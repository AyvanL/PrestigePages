import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// ---------- Init ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI refs
const loginForm = document.getElementById("loginForm");
const forgotPasswordLink = document.getElementById("forgotPassword");
const emailInput = document.getElementById("email");
const msgBox = document.getElementById("message");
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

  let email = document.getElementById("email")?.value?.trim() || "";
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
      // Removed legacy admin shortcut (email/password "admin")

      // If user typed a username (no @), resolve to email via Firestore users collection
      if (email && !email.includes('@')){
        try {
          const qy = query(collection(db,'users'), where('username','==', email));
          const snap = await getDocs(qy);
          if (!snap.empty){ email = (snap.docs[0].data().email)||email; }
        } catch {}
      }

      // Persist session
      await setPersistence(auth, browserLocalPersistence);

      // Try to sign in
      await signInWithEmailAndPassword(auth, email, password);

      // Success -> clear counters
      clearLock();

      // Suspension check
      try {
        const user = auth.currentUser;
        if (user) {
          const uSnap = await getDoc(doc(db, 'users', user.uid));
          if (uSnap.exists()) {
            const uData = uSnap.data() || {};
            if (uData.suspended) {
              alert('🚫 This account is suspended. Please contact support.');
              await auth.signOut();
              return; // Stop further navigation
            }
          }
        }
      } catch (sErr) { console.warn('Suspension check failed', sErr); }

      // Redirect directly (role-based)
      try {
        const user = auth.currentUser;
        if (user) {
          const uSnap = await getDoc(doc(db,'users',user.uid));
          const role = (uSnap.data()?.role||'').toLowerCase();
          window.location.href = role ? "admin-sales-activity.html" : "homepage-logged.html";
        } else {
          window.location.href = "homepage-logged.html";
        }
      } catch {
        window.location.href = "homepage-logged.html";
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error?.code === "auth/user-disabled") {
        alert("🚫 This account is disabled or under review. Please contact support.");
        return;
      }

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

