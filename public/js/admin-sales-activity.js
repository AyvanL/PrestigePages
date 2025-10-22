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
  const bookSales = {}; // Track book sales: { bookId: { title, author, cover, qty, revenue } }
  const customerData = {}; // Track customer purchases: { uid: { name, email, orders, totalSpent, firstOrder } }
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
    const userData = u.data() || {};
    const firstName = userData.firstName || '';
    const lastName = userData.lastName || '';
    const fullName = (firstName + ' ' + lastName).trim() || 'Unknown';
    const userEmail = userData.email || '';
    
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
      
      // Track book sales for top sellers
      items.forEach(item => {
        const bookId = item.id || item.bookId || item.title;
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const revenue = qty * price;
        
        if (!bookSales[bookId]) {
          bookSales[bookId] = {
            title: item.title || 'Unknown',
            author: item.author || '',
            cover: item.cover || '',
            qty: 0,
            revenue: 0
          };
        }
        bookSales[bookId].qty += qty;
        bookSales[bookId].revenue += revenue;
      });

      // Track customer data
      if (!customerData[uid]) {
        customerData[uid] = {
          name: fullName,
          email: userEmail,
          orders: 0,
          totalSpent: 0,
          firstOrder: created
        };
      }
      customerData[uid].orders += 1;
      customerData[uid].totalSpent += total;
      if (created < customerData[uid].firstOrder) {
        customerData[uid].firstOrder = created;
      }
      
      rows.push({ date: created, id: doc.id, customer: fullName, items: count, total });
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

  // Render Top Selling Books
  const topBooksTable = document.getElementById('topBooksTable');
  const topBooks = Object.entries(bookSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10); // Top 10
  
  if (!topBooks.length) {
    topBooksTable.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:12px; color:#666;">No sales found for selected range.</td></tr>';
  } else {
    topBooksTable.innerHTML = topBooks.map((book, idx) => {
      const cleanedCover = typeof book.cover === 'string' ? book.cover.trim().replace(/^['"]+|['"]+$/g, "") : book.cover;
      const safeCover = cleanedCover && (cleanedCover.startsWith('http://') || cleanedCover.startsWith('https://')) ? cleanedCover : '';
      const thumb = safeCover 
        ? `<img src="${safeCover}" alt="${book.title || 'cover'}" style="width:40px; height:55px; object-fit:cover; border:1px solid #ddd; border-radius:4px;" onerror="this.style.display='none'"/>` 
        : '<div style="width:40px;height:55px;background:#eee;border:1px solid #ddd;border-radius:4px;"></div>';
      
      return `
        <tr>
          <td style="font-weight:700; color:#c89b3c;">#${idx + 1}</td>
          <td>${thumb}</td>
          <td>${book.title}</td>
          <td>${book.author}</td>
          <td style="font-weight:600;">${book.qty}</td>
          <td style="font-weight:600; color:#3a7e4b;">${peso(book.revenue)}</td>
        </tr>
      `;
    }).join('');
  }

  // Render Customer Insights
  const totalCustomers = Object.keys(customerData).length;
  const newCustomers = Object.values(customerData).filter(c => c.orders === 1).length;
  const returningCustomers = Object.values(customerData).filter(c => c.orders > 1).length;
  
  document.getElementById('totalCustomers').textContent = totalCustomers;
  document.getElementById('newCustomers').textContent = newCustomers;
  document.getElementById('returningCustomers').textContent = returningCustomers;

  // Render Top Customers
  const topCustomersTable = document.getElementById('topCustomersTable');
  const topCustomers = Object.entries(customerData)
    .map(([uid, data]) => ({ uid, ...data }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10); // Top 10
  
  if (!topCustomers.length) {
    topCustomersTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:#666;">No customers found for selected range.</td></tr>';
  } else {
    topCustomersTable.innerHTML = topCustomers.map((customer, idx) => {
      return `
        <tr>
          <td style="font-weight:700; color:#c89b3c;">#${idx + 1}</td>
          <td>${customer.name}</td>
          <td style="color:#666;">${customer.email || 'N/A'}</td>
          <td style="font-weight:600;">${customer.orders}</td>
          <td style="font-weight:600; color:#3a7e4b;">${peso(customer.totalSpent)}</td>
        </tr>
      `;
    }).join('');
  }

  // Render Recent Sales table (newest first)
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
