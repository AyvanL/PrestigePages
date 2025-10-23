import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    addDoc,
    getDocs,
    getDoc,
    onSnapshot,
    query,
    orderBy,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { logAudit } from './admin-audit.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add Book Form Handler
const productForm = document.getElementById("productForm");
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

        const strip = (s) => s.trim().replace(/^['"]+|['"]+$/g, "");
        const title = strip(document.getElementById("productTitle").value);
        const author = strip(document.getElementById("productAuthor").value);
        const cover = strip(document.getElementById("productCover").value);
        const category = strip(document.getElementById("productCategory").value).toLowerCase();
    const price = parseFloat(document.getElementById("productPrice").value);
    const ratingRaw = parseFloat(document.getElementById("productRating").value);
    const stockRaw = parseInt(document.getElementById("productStock").value, 10);

    const rating = isNaN(ratingRaw) ? 5 : Math.min(5, Math.max(0, ratingRaw));
    const stock = isNaN(stockRaw) || stockRaw < 0 ? 0 : stockRaw;

    if (!title || !author || !cover || !category || isNaN(price)) {
        alert("Please fill out all required fields correctly.");
        return;
    }

    try {
            const newBook = {
                title,
                author,
                cover,
                category,
            price: Number(price.toFixed(2)),
            rating,
            stock,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

    const ref = await addDoc(collection(db, "books"), newBook);
    await logAudit({ action: 'add_book', targetResource: 'book', resourceId: ref.id, details: { before: null, after: newBook } });
        alert("Book added successfully!");
        productForm.reset();
        loadProductList();
    } catch (error) {
        console.error("Error adding book: ", error);
        alert("Failed to add book.");
    }
});

let BOOK_CACHE = [];
let SORT_MODE = 'title-asc'; // 'title-asc' | 'stock-asc' | 'stock-desc'
const LOW_STOCK_THRESHOLD = 3;

// Render Stock Alerts (Out of Stock + Low on Stock)
function renderStockAlerts() {
    const outList = document.getElementById('outOfStockList');
    const lowList = document.getElementById('lowStockList');
    const outEmpty = document.getElementById('outEmpty');
    const lowEmpty = document.getElementById('lowEmpty');
    const outCount = document.getElementById('outCount');
    const lowCount = document.getElementById('lowCount');
    const lowThresholdVal = document.getElementById('lowThresholdVal');
    
    if (!outList || !lowList) return; // Stock Alerts card not present
    
    if (lowThresholdVal) lowThresholdVal.textContent = String(LOW_STOCK_THRESHOLD);

    const out = [];
    const low = [];
    
    BOOK_CACHE.forEach(({ book }) => {
        const stock = Number(book?.stock) || 0;
        const title = (book?.title || '').toString();
        const rawCover = book?.cover || '';
        const cleanedCover = typeof rawCover === 'string' ? rawCover.trim().replace(/^['"]+|['"]+$/g, "") : rawCover;
        const safeCover = typeof cleanedCover === 'string' && (cleanedCover.startsWith('http://') || cleanedCover.startsWith('https://')) ? cleanedCover : '';
        
        const thumb = safeCover
            ? `<img src="${safeCover}" alt="${title || 'cover'}" style="width:32px; height:44px; object-fit:cover; border:1px solid #ddd; border-radius:4px;" onerror="this.onerror=null;this.replaceWith('<div style=\\'width:32px;height:44px;background:#f3f3f3;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;\\'>IMG</div>')"/>`
            : '<div style="width:32px;height:44px;background:#eee;border:1px solid #ddd;border-radius:4px;"></div>';

        const item = `<li style="border:1px solid #eee; border-radius:8px; background:#fff; padding:8px 10px; display:flex; align-items:center; gap:10px; min-height:50px;">
            ${thumb}
            <div style="flex:1; min-width:0; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; font-size:14px;">${title}</div>
            <span style="flex-shrink:0; padding:4px 10px; text-align:center; font-weight:700; font-size:13px; background:#f3f4f6; color:#111827; border:1px solid #e5e7eb; border-radius:999px;">${stock}</span>
        </li>`;
        
        if (stock === 0) out.push(item);
        else if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) low.push(item);
    });

    outList.innerHTML = out.join('');
    lowList.innerHTML = low.join('');
    
    if (outCount) outCount.textContent = String(out.length);
    if (lowCount) lowCount.textContent = String(low.length);
    if (outEmpty) outEmpty.style.display = out.length ? 'none' : 'block';
    if (lowEmpty) lowEmpty.style.display = low.length ? 'none' : 'block';
}


function renderBookRows(list) {
    const strip = (s) => (typeof s === 'string' ? s.trim().replace(/^['"]+|['"]+$/g, "") : s);
    const productList = document.getElementById("product-list");
    if (!productList) return;
    if (!list.length) {
        productList.innerHTML = '<tr><td colspan="8" style="padding:12px; text-align:center; color:#777;">No books found.</td></tr>';
        return;
    }
    productList.innerHTML = '';
    list.forEach(({ book, productId }) => {
    const rawCover = book.cover || '';
    const cleanedCover = typeof rawCover === 'string' ? rawCover.trim().replace(/^['"]+|['"]+$/g, "") : rawCover;
    const safeCover = cleanedCover.startsWith('http://') || cleanedCover.startsWith('https://') ? cleanedCover : '';
    const thumb = safeCover ? `<img src="${safeCover}" alt="${book.title || 'cover'}" style="width:40px; height:55px; object-fit:cover; border:1px solid #ddd; border-radius:4px;" onerror="this.onerror=null;this.replaceWith('<div style=\'width:40px;height:55px;background:#f3f3f3;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;\'>IMG</div>')"/>` : '<div style="width:40px;height:55px;background:#eee;border:1px solid #ddd;border-radius:4px;"></div>';
        const stockVal = Number.isFinite(Number(book.stock)) ? Number(book.stock) : 0;
        const stockIsZero = stockVal === 0;
        const stockStyle = stockIsZero ? 'color:#b91c1c;font-weight:600;' : '';
        const stockTitle = stockIsZero ? 'Out of stock' : '';
        const row = document.createElement("tr");
            row.innerHTML = `
                <td>${thumb}</td>
                <td>${strip(book.title) || ''}</td>
                <td>${strip(book.author) || ''}</td>
                <td>${strip(book.category) || ''}</td>
            <td>₱${Number(book.price || 0).toFixed(2)}</td>
            <td>${(book.rating !== undefined ? Number(book.rating).toFixed(1) : '5.0')}</td>
            <td style="${stockStyle}" title="${stockTitle}">${stockVal}</td>
            <td>
                <button class="edit" onclick="editProduct('${productId}')">Edit</button>
                <button class="delete" onclick="deleteProduct('${productId}')">Delete</button>
            </td>`;
        productList.appendChild(row);
    });
}

function applySearchFilter() {
    const q = (document.getElementById('bookSearch')?.value || '').toLowerCase().trim();
    let list = BOOK_CACHE;
    if (q) {
        list = BOOK_CACHE.filter(({ book }) => {
            return [book.title, book.author, book.category]
                .filter(Boolean)
                .some(v => v.toLowerCase().includes(q));
        });
    }
    // Apply sorting
    const byNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const byTitle = (a, b) => ((a.book?.title || '').localeCompare(b.book?.title || ''));
    if (SORT_MODE === 'stock-asc') {
        list = list.slice().sort((a, b) => byNum(a.book?.stock) - byNum(b.book?.stock) || byTitle(a, b));
    } else if (SORT_MODE === 'stock-desc') {
        list = list.slice().sort((a, b) => byNum(b.book?.stock) - byNum(a.book?.stock) || byTitle(a, b));
    } else {
        list = list.slice().sort(byTitle);
    }
    renderBookRows(list);
}

// Realtime subscription
function loadProductList() {
    const productList = document.getElementById("product-list");
    if (productList) {
        productList.innerHTML = '<tr><td colspan="8" style="padding:12px; text-align:center; color:#555;">Loading...</td></tr>';
    }
    const booksCol = collection(db, 'books');
    const qRef = query(booksCol, orderBy('title'));
    onSnapshot(qRef, (snap) => {
        BOOK_CACHE = snap.docs.map(d => ({ book: d.data(), productId: d.id }));
        applySearchFilter();
        renderStockAlerts();
    }, (err) => {
        console.error('Realtime books error:', err);
        if (productList) productList.innerHTML = '<tr><td colspan="8" style="padding:12px; text-align:center; color:#b91c1c;">Failed to load books (realtime).</td></tr>';
    });
}

// Delete Book Function
async function deleteProduct(productId) {
    try {
        const productDocRef = doc(db, "books", productId);
        const beforeSnap = await getDoc(productDocRef).catch(()=>null);
        const before = beforeSnap?.exists() ? beforeSnap.data() : null;
        await deleteDoc(productDocRef);
        await logAudit({ action: 'delete_book', targetResource: 'book', resourceId: productId, details: { before, after: null } });
        alert("Book deleted successfully!");
        loadProductList();
    } catch (error) {
        console.error("Error deleting book: ", error);
        alert("Failed to delete book.");
    }
}

// Edit Book Function
async function editProduct(productId) {
    const productDocRef = doc(db, "books", productId);
    const productDoc = await getDoc(productDocRef);
    const data = productDoc.data() || {};

        const strip = (s) => (typeof s === 'string' ? s.trim().replace(/^['"]+|['"]+$/g, "") : s);
        document.getElementById("editTitle").value = strip(data.title) || "";
        document.getElementById("editAuthor").value = strip(data.author) || "";
        document.getElementById("editCover").value = strip(data.cover) || "";
        document.getElementById("editCategory").value = strip(data.category) || "";
    document.getElementById("editPrice").value = data.price || 0;
    document.getElementById("editRating").value = data.rating || 5;
    document.getElementById("editStock").value = data.stock || 0;

    const editModal = document.getElementById("editModal");
    editModal.style.display = "block";
    const closeModalBtn = document.getElementById("closeModalBtn");

    const editForm = document.getElementById("editForm");
    // Remove any previous submit listeners by cloning (simple approach for this context)
    const newForm = editForm.cloneNode(true);
    editForm.parentNode.replaceChild(newForm, editForm);

    newForm.addEventListener("submit", async (e) => {
        e.preventDefault();
            const strip = (s) => s.trim().replace(/^['"]+|['"]+$/g, "");
            const updated = {
                title: strip(document.getElementById("editTitle").value),
                author: strip(document.getElementById("editAuthor").value),
                cover: strip(document.getElementById("editCover").value),
                category: strip(document.getElementById("editCategory").value).toLowerCase(),
            price: parseFloat(document.getElementById("editPrice").value),
            rating: Math.min(5, Math.max(0, parseFloat(document.getElementById("editRating").value))),
            stock: Math.max(0, parseInt(document.getElementById("editStock").value, 10) || 0),
            updatedAt: new Date(),
        };
        try {
            const beforeSnap = await getDoc(productDocRef).catch(()=>null);
            const before = beforeSnap?.exists() ? beforeSnap.data() : null;
            await updateDoc(productDocRef, updated);
            await logAudit({ action: 'edit_book', targetResource: 'book', resourceId: productId, details: { before, after: updated } });
            alert("Book updated successfully!");
            loadProductList();
            editModal.style.display = "none";
        } catch (error) {
            console.error("Error updating book: ", error);
            alert("Failed to update book.");
        }
    });

    const closeBtnNew = document.getElementById("closeModalBtn");
    closeBtnNew.addEventListener("click", () => (editModal.style.display = "none"));
}

// Load books list on page load
loadProductList();

// Search listener
const searchEl = document.getElementById('bookSearch');
if (searchEl) searchEl.addEventListener('input', () => applySearchFilter());
const sortEl = document.getElementById('bookSort');
if (sortEl) sortEl.addEventListener('change', (e) => { SORT_MODE = e.target.value; applySearchFilter(); });

// Expose functions for inline onclick attributes
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
