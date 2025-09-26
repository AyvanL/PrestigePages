import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

// Cloud Function reference
const sendEmailOTP = httpsCallable(functions, "sendEmailOTP");

// Forgot password
const forgotPasswordLink = document.getElementById("forgotPassword");
const emailInput = document.getElementById("email");
const msgBox = document.getElementById("message");

forgotPasswordLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();

  if (!email) {
    msgBox.textContent = "Please enter your email first.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    msgBox.textContent = "✅ Reset link sent! Check your email.";
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    alert("❌ " + error.message);
  }
});

// Login handler
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // Request OTP from backend
    await sendEmailOTP({ email });

    // Show modal
    document.getElementById("otpModal").style.display = "flex";
    localStorage.setItem("pendingEmail", email);
  } catch (error) {
    alert("❌ Login failed: wrong email or password.");
  }
});

// Verify OTP
document.getElementById("verifyOtpBtn").addEventListener("click", async () => {
  const email = localStorage.getItem("pendingEmail");
  const enteredOtp = document.getElementById("otpInput").value.trim();
  const docRef = doc(db, "emailOtps", email);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    document.getElementById("otpMessage").textContent = "❌ No code found.";
    return;
  }

  const { otp, expiresAt } = snapshot.data();

  if (Date.now() > expiresAt) {
    document.getElementById("otpMessage").textContent = "❌ Code expired.";
    await deleteDoc(docRef);
    return;
  }

  if (enteredOtp === otp) {
    await deleteDoc(docRef);
    alert("✅ Login successful!");
    window.location.href = "homepage-logged.html";
  } else {
    document.getElementById("otpMessage").textContent = "❌ Invalid code.";
  }
});

// Password toggle
const passwordInput = document.getElementById("password");
const toggleIcon = document.getElementById("togglePassword");
toggleIcon.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  toggleIcon.classList.toggle("fa-eye");
  toggleIcon.classList.toggle("fa-eye-slash");
});

// Mobile nav
document.getElementById("navToggle").addEventListener("click", () => {
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
