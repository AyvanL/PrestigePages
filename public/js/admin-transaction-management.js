// Admin Transaction Management: list, search, view transactions from Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
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
const modalItems = document.getElementById('modalItems');
const modalItemsWrap = document.getElementById('modalItemsWrap');

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

async function aggregateTransactions() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const rows = [];
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data() || {};
    const customerName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    const txSnap = await getDocs(query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt','desc')));
    txSnap.forEach((d) => {
      const data = d.data();
      const pay = normalizeStatus(data.status);
      const deliv = normalizeStatus(data.delivstatus || data.deliveryStatus || data.fulfillmentStatus);
      const isPaid = (pay === 'paid' || pay === 'complete' || pay === 'completed' || pay === 'success');
      const isDelivered = (deliv === 'delivered' || deliv === 'refund-rejected');
      // Exclude any refunded transactions completely
      if (deliv === 'refunded') return;
      // Only show paid + delivered
      if (!(isPaid && isDelivered)) return;
      const created = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      const dateStr = created ? created.toISOString().slice(0,10) : '';
      const amountStr = typeof data.total === 'number' ? `₱${data.total.toLocaleString()}` : '';
      rows.push({
        id: d.id,
        customerName: customerName || userData.email || uid,
        orderDetails: d.id,
        amount: amountStr,
        date: dateStr,
        status: `${(data.status || 'paid').toString().toLowerCase()} / ${(data.delivstatus || 'delivered').toString().toLowerCase()}`,
        _uid: uid,
      });
    });
  }
  return rows.sort((a,b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

let txAdminUnsub = null;
function initRealtimeTransactions() {
  showMessageRow('<i class="fas fa-spinner fa-spin"></i> Loading...', 'loading');
  if (txAdminUnsub) { txAdminUnsub(); txAdminUnsub = null; }
  // Subscribe to users collection; on any change re-aggregate completed/refunded transactions.
  txAdminUnsub = onSnapshot(collection(db, 'users'), async () => {
    try {
      const rows = await aggregateTransactions();
      TRANSACTIONS = rows;
      if (!rows.length) {
        showMessageRow('No transactions found.', 'empty');
      } else {
        render(rows);
      }
    } catch (e) {
      console.error('Realtime transactions refresh failed', e);
      showMessageRow('Failed to load transactions.', 'error');
    }
  }, (err) => {
    console.error('Users snapshot failed', err);
    showMessageRow('Realtime subscription error.', 'error');
  });
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
async function openModal(txn) {
  if (!modal) return;
  modalTxnId.textContent = txn.id;
  modalCustomer.textContent = txn.customerName || '';
  modalOrder.textContent = txn.orderDetails || '';
  modalAmount.textContent = txn.amount || '';
  modalDate.textContent = txn.date || '';
  modalStatus.textContent = txn.status || '';

  if (modalItems) {
    modalItems.innerHTML = '<li style="font-size:13px; color:#666;">Loading items...</li>';
  }

  try {
    // Attempt to read from top-level transactions first (if mirror exists)
    let data = null;
    try {
      const topSnap = await getDoc(doc(db,'transactions', txn.id));
      if (topSnap.exists()) data = topSnap.data();
    } catch {}
    // Fallback: nested user transaction if we have _uid
    if (!data && txn._uid) {
      try {
        const nested = await getDoc(doc(db,'users', txn._uid, 'transactions', txn.id));
        if (nested.exists()) data = nested.data();
      } catch {}
    }
    const itemsArr = Array.isArray(data?.items) ? data.items : [];
    if (!itemsArr.length) {
      if (modalItems) modalItems.innerHTML = '<li style="font-size:13px; color:#666;">No items recorded.</li>';
    } else {
      modalItems.innerHTML = itemsArr.map(it => {
        const title = (it.title||'Untitled');
        const author = it.author ? `by ${it.author}` : '';
        const qty = it.qty || 1;
        const price = typeof it.price === 'number' ? `₱${it.price.toLocaleString()}` : '';
        const cover = it.cover || 'https://via.placeholder.com/48x72?text=No+Cover';
        return `<li style="display:flex; gap:10px; align-items:center; padding:6px 0; border-bottom:1px solid #eee;">
            <img src="${cover}" alt="" style="width:48px; height:72px; object-fit:cover; border-radius:6px; background:#f5f5f5;" />
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600;">${title}</div>
              <div style="font-size:12px; color:#555;">${author}</div>
              <div style="font-size:12px; color:#777;">Qty: ${qty}</div>
            </div>
            <div style="font-weight:600; white-space:nowrap;">${price}</div>
          </li>`;
      }).join('');
    }
  } catch (e) {
    if (modalItems) modalItems.innerHTML = '<li style="font-size:13px; color:#c00;">Failed to load items.</li>';
    console.error('Load items failed', e);
  }

  if (modalItemsWrap) modalItemsWrap.style.display = '';
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

// Kick off realtime
initRealtimeTransactions();
    