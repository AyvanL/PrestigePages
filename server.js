import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const preferredPort = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(publicDir));

let adminReady = false;
let adminAuth = null;
let adminDb = null;

function findLocalServiceAccountFile() {
  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicitPath && fs.existsSync(explicitPath) && fs.statSync(explicitPath).isFile()) {
    return explicitPath;
  }

  const preferredFiles = [
    path.join(__dirname, 'service-account.json'),
    path.join(__dirname, 'prestige-pages-firebase-adminsdk-fbsvc-873319e470.json'),
  ];

  for (const candidate of preferredFiles) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  const jsonFiles = fs
    .readdirSync(__dirname)
    .filter((fileName) => fileName.endsWith('.json') && fileName.includes('firebase-adminsdk'))
    .map((fileName) => path.join(__dirname, fileName));

  for (const candidate of jsonFiles) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return '';
}

function initAdmin() {
  if (getApps().length === 0) {
    const serviceAccountFile = findLocalServiceAccountFile();

    if (serviceAccountFile) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || 'prestige-pages',
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'prestige-pages',
      });
    }
  }

  adminAuth = getAuth();
  adminDb = getFirestore();
  adminReady = true;
}

try {
  initAdmin();
} catch (error) {
  console.warn('Firebase Admin is not initialized. Set GOOGLE_APPLICATION_CREDENTIALS or ADC before using /api/signup.');
  console.warn(error?.message || error);
}

const disposableDomainPatterns = [
  '10minutemail',
  'mailinator',
  'guerrillamail',
  'tempmail',
  'temp-mail',
  'yopmail',
  'trashmail',
  'fakeinbox',
  'getnada',
  'moakt',
  'mintemail',
  'maildrop',
  'dispostable',
  'sharklasers',
  'mailnesia',
  'emailondeck',
  'spambog',
  'mytemp.email',
  'drdrb.net',
];

const rateState = {
  ip: new Map(),
  email: new Map(),
  fingerprint: new Map(),
};

const rateRules = {
  ip: { windowMs: 10 * 60 * 1000, softLimit: 4, hardLimit: 8 },
  email: { windowMs: 60 * 60 * 1000, softLimit: 2, hardLimit: 3 },
  fingerprint: { windowMs: 60 * 60 * 1000, softLimit: 2, hardLimit: 4 },
};

const emailBlockWindowMs = 60 * 60 * 1000;

function cleanupBucket(bucket, windowMs) {
  const now = Date.now();
  for (const [key, timestamps] of bucket.entries()) {
    const fresh = timestamps.filter((timestamp) => now - timestamp <= windowMs);
    if (fresh.length === 0) {
      bucket.delete(key);
    } else {
      bucket.set(key, fresh);
    }
  }
}

function recordHit(bucketName, key) {
  const rule = rateRules[bucketName];
  const bucket = rateState[bucketName];
  const now = Date.now();
  const previous = bucket.get(key) || [];
  const fresh = previous.filter((timestamp) => now - timestamp <= rule.windowMs);
  fresh.push(now);
  bucket.set(key, fresh);
  return fresh.length;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isDisposableEmail(email) {
  const domain = normalizeEmail(email).split('@')[1] || '';
  if (!domain) return false;
  return disposableDomainPatterns.some((pattern) => domain.includes(pattern));
}

function hashFingerprint(value) {
  return crypto.createHash('sha256').update(String(value || 'unknown')).digest('hex');
}

function hashEmail(email) {
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

function getFingerprint(req, body) {
  const clientSeed = String(body?.deviceFingerprint || '');
  const userAgent = String(req.headers['user-agent'] || '');
  const language = String(req.headers['accept-language'] || '');
  return hashFingerprint([clientSeed, userAgent, language].join('|'));
}

function severityFromCounts(counts) {
  const flags = [];
  if (counts.ip >= rateRules.ip.softLimit) flags.push('ip');
  if (counts.email >= rateRules.email.softLimit) flags.push('email');
  if (counts.fingerprint >= rateRules.fingerprint.softLimit) flags.push('fingerprint');
  return flags;
}

async function logSecurityEvent(event) {
  if (!adminReady || !adminDb) return;
  try {
    await adminDb.collection('securityEvents').add({
      ...event,
      createdAt: new Date(),
    });
  } catch (error) {
    console.warn('security event log failed:', error?.message || error);
  }
}

async function enforceEmailAbuseLimit(email, metadata) {
  if (!adminDb) {
    return { allowed: true };
  }

  const docId = hashEmail(email);
  const ref = adminDb.collection('signupEmailAbuse').doc(docId);
  const now = Date.now();

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const blockUntil = Number(data.blockUntil || 0);

    if (blockUntil && now < blockUntil) {
      return { allowed: false, message: 'This email is temporarily blocked. Please wait and try again later.' };
    }

    const attempts = Array.isArray(data.attempts)
      ? data.attempts.filter((timestamp) => now - Number(timestamp) <= emailBlockWindowMs)
      : [];
    attempts.push(now);

    const nextRecord = {
      emailHash: docId,
      attempts,
      lastAttemptAt: new Date(now),
      updatedAt: new Date(now),
      lastIp: metadata.ip,
      lastFingerprint: metadata.fingerprint,
      lastUserAgent: metadata.userAgent,
    };

    if (attempts.length >= rateRules.email.hardLimit) {
      nextRecord.blockUntil = new Date(now + emailBlockWindowMs);
      transaction.set(ref, nextRecord, { merge: true });
      return { allowed: false, message: 'This email has been used too many times. Please wait before trying again.' };
    }

    transaction.set(ref, nextRecord, { merge: true });
    return { allowed: true };
  });
}

async function createSignupUser(payload, metadata) {
  const displayName = `${payload.firstName} ${payload.lastName}`.trim();
  const shouldSuspend = metadata.riskFlags.length >= 2 || payload.isDisposable;
  const authUser = await adminAuth.createUser({
    email: payload.email,
    password: payload.password,
    displayName,
    disabled: shouldSuspend,
  });

  await adminDb.collection('users').doc(authUser.uid).set({
    firstName: payload.firstName,
    lastName: payload.lastName,
    mobile: payload.mobile,
    email: payload.email,
    createdAt: new Date(),
    active: !shouldSuspend,
    suspended: shouldSuspend,
    suspendedReason: shouldSuspend ? 'signup-risk-review' : '',
    signupMeta: {
      ip: metadata.ip,
      fingerprint: metadata.fingerprint,
      userAgent: metadata.userAgent,
      riskFlags: metadata.riskFlags,
    },
  });

  await logSecurityEvent({
    type: shouldSuspend ? 'signup_suspended' : 'signup_created',
    uid: authUser.uid,
    email: payload.email,
    ip: metadata.ip,
    fingerprint: metadata.fingerprint,
    riskFlags: metadata.riskFlags,
    disposableEmail: payload.isDisposable,
  });

  return { uid: authUser.uid, suspended: shouldSuspend };
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, adminReady });
});

app.post('/api/signup', async (req, res) => {
  if (!adminReady || !adminAuth || !adminDb) {
    return res.status(503).json({ ok: false, message: 'Signup service is not configured.' });
  }

  const firstName = String(req.body?.firstName || '').trim();
  const lastName = String(req.body?.lastName || '').trim();
  const mobile = String(req.body?.mobile || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const honeypot = String(req.body?.website || req.body?.company || '').trim();
  const ip = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '');
  const fingerprint = getFingerprint(req, req.body);

  if (honeypot) {
    await logSecurityEvent({
      type: 'signup_honeypot',
      email,
      ip,
      fingerprint,
      userAgent,
    });
    return res.status(400).json({ ok: false, message: 'Unable to complete signup.' });
  }

  if (!firstName || !lastName || !mobile || !email || !password) {
    return res.status(400).json({ ok: false, message: 'Missing signup fields.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Weak password.' });
  }

  const mobileRegex = /^09\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ ok: false, message: 'Invalid mobile number.' });
  }

  if (isDisposableEmail(email)) {
    await logSecurityEvent({
      type: 'signup_blocked_disposable',
      email,
      ip,
      fingerprint,
      userAgent,
    });
    return res.status(400).json({ ok: false, message: 'Email domain is not allowed.' });
  }

  const emailLimit = await enforceEmailAbuseLimit(email, { ip, fingerprint, userAgent });
  if (!emailLimit.allowed) {
    await logSecurityEvent({
      type: 'signup_email_blocked',
      email,
      ip,
      fingerprint,
      userAgent,
      message: emailLimit.message,
    });
    return res.status(429).json({ ok: false, message: emailLimit.message });
  }

  const counts = {
    ip: recordHit('ip', ip),
    email: recordHit('email', email),
    fingerprint: recordHit('fingerprint', fingerprint),
  };

  cleanupBucket(rateState.ip, rateRules.ip.windowMs);
  cleanupBucket(rateState.email, rateRules.email.windowMs);
  cleanupBucket(rateState.fingerprint, rateRules.fingerprint.windowMs);

  if (counts.ip > rateRules.ip.hardLimit || counts.email > rateRules.email.hardLimit || counts.fingerprint > rateRules.fingerprint.hardLimit) {
    await logSecurityEvent({
      type: 'signup_rate_limited',
      email,
      ip,
      fingerprint,
      userAgent,
      counts,
    });
    return res.status(429).json({ ok: false, message: 'Too many signup attempts. Try again later.' });
  }

  const riskFlags = severityFromCounts(counts);
  const metadata = {
    ip,
    fingerprint,
    userAgent,
    riskFlags,
  };

  try {
    const result = await createSignupUser(
      {
        firstName,
        lastName,
        mobile,
        email,
        password,
        isDisposable: false,
      },
      metadata,
    );

    if (result.suspended) {
      return res.status(202).json({
        ok: true,
        suspended: true,
        message: 'Account created but placed under review.',
      });
    }

    return res.status(201).json({ ok: true, suspended: false, message: 'Account created successfully.' });
  } catch (error) {
    const code = error?.code || '';
    if (code === 'auth/email-already-exists') {
      return res.status(409).json({ ok: false, message: 'Email already in use.' });
    }
    if (code === 'auth/invalid-email') {
      return res.status(400).json({ ok: false, message: 'Invalid email format.' });
    }
    if (code === 'auth/invalid-password') {
      return res.status(400).json({ ok: false, message: 'Weak password.' });
    }

    console.error('signup error:', error);
    await logSecurityEvent({
      type: 'signup_error',
      email,
      ip,
      fingerprint,
      userAgent,
      errorCode: code || 'unknown',
    });
    return res.status(500).json({ ok: false, message: 'Unable to create account.' });
  }
});

function startServer(portCandidates) {
  const [currentPort, ...remainingPorts] = portCandidates;

  const server = app.listen(currentPort, () => {
    console.log(`PrestigePages server listening on http://localhost:${currentPort}`);
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE' && remainingPorts.length > 0) {
      startServer(remainingPorts);
      return;
    }

    console.error('Server failed to start:', error);
    process.exit(1);
  });
}

startServer([preferredPort, 3001, 3002, 3003, 3004]);