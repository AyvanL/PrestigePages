// Admin Customer Management: list, view, edit, delete users from Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const tableEl = document.getElementById('customerTable');
const tableBody = document.querySelector('#customerTable tbody');
const searchInput = document.getElementById('searchInput');

// Modal elements
const modal = document.getElementById('customerModal');
const modalClose = modal?.querySelector('.close');
// View modal field refs (personal only)
const vEmail = document.getElementById('vEmail');
const vFirstName = document.getElementById('vFirstName');
const vLastName = document.getElementById('vLastName');
const vMobile = document.getElementById('vMobile');
const vHouseNo = document.getElementById('vHouseNo');
const vStreet = document.getElementById('vStreet');
const vBaranggay = document.getElementById('vBaranggay');
const vCity = document.getElementById('vCity');
const vProvince = document.getElementById('vProvince');
const vPostal = document.getElementById('vPostal');
const vAddress = document.getElementById('vAddress');
const closeViewBtn = document.getElementById('closeViewBtn');

// Edit modal elements
const editModal = document.getElementById('editUserModal');
const closeEditUser = document.getElementById('closeEditUser');
const editForm = document.getElementById('editUserForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');

const efirstName = document.getElementById('efirstName');
const elastName = document.getElementById('elastName');
const eemail = document.getElementById('eemail');
const emobile = document.getElementById('emobile');
const ehouseNo = document.getElementById('ehouseNo');
const estreet = document.getElementById('estreet');
const eBaranggay = document.getElementById('eBaranggay');
const ecity = document.getElementById('ecity');
const eprovince = document.getElementById('eprovince');
const epostal = document.getElementById('epostal');
let CURRENT_EDIT_UID = null;

// Simple state
let USERS = [];

// Admin modal elements
const adminModal = document.getElementById('adminModal');
const openAdminModalBtn = document.getElementById('openAdminModal');
const closeAdminModalBtn = document.getElementById('closeAdminModal');
const adminListBody = document.getElementById('adminList');
const adminUsernameInput = document.getElementById('adminUsername');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const createAdminBtn = document.getElementById('createAdminBtn');

function showMessageRow(text, cls = '') {
  if (!tableBody) return;
  const colSpan = (tableEl?.querySelectorAll('thead th')?.length) || 6;
  tableBody.innerHTML = `<tr class="${cls}"><td colspan="${colSpan}" style="text-align:center; padding:12px; color:#555;">${text}</td></tr>`;
}

function rowHtml(u) {
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  const email = u.email || '';
  const mobile = u.mobile || '';
  const suspended = !!u.suspended;
  const banBtnLabel = suspended ? 'Reactivate' : 'Ban';
  const banBtnClass = suspended ? 'reactivate-btn' : 'ban-btn';
  return `<tr data-uid="${u.id}">
    <td>${u.username || ''}</td>
    <td>${u.firstName || ''}</td>
    <td>${u.lastName || ''}</td>
    <td>${email}</td>
    <td>${mobile}</td>
    <td>
      <button class="view-btn" data-action="view">View</button>
      <button class="edit-btn" data-action="edit">Edit</button>
      <button class="delete-btn" data-action="delete">Delete</button>
      <button class="${banBtnClass}" data-action="ban-toggle" data-suspended="${suspended}">${banBtnLabel}</button>
    </td>
  </tr>`;
}

async function loadUsers() {
  showMessageRow('<i class="fas fa-spinner fa-spin"></i> Loading...', 'loading');
  try {
    const qy = query(collection(db, 'users'), orderBy('firstName'));
    const snap = await getDocs(qy);
    USERS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (USERS.length === 0) {
      showMessageRow('No customers found.', 'empty');
    } else {
      render(USERS);
    }
  } catch (err) {
    console.error('Failed to load users', err);
    showMessageRow('Failed to load customers.', 'error');
  }
}

function render(list) {
  if (!tableBody) return;
  tableBody.innerHTML = list.map(rowHtml).join('');
}

function formatAddress(u) {
  const parts = [u.houseNo, u.street, u.baranggay, u.city, u.province, u.postal].filter(Boolean);
  return parts.join(', ');
}

function openModal(user) {
  if (!modal) return;
  vEmail.textContent = user.email || '';
  vFirstName.textContent = user.firstName || '';
  vLastName.textContent = user.lastName || '';
  vMobile.textContent = user.mobile || '';
  vHouseNo.textContent = user.houseNo || '';
  vStreet.textContent = user.street || '';
  vBaranggay.textContent = user.baranggay || '';
  vCity.textContent = user.city || '';
  vProvince.textContent = user.province || '';
  vPostal.textContent = user.postal || '';
  vAddress.textContent = formatAddress(user);
  modal.style.display = 'block';
}

function closeModal() {
  if (modal) modal.style.display = 'none';
}

// Inline edit UI using prompt (minimal, avoids new modal)
async function handleEdit(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return alert('User not found');
  const data = snap.data();

  CURRENT_EDIT_UID = uid;
  efirstName.value = data.firstName || '';
  elastName.value = data.lastName || '';
  eemail.value = data.email || '';
  emobile.value = data.mobile || '';
  ehouseNo.value = data.houseNo || '';
  estreet.value = data.street || '';
  ebaranggay.value = data.baranggay || '';
  ecity.value = data.city || '';
  eprovince.value = data.province || '';
  epostal.value = data.postal || '';
  editModal.style.display = 'block';
}

async function handleDelete(uid) {
  if (!confirm('Delete this user? This will remove profile data but not their Auth account.')) return;
  await deleteDoc(doc(db, 'users', uid));
  await loadUsers();
}

// Events
searchInput?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = USERS.filter(u =>
    `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  );
  render(filtered);
});

tableBody?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const tr = btn.closest('tr');
  const uid = tr?.getAttribute('data-uid');
  if (!uid) return;

  const action = btn.getAttribute('data-action');
  const user = USERS.find(u => u.id === uid);
  if (!user) return;

  if (action === 'view') openModal(user);
  if (action === 'edit') handleEdit(uid);
  if (action === 'delete') handleDelete(uid);
  if (action === 'ban-toggle') handleBanToggle(user, btn);
});

modalClose?.addEventListener('click', closeModal);
window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
closeViewBtn?.addEventListener('click', closeModal);

// Edit modal events
closeEditUser?.addEventListener('click', () => { if (editModal) editModal.style.display = 'none'; });
cancelEditBtn?.addEventListener('click', () => { if (editModal) editModal.style.display = 'none'; });
editForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!CURRENT_EDIT_UID) return;
  const userRef = doc(db, 'users', CURRENT_EDIT_UID);
  await updateDoc(userRef, {
    firstName: efirstName.value,
    lastName: elastName.value,
    mobile: emobile.value,
    houseNo: ehouseNo.value,
    street: estreet.value,
    baranggay: ebaranggay.value,
    city: ecity.value,
    province: eprovince.value,
    postal: epostal.value,
  });
  editModal.style.display = 'none';
  await loadUsers();
});

window.addEventListener('click', (e) => { if (e.target === editModal) editModal.style.display = 'none'; });

async function handleBanToggle(user, btnEl){
  try {
    const currentlySuspended = !!user.suspended;
    const confirmMsg = currentlySuspended ? 'Reactivate this account?' : 'Ban (suspend) this account? The user will be prevented from logging in.';
    if (!confirm(confirmMsg)) return;
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      suspended: !currentlySuspended,
      suspendedAt: !currentlySuspended ? new Date() : null,
      reactivatedAt: currentlySuspended ? new Date() : null
    });
    // Update local state & button inline without full reload
    user.suspended = !currentlySuspended;
    btnEl.textContent = user.suspended ? 'Reactivate' : 'Ban';
    btnEl.setAttribute('data-suspended', String(!!user.suspended));
    btnEl.className = user.suspended ? 'reactivate-btn' : 'ban-btn';
  } catch (err){
    alert('Failed to toggle suspension');
    console.error(err);
  }
}

// Kick off
loadUsers();

// ---------- Admin modal logic ----------
function openAdminModal(){ if (adminModal) { adminModal.style.display = 'flex'; loadAdmins(); } }
function closeAdminModal(){ if (adminModal) adminModal.style.display = 'none'; }
openAdminModalBtn?.addEventListener('click', openAdminModal);
closeAdminModalBtn?.addEventListener('click', closeAdminModal);
window.addEventListener('click', (e)=>{ if (e.target === adminModal) closeAdminModal(); });

async function loadAdmins(){
  if (!adminListBody) return;
  adminListBody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#777;">Loading...</td></tr>';
  try {
    const snap = await getDocs(query(collection(db,'users')));
    const admins = [];
    snap.forEach(d=>{ const u = { id: d.id, ...d.data() }; if ((u.role||'').toLowerCase()==='admin') admins.push(u); });
    if (!admins.length){
      adminListBody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#777;">No admin accounts found.</td></tr>';
    } else {
      adminListBody.innerHTML = admins.map(a=>{
        const suspended = !!a.suspended;
        const banLabel = suspended ? 'Reactivate' : 'Ban';
        return `
        <tr data-uid="${a.id}">
          <td style="padding:10px; border-bottom:1px solid #eee;">${a.username || ''}</td>
          <td style="padding:10px; border-bottom:1px solid #eee;">${a.email||''}</td>
          <td style="padding:10px; border-bottom:1px solid #eee; display:flex; gap:6px; flex-wrap:wrap;">
            <button class="admin-ban" data-action="ban">${banLabel}</button>
            <button class="admin-edit" data-action="edit">Edit</button>
            <button class="admin-delete" data-action="delete">Delete</button>
          </td>
        </tr>`;
      }).join('');
    }
  } catch(err){
    console.error('loadAdmins error', err);
    adminListBody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#b91c1c;">Failed to load admins.</td></tr>';
  }
}

// Note: Creating Auth accounts requires Firebase Auth admin or client-side createUserWithEmailAndPassword.
// Here we only create a Firestore user doc with role=admin as requested. Use an existing user UID or email as key.
createAdminBtn?.addEventListener('click', async ()=>{
  const username = adminUsernameInput?.value?.trim();
  const email = adminEmailInput?.value?.trim();
  const password = adminPasswordInput?.value || '';
  if (!username || !email || !password){
    alert('Enter username, email and password for the admin account.');
    return;
  }
  try {
    // Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    // Create Firestore profile with role=admin under UID
    await setDoc(doc(db,'users', uid), {
      email,
      username,
      role: 'admin',
      createdAt: new Date(),
    }, { merge: true });
    alert('Admin account created successfully.');
    adminUsernameInput.value = '';
    adminEmailInput.value = '';
    adminPasswordInput.value = '';
    await loadAdmins();
  } catch(err){
    console.error('create admin error', err);
    let msg = 'Failed to create admin account.';
    if (err?.code === 'auth/email-already-in-use') msg = 'Email already in use.';
    if (err?.code === 'auth/invalid-email') msg = 'Invalid email.';
    if (err?.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
    alert(msg);
  }
});

// Admin actions: ban/reactivate, edit (username/email), delete
adminListBody?.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button');
  if (!btn) return;
  const tr = btn.closest('tr');
  const uid = tr?.getAttribute('data-uid');
  if (!uid) return;
  const action = btn.getAttribute('data-action');
  try {
    if (action === 'ban'){
      const uref = doc(db,'users', uid);
      const snap = await getDoc(uref);
      if (!snap.exists()) return alert('User not found');
      const cur = snap.data();
      const suspended = !!cur.suspended;
      const ok = confirm(suspended ? 'Reactivate this admin?' : 'Ban (suspend) this admin?');
      if (!ok) return;
      await updateDoc(uref, { suspended: !suspended, suspendedAt: !suspended ? new Date() : null });
      await loadAdmins();
    }
    if (action === 'edit'){
      const newEmail = prompt('New email (leave blank to keep current):');
      const newUsername = prompt('New username (leave blank to keep current):');
      const delta = {};
      if (newEmail) delta.email = newEmail;
      if (newUsername) delta.username = newUsername;
      if (Object.keys(delta).length){ await updateDoc(doc(db,'users', uid), delta); }
      await loadAdmins();
    }
    if (action === 'delete'){
      if (!confirm('Delete this admin profile? This does not remove their Auth account.')) return;
      await deleteDoc(doc(db,'users', uid));
      await loadAdmins();
    }
  } catch(err){
    console.error('Admin action error', err);
    alert('Action failed.');
  }
});
