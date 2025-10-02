// Admin Transaction Management: list, search, view transactions from Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const tableBody = document.querySelector('#transactionTable tbody');
const searchInput = document.getElementById('searchTransaction');

// Modal Elements
const modal = document.getElementById('transactionModal');
const closeBtn = modal?.querySelector('.close');
const modalTxnId = document.getElementById('modalTxnId');
const modalCustomer = document.getElementById('modalCustomer');
const modalOrder = document.getElementById('modalOrder');
const modalAmount = document.getElementById('modalAmount');
const modalDate = document.getElementById('modalDate');
const modalStatus = document.getElementById('modalStatus');

// State
let TRANSACTIONS = [];

// Generate HTML row
function rowHtml(txn) {
  return `<tr data-id="${txn.id}">
    <td>${txn.id}</td>
    <td>${txn.customerName || ''}</td>
    <td>${txn.orderDetails || ''}</td>
    <td>${txn.amount || ''}</td>
    <td>${txn.date || ''}</td>
    <td>${txn.status || ''}</td>
    <td><button class="view-btn" data-action="view">View</button></td>
  </tr>`;
}

// Fetch transactions from Firestore
async function loadTransactions() {
  const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  TRANSACTIONS = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  render(TRANSACTIONS);
}

// Render transaction list
function render(list) {
  if (!tableBody) return;
  tableBody.innerHTML = list.map(rowHtml).join('');
}

// Search filtering
searchInput?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = TRANSACTIONS.filter(txn =>
    (txn.customerName || '').toLowerCase().includes(q) ||
    (txn.orderDetails || '').toLowerCase().includes(q) ||
    (txn.status || '').toLowerCase().includes(q)
  );
  render(filtered);
});

// View modal
function openModal(txn) {
  if (!modal) return;
  modalTxnId.textContent = txn.id;
  modalCustomer.textContent = txn.customerName || '';
  modalOrder.textContent = txn.orderDetails || '';
  modalAmount.textContent = txn.amount || '';
  modalDate.textContent = txn.date || '';
  modalStatus.textContent = txn.status || '';
  modal.style.display = 'block';
}

function closeModal() {
  if (modal) modal.style.display = 'none';
}

// Table button events
tableBody?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const tr = btn.closest('tr');
  const id = tr?.getAttribute('data-id');
  if (!id) return;

  const txn = TRANSACTIONS.find(t => t.id === id);
  if (!txn) return;

  openModal(txn);
});

// Close modal
closeBtn?.addEventListener('click', closeModal);
window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// Kick off
loadTransactions().catch(err => {
  console.error('Failed to load transactions', err);
  alert('Failed to load transactions');
});
    