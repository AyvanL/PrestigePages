import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Singleton Firebase init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let CURRENT_ADMIN = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { CURRENT_ADMIN = null; return; }
  let email = user.email || '';
  let username = '';
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const u = snap.data() || {};
      email = email || u.email || '';
      username = u.username || '';
    }
  } catch {}
  CURRENT_ADMIN = { uid: user.uid, email, username };
});

export async function logAudit(entry) {
  try {
    const admin = CURRENT_ADMIN || {};
    const payload = {
      adminId: admin.uid || null,
      adminEmail: admin.email || null,
      adminUsername: admin.username || null,
      action: entry?.action || 'unknown',
      targetUserId: entry?.targetUserId || null,
      targetEmail: entry?.targetEmail || null,
      targetUsername: entry?.targetUsername || null,
      targetResource: entry?.targetResource || null, // e.g., 'book', 'order', 'content:hero', 'inquiry'
      resourceId: entry?.resourceId || null,        // e.g., productId, txid, docId
      details: entry?.details || null,
      createdAt: serverTimestamp(),
      clientTime: new Date(),
    };
    await addDoc(collection(db, 'admin_audit'), payload);
  } catch (e) {
    console.warn('logAudit failed', e);
  }
}
