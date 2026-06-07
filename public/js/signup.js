const signupForm = document.getElementById('signupForm');
const navToggle = document.getElementById('navToggle');
const submitButton = signupForm?.querySelector('button[type="submit"]');

const COOLDOWN_KEY = 'pp_signupCooldownUntil';
const ATTEMPTS_KEY = 'pp_signupAttemptTimes';
const DEVICE_KEY = 'pp_signupDeviceId';
const COOLDOWN_MS = 20 * 1000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_LOCAL_ATTEMPTS = 3;

function getNow() {
  return Date.now();
}

function readAttempts() {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const values = JSON.parse(raw || '[]');
    return Array.isArray(values) ? values.filter((value) => Number.isFinite(Number(value))) : [];
  } catch {
    return [];
  }
}

function writeAttempts(values) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(values));
}

function getDeviceFingerprint() {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const generated =
    (self.crypto?.randomUUID?.() || `${Math.random().toString(16).slice(2)}-${Date.now()}`) +
    `|${navigator.userAgent}|${navigator.language}|${new Date().getTimezoneOffset()}`;
  localStorage.setItem(DEVICE_KEY, generated);
  return generated;
}

function setCooldown() {
  localStorage.setItem(COOLDOWN_KEY, String(getNow() + COOLDOWN_MS));
}

function getCooldownRemaining() {
  const until = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
  return Math.max(0, until - getNow());
}

function pruneAttempts(values) {
  const now = getNow();
  return values.filter((timestamp) => now - Number(timestamp) <= WINDOW_MS);
}

function isAllowedToSubmit() {
  const remaining = getCooldownRemaining();
  if (remaining > 0) {
    return { allowed: false, message: `Please wait ${Math.ceil(remaining / 1000)} seconds before trying again.` };
  }

  const attempts = pruneAttempts(readAttempts());
  if (attempts.length >= MAX_LOCAL_ATTEMPTS) {
    return { allowed: false, message: 'Too many local signup attempts. Please wait a moment and try again.' };
  }

  return { allowed: true, attempts };
}

function registerAttempt() {
  const attempts = pruneAttempts(readAttempts());
  attempts.push(getNow());
  writeAttempts(attempts);
  setCooldown();
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  icon.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  });
}

function showMessage(message) {
  alert(message);
}

signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const gate = isAllowedToSubmit();
  if (!gate.allowed) {
    showMessage(gate.message);
    return;
  }

  const firstName = document.getElementById('firstName')?.value.trim() || '';
  const lastName = document.getElementById('lastName')?.value.trim() || '';
  const mobile = document.getElementById('mobile')?.value.trim() || '';
  const email = document.getElementById('email')?.value.trim() || '';
  const password = document.getElementById('password')?.value || '';
  const cpassword = document.getElementById('cpassword')?.value || '';
  const terms = document.getElementById('terms');
  const privacy = document.getElementById('privacy');
  const honeypot = document.getElementById('website')?.value.trim() || '';

  if (!terms || !privacy) {
    showMessage('Developer error: terms/privacy checkboxes not found.');
    return;
  }

  if (!terms.checked || !privacy.checked) {
    showMessage('Please agree to the Terms and Conditions and Privacy Policy before signing up.');
    return;
  }

  if (honeypot) {
    registerAttempt();
    showMessage('Unable to complete signup.');
    return;
  }

  const mobileRegex = /^09\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    showMessage('Invalid mobile number. It must start with 09 and be 11 digits.');
    return;
  }

  if (password !== cpassword) {
    showMessage('Passwords do not match.');
    return;
  }

  if (password.length < 6) {
    showMessage('Password too short. It should be at least 6 characters.');
    return;
  }

  registerAttempt();

  const payload = {
    firstName,
    lastName,
    mobile,
    email,
    password,
    website: honeypot,
    deviceFingerprint: getDeviceFingerprint(),
  };

  try {
    if (submitButton) submitButton.disabled = true;

    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok && response.status !== 202) {
      throw new Error(result.message || 'Error creating account.');
    }

    signupForm.reset();

    if (result.suspended) {
      showMessage('Account created but placed under review. You can sign in once it is approved.');
      window.location.href = 'login.html';
      return;
    }

    showMessage(result.message || 'Account created successfully!');
    window.location.href = 'homepage-logged.html';
  } catch (error) {
    console.error('Signup error:', error);
    showMessage(error.message || 'Unable to create account right now.');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

togglePasswordVisibility('password', 'togglePassword');
togglePasswordVisibility('cpassword', 'toggleCPassword');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const existing = document.getElementById('mobileMenu');
    if (existing) {
      existing.remove();
      return;
    }

    const menu = document.createElement('div');
    menu.id = 'mobileMenu';
    menu.style.background = 'var(--paper)';
    menu.style.borderTop = '1px solid var(--line)';
    menu.innerHTML = `<div class="container" style="padding:12px 20px 16px; display:grid; gap:10px;">
      <a href="index.html">Home</a>
      <a href="#popular">Store</a>
      <a href="about-us.html">About us</a>
    </div>`;

    document.querySelector('.site-header')?.appendChild(menu);
  });
}