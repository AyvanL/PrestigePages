import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const peso = v => "₱" + Number(v || 0).toLocaleString(undefined,{ minimumFractionDigits: 2, maximumFractionDigits: 2 });

const kpiRevenue = document.getElementById('kpiRevenue');
const kpiOrders = document.getElementById('kpiOrders');
const kpiItems = document.getElementById('kpiItems');
const kpiAOV = document.getElementById('kpiAOV');
const salesTable = document.getElementById('salesTable');

const rangeSel = document.getElementById('range');
const fromEl = document.getElementById('from');
const toEl = document.getElementById('to');
const applyBtn = document.getElementById('applyRange');

function normalizeDate(d){ const dt = (d?.toDate ? d.toDate() : (d instanceof Date ? d : new Date(d))); return isNaN(dt) ? null : dt; }
function isWithin(newDate, start, end){
  const t = newDate.getTime();
  return (!start || t >= start.getTime()) && (!end || t <= end.getTime());
}

async function loadSales(){
  // Aggregate sales from all users' transactions with status delivered or paid
  const users = await getDocs(collection(db,'users'));
  const rows = [];
  let totalRevenue = 0, totalOrders = 0, totalItems = 0;

  // Range
  let start = null, end = null;
  const presetDays = Number(rangeSel.value);
  if (Number.isFinite(presetDays) && presetDays > 0){
    end = new Date();
    start = new Date();
    start.setDate(end.getDate() - presetDays);
  }
  const manualFrom = fromEl.value ? new Date(fromEl.value + 'T00:00:00') : null;
  const manualTo = toEl.value ? new Date(toEl.value + 'T23:59:59') : null;
  if (manualFrom) start = manualFrom; if (manualTo) end = manualTo;

  for (const u of users.docs){
    const uid = u.id;
    const txSnap = await getDocs(collection(db,'users',uid,'transactions'));
    txSnap.forEach(doc => {
      const t = doc.data() || {};
      const deliv = (t.delivstatus||'').toLowerCase();
      const pay = (t.paymentStatus||t.status||'').toLowerCase();
      // count orders that are paid and delivered (or just paid if no delivery tracking)
      const ok = (deliv === 'delivered') || (pay === 'paid');
      if (!ok) return;
      const created = normalizeDate(t.createdAt) || normalizeDate(t.orderDate) || new Date();
      if (start || end){ if (!created || !isWithin(created, start, end)) return; }
      const total = Number(t.total || 0);
      const items = Array.isArray(t.items) ? t.items : [];
      const count = items.reduce((s,x)=> s + (Number(x.qty||1)||1), 0);
      rows.push({ date: created, id: doc.id, customer: (t.customerName||t.customer||uid), items: count, total });
      totalRevenue += total;
      totalOrders += 1;
      totalItems += count;
    });
  }

  // KPIs
  kpiRevenue.textContent = peso(totalRevenue);
  kpiOrders.textContent = totalOrders;
  kpiItems.textContent = totalItems;
  kpiAOV.textContent = totalOrders ? peso(totalRevenue / totalOrders) : '₱0.00';

  // Render table (newest first)
  rows.sort((a,b)=> b.date - a.date);
  if (!rows.length){
    salesTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:#666;">No sales found for selected range.</td></tr>';
  } else {
    salesTable.innerHTML = rows.map(r=>`
      <tr>
        <td>${r.date.toLocaleString()}</td>
        <td>${r.id}</td>
        <td>${r.customer || ''}</td>
        <td>${r.items}</td>
        <td>${peso(r.total)}</td>
      </tr>
    `).join('');
  }
}

applyBtn.addEventListener('click', loadSales);
rangeSel.addEventListener('change', loadSales);

// initial
loadSales();
