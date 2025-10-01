// Import Firebase (ESM via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, updateDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const statusEl = document.getElementById("status");

function setStatus(text, cls) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = cls ? cls : "";
}

function getQueryParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

async function markTransactionPaid(user, txId) {
  const txRef = doc(db, "users", user.uid, "transactions", txId);
  const snap = await getDoc(txRef);
  if (!snap.exists()) throw new Error("Transaction not found");

  await updateDoc(txRef, {
    status: "paid",
    paidAt: serverTimestamp(),
  });

  // Also set lastTransactionId on the user for quick lookup
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    lastTransactionId: txId,
    lastTransactionAt: serverTimestamp(),
  });

  // Clear the user's cart after successful payment
  try {
    await updateDoc(userRef, { cart: [] });
  } catch (e) {
    console.warn("Could not clear cart:", e);
  }
}

onAuthStateChanged(auth, async (user) => {
  const txId = getQueryParam("ref");
  if (!txId) {
    setStatus("Missing order reference in URL.", "error");
    return;
  }

  if (!user) {
    setStatus("Please log in to view your receipt.", "error");
    // Optionally redirect to login and back
    // location.href = "/login.html?redirect=" + encodeURIComponent(location.pathname + location.search);
    return;
  }

  try {
    await markTransactionPaid(user, txId);
    setStatus("Payment successful. Your order is now marked as ", "ok");
    statusEl.insertAdjacentHTML("beforeend", "<strong>paid</strong>.");
  } catch (err) {
    console.error("Failed to mark transaction paid:", err);
    setStatus("We couldn't verify your payment automatically. We'll keep checking.", "error");
  }
});
