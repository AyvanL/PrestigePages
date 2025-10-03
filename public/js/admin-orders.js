import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function formatDate(ts) {
  try {
    if (!ts) return '';
    if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    if (typeof ts === 'number') return new Date(ts).toLocaleString();
    return String(ts);
  } catch { return ''; }
}

// Modal refs
let modalCtx = { uid: null, txid: null };
const statusModal = document.getElementById('statusModal');
const statusDeliverySel = document.getElementById('statusDelivery');
const statusPaymentSel = document.getElementById('statusPayment');
const statusCancelBtn = document.getElementById('statusCancelBtn');
const statusSaveBtn = document.getElementById('statusSaveBtn');

statusCancelBtn?.addEventListener('click', () => { if (statusModal) statusModal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === statusModal) statusModal.style.display = 'none'; });

// Load all users' transactions
async function loadOrders() {
  const orderList = document.getElementById('order-list');
  orderList.innerHTML = '<tr><td colspan="7" style="padding:12px; text-align:center; color:#555;">Loading...</td></tr>';
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const rows = [];
    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const udata = userDoc.data() || {};
      const name = `${(udata.firstName||'').trim()} ${(udata.lastName||'').trim()}`.trim() || udata.email || uid;
      const txSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
      txSnap.forEach((txDoc) => {
        const tx = txDoc.data() || {};
        const txId = txDoc.id;
  const deliv = tx.delivstatus || 'pending';
  const payMethod = tx.paymentMethod || tx.payment || tx.payment_type || '';
  let payRaw = (tx.status || '').toString().toLowerCase();
  const payStatus = (payRaw === 'paid') ? 'paid' : (payRaw === 'failed' ? 'failed' : 'unpaid');
        const createdAt = formatDate(tx.createdAt);

        const tr = document.createElement('tr');
        const delivDisplay = (deliv && deliv[0]) ? deliv[0].toUpperCase() + deliv.slice(1).toLowerCase() : 'Pending';
        tr.innerHTML = `
          <td>${txId}</td>
          <td>${name}</td>
          <td>${createdAt}</td>
          <td>${payMethod}</td>
          <td style="text-transform:capitalize;">${payStatus}</td>
          <td class="status-text" style="color:#111; font-weight:400;">${delivDisplay}</td>
          <td>
            <button class="open-status" data-uid="${uid}" data-txid="${txId}">Change</button>
            <button class="delete-order" data-uid="${uid}" data-txid="${txId}">Delete</button>
            <button class="view-btn" data-uid="${uid}" data-txid="${txId}">View</button>
          </td>
        `;
        rows.push({ tr, createdAtVal: createdAt });
      });
    }

    // Sort by date desc
    rows.sort((a,b) => new Date(b.createdAtVal).getTime() - new Date(a.createdAtVal).getTime());
    orderList.innerHTML = '';
    if (rows.length === 0) {
      orderList.innerHTML = '<tr><td colspan="7" style="padding:12px; text-align:center; color:#777;">No orders found.</td></tr>';
      return;
    }
    rows.forEach(r => orderList.appendChild(r.tr));

    // Events for open status modal and delete
    orderList.addEventListener('click', async (e) => {
      const openBtn = e.target.closest('.open-status');
      if (openBtn) {
        const uid = openBtn.getAttribute('data-uid');
        const txid = openBtn.getAttribute('data-txid');
        // Pre-fill current values from row
        const tr = openBtn.closest('tr');
        const delivText = tr.querySelector('.status-text')?.textContent?.trim().toLowerCase() || 'pending';
  const payText = tr.children[4]?.textContent?.trim().toLowerCase() || 'unpaid';
        if (statusDeliverySel) statusDeliverySel.value = delivText;
        if (statusPaymentSel) statusPaymentSel.value = payText;
        modalCtx = { uid, txid };
        if (statusModal) statusModal.style.display = 'block';
        return;
      }

      const delBtn = e.target.closest('.delete-order');
      if (delBtn) {
        const uid = delBtn.getAttribute('data-uid');
        const txid = delBtn.getAttribute('data-txid');
        if (!uid || !txid) return;
        const ok = confirm('Delete this order? This cannot be undone.');
        if (!ok) return;
        try {
          await deleteDoc(doc(db, 'users', uid, 'transactions', txid));
          // Remove row from UI
          delBtn.closest('tr')?.remove();
        } catch (err) {
          console.error('Failed to delete order', err);
          alert('Failed to delete order');
        }
      }
    });
  } catch (err) {
    console.error('Error loading orders', err);
    orderList.innerHTML = '<tr><td colspan="7" style="padding:12px; text-align:center; color:#b91c1c;">Failed to load orders.</td></tr>';
  }
}

// View Order Details (fetch the transaction)
async function viewOrderDetails(uid, txid) {
  try {
    const txDoc = await getDoc(doc(db, 'users', uid, 'transactions', txid));
    const tx = txDoc.data() || {};
    const orderDetailsContent = document.getElementById('orderDetailsContent');
    const itemsHtml = (tx.items || []).map(it => `<li>${it.title || it.name || 'Item'} x${it.qty || it.quantity || 1} - ₱${Number(it.price || 0).toFixed(2)}</li>`).join('');
    orderDetailsContent.innerHTML = `
      <p><strong>Total:</strong> ₱${Number(tx.total || 0).toFixed(2)}</p>
      <p><strong>Payment:</strong> ${tx.status || 'unknown'}</p>
      <p><strong>Delivery:</strong> ${tx.delivstatus || ''}</p>
      <p><strong>Created:</strong> ${formatDate(tx.createdAt)}</p>
      <ul>${itemsHtml}</ul>
    `;
    document.getElementById('orderDetailsModal').style.display = 'block';
  } catch (error) {
    console.error('Error fetching order details: ', error);
    alert('Failed to load order details.');
  }
}

// Close modal
document.getElementById('closeModalBtn').addEventListener('click', () => {
  document.getElementById('orderDetailsModal').style.display = 'none';
});

// Delegate view button clicks
document.getElementById('order-list').addEventListener('click', (e) => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;
  const uid = btn.getAttribute('data-uid');
  const txid = btn.getAttribute('data-txid');
  viewOrderDetails(uid, txid);
});

// Load on page
loadOrders();

// Save status changes
statusSaveBtn?.addEventListener('click', async () => {
  const { uid, txid } = modalCtx;
  if (!uid || !txid) { statusModal.style.display = 'none'; return; }
  const deliv = statusDeliverySel?.value || 'pending';
  const pay = statusPaymentSel?.value || 'unpaid';
  try {
    await updateDoc(doc(db, 'users', uid, 'transactions', txid), {
      delivstatus: deliv,
      status: pay,
    });
    // Update the row inline without full reload
    const row = document.querySelector(`button.open-status[data-uid='${uid}'][data-txid='${txid}']`)?.closest('tr');
    if (row) {
      row.querySelector('.status-text').textContent = deliv.charAt(0).toUpperCase() + deliv.slice(1);
      // Payment status is in 5th cell (0-based: 4)
      const payCell = row.children[4];
      if (payCell) payCell.textContent = pay;
    }
  } catch (err) {
    console.error('Failed to update status', err);
    alert('Failed to update status');
  } finally {
    if (statusModal) statusModal.style.display = 'none';
  }
});
