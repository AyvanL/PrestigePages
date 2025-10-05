import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";
import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// ---------- Init ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

// Callable function (backend) for sending OTP on login
const sendEmailOTP = httpsCallable(functions, "sendEmailOTP");

// UI refs
const loginForm = document.getElementById("loginForm");
const forgotPasswordLink = document.getElementById("forgotPassword");
const emailInput = document.getElementById("email");
const msgBox = document.getElementById("message");
const otpModal = document.getElementById("otpModal");
const verifyBtn = document.getElementById("verifyOtpBtn");
const otpInput = document.getElementById("otpInput");
const otpMessageEl = document.getElementById("otpMessage");
const passwordInput = document.getElementById("password");
const toggleIcon = document.getElementById("togglePassword");
const navToggle = document.getElementById("navToggle");

// ---------- Settings for lockout ----------
const STORAGE_ATTEMPTS_KEY = "pp_failedAttempts"; // namespaced keys
const STORAGE_LOCK_KEY = "pp_lockTime";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 30 minutes = 1,800,000 ms

// Utility to parse storage ints safely
function readInt(key) {
  const v = parseInt(localStorage.getItem(key));
  return Number.isFinite(v) ? v : 0;
}

function clearLock() {
  localStorage.removeItem(STORAGE_ATTEMPTS_KEY);
  localStorage.removeItem(STORAGE_LOCK_KEY);
}

// If lock expired on page load, clear it
(function initLockState() {
  const lockTime = readInt(STORAGE_LOCK_KEY);
  if (lockTime) {
    const now = Date.now();
    if (now >= lockTime + LOCK_DURATION_MS) {
      clearLock();
    }
  }
})();

// ---------- Forgot password ----------
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput?.value?.trim() || "";

    if (!email) {
      if (msgBox) msgBox.textContent = "Please enter your email first.";
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      if (msgBox) msgBox.textContent = "✅ Reset link sent! Check your email.";
    } catch (error) {
      console.error("Forgot password error:", error);
      alert("❌ " + (error.message || "Failed to send reset link."));
    }
  });
}

// ---------- Login handler with lockout ----------
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value?.trim() || "";
    const password = document.getElementById("password")?.value || "";

    const now = Date.now();
    let failedAttempts = readInt(STORAGE_ATTEMPTS_KEY);
    const lockTime = readInt(STORAGE_LOCK_KEY);

    // If there is a lock and it hasn't expired -> show minutes remaining
    if (lockTime && now < lockTime + LOCK_DURATION_MS) {
      const remainingMs = lockTime + LOCK_DURATION_MS - now;
      const remainingMinutes = Math.ceil(remainingMs / 60000); // round up
      alert(
        `You have reached ${MAX_ATTEMPTS} login failed attempts. Please wait ${remainingMinutes} minute(s) to try again.`
      );
      return;
    }

    // If lock expired, reset counters
    if (lockTime && now >= lockTime + LOCK_DURATION_MS) {
      clearLock();
      failedAttempts = 0;
    }

    try {
      // Admin shortcut (keeps previous behavior)
      if (email === "admin" && password === "admin") {
        clearLock();
        window.location.href = "admin-orders.html";
        return;
      }

      // Persist session
      await setPersistence(auth, browserLocalPersistence);

      // Try to sign in
      await signInWithEmailAndPassword(auth, email, password);

      // Success -> clear counters
      clearLock();

      // OTP flow if UI & backend exist
      if (otpModal && verifyBtn && otpInput) {
        try {
          await sendEmailOTP({ email });
          otpModal.style.display = "flex";
          localStorage.setItem("pendingEmail", email);
        } catch (err) {
          // If sending OTP fails, still redirect or show error
          console.error("sendEmailOTP error:", err);
          alert("✅ Signed in but failed to request OTP. Redirecting...");
          window.location.href = "homepage-logged.html";
        }
      } else {
        // No OTP UI = redirect directly
        window.location.href = "homepage-logged.html";
      }
    } catch (error) {
      console.error("Login error:", error);

      // Increment failed attempts only for sign-in failures
      failedAttempts = readInt(STORAGE_ATTEMPTS_KEY) + 1;
      localStorage.setItem(STORAGE_ATTEMPTS_KEY, String(failedAttempts));

      if (failedAttempts >= MAX_ATTEMPTS) {
        // set lock start time
        localStorage.setItem(STORAGE_LOCK_KEY, String(now));
        alert(
          `You have exceeded ${MAX_ATTEMPTS} login failed attempts. Please wait for 30 minutes to try again.`
        );
      } else {
        const remaining = MAX_ATTEMPTS - failedAttempts;
        alert(
          `❌ Login failed: wrong email or password. You have ${remaining} attempt(s) left.`
        );
      }
    }
  });
}

// ---------- OTP verification (login flow) ----------
if (verifyBtn) {
  verifyBtn.addEventListener("click", async () => {
    const email = localStorage.getItem("pendingEmail");
    const enteredOtp = otpInput?.value?.trim() || "";

    if (!email) {
      if (otpMessageEl) otpMessageEl.textContent = "❌ No pending email found.";
      return;
    }

    try {
      const docRef = doc(db, "emailOtps", email);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        if (otpMessageEl) otpMessageEl.textContent = "❌ No code found.";
        return;
      }

      const data = snapshot.data() || {};
      const { otp, expiresAt } = data;

      if (!otp || !expiresAt) {
        if (otpMessageEl) otpMessageEl.textContent = "❌ Invalid OTP record.";
        await deleteDoc(docRef).catch(() => {});
        return;
      }

      if (Date.now() > expiresAt) {
        if (otpMessageEl) otpMessageEl.textContent = "❌ Code expired.";
        await deleteDoc(docRef).catch(() => {});
        return;
      }

      if (enteredOtp === otp) {
        await deleteDoc(docRef).catch(() => {});
        alert("✅ Login successful!");
        localStorage.removeItem("pendingEmail");
        window.location.href = "homepage-logged.html";
      } else {
        if (otpMessageEl) otpMessageEl.textContent = "❌ Invalid code.";
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      if (otpMessageEl) otpMessageEl.textContent = "❌ Error verifying OTP.";
    }
  });
}

// Allow closing OTP modal by clicking on backdrop
if (otpModal) {
  otpModal.addEventListener("click", (ev) => {
    if (ev.target === otpModal) otpModal.style.display = "none";
  });
}

// ---------- Password visibility toggle ----------
if (passwordInput && toggleIcon) {
  toggleIcon.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleIcon.classList.toggle("fa-eye");
    toggleIcon.classList.toggle("fa-eye-slash");
  });
}

// ---------- Mobile nav toggle ----------
if (navToggle) {
  navToggle.addEventListener("click", () => {
    const existing = document.getElementById("mobileMenu");
    if (existing) {
      existing.remove();
      return;
    }
    const menu = document.createElement("div");
    menu.id = "mobileMenu";
    menu.style.background = "var(--paper)";
    menu.style.borderTop = "1px solid var(--line)";
    menu.innerHTML = `<div class="container" style="padding:12px 20px 16px; display:grid; gap:10px;">
        <a href="index.html">Home</a>
        <a href="#popular">Store</a>
        <a href="about-us.html">About us</a>
      </div>`;
    document.querySelector(".site-header").appendChild(menu);
  });
}
