import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
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

// Load all users' transactions
async function loadOrders() {
  const orderList = document.getElementById('order-list');
  orderList.innerHTML = '';
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
        const createdAt = formatDate(tx.createdAt);

        const tr = document.createElement('tr');
        const delivDisplay = (deliv && deliv[0]) ? deliv[0].toUpperCase() + deliv.slice(1).toLowerCase() : 'Pending';
        tr.innerHTML = `
          <td>${txId}</td>
          <td>${name}</td>
          <td>${createdAt}</td>
          <td class="status-text" style="color:#111; font-weight:400;">${delivDisplay}</td>
          <td>
            <button class="change-status" data-uid="${uid}" data-txid="${txId}">Change</button>
            <div class="status-panel" style="max-height:0; overflow:hidden; transition:max-height .25s ease; margin-top:6px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; box-shadow:0 8px 20px rgba(0,0,0,.08);">
              <div class="status-options" style="display:flex; flex-direction:column; gap:6px; padding:8px;">
                <button class="status-option" data-value="Pending" style="background:#fff; color:#111; font-weight:400; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; text-align:left; cursor:pointer;">Pending</button>
                <button class="status-option" data-value="Processing" style="background:#fff; color:#111; font-weight:400; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; text-align:left; cursor:pointer;">Processing</button>
                <button class="status-option" data-value="Shipped" style="background:#fff; color:#111; font-weight:400; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; text-align:left; cursor:pointer;">Shipped</button>
                <button class="status-option" data-value="Delivered" style="background:#fff; color:#111; font-weight:400; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; text-align:left; cursor:pointer;">Delivered</button>
              </div>
            </div>
            <button class="view-btn" data-uid="${uid}" data-txid="${txId}">View</button>
          </td>
        `;
        rows.push({ tr, createdAtVal: createdAt });
      });
    }

    // Sort by date desc
    rows.sort((a,b) => new Date(b.createdAtVal).getTime() - new Date(a.createdAtVal).getTime());
    rows.forEach(r => orderList.appendChild(r.tr));

    // Events for Change and option click (slide down panel)
    orderList.addEventListener('click', async (e) => {
      // Toggle panel
      const changeBtn = e.target.closest('.change-status');
      if (changeBtn) {
        const td = changeBtn.parentElement;
        const panel = td.querySelector('.status-panel');
        if (!panel) return;
        const isOpen = panel.style.maxHeight && panel.style.maxHeight !== '0px';
        if (isOpen) {
          panel.style.maxHeight = '0px';
        } else {
          // close other open panels in this row to avoid stacking heights (optional)
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
        return;
      }

      // Click on option
      const opt = e.target.closest('.status-option');
      if (opt) {
        const newVal = opt.getAttribute('data-value');
        const tr = opt.closest('tr');
        const statusCell = tr.querySelector('.status-text');
        const uid = tr.querySelector('.change-status')?.getAttribute('data-uid');
        const txid = tr.querySelector('.change-status')?.getAttribute('data-txid');
        const panel = tr.querySelector('.status-panel');
        if (!uid || !txid || !statusCell) return;
        try {
          await updateDoc(doc(db, 'users', uid, 'transactions', txid), { delivstatus: newVal });
          statusCell.textContent = newVal;
        } catch (err) {
          console.error('Failed to update delivery status', err);
          alert('Failed to update delivery status');
        } finally {
          if (panel) panel.style.maxHeight = '0px';
        }
      }
    });
  } catch (err) {
    console.error('Error loading orders', err);
    alert('Failed to load orders');
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
