import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize (idempotent if already initialized elsewhere)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sidebar bottom logout button
document.addEventListener('click', async (e) => {
  const a = e.target.closest('#adminLogoutBtn');
  if (!a) return;
  e.preventDefault();
  try {
    await signOut(auth);
    localStorage.removeItem('pendingEmail');
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Logout failed', err);
    alert('Failed to log out.');
  }
});

// Auto-logout if current user becomes suspended
let SUSPEND_ALERTED = false;
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  // Initial check in case the doc already has suspended=true
  try {
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data()?.suspended) {
      if (!SUSPEND_ALERTED) { SUSPEND_ALERTED = true; alert('Your account has been suspended.'); }
      await signOut(auth).catch(()=>{});
      localStorage.removeItem('pendingEmail');
      window.location.href = 'index.html';
      return;
    }
  } catch (err) {
    console.warn('Initial suspension check failed', err);
  }
  // Live listener to catch future bans
  onSnapshot(userRef, (snap) => {
    try {
      const data = snap.data() || {};
      if (data.suspended) {
        if (!SUSPEND_ALERTED) { SUSPEND_ALERTED = true; alert('Your account has been suspended.'); }
        signOut(auth).finally(() => {
          localStorage.removeItem('pendingEmail');
          window.location.href = 'index.html';
        });
      }
    } catch (err) {
      console.warn('Suspend listener error', err);
    }
  });
});
