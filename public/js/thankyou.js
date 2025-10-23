// Import Firebase (ESM via CDN)
// (Upgraded SDK version to align with other pages using 12.1.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, getDoc, serverTimestamp, collection, getDocs, runTransaction } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const statusEl = document.getElementById("status");
const homeBtn = document.getElementById('homeBtn');
const countdownMsg = document.getElementById('countdownMsg');

function setHomeButtonEnabled(enabled) {
  if (!homeBtn) return;
  if (enabled) {
    homeBtn.style.pointerEvents = '';
    homeBtn.style.opacity = '';
    homeBtn.removeAttribute('tabindex');
    homeBtn.setAttribute('aria-disabled', 'false');
    if (countdownMsg) countdownMsg.textContent = '';
  } else {
    homeBtn.style.pointerEvents = 'none';
    homeBtn.style.opacity = '0.6';
    homeBtn.setAttribute('tabindex', '-1');
    homeBtn.setAttribute('aria-disabled', 'true');
    if (countdownMsg) countdownMsg.textContent = 'Confirming your payment...';
  }
}

// Disable Back to Home until status is confirmed
setHomeButtonEnabled(false);

function setStatus(text, cls) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = cls ? cls : "";
}

function getQueryParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

// Deduct stock once per transaction (idempotent via stockDeducted flag)
async function ensureStockDeducted(txRef, txData) {
  if (txData.stockDeducted) return; // already processed
  const items = Array.isArray(txData.items) ? txData.items : [];
  if (!items.length) {
    await updateDoc(txRef, { stockDeducted: true });
    return;
  }
  try {
    // Use a transaction per item (simpler; low contention). Could batch, but Firestore lacks atomic multi-doc update without transaction.
    for (const it of items) {
      const qtyToDeduct = Math.max(1, Number(it.qty || 1));
      if (qtyToDeduct <= 0) continue;
      console.debug('[ensureStockDeducted] Processing item', { title: it.title, id: it.id, qtyToDeduct });

      if (it.id) {
        const bookRef = doc(db, 'books', it.id);
        await runTransaction(db, async (trx) => {
          const snap = await trx.get(bookRef);
          if (!snap.exists()) return; // skip silently if book removed
          const data = snap.data();
          let currentStockRaw = data.stock;
          // Accept numeric strings
          if (typeof currentStockRaw === 'string') {
            const parsed = parseInt(currentStockRaw, 10);
            currentStockRaw = isNaN(parsed) ? 0 : parsed;
          }
          const currentStock = typeof currentStockRaw === 'number' ? currentStockRaw : 0;
          const newStock = Math.max(0, currentStock - qtyToDeduct);
          console.debug('[ensureStockDeducted] Transaction (id path)', { currentStock, qtyToDeduct, newStock });
          trx.update(bookRef, { stock: newStock });
        });
        continue;
      }

      // Fallback: find by title + author (case-insensitive)
      if (it.title) {
        const booksCol = collection(db, 'books');
        // Note: Performance hit (full scan). Consider storing book id in transaction items to avoid this path.
        const allBooksSnap = await getDocs(booksCol);
        const needleTitle = String(it.title).trim().toLowerCase();
        const needleAuthor = String(it.author || '').trim().toLowerCase();
        const match = allBooksSnap.docs.find(d => {
          const dData = d.data() || {};
          return String(dData.title||'').trim().toLowerCase() === needleTitle &&
                 (!needleAuthor || String(dData.author||'').trim().toLowerCase() === needleAuthor);
        });
        if (match) {
          const bookRef = doc(db, 'books', match.id);
          await runTransaction(db, async (trx) => {
            const snap = await trx.get(bookRef);
            if (!snap.exists()) return;
            const data = snap.data();
            let currentStockRaw = data.stock;
            if (typeof currentStockRaw === 'string') {
              const parsed = parseInt(currentStockRaw, 10);
              currentStockRaw = isNaN(parsed) ? 0 : parsed;
            }
            const currentStock = typeof currentStockRaw === 'number' ? currentStockRaw : 0;
            const newStock = Math.max(0, currentStock - qtyToDeduct);
            console.debug('[ensureStockDeducted] Transaction (fallback path)', { title: it.title, currentStock, qtyToDeduct, newStock });
            trx.update(bookRef, { stock: newStock });
          });
        }
      }
    }
    await updateDoc(txRef, { stockDeducted: true });
  } catch (e) {
    console.warn('ensureStockDeducted (transactional) failed:', e);
  }
}

async function markTransactionPaid(user, txId) {
  const txRef = doc(db, "users", user.uid, "transactions", txId);
  const snap = await getDoc(txRef);
  if (!snap.exists()) throw new Error("Transaction not found");
  const txData = snap.data();

  // Always attempt stock deduction first (safe if already done)
  await ensureStockDeducted(txRef, txData);

  // Then mark as paid if not already
  await updateDoc(txRef, { status: "paid", paidAt: serverTimestamp() });

  // Update user doc (clear cart etc.)
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    lastTransactionId: txId,
    lastTransactionAt: serverTimestamp(),
    cart: [],
  });
  // Payment confirmed -> enable navigation
  setHomeButtonEnabled(true);
}

onAuthStateChanged(auth, async (user) => {
  const txId = getQueryParam("ref");
  const cod = getQueryParam("cod");
  if (!txId) {
    setStatus("Missing order reference in URL.", "error");
    return;
  }

  // Set a fallback flag immediately: being on the thank-you page implies payment success
  try { localStorage.setItem("pp:clearCartTx", txId); } catch {}

  if (!user) {
    // If the user isn't signed in after redirect, defer cart clearing to next login/homepage load
    try {
      localStorage.setItem("pp:clearCartTx", txId);
    } catch {}
    setStatus("Please log in to view your receipt.", "error");
    // Optionally redirect to login and back
    // location.href = "/login.html?redirect=" + encodeURIComponent(location.pathname + location.search);
    return;
  }

  try {
    const txRef = doc(db, "users", user.uid, "transactions", txId);
    const txSnap = await getDoc(txRef);
    if (!txSnap.exists()) throw new Error("Transaction not found");
    const txData = txSnap.data();

    // Always deduct stock immediately (once) regardless of payment method
    await ensureStockDeducted(txRef, txData);

    if (cod) {
      // COD: keep status unpaid but reflect that order + stock reservation succeeded
      if (!txData.status || txData.status === 'initiated') {
        await updateDoc(txRef, { status: 'unpaid', cod: true });
      }
      setStatus("Order placed via Cash on Delivery. Stock reserved. Payment status: ", "ok");
      if (statusEl) statusEl.insertAdjacentHTML("beforeend", "<strong>unpaid</strong>.");
      // Clear cart for user now
      await updateDoc(doc(db, 'users', user.uid), { cart: [], lastTransactionId: txId, lastTransactionAt: serverTimestamp() });
      try { localStorage.removeItem("pp:clearCartTx"); } catch {}
      // COD placed -> allow navigation
      setHomeButtonEnabled(true);
    } else {
      // Online: proceed to mark as paid (also clears cart in helper)
      await markTransactionPaid(user, txId);
      setStatus("Payment successful. Your order is now marked as ", "ok");
      if (statusEl) statusEl.insertAdjacentHTML("beforeend", "<strong>paid</strong>.");
      try { localStorage.removeItem("pp:clearCartTx"); } catch {}
    }
  } catch (err) {
    console.error("Failed to mark transaction paid:", err);
    setStatus("We couldn't verify your payment automatically. We'll keep checking.", "error");
    // Keep disabled until verified; user can refresh if needed
  }
});
