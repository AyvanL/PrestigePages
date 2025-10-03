// Admin Transaction Management: list, search, view transactions from Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const tableBody = document.querySelector('#transactionTable tbody');
const tableEl = document.getElementById('transactionTable');
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

function normalizeStatus(val) {
  return String(val || "").trim().toLowerCase();
}

// Helper: show a single full-width message row
function showMessageRow(text, cls = '') {
  if (!tableBody) return;
  const colSpan = (tableEl?.querySelectorAll('thead th')?.length) || 7;
  tableBody.innerHTML = `<tr class="${cls}"><td colspan="${colSpan}" style="text-align:center; padding:12px;">${text}</td></tr>`;
}

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

// Fetch transactions from Firestore across users and keep only completed
async function loadTransactions() {
  // show loading state
  showMessageRow('<i class="fas fa-spinner fa-spin"></i> Loading...', 'loading');

  // 1) List all users
  const usersSnap = await getDocs(collection(db, 'users'));
  const rows = [];

  // 2) For each user, load their transactions ordered by createdAt desc
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data() || {};
    const customerName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

    const txSnap = await getDocs(query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc')));
    txSnap.forEach((d) => {
      const data = d.data();
      const pay = normalizeStatus(data.status);
      const deliv = normalizeStatus(data.delivstatus || data.deliveryStatus || data.fulfillmentStatus);
  const isPaid = (pay === 'paid' || pay === 'complete' || pay === 'completed' || pay === 'success');
  const isDelivered = (deliv === 'delivered');
  const isRefunded = (deliv === 'refunded');
  const isRefundProcessing = (deliv === 'refund-processing');
  // Show Paid+Delivered (completed) and also any Refunded entries here
  if (!((isPaid && isDelivered) || isRefunded)) return;

      const created = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      const dateStr = created ? created.toISOString().slice(0, 10) : '';
      const amountStr = typeof data.total === 'number' ? `₱${data.total.toLocaleString()}` : '';

      rows.push({
        id: d.id,
        customerName: customerName || userData.email || uid,
        orderDetails: d.id, // using tx id as order id placeholder
        amount: amountStr,
        date: dateStr,
        status: `${(data.status || 'paid').toString().toLowerCase()} / ${(data.delivstatus || (isRefunded?'refunded':'delivered')).toString().toLowerCase()}`,
        _uid: uid,
      });
    });
  }

  // 3) Sort all rows by date desc (fallback to createdAt implicit order)
  TRANSACTIONS = rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (TRANSACTIONS.length === 0) {
    showMessageRow('No transactions found.', 'empty');
  } else {
    render(TRANSACTIONS);
  }
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
  showMessageRow('Failed to load transactions.', 'error');
});
    