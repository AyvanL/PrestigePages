import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { logAudit } from './admin-audit.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const bodyEl = document.getElementById('returnTableBody');
const searchInput = document.getElementById('searchReturns');
const statusFilter = document.getElementById('statusFilter');
let RETURNS = []; // flattened per book row (refunded only)

async function loadReturns(){
  bodyEl.innerHTML = `<tr><td colspan="7" style="padding:14px; text-align:center; color:#666;">Loading...</td></tr>`;
  const usersSnap = await getDocs(collection(db,'users'));
  const rows = [];
  for (const u of usersSnap.docs){
    const uid = u.id;
    const txSnap = await getDocs(collection(db,'users', uid, 'transactions'));
    txSnap.forEach(d => {
      const t = d.data()||{};
      const status = (t.delivstatus||'').toLowerCase();
      if (status !== 'refunded') return; // only refunded
      const reason = t.refundReason || '(No reason)';
      const proofImg = Array.isArray(t.refundImages) && t.refundImages.length ? t.refundImages[0].dataUrl : '';
      (Array.isArray(t.items)? t.items: []).forEach(item => {
        rows.push({
          uid,
          txid: d.id,
          cover: item.cover || '',
          title: item.title || '',
            author: item.author || '',
          reason,
          proofImg,
          stock: (item.qty != null ? item.qty : 1)
        });
      });
    });
  }
  RETURNS = rows;
  renderTable();
}

function applyFilters(list){
  const term = (searchInput?.value||'').toLowerCase().trim();
  return list.filter(r => {
    if (!term) return true;
    return r.title.toLowerCase().includes(term) || r.author.toLowerCase().includes(term);
  });
}

function renderTable(){
  const list = applyFilters(RETURNS);
  if (list.length === 0){
    bodyEl.innerHTML = `<tr><td colspan="7" style="padding:14px; text-align:center; color:#666;">No refunded items.</td></tr>`;
    return;
  }
  bodyEl.innerHTML = list.map(r => {
    return `<tr data-uid="${r.uid}" data-txid="${r.txid}">
      <td>${r.cover ? `<img src="${r.cover}" alt="cover" style="width:40px; height:60px; object-fit:cover; border-radius:4px; background:#eee;" />` : ''}</td>
      <td>${r.title}</td>
      <td>${r.author}</td>
      <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.reason.replace(/"/g,'&quot;')}">${r.reason}</td>
      <td>${r.proofImg ? `<img src="${r.proofImg}" class="proof-thumb" alt="proof" style="width:50px;height:50px;object-fit:cover;border-radius:6px;cursor:pointer;" />` : '<span style="font-size:12px; color:#888;">None</span>'}</td>
      <td>${r.stock}</td>
      <td><button class="btn btn-sm delete-return" data-uid="${r.uid}" data-txid="${r.txid}"><i class="fa fa-trash"></i> Delete</button></td>
    </tr>`;
  }).join('');
}

searchInput?.addEventListener('input', renderTable);
// statusFilter no longer used for refunded-only view
if (statusFilter) statusFilter.style.display='none';

bodyEl.addEventListener('click', async (e) => {
  const proof = e.target.closest('.proof-thumb');
  if (proof){
    const tr = proof.closest('tr');
    if (!tr) return;
    const uid = tr.getAttribute('data-uid');
    const txid = tr.getAttribute('data-txid');
    if (!uid || !txid) return;
    const txSnap = await getDocs(collection(db,'users', uid, 'transactions'));
    txSnap.forEach(d => {
      if (d.id === txid){
        const data = d.data()||{}; const imgs = Array.isArray(data.refundImages)? data.refundImages: [];
        if (imgs.length){ const w = window.open(); if (w){ w.document.write(`<title>Proof Image</title><img src='${imgs[0].dataUrl}' style='max-width:100%;display:block;margin:0 auto;' />`); } }
      }
    });
    return;
  }
  const delBtn = e.target.closest('.delete-return');
  if (delBtn){
    const uid = delBtn.getAttribute('data-uid');
    const txid = delBtn.getAttribute('data-txid');
    if (!uid || !txid) return;
    if (!confirm('Delete this refunded transaction? This cannot be undone.')) return;
    try {
      const ref = doc(db,'users',uid,'transactions',txid);
      const beforeSnap = await getDoc(ref).catch(()=>null);
      const before = beforeSnap?.exists() ? beforeSnap.data() : null;
      await deleteDoc(ref);
      await logAudit({ action: 'delete_refund_record', targetResource: 'refund', resourceId: txid, targetUserId: uid, details: { before, after: null } });
      loadReturns();
    }
    catch(err){ alert('Delete failed'); console.error(err); }
    return;
  }
});

loadReturns();
