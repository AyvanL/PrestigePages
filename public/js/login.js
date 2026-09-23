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

// ---------- Login handler ----------
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value?.trim() || "";
    const password = document.getElementById("password")?.value || "";

    try {
      // Persist session
      await setPersistence(auth, browserLocalPersistence);

      // Sign in
      await signInWithEmailAndPassword(auth, email, password);

      // Suspension check
      try {
        const user = auth.currentUser;
        if (user) {
          const uSnap = await getDoc(doc(db, "users", user.uid));
          if (uSnap.exists()) {
            const uData = uSnap.data() || {};
            if (uData.suspended) {
              alert("🚫 This account is suspended. Please contact support.");
              await auth.signOut();
              return;
            }
          }
        }
      } catch (sErr) {
        console.warn("Suspension check failed", sErr);
      }

      // Redirect (role-based)
      try {
        const user = auth.currentUser;
        if (user) {
          const uSnap = await getDoc(doc(db, "users", user.uid));
          const role = (uSnap.data()?.role || "").toLowerCase();
          window.location.href = role
            ? "admin-sales-activity.html"
            : "homepage-logged.html";
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

      alert("❌ Login failed: wrong email or password.");
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