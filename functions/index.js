import crypto from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

const auth = getAuth();
const db = getFirestore();

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
  ip: { windowMs: 10 * 60 * 1000, hardLimit: 8 },
  email: { windowMs: 60 * 60 * 1000, hardLimit: 3 },
  fingerprint: { windowMs: 60 * 60 * 1000, hardLimit: 4 },
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

async function logSecurityEvent(event) {
  try {
    await db.collection('securityEvents').add({
      ...event,
      createdAt: new Date(),
    });
  } catch (error) {
    console.warn('security event log failed:', error?.message || error);
  }
}

async function enforceEmailAbuseLimit(email, metadata) {
  const docId = hashEmail(email);
  const ref = db.collection('signupEmailAbuse').doc(docId);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const blockUntil = Number(data.blockUntil || 0);

    if (blockUntil && now < blockUntil) {
      return { allowed: false, message: 'This email is temporarily blocked. Please wait and try again later.' };
    }

    const attempts = Array.isArray(data.attempts) ? data.attempts.filter((timestamp) => now - Number(timestamp) <= emailBlockWindowMs) : [];
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

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export const signupApi = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
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
    await logSecurityEvent({ type: 'signup_honeypot', email, ip, fingerprint, userAgent });
    return sendJson(res, 400, { ok: false, message: 'Unable to complete signup.' });
  }

  if (!firstName || !lastName || !mobile || !email || !password) {
    return sendJson(res, 400, { ok: false, message: 'Missing signup fields.' });
  }

  if (password.length < 6) {
    return sendJson(res, 400, { ok: false, message: 'Weak password.' });
  }

  const mobileRegex = /^09\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return sendJson(res, 400, { ok: false, message: 'Invalid mobile number.' });
  }

  if (isDisposableEmail(email)) {
    await logSecurityEvent({ type: 'signup_blocked_disposable', email, ip, fingerprint, userAgent });
    return sendJson(res, 400, { ok: false, message: 'Email domain is not allowed.' });
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
    return sendJson(res, 429, { ok: false, message: emailLimit.message });
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
    await logSecurityEvent({ type: 'signup_rate_limited', email, ip, fingerprint, userAgent, counts });
    return sendJson(res, 429, { ok: false, message: 'Too many signup attempts. Try again later.' });
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
      disabled: false,
    });

    await db.collection('users').doc(userRecord.uid).set({
      firstName,
      lastName,
      mobile,
      email,
      createdAt: new Date(),
      active: true,
      suspended: false,
      signupMeta: {
        ip,
        fingerprint,
        userAgent,
      },
    });

    await logSecurityEvent({ type: 'signup_created', uid: userRecord.uid, email, ip, fingerprint, userAgent });

    return sendJson(res, 201, { ok: true, suspended: false, message: 'Account created successfully.' });
  } catch (error) {
    const code = error?.code || '';
    if (code === 'auth/email-already-exists') {
      return sendJson(res, 409, { ok: false, message: 'Email already in use.' });
    }
    if (code === 'auth/invalid-email') {
      return sendJson(res, 400, { ok: false, message: 'Invalid email format.' });
    }
    if (code === 'auth/invalid-password') {
      return sendJson(res, 400, { ok: false, message: 'Weak password.' });
    }

    console.error('signup error:', error);
    await logSecurityEvent({ type: 'signup_error', email, ip, fingerprint, userAgent, errorCode: code || 'unknown' });
    return sendJson(res, 500, { ok: false, message: 'Unable to create account.' });
  }
});