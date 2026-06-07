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

// Auto-logout if current user becomes suspended, or redirect if not admin
let SUSPEND_ALERTED = false;
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // No user logged in -> go to login
    window.location.href = 'login.html';
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      // User has no profile doc -> likely not an admin
      window.location.href = 'index.html';
      return;
    }

    const data = snap.data() || {};

    // Authorization check: Must have a role (admin)
    const role = (data.role || '').toLowerCase();
    if (!role) {
      // Logged in but not an admin -> go to user homepage
      window.location.href = 'homepage-logged.html';
      return;
    }

    // Suspension check
    if (data.suspended) {
      if (!SUSPEND_ALERTED) { SUSPEND_ALERTED = true; alert('Your account has been suspended.'); }
      await signOut(auth).catch(()=>{});
      localStorage.removeItem('pendingEmail');
      window.location.href = 'index.html';
      return;
    }
  } catch (err) {
    console.warn('Initial admin check failed', err);
    // If we can't verify, safer to kick to index
    // window.location.href = 'index.html';
  }

  // Live listener to catch future bans or role changes
  onSnapshot(userRef, (snap) => {
    try {
      const data = snap.data() || {};
      
      // If role removed while online
      if (!data.role) {
        window.location.href = 'homepage-logged.html';
        return;
      }

      if (data.suspended) {
        if (!SUSPEND_ALERTED) { SUSPEND_ALERTED = true; alert('Your account has been suspended.'); }
        signOut(auth).finally(() => {
          localStorage.removeItem('pendingEmail');
          window.location.href = 'index.html';
        });
      }
    } catch (err) {
      console.warn('Admin listener error', err);
    }
  });
});
