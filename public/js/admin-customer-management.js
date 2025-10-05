// Admin Customer Management: list, view, edit, delete users from Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

function showMessageRow(text, cls = '') {
  if (!tableBody) return;
  const colSpan = (tableEl?.querySelectorAll('thead th')?.length) || 6;
  tableBody.innerHTML = `<tr class="${cls}"><td colspan="${colSpan}" style="text-align:center; padding:12px; color:#555;">${text}</td></tr>`;
}

function rowHtml(u) {
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  const email = u.email || '';
  const mobile = u.mobile || '';
  return `<tr data-uid="${u.id}">
    <td>${u.id}</td>
    <td>${u.firstName || ''}</td>
    <td>${u.lastName || ''}</td>
    <td>${email}</td>
    <td>${mobile}</td>
    <td>
      <button class="view-btn" data-action="view">View</button>
      <button class="edit-btn" data-action="edit">Edit</button>
      <button class="delete-btn" data-action="delete">Delete</button>
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

// Kick off
loadUsers();
