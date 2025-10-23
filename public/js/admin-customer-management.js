// Admin Customer Management: list, view, edit, delete users from Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
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
// Note: HTML id is 'ebaranggay' (lowercase b)
const eBaranggay = document.getElementById('ebaranggay');
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
// Audit UI
const openAuditTrailBtn = document.getElementById('openAuditTrailBtn');
const auditModal = document.getElementById('auditModal');
const closeAuditModalBtn = document.getElementById('closeAuditModal');
const auditAdminFilter = document.getElementById('auditAdminFilter');
const auditTableBody = document.getElementById('auditTableBody');

let CURRENT_ADMIN = null; // { uid, email, username }

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const uref = doc(db, 'users', user.uid);
  const snap = await getDoc(uref).catch(()=>null);
  const udata = snap?.exists() ? snap.data() : {};
  CURRENT_ADMIN = { uid: user.uid, email: user.email || udata.email || '', username: udata.username || '' };
});

async function logAudit(entry){
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
      details: entry?.details || null,
      createdAt: serverTimestamp(),
      clientTime: new Date(),
    };
    await addDoc(collection(db, 'admin_audit'), payload);
  } catch (e) {
    console.warn('logAudit failed', e);
  }
}

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
  eBaranggay.value = data.baranggay || '';
  ecity.value = data.city || '';
  eprovince.value = data.province || '';
  epostal.value = data.postal || '';
  editModal.style.display = 'block';
}

async function handleDelete(uid) {
  if (!confirm('Delete this user? This will remove profile data but not their Auth account.')) return;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef).catch(()=>null);
  const before = snap?.exists() ? snap.data() : null;
  await deleteDoc(userRef);
  await logAudit({ action: 'delete_user', targetUserId: uid, details: before ? { before } : null });
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
  const snap = await getDoc(userRef).catch(()=>null);
  const cur = snap?.exists() ? snap.data() : {};
  const before = {
    firstName: cur.firstName || '',
    lastName: cur.lastName || '',
    mobile: cur.mobile || '',
    houseNo: cur.houseNo || '',
    street: cur.street || '',
    baranggay: cur.baranggay || '',
    city: cur.city || '',
    province: cur.province || '',
    postal: cur.postal || '',
  };
  const after = {
    firstName: efirstName.value,
    lastName: elastName.value,
    mobile: emobile.value,
    houseNo: ehouseNo.value,
    street: estreet.value,
    baranggay: eBaranggay.value,
    city: ecity.value,
    province: eprovince.value,
    postal: epostal.value,
  };
  await updateDoc(userRef, after);
  await logAudit({ action: 'edit_user', targetUserId: CURRENT_EDIT_UID, targetEmail: eemail?.value || null, details: { before, after } });
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
    const before = { suspended: !!user.suspended };
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
    const after = { suspended: !!user.suspended };
    await logAudit({ action: user.suspended ? 'ban_user' : 'reactivate_user', targetUserId: user.id, targetEmail: user.email || null, targetUsername: user.username || null, details: { before, after } });
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
    // Populate audit filter dropdown
    if (auditAdminFilter) {
      const options = [ { value: '', label: 'All admins' }, ...admins.map(a => ({ value: a.id, label: a.username || a.email || a.id })) ];
      auditAdminFilter.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
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
    await logAudit({ action: 'create_admin', targetUserId: uid, targetEmail: email, targetUsername: username });
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
      const before = { suspended };
      await updateDoc(uref, { suspended: !suspended, suspendedAt: !suspended ? new Date() : null });
      const after = { suspended: !suspended };
      await logAudit({ action: !suspended ? 'ban_admin' : 'reactivate_admin', targetUserId: uid, targetEmail: cur.email || null, targetUsername: cur.username || null, details: { before, after } });
      await loadAdmins();
    }
    if (action === 'edit'){
      const snap = await getDoc(doc(db,'users', uid));
      if (!snap.exists()) return alert('User not found');
      const cur = snap.data();
      const before = { email: cur.email || null, username: cur.username || null };
      const newEmail = prompt('New email (leave blank to keep current):');
      const newUsername = prompt('New username (leave blank to keep current):');
      const delta = {};
      if (newEmail) delta.email = newEmail;
      if (newUsername) delta.username = newUsername;
      if (Object.keys(delta).length){
        await updateDoc(doc(db,'users', uid), delta);
        const after = { email: delta.email ?? before.email, username: delta.username ?? before.username };
        await logAudit({ action: 'edit_admin', targetUserId: uid, targetEmail: after.email || null, targetUsername: after.username || null, details: { before, after } });
      }
      await loadAdmins();
    }
    if (action === 'delete'){
      if (!confirm('Delete this admin profile? This does not remove their Auth account.')) return;
      const uref = doc(db,'users', uid);
      const snap = await getDoc(uref).catch(()=>null);
      const before = snap?.exists() ? snap.data() : null;
      await deleteDoc(uref);
      await logAudit({ action: 'delete_admin_profile', targetUserId: uid, details: before ? { before } : null });
      await loadAdmins();
    }
  } catch(err){
    console.error('Admin action error', err);
    alert('Action failed.');
  }
});

// ---------- Audit Trail modal logic ----------
function openAuditModal(){ if (auditModal) { auditModal.style.display = 'flex'; loadAuditTrail(); } }
function closeAuditModal(){ if (auditModal) auditModal.style.display = 'none'; }
openAuditTrailBtn?.addEventListener('click', openAuditModal);
closeAuditModalBtn?.addEventListener('click', closeAuditModal);
window.addEventListener('click', (e)=>{ if (e.target === auditModal) closeAuditModal(); });

let AUDIT_CACHE = [];
function renderAuditRows(rows){
  if (!auditTableBody) return;
  if (!rows.length) {
    auditTableBody.innerHTML = '<tr><td colspan="4" style="padding:12px; text-align:center; color:#777;">No audit entries.</td></tr>';
    return;
  }
  const formatValue = (v) => {
    if (v === undefined) return '—';
    if (v === null) return 'null';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  const displayName = (obj, r) => {
    if (!obj || typeof obj !== 'object') {
      const t = r?.targetUsername || r?.targetEmail || r?.resourceId || r?.targetUserId || '';
      return t || 'item';
    }
    const fullName = (obj.firstName || obj.lastName) ? `${obj.firstName || ''} ${obj.lastName || ''}`.trim() : '';
    return obj.title || obj.name || obj.username || obj.email || fullName || r?.resourceId || r?.targetUserId || 'item';
  };
  const formatChanges = (r) => {
    const d = r.details || {};
    const before = d.before ?? null;
    const after = d.after ?? null;
    const action = (r.action || '').toLowerCase();

    // Special cases: add/create/delete concise labels
    if ((/delete|remove/).test(action)) {
      const label = displayName(before, r);
      return `<span style="color:#b91c1c; font-weight:600;">Deleted</span>: ${label}`;
    }
    if ((/add|create/).test(action)) {
      const label = displayName(after, r) || displayName(null, r);
      return `<span style="color:#166534; font-weight:600;">Added</span>: ${label}`;
    }

    if (before || after) {
      // Build a header label for edits/updates
      const headerLines = [];
      const lowerAct = action;
      const isUpdate = (/edit|update|change/).test(lowerAct);
      if (isUpdate) {
        // Prefer name/title from 'after', else 'before'
        const label = displayName(after || before || {}, r);
        // Transaction/order id hint when available
        if (r.resourceId && (/order|transaction|status/).test(lowerAct)) {
          headerLines.push(`<div><strong>Transaction:</strong> ${r.resourceId}</div>`);
        } else {
          headerLines.push(`<div><strong>Item:</strong> ${label}</div>`);
        }
      }

      const SKIP = new Set(['updatedAt','createdAt','updated_at','created_at']);
      const keys = new Set([...(before ? Object.keys(before) : []), ...(after ? Object.keys(after) : [])]);
      const lines = [];
      let count = 0;
      for (const k of keys) {
        if (SKIP.has(k)) continue;
        const b = before ? before[k] : undefined;
        const a = after ? after[k] : undefined;
        if (JSON.stringify(b) !== JSON.stringify(a)) {
          lines.push(`<div><strong>${k}:</strong> <span style="color:#b91c1c;">${formatValue(b)}</span> → <span style="color:#166534;">${formatValue(a)}</span></div>`);
          count++;
          if (count >= 6) { lines.push('<div>…</div>'); break; }
        }
      }
      if (!lines.length) return '<span style="color:#666;">No field changes</span>';
      return (headerLines.join('') + lines.join(''));
    }
    // Fallbacks
    if (d && Object.keys(d).length) {
      const safe = JSON.stringify(d).slice(0, 300);
      return `<code style="font-size:12px; color:#444;">${safe}${safe.length===300?'…':''}</code>`;
    }
    const targetLabel = r.targetUsername || r.targetEmail || r.targetUserId || r.resourceId || '—';
    return targetLabel;
  };

  auditTableBody.innerHTML = rows.map(r => {
    const time = r.createdAt?.toDate ? r.createdAt.toDate() : (r.clientTime ? new Date(r.clientTime) : null);
    const timeStr = time ? time.toLocaleString() : '';
    const adminLabel = r.adminUsername || r.adminEmail || r.adminId || '—';
    const action = r.action || '—';
    const changes = formatChanges(r);
    return `<tr>
      <td style="padding:10px; border-bottom:1px solid #eee;">${timeStr}</td>
      <td style="padding:10px; border-bottom:1px solid #eee;">${adminLabel}</td>
      <td style="padding:10px; border-bottom:1px solid #eee;">${action}</td>
      <td style="padding:10px; border-bottom:1px solid #eee;">${changes}</td>
    </tr>`;
  }).join('');
}

async function loadAuditTrail(){
  if (!auditTableBody) return;
  auditTableBody.innerHTML = '<tr><td colspan="4" style="padding:12px; text-align:center; color:#777;">Loading...</td></tr>';
  try {
    const qy = query(collection(db, 'admin_audit'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qy);
    AUDIT_CACHE = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyAuditFilter();
  } catch (e) {
    console.error('loadAuditTrail failed', e);
    auditTableBody.innerHTML = '<tr><td colspan="4" style="padding:12px; text-align:center; color:#b91c1c;">Failed to load audit trail.</td></tr>';
  }
}

function applyAuditFilter(){
  const adminId = auditAdminFilter?.value || '';
  const rows = adminId ? AUDIT_CACHE.filter(r => r.adminId === adminId) : AUDIT_CACHE;
  renderAuditRows(rows);
}

auditAdminFilter?.addEventListener('change', applyAuditFilter);
