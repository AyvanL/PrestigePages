import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Load custom hero content from CMS
async function loadHeroContent() {
  try {
    const docRef = doc(db, 'content', 'hero-section');
    const docSnap = await getDoc(docRef);
    
    // Default values
    const defaults = {
      eyebrow: 'New Arrivals',
      title: 'Experience our\nNew Exclusive Books',
      description: 'Discover hand‑picked titles from acclaimed authors. Enjoy quality hardbacks, digital editions, and secure shipping right to your door.',
      imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=700&auto=format&fit=crop',
      primaryButton: 'Shop Now',
      secondaryButton: 'Learn more'
    };
    
    const data = docSnap.exists() ? docSnap.data() : defaults;
    
    // Update eyebrow text
    const eyebrowEl = document.querySelector('.hero .eyebrow');
    if (eyebrowEl) {
      eyebrowEl.textContent = data.eyebrow || defaults.eyebrow;
    }
    
    // Update title (handle line breaks)
    const titleEl = document.querySelector('.hero h1');
    if (titleEl) {
      titleEl.innerHTML = (data.title || defaults.title).replace(/\n/g, '<br>');
    }
    
    // Update description
    const descEl = document.querySelector('.hero-copy > p');
    if (descEl) {
      descEl.textContent = data.description || defaults.description;
    }
    
    // Update hero image
    const imageEl = document.querySelector('.hero-art .stack img');
    if (imageEl) {
      imageEl.src = data.imageUrl || defaults.imageUrl;
    }
    
    // Update primary button text
    const primaryBtnEl = document.querySelector('.hero .cta .btn:not(.secondary)');
    if (primaryBtnEl) {
      primaryBtnEl.textContent = data.primaryButton || defaults.primaryButton;
    }
    
    // Update secondary button text
    const secondaryBtnEl = document.querySelector('.hero .cta .btn.secondary');
    if (secondaryBtnEl) {
      secondaryBtnEl.textContent = data.secondaryButton || defaults.secondaryButton;
    }
  } catch (error) {
    console.error('Error loading hero content:', error);
    // Load defaults on error
    const eyebrowEl = document.querySelector('.hero .eyebrow');
    const titleEl = document.querySelector('.hero h1');
    const descEl = document.querySelector('.hero-copy > p');
    const imageEl = document.querySelector('.hero-art .stack img');
    const primaryBtnEl = document.querySelector('.hero .cta .btn:not(.secondary)');
    const secondaryBtnEl = document.querySelector('.hero .cta .btn.secondary');
    
    if (eyebrowEl) eyebrowEl.textContent = 'New Arrivals';
    if (titleEl) titleEl.innerHTML = 'Experience our<br />New Exclusive Books';
    if (descEl) descEl.textContent = 'Discover hand‑picked titles from acclaimed authors. Enjoy quality hardbacks, digital editions, and secure shipping right to your door.';
    if (imageEl) imageEl.src = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=700&auto=format&fit=crop';
    if (primaryBtnEl) primaryBtnEl.textContent = 'Shop Now';
    if (secondaryBtnEl) secondaryBtnEl.textContent = 'Learn more';
  }
}

// Load hero content on page load
loadHeroContent();

// Elements
const profileFirstName = document.getElementById("profileFirstName");
const profileLastName = document.getElementById("profileLastName");
const profileEmail = document.getElementById("profileEmail");
const profileMobile = document.getElementById("profileMobile");
// Address/profile fields present in the modal
const profileHouseno = document.getElementById("profileHouseno");
const profileStreet = document.getElementById("profileStreet");
const profileBaranggay = document.getElementById("profileBaranggay");
const profileProvince = document.getElementById("profileProvince");
const profileCity = document.getElementById("profileCity");
const profilePostal = document.getElementById("profilePostal");
// Modal container
const profileModal = document.getElementById("profileModal");

const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const closeEditBtn = document.getElementById("closeEdit");
const editProfileForm = document.getElementById("editProfileForm");

const editFirstName = document.getElementById("editFirstName");
const editLastName = document.getElementById("editLastName");
const editMobile = document.getElementById("editMobile");
const editHouseNo = document.getElementById("editHouseNo");
const editStreet = document.getElementById("editStreet");
const editBaranggay = document.getElementById("editBaranggay");
const editCity = document.getElementById("editCity");
const editProvince = document.getElementById("editProvince");
const editPostal = document.getElementById("editPostal");
const closeProfileBtn = document.getElementById("closeProfile");

// checkout modal elements may not exist here
const modal = document.getElementById("checkoutModal");
const openBtn = document.getElementById("openCheckout");
const closeBtn = document.getElementById("closeCheckout");

const welcomeEl = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn");

// Cart system variables
let cart = [];
// Wishlist state
let USER_WISHLIST = [];

const cartBtn = document.getElementById("cartBtn");
const wishlistBtn = document.querySelector(
  ".actions button[aria-label='Wishlist']"
);
const wishlistModal = document.getElementById("wishlistModal");
const wishlistItemsEl = document.getElementById("wishlistItems");
const closeWishlistBtn = document.getElementById("closeWishlist");
const cartCount = document.getElementById("cartCount");
const cartModal = document.getElementById("cartModal");
const closeCart = document.getElementById("closeCart");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
// Transactions modal elements
const transBtn = document.getElementById("transBtn");
const transModal = document.getElementById("transModal");
const closeTrans = document.getElementById("closeTrans");
const transContent = document.getElementById("transContent");
// Refund reason modal elements
const refundReasonModal = document.getElementById('refundReasonModal');
const refundReasonForm = document.getElementById('refundReasonForm');
// Radio-based refund reasons (textarea removed)
// We'll query selected radio on submit instead of using a text area.
const refundReasonMsg = document.getElementById('refundReasonMsg');
const closeRefundReason = document.getElementById('closeRefundReason');
const cancelRefundReason = document.getElementById('cancelRefundReason');
// Refund evidence image elements
const refundImagesInput = document.getElementById('refundImagesInput');
const refundImagesPreview = document.getElementById('refundImagesPreview');
const refundImagesMsg = document.getElementById('refundImagesMsg');
let REFUND_TARGET_TXID = null;

// In-memory selected images (processed as data URLs)
let REFUND_IMAGE_DATA = [];

function clearRefundImages(){
  REFUND_IMAGE_DATA = [];
  if (refundImagesPreview) refundImagesPreview.innerHTML = '';
  if (refundImagesInput) refundImagesInput.value = '';
  if (refundImagesMsg) refundImagesMsg.textContent = '';
}

async function fileToDataURLScaled(file, maxDim = 800, quality = 0.8){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
            if (width > height && width > maxDim){
              height = Math.round(height * (maxDim/width));
              width = maxDim;
            } else if (height >= width && height > maxDim){
              width = Math.round(width * (maxDim/height));
              height = maxDim;
            }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          // Prefer JPEG for better compression unless original is png with transparency
          let mime = 'image/jpeg';
          if (file.type === 'image/png') {
            // detect if transparency present; quick heuristic
            try {
              const imgData = ctx.getImageData(0,0,Math.min(10,width),Math.min(10,height)).data;
              for (let i=3;i<imgData.length;i+=4){ if (imgData[i] < 255){ mime='image/png'; break; } }
            } catch(_){}
          }
          const dataUrl = canvas.toDataURL(mime, quality);
          resolve({ name: file.name, type: mime, dataUrl });
        } catch(err){ reject(err); }
      };
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

if (refundImagesInput){
  refundImagesInput.addEventListener('change', async () => {
    if (!refundImagesInput.files) return;
    REFUND_IMAGE_DATA = [];
    if (refundImagesPreview) refundImagesPreview.innerHTML = '';
    if (refundImagesMsg) refundImagesMsg.textContent = '';
    const files = Array.from(refundImagesInput.files).slice(0,3); // max 3
    for (const f of files){
      if (!/^image\//.test(f.type)) { if (refundImagesMsg) refundImagesMsg.textContent = 'Some files were skipped (not images).'; continue; }
      if (f.size > 5 * 1024 * 1024) { if (refundImagesMsg) refundImagesMsg.textContent = 'Image too large (>5MB) skipped.'; continue; }
      try {
        const scaled = await fileToDataURLScaled(f);
        REFUND_IMAGE_DATA.push(scaled);
        const thumb = document.createElement('div');
        thumb.style.width = '70px'; thumb.style.height='70px'; thumb.style.position='relative'; thumb.style.border='1px solid #ddd'; thumb.style.borderRadius='6px'; thumb.style.overflow='hidden';
        thumb.innerHTML = `<img src="${scaled.dataUrl}" alt="evidence" style="width:100%;height:100%;object-fit:cover;" />`;
        refundImagesPreview.appendChild(thumb);
      } catch(err){ console.error('Image process failed', err); if (refundImagesMsg) refundImagesMsg.textContent = 'Failed to process an image.'; }
    }
  });
}

// --- Helper functions for Firestore cart ---

// Save cart to Firestore for current user
async function saveCartToFirestore() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userDocRef, { cart });
  } catch (error) {
    // If cart field doesn't exist yet, create it
    await setDoc(userDocRef, { cart }, { merge: true });
  }
}

// Load cart from Firestore for current user
async function loadCartFromFirestore() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.cart && Array.isArray(data.cart)) {
      cart = data.cart;
      await updateCart();
      console.debug('[PP] Cart loaded from Firestore with', cart.length, 'items');
    }
  } else {
    console.debug('[PP] No Firestore cart found for user; preserving local state.');
  }
}

// --- Profile modal and edit profile logic ---

// When Profile is clicked, load data
const profileLink = document.querySelector(".dropdown-content a[href='profile.html']");
if (profileLink) profileLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Show in Profile Modal
        profileFirstName.textContent = data.firstName || "Not set";
        profileLastName.textContent = data.lastName || "Not set";
        profileEmail.textContent = user.email || "No email";
        profileHouseno.textContent = data.houseNo || "Not set";
        profileStreet.textContent = data.street || "Not set";
        profileBaranggay.textContent = data.baranggay || "Not set";
        profileProvince.textContent = data.province || "Not set";
        profileCity.textContent = data.city || "Not set";
        profilePostal.textContent = data.postal || "Not set";
        profileMobile.textContent = data.mobile || "Not set";

        // Prefill edit form
        editFirstName.value = data.firstName || "";
        editLastName.value = data.lastName || "";
        editHouseNo.value = data.houseNo || "";
        editStreet.value = data.street || "";
        editBaranggay.value = data.baranggay || "";
        editCity.value = data.city || "";
        editProvince.value = data.province || "";
        editPostal.value = data.postal || "";
        editMobile.value = data.mobile || "";
      }
    }

    profileModal.style.display = "flex";
  });

// Close Profile Modal
if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", () => {
    profileModal.style.display = "none";
  });
}

// Open Edit Profile Modal
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    profileModal.style.display = "none";
    editProfileModal.style.display = "flex";
  });
}

// Close Edit Modal
if (closeEditBtn) {
  closeEditBtn.addEventListener("click", () => {
    editProfileModal.style.display = "none";
  });
}

// Handle form submit
editProfileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (user) {
    const docRef = doc(db, "users", user.uid);

    await updateDoc(docRef, {
      firstName: editFirstName.value,
      lastName: editLastName.value,
      houseNo: editHouseNo.value,
      street: editStreet.value,
      baranggay: editBaranggay.value,
      city: editCity.value,
      province: editProvince.value,
      postal: editPostal.value,
      mobile: editMobile.value,
    });

    alert("Profile updated successfully!");

    // Refresh display
    profileFirstName.textContent = editFirstName.value;
    profileLastName.textContent = editLastName.value;
    profileHouseno.textContent = editHouseNo.value;
    profileStreet.textContent = editStreet.value;
    profileBaranggay.textContent = editBaranggay.value;
    profileCity.textContent = editCity.value;
    profileProvince.textContent = editProvince.value;
    profilePostal.textContent = editPostal.value;
    profileMobile.textContent = editMobile.value;

    editProfileModal.style.display = "none";
    profileModal.style.display = "flex";
  }
});

// Dropdown toggle
const dropdown = document.querySelector(".dropdown");
if (dropdown) {
  dropdown.addEventListener("click", function (e) {
    this.classList.toggle("active");
    this.querySelector(".dropdown-content").classList.toggle("show");
    this.querySelector(".dropdown-trigger").classList.toggle("active");
    e.stopPropagation();
  });
}

// Close dropdown when clicking outside
window.addEventListener("click", function () {
  const dropdownEl = document.querySelector(".dropdown");
  if (dropdownEl && dropdownEl.classList.contains("active")) {
    dropdownEl.classList.remove("active");
    dropdownEl.querySelector(".dropdown-content").classList.remove("show");
    dropdownEl.querySelector(".dropdown-trigger").classList.remove("active");
  }
});


// Check if user is logged in
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Get extra data from Firestore
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const uData = docSnap.data();
      if (uData && uData.suspended) {
        alert('🚫 Your account is suspended. Please contact support.');
        try { await signOut(auth); } catch {}
        window.location.href = 'login.html';
        return;
      }
      const firstName = docSnap.data().firstName;
      welcomeEl.textContent = firstName;
      // Load wishlist if available
      USER_WISHLIST = docSnap.data().wishlist || [];
    } else {
      welcomeEl.textContent = "Welcome User!";
    }

    // Realtime cart + wishlist via user doc snapshot
    const userDocRef = doc(db, "users", user.uid);
    onSnapshot(userDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      // Realtime suspension enforcement: if admin sets suspended=true while user is online, auto logout immediately.
      if (data.suspended) {
        if (!window.__ppSuspendedNotified) {
          window.__ppSuspendedNotified = true;
          alert('🚫 Your account has been suspended while you were online. You will be logged out.');
          signOut(auth).then(()=>{ window.location.href = 'login.html'; }).catch(()=>{ window.location.href = 'login.html'; });
        }
        return; // Stop further processing of wishlist/cart updates after suspension
      }
      // Update wishlist live
      USER_WISHLIST = Array.isArray(data.wishlist) ? data.wishlist : [];
      // Update cart live (avoid overwriting if we are in the middle of local mutation? simple approach: replace)
      if (Array.isArray(data.cart)) {
        cart = data.cart;
        updateCart(); // no await inside snapshot
      }
    });

    // Fallback: if thankyou page couldn't clear the cart (e.g., user not signed in on redirect),
    // detect a pending clear flag and clear here once the user is authenticated.
    try {
      const pendingTx = localStorage.getItem("pp:clearCartTx");
      if (pendingTx) {
        const txRef = doc(db, "users", user.uid, "transactions", pendingTx);
        try {
          const snap = await getDoc(txRef);
          if (snap.exists()) {
            const txData = snap.data();
            // Deduct stock here if not yet deducted (mirrors thankyou logic simplified)
            if (!txData.stockDeducted) {
              const items = Array.isArray(txData.items) ? txData.items : [];
              for (const it of items) {
                const qty = Math.max(1, Number(it.qty || 1));
                if (it.id) {
                  const bookRef = doc(db, 'books', it.id);
                  try {
                    const bSnap = await getDoc(bookRef);
                    if (bSnap.exists()) {
                      let cur = bSnap.data().stock;
                      if (typeof cur === 'string') { const p = parseInt(cur,10); cur = isNaN(p)?0:p; }
                      if (typeof cur !== 'number') cur = 0;
                      const newStock = Math.max(0, cur - qty);
                      await updateDoc(bookRef, { stock: newStock });
                    }
                  } catch (e) { console.warn('Fallback stock deduction (id) failed', e); }
                } else if (it.title) {
                  // Fallback match title+author (inefficient)
                  try {
                    const all = await getDocs(collection(db,'books'));
                    const needleTitle = String(it.title).trim().toLowerCase();
                    const needleAuthor = String(it.author||'').trim().toLowerCase();
                    const match = all.docs.find(d=>{
                      const dData = d.data()||{};
                      return String(dData.title||'').trim().toLowerCase()===needleTitle && (!needleAuthor || String(dData.author||'').trim().toLowerCase()===needleAuthor);
                    });
                    if (match) {
                      const bData = match.data();
                      let cur = bData.stock;
                      if (typeof cur === 'string') { const p = parseInt(cur,10); cur = isNaN(p)?0:p; }
                      if (typeof cur !== 'number') cur = 0;
                      const newStock = Math.max(0, cur - qty);
                      await updateDoc(doc(db,'books', match.id), { stock: newStock });
                    }
                  } catch (e) { console.warn('Fallback stock deduction (title) failed', e); }
                }
              }
              await updateDoc(txRef, { stockDeducted: true });
            }
            // Mark transaction paid (best-effort) and clear cart
            try {
              await updateDoc(txRef, { status: 'paid', paidAt: serverTimestamp() });
            } catch {}
          }
        } catch (e) {
          console.warn('Could not process fallback transaction', e);
        }
        // Only clear cart if the fallback transaction actually existed and we processed it.
        try { await updateDoc(doc(db, "users", user.uid), { cart: [] }); } catch {}
        cart = []; await updateCart();
        localStorage.removeItem("pp:clearCartTx");
      }
    } catch {}

    // Removed aggressive automatic cart clearing on paid transaction to allow cart persistence across refresh.
    // If you need to explicitly clear after successful checkout, set localStorage key `pp:clearCartTx` before redirect.

  // Subscribe to books collection in realtime
  initBooksRealtime();
  } else {
    // Not logged in → redirect to login
    window.location.href = "login.html";
  }
});

// Handle logout
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("You have logged out.");
    window.location.href = "index.html";
  } catch (error) {
    alert("Logout failed: " + error.message);
  }
});

// --- Books data (loaded dynamically from Firestore) ------------------
let BOOKS = [];
// Book detail modal elements
const bookDetailModal = document.getElementById('bookDetailModal');
const closeBookDetail = document.getElementById('closeBookDetail');
const bdTitle = document.getElementById('bdTitle');
const bdAuthor = document.getElementById('bdAuthor');
const bdCover = document.getElementById('bdCover');
const bdPrice = document.getElementById('bdPrice');
const bdStock = document.getElementById('bdStock');
const bdDescription = document.getElementById('bdDescription');
const bdReviewsList = document.getElementById('bdReviewsList');
const bdReviewFormWrap = document.getElementById('bdReviewFormWrap');
const bdReviewForm = document.getElementById('bdReviewForm');
const bdStarPicker = document.getElementById('bdStarPicker');
const bdReviewText = document.getElementById('bdReviewText');
const bdDeleteReview = document.getElementById('bdDeleteReview');
const bdReviewMsg = document.getElementById('bdReviewMsg');
const bdRatingSummary = document.getElementById('bdRatingSummary');
const bdPurchaseNote = document.getElementById('bdPurchaseNote');
let CURRENT_BOOK_ID = null;
let CURRENT_BOOK_REVIEWS_UNSUB = null;
let CURRENT_USER_REVIEW_ID = null; // track if user already reviewed

function sanitizeBookDoc(d) {
  const raw = d.data() || {};
  const pick = (val, fallback) => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === 'string') {
      const trimmed = val.trim().replace(/^["']+|["']+$/g, '');
      return trimmed || fallback;
    }
    return val;
  };
  const title = pick(raw.title ?? raw.tittle, 'Untitled');
  const author = pick(raw.author, 'Unknown');
  const category = pick(raw.category, 'uncategorized').toLowerCase();
  const cover = pick(raw.cover, 'https://via.placeholder.com/200x300?text=No+Cover');
  const price = Number(raw.price);
  const rating = Number(raw.rating);
  const stock = Number(raw.stock);
  return {
    id: d.id,
    title,
    author,
    price: isNaN(price) ? 0 : price,
    rating: isNaN(rating) ? 5 : rating,
    category,
    cover,
    stock: isNaN(stock) ? 0 : stock,
  };
}

function initBooksRealtime() {
  const booksCol = collection(db, 'books');
  const qBooks = query(booksCol, orderBy('title'));
  onSnapshot(qBooks, (snap) => {
    BOOKS = snap.docs.map(sanitizeBookDoc);
    renderBooks(BOOKS);
  }, (err) => {
    console.error('Books realtime subscription failed', err);
  });
}

// --- Render helpers --------------------------------------------------
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

const stars = (n) => {
  // Default to 5 if null/undefined/NaN
  let rating = (n === undefined || n === null) ? 5 : Number(n);

  // Clamp to 0–5 for display (but keep exact for text)
  const clamped = Math.max(0, Math.min(5, rating));
  const fullStars = Math.floor(clamped); // only full stars
  const emptyStars = 5 - fullStars;

  const full = "★".repeat(fullStars);
  const empty = "☆".repeat(emptyStars);

  // Show exact rating text next to stars (1 decimal if needed)
  const ratingText = `${rating.toFixed(1)}/5`;

  return `
    <span class="rating" aria-label="${ratingText}">
      ${full}${empty} <span class="rating-text">- ${ratingText}</span>
    </span>
  `;
};


function renderBooks(list) {
  const grid = document.getElementById("book-grid");
  grid.innerHTML = "";

  list.forEach((b) => {
    const card = el("article", "card");

  const imgWrap = el('div','cover-wrap');
  const img = el("img", "cover");
  img.alt = `${b.title} cover`;
  img.src = b.cover;
  img.style.cursor = 'pointer';
  img.addEventListener('click', () => openBookDetail(b.id));
  imgWrap.appendChild(img);
  card.appendChild(imgWrap);

    const body = el("div", "card-body");
    body.appendChild(el("div", "title", b.title));
    body.appendChild(el("div", "byline", `by ${b.author}`));
    body.insertAdjacentHTML("beforeend", stars(b.rating));

    const priceRow = el("div", "price-row");
    priceRow.appendChild(
      el(
        "div",
        "price",
        `₱${b.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      )
    );
  const stockVal = typeof b.stock === 'number' ? b.stock : 0;
  const inStock = stockVal > 0;
  const LOW_THRESHOLD = 3;
  let pillText;
  let pillClass = 'pill';
  if (!inStock) { pillText = 'Out of stock'; pillClass += ' pill-out'; }
  else if (stockVal <= LOW_THRESHOLD) { pillText = `Low stock (${stockVal})`; pillClass += ' pill-low'; }
  else { pillText = `In stock (${stockVal})`; }
  const pill = el("div", pillClass, pillText);
  priceRow.appendChild(pill);
    body.appendChild(priceRow);

    const actions = el("div", "actions-row");

  const addBtn = el("button", "btn small" + (inStock ? "" : " disabled"));
  addBtn.textContent = inStock ? "Add to Cart" : "Out of Stock";
  addBtn.disabled = !inStock;
    addBtn.addEventListener("click", async () => {
      if (!inStock) return;
      const existing = cart.find((c) => c.title === b.title);
      if (existing) {
        if (existing.qty >= stockVal) { alert('Reached available stock.'); return; }
        existing.qty++;
      } else {
        if (stockVal < 1) return;
        cart.push({ ...b, qty: 1 });
      }
      await saveCartToFirestore();
      await updateCart();
      alert(`Added "${b.title}" to cart.`);
    });

  const heart = el("button", "btn icon secondary");
  heart.setAttribute('data-title', b.title);
  heart.setAttribute('data-author', b.author);
  heart.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12.1 20.3 4.7 13c-2.6-2.6-1.9-6.9 1.6-8.5 1.7-.8 3.7-.5 5.1.7 1.4-1.2 3.4-1.5 5.1-.7 3.5 1.6 4.2 5.9 1.6 8.5l-7.3 7.3Z" stroke="#7E6E5B" stroke-width="1.6" fill="#fff"/>
        </svg>`;

    // Set initial heart state if book is in wishlist
    const isInWishlist = USER_WISHLIST.some(
      (item) => item.title === b.title && item.author === b.author
    );
    if (isInWishlist) {
      heart.classList.add("active");
      heart.querySelector("svg path").setAttribute("fill", "#FF0000");
    }

    heart.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to save items to your wishlist");
        return;
      }

      const path = heart.querySelector("svg path");
      const userDocRef = doc(db, "users", user.uid);
      const isCurrentlyActive = heart.classList.contains("active");

      try {
        if (isCurrentlyActive) {
          // Remove from wishlist
          await updateDoc(userDocRef, {
            wishlist: arrayRemove(b),
          });
          USER_WISHLIST = USER_WISHLIST.filter(
            (item) => !(item.title === b.title && item.author === b.author)
          );
          heart.classList.remove("active");
          path.setAttribute("fill", "#fff");
        } else {
          // Add to wishlist
          await updateDoc(userDocRef, {
            wishlist: arrayUnion(b),
          });
          USER_WISHLIST.push(b);
          heart.classList.add("active");
          path.setAttribute("fill", "#FF0000");
        }
      } catch (error) {
        // If wishlist field doesn't exist yet, create it
        try {
          if (!isCurrentlyActive) {
            await setDoc(userDocRef, { wishlist: [b] }, { merge: true });
            USER_WISHLIST.push(b);
            heart.classList.add("active");
            path.setAttribute("fill", "#FF0000");
          } else {
            throw error; // Re-throw if we were trying to remove
          }
        } catch (err) {
          console.error("Failed to update wishlist:", err);
          alert("Failed to update wishlist");
          // Revert visual state to match database state
          if (isCurrentlyActive) {
            heart.classList.add("active");
            path.setAttribute("fill", "#FF0000");
          } else {
            heart.classList.remove("active");
            path.setAttribute("fill", "#fff");
          }
        }
      }
    });

    actions.append(addBtn, heart);
    body.appendChild(actions);

    card.appendChild(body);
    grid.appendChild(card);
  });
}

// -------------- Book Detail Modal + Reviews --------------
async function openBookDetail(bookId) {
  try {
    const book = BOOKS.find(b => b.id === bookId);
    if (!book) return;
    CURRENT_BOOK_ID = bookId;
    bdTitle.textContent = book.title;
    bdAuthor.textContent = `by ${book.author}`;
    bdCover.src = book.cover;
    bdPrice.textContent = '₱' + book.price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
    const stockVal = typeof book.stock === 'number'? book.stock : 0;
    if (stockVal <= 0) {
      bdStock.innerHTML = `<span class="pill pill-out">Out of stock</span>`;
    } else if (stockVal <= 3) {
      bdStock.innerHTML = `<span class="pill pill-low">Low stock (${stockVal})</span>`;
    } else {
      bdStock.innerHTML = `<span class="pill">In stock (${stockVal})</span>`;
    }
    // Fetch extra book info (description) if exists
    try {
      const snap = await getDoc(doc(db,'books', bookId));
      if (snap.exists()) {
        const data = snap.data();
        bdDescription.textContent = data.description || 'No description available.';
      } else {
        bdDescription.textContent = 'No description available.';
      }
    } catch { bdDescription.textContent = 'No description available.'; }

    // Setup review form state
    setupReviewPermissions(bookId).then(()=>{
      subscribeToReviews(bookId);
    });

    bookDetailModal.style.display = 'flex';
  } catch (e) { console.error('Open book detail failed', e); }
}

if (closeBookDetail && bookDetailModal) {
  closeBookDetail.addEventListener('click', ()=>{ closeBookDetailModal(); });
}
window.addEventListener('click', (e)=>{ if (e.target === bookDetailModal) closeBookDetailModal(); });
function closeBookDetailModal(){
  bookDetailModal.style.display = 'none';
  if (CURRENT_BOOK_REVIEWS_UNSUB) { CURRENT_BOOK_REVIEWS_UNSUB(); CURRENT_BOOK_REVIEWS_UNSUB = null; }
  CURRENT_BOOK_ID = null; CURRENT_USER_REVIEW_ID = null;
  bdReviewsList.innerHTML='';
  bdReviewText.value='';
}

function renderStarPicker(rating){
  bdStarPicker.innerHTML='';
  const current = rating || 0;
  for(let i=1;i<=5;i++){
    const btn = document.createElement('button');
    btn.type='button';
    btn.textContent = i <= current ? '★' : '☆';
    btn.setAttribute('data-val', i);
    btn.style.fontSize='22px'; btn.style.lineHeight='1'; btn.style.border='none'; btn.style.background='transparent'; btn.style.cursor='pointer';
    btn.addEventListener('click', ()=>{
      bdStarPicker.setAttribute('data-rating', i);
      renderStarPicker(i);
    });
    bdStarPicker.appendChild(btn);
  }
}
renderStarPicker(0);

async function setupReviewPermissions(bookId){
  const user = auth.currentUser;
  if (!user){
    bdReviewFormWrap.style.display='none';
    bdPurchaseNote.style.display='block';
    return;
  }
  // Determine if user purchased this book (has a paid transaction with the item id or title)
  bdPurchaseNote.style.display='none';
  bdReviewFormWrap.style.display='none';
  CURRENT_USER_REVIEW_ID = null;
  try {
    const txCol = collection(db,'users', user.uid, 'transactions');
    const txSnap = await getDocs(txCol); // could optimize with where clauses if indexed
    let purchased = false;
    txSnap.forEach(d => {
      if (purchased) return;
      const data = d.data();
      const status = (data.status||'').toLowerCase();
      if (status !== 'paid') return;
      const items = Array.isArray(data.items)? data.items: [];
      if (items.some(it => it.id === bookId || (it.title === bdTitle.textContent))) purchased = true;
    });
    if (purchased){
      bdReviewFormWrap.style.display='block';
      // Check existing review by this user
      const existingSnap = await getDocs(collection(db,'books', bookId, 'reviews'));
      existingSnap.forEach(r => {
        const rv = r.data();
        if (rv.userId === user.uid){
          CURRENT_USER_REVIEW_ID = r.id;
          bdReviewText.value = rv.text || '';
          renderStarPicker(Number(rv.rating)||0);
          bdStarPicker.setAttribute('data-rating', Number(rv.rating)||0);
        }
      });
      bdDeleteReview.style.display = CURRENT_USER_REVIEW_ID ? 'inline-block' : 'none';
    } else {
      bdPurchaseNote.style.display='block';
    }
  } catch (e){
    console.warn('Purchase check failed', e);
    bdPurchaseNote.style.display='block';
  }
}

function subscribeToReviews(bookId){
  if (CURRENT_BOOK_REVIEWS_UNSUB){ CURRENT_BOOK_REVIEWS_UNSUB(); CURRENT_BOOK_REVIEWS_UNSUB = null; }
  const revCol = collection(db,'books', bookId, 'reviews');
  CURRENT_BOOK_REVIEWS_UNSUB = onSnapshot(revCol, (snap)=>{
    const reviews = [];
    let total = 0;
    snap.forEach(d=>{
      const data = d.data();
      const rating = Number(data.rating)||0;
      total += rating;
      reviews.push({ id:d.id, ...data, rating });
    });
    const avg = reviews.length ? (total / reviews.length) : 0;
    bdRatingSummary.innerHTML = reviews.length ? `${'★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg))} <span style="font-size:13px; color:var(--muted-ink);">(${avg.toFixed(1)} avg from ${reviews.length} review${reviews.length>1?'s':''})</span>` : '<span style="font-size:13px; color:var(--muted-ink);">No reviews yet.</span>';
    reviews.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    bdReviewsList.innerHTML = reviews.map(r => {
      const filled = '★'.repeat(Math.round(r.rating));
      const empty = '☆'.repeat(5-Math.round(r.rating));
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const owner = (auth.currentUser && r.userId === auth.currentUser.uid) ? '<span style="color:var(--muted-ink); font-size:11px;">(You)</span>' : '';
      return `<div style="border:1px solid var(--line); padding:10px 12px; border-radius:8px;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div style="font-weight:600; font-size:14px;">${r.userName || 'User'} ${owner}</div>
          <div style="font-size:16px; color:#C89B3C;">${filled}${empty}</div>
        </div>
        <div style="font-size:12px; color:var(--muted-ink); margin:2px 0 6px;">${when}</div>
        <div style="font-size:14px; white-space:pre-wrap;">${(r.text||'').replace(/[<>]/g,'')}</div>
      </div>`;
    }).join('');
  }, (err)=>{ console.warn('Reviews snapshot failed', err); });
}

if (bdReviewForm){
  bdReviewForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !CURRENT_BOOK_ID){ return; }
    const rating = Number(bdStarPicker.getAttribute('data-rating'))||0;
    if (rating < 1){ bdReviewMsg.textContent = 'Please select a star rating.'; return; }
    const text = bdReviewText.value.trim();
    try {
      const reviewData = {
        userId: user.uid,
        userName: welcomeEl.textContent || user.email || 'User',
        rating,
        text,
        updatedAt: serverTimestamp(),
      };
      if (CURRENT_USER_REVIEW_ID){
        await updateDoc(doc(db,'books', CURRENT_BOOK_ID, 'reviews', CURRENT_USER_REVIEW_ID), reviewData);
        bdReviewMsg.textContent = 'Review updated.';
      } else {
        reviewData.createdAt = serverTimestamp();
        const newRef = doc(collection(db,'books', CURRENT_BOOK_ID, 'reviews'));
        await setDoc(newRef, reviewData);
        CURRENT_USER_REVIEW_ID = newRef.id;
        bdDeleteReview.style.display = 'inline-block';
        bdReviewMsg.textContent = 'Review posted.';
      }
    } catch (err){
      console.error('Save review failed', err);
      bdReviewMsg.textContent = 'Failed to save review.';
    }
  });
}

if (bdDeleteReview){
  bdDeleteReview.addEventListener('click', async ()=>{
    if (!CURRENT_BOOK_ID || !CURRENT_USER_REVIEW_ID) return;
    const ok = confirm('Delete your review?');
    if (!ok) return;
    try {
      await deleteDoc(doc(db,'books', CURRENT_BOOK_ID, 'reviews', CURRENT_USER_REVIEW_ID));
      CURRENT_USER_REVIEW_ID = null;
      bdReviewText.value='';
      bdStarPicker.setAttribute('data-rating','0');
      renderStarPicker(0);
      bdDeleteReview.style.display='none';
      bdReviewMsg.textContent='Review deleted.';
    } catch (e){
      console.error('Delete review failed', e);
      bdReviewMsg.textContent='Failed to delete review.';
    }
  });
}

// search filtering
const searchInput = document.getElementById("searchInput");
if (searchInput) searchInput.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = BOOKS.filter((b) =>
    (b.title + " " + b.author).toLowerCase().includes(q)
  );
  renderBooks(filtered);
});

window.handleLogout = async function () {
  try {
    await signOut(auth);
    alert("You have logged out.");
    window.location.href = "index.html";
  } catch (error) {
    alert("Logout failed: " + error.message);
  }
};

// mobile nav demo (expand inline links under header)
const navToggle = document.getElementById("navToggle");
if (navToggle) navToggle.addEventListener("click", () => {
  const existing = document.getElementById("mobileMenu");
  if (existing) {
    existing.remove();
    return;
  }
  const menu = document.createElement("div");
  menu.id = "mobileMenu";
  menu.style.background = "var(--paper)";
  menu.style.borderTop = "1px solid var(--line)";
  menu.innerHTML = `<div class="container" style="padding:12px 20px 16px; display:grid; gap:10px;">
        <a href="homepage-logged.html">Home</a>
        <a href="#popular">Store</a>
        <a href="about-us-logged.html">About us</a>
      </div>`;
  document.querySelector(".site-header").appendChild(menu);
});

// boot
document.getElementById("yr").textContent = new Date().getFullYear();

// --- category filtering ---
document.querySelectorAll('input[name="category"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const selected = e.target.value;
    if (selected === "all") {
      renderBooks(BOOKS); // show everything
    } else {
      const filtered = BOOKS.filter((b) => b.category === selected);
      renderBooks(filtered);
    }
  });
});

// --- price range slider ---
const minPrice = document.getElementById("minPrice");
const maxPrice = document.getElementById("maxPrice");
const minPriceVal = document.getElementById("minPriceVal");
const maxPriceVal = document.getElementById("maxPriceVal");

// update displayed values when sliders move
if (minPrice && maxPrice && minPriceVal && maxPriceVal) {
  [minPrice, maxPrice].forEach((slider) => {
    slider.addEventListener("input", () => {
      minPriceVal.textContent = minPrice.value;
      maxPriceVal.textContent = maxPrice.value;
      applyFilters();
    });
  });
}

// --- update your applyFilters() ---
function applyFilters() {
  const selectedCategory = document.querySelector(
    'input[name="category"]:checked'
  ).value;
  const searchTerm = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const min = parseInt(minPrice.value);
  const max = parseInt(maxPrice.value);

  let filtered = BOOKS;

  // filter by category
  if (selectedCategory !== "all") {
    filtered = filtered.filter((b) => b.category === selectedCategory);
  }

  // filter by price range
  filtered = filtered.filter((b) => b.price >= min && b.price <= max);

  // filter by search keyword
  if (searchTerm) {
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(searchTerm) ||
        b.author.toLowerCase().includes(searchTerm)
    );
  }

  renderBooks(filtered);
}
// --- Cart system ---

async function updateCart() {
  cartItemsEl.innerHTML = "";
  let total = 0;
  try { localStorage.setItem('pp:cartBackup', JSON.stringify(cart)); } catch {}
  const proceedBtn = document.getElementById('checkoutProceedBtn');

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="empty-cart-message">🛒 Your cart is empty.</p>`;
    cartTotalEl.textContent = `Total: ₱0.00`;
    cartCount.textContent = "0";
    if (proceedBtn) {
      proceedBtn.setAttribute('aria-disabled','true');
      proceedBtn.classList.add('disabled');
      proceedBtn.style.pointerEvents = 'none';
      proceedBtn.style.opacity = '0.5';
    }
    return;
  }

  cart.forEach((item, i) => {
    total += item.price * item.qty;

    const div = document.createElement("div");
    div.classList.add("cart-item");

    div.innerHTML = `
            <img src="${item.cover}" alt="${item.title}" style="width: 60px; height: 90px; object-fit: cover; border-radius: 6px;">
            <div class="cart-item-details">
              <h4 style="margin-left: 20px">${item.title}</h4>
              <p style="margin-left: 20px">${item.author || "No Brand"}</p>
            </div>
            <div class="cart-item-price">₱${item.price.toFixed(2)}</div>
            <div class="cart-qty">
              <button class="decrease"><span>-</span></button>
              <input type="text" value="${item.qty}" readonly>
              <button class="increase"><span>+</span></button>
            </div>
            <span class="cart-remove">🗑</span>
          `;

    div.querySelector(".cart-remove").addEventListener("click", async () => {
      cart.splice(i, 1);
      await updateCart();
      await saveCartToFirestore();
    });

    div.querySelector(".decrease").addEventListener("click", async () => {
      if (item.qty > 1) {
        item.qty--;
        await updateCart();
        await saveCartToFirestore();
      }
    });

    div.querySelector(".increase").addEventListener("click", async () => {
      const maxStock = typeof item.stock === 'number' ? item.stock : Infinity;
      if (item.stock !== undefined && item.qty >= maxStock) {
        alert('Cannot exceed available stock.');
        return;
      }
      item.qty++;
      await updateCart();
      await saveCartToFirestore();
    });

    cartItemsEl.appendChild(div);
  });

  cartTotalEl.textContent = `Total: ₱${total.toFixed(2)}`;
  cartCount.textContent = cart.length;
  if (proceedBtn) {
    proceedBtn.setAttribute('aria-disabled','false');
    proceedBtn.classList.remove('disabled');
    proceedBtn.style.pointerEvents = '';
    proceedBtn.style.opacity = '';
  }
}

// Show/hide cart modal
if (cartBtn) {
  cartBtn.addEventListener("click", async () => {
    await loadCartFromFirestore();
    cartModal.style.display = "flex";
  });
}

// On initial load (before auth snapshot might apply), attempt to hydrate cart from localStorage backup
try {
  const backup = localStorage.getItem('pp:cartBackup');
  if (backup) {
    const parsed = JSON.parse(backup);
    if (Array.isArray(parsed) && parsed.length && cart.length === 0) {
      cart = parsed;
      updateCart();
      console.debug('[PP] Cart hydrated from localStorage backup with', parsed.length, 'items');
    }
  }
} catch (e) { console.warn('[PP] Failed to restore cart backup', e); }

if (closeCart) {
  closeCart.addEventListener("click", () => {
    cartModal.style.display = "none";
  });
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === cartModal) {
    cartModal.style.display = "none";
  }
});

// ---------- Transactions Modal (Realtime) ----------
let txUnsub = null;
function renderTransactionsSnapshot(snap) {
  if (!transContent) return;
  if (snap.empty) {
    transContent.innerHTML = `
      <div class="tx-tabs">
        <button class="tx-tab active" data-tab="in">In Process</button>
        <button class="tx-tab" data-tab="done">Complete</button>
        <button class="tx-tab" data-tab="refund">Refund</button>
      </div>
      <div class="tx-panels">
        <div class="tx-panel" data-tab="in"><p>No transactions yet.</p></div>
        <div class="tx-panel" data-tab="done" style="display:none;"><p>No transactions yet.</p></div>
        <div class="tx-panel" data-tab="refund" style="display:none;"><p>No refund transactions.</p></div>
      </div>`;
    return;
  }
  const rowsIn = [];
  const rowsDone = [];
  const rowsRefund = [];
  snap.forEach((d) => {
    const data = d.data();
    const date = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    const when = date ? date.toLocaleString() : '';
    const total = typeof data.total === 'number' ? `₱${data.total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}` : '';
    const paymentStatus = data.status || 'initiated';
    const deliveryStatus = data.delivstatus || data.deliveryStatus || data.fulfillmentStatus || 'pending';
    const shipFee = typeof data.shippingFee === 'number'
      ? `₱${data.shippingFee.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`
      : '₱0.00';
    const itemsArr = Array.isArray(data.items) ? data.items : [];
    const payNorm = String(paymentStatus||'').toLowerCase();
    const delivNorm = String(deliveryStatus||'').toLowerCase();
    const isPaid = (payNorm === 'paid' || payNorm === 'complete' || payNorm === 'completed' || payNorm === 'success');
    const isDelivered = (delivNorm === 'delivered');
    const delivLower = String(deliveryStatus).toLowerCase();
  const isRefundState = (delivLower === 'refund-processing' || delivLower === 'refunded' || delivLower === 'refund-rejected');
    const isComplete = isPaid && isDelivered;
    const items = itemsArr.map((it) => {
      const price = typeof it.price === 'number' ? `₱${it.price.toLocaleString()}` : '';
      const qty = it.qty || 1;
      const cover = it.cover || '';
      const rateBtn = (isComplete && !isRefundState) ? `<button class=\"btn tertiary small btn-rate-book\" data-book-id=\"${it.id || ''}\" data-title=\"${(it.title||'').replace(/"/g,'&quot;')}\" data-author=\"${(it.author||'').replace(/"/g,'&quot;')}\" style=\"margin-left:auto;\">Rate</button>` : '';
      return `
        <li style=\"display:flex; gap:16px; align-items:center; padding:14px 0; border-bottom:1px solid var(--line)\">
          <img src=\"${cover}\" alt=\"\" style=\"width:60px; height:90px; object-fit:cover; border-radius:8px; background:#eee;\" />
          <div style=\"flex:1; min-width:0;\">
            <div style=\"font-weight:700; margin-bottom:2px;\">${it.title || 'Item'}</div>
            <div style=\"font-size:13px; color:var(--muted-ink)\">${it.author || ''}</div>
            <div style=\"display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:6px;\">
              <span style=\"font-size:12px; color:var(--muted-ink);\">Qty: ${qty}</span>
              <span style=\"font-size:12px; font-weight:600;\">${price}</span>
              ${rateBtn}
            </div>
          </div>
        </li>`;
    }).join('');
    let actionBtnHtml = '';
    if (isRefundState) {
      if (delivLower === 'refund-processing') {
        actionBtnHtml = '<span style="font-size:16px; font-weight: bold; color:white; background-color: #888125ff; border: 1px solid black; padding: 8px 10px; border-radius: 8%">Refund Request Pending</span>';
      } else if (delivLower === 'refund-rejected') {
        actionBtnHtml = '<span style="font-size:16px; font-weight: bold; color:white; background-color: #4f221fff; border: 1px solid black; padding: 8px 10px; border-radius: 8%">Refund Rejected</span>';
      } else { // refunded
        actionBtnHtml = '<span style="font-size:18px; font-weight: bold; color:white; background-color: #344F1F; border: 1px solid black; padding: 8px 10px; border-radius: 8%">Refunded</span>';
      }
    } else if (isComplete) {
      actionBtnHtml = `<button class="btn secondary small btn-refund" data-txid="${d.id}">Refund</button>`;
    } else {
      actionBtnHtml = `<button class="btn secondary small btn-cancel" data-txid="${d.id}">Cancel</button>`;
    }
    const rowHtml = `
      <li style="border-bottom:1px solid var(--line); margin:12px 0; padding:8px 0;">
        <details>
          <summary style="display:flex; align-items:center; gap:10px; list-style:none; cursor:pointer;">
            <span class="tx-chevron" aria-hidden="true" style="margin-right:6px; display:inline-flex;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="#7E6E5B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div style="flex:1">
              <div style="font-weight:700">Order #${d.id}</div>
              <div style="font-size:12px; color:var(--muted-ink)">${when}</div>
            </div>
            <div style="min-width:90px; font-weight:700;">${total}</div>
            <div class="pill" style="white-space:nowrap; text-transform:capitalize;">${deliveryStatus}</div>
          </summary>
          <div style="margin-top:10px; font-size:13px; color:var(--muted-ink);">
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
              <span><strong>Payment:</strong> ${paymentStatus}</span>
              <span><strong>Delivery:</strong> ${deliveryStatus}</span>
              <span><strong>Delivery fee:</strong> ${shipFee}</span>
            </div>
          </div>
          <ul style="list-style:none; padding:0; margin:12px 0 0;">${items || '<li style="padding:8px 0;">No items</li>'}</ul>
          <div class="tx-actions" style="display:flex; gap:10px; margin-top:12px;">
            <button class="btn small btn-print" data-txid="${d.id}">Print receipt</button>
            ${actionBtnHtml}
          </div>
        </details>
      </li>`;
    if (isRefundState) rowsRefund.push(rowHtml);
    else if (isComplete) rowsDone.push(rowHtml); else rowsIn.push(rowHtml);
  });
  const inHTML = rowsIn.length ? `<ul style="list-style:none; padding:0; margin:0">${rowsIn.join('')}</ul>` : `<p class="empty-cart-message">No in‑process orders.</p>`;
  const doneHTML = rowsDone.length ? `<ul style="list-style:none; padding:0; margin:0">${rowsDone.join('')}</ul>` : `<p class="empty-cart-message">No completed orders.</p>`;
  const refundHTML = rowsRefund.length ? `<ul style="list-style:none; padding:0; margin:0">${rowsRefund.join('')}</ul>` : `<p class="empty-cart-message">No refund transactions.</p>`;
  transContent.innerHTML = `
    <div class="tx-tabs">
      <button class="tx-tab active" data-tab="in">In Process</button>
      <button class="tx-tab" data-tab="done">Complete</button>
      <button class="tx-tab" data-tab="refund">Refund</button>
    </div>
    <div class="tx-panels">
      <div class="tx-panel" data-tab="in">${inHTML}</div>
      <div class="tx-panel" data-tab="done" style="display:none;">${doneHTML}</div>
      <div class="tx-panel" data-tab="refund" style="display:none;">${refundHTML}</div>
    </div>`;
}

function subscribeTransactions() {
  if (!transContent) return;
  const user = auth.currentUser;
  if (!user) {
    transContent.innerHTML = '<p>Please log in to see your transactions.</p>';
    return;
  }
  if (txUnsub) { txUnsub(); txUnsub = null; }
  transContent.innerHTML = '<p>Loading...</p>';
  const qTx = query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt','desc'));
  txUnsub = onSnapshot(qTx, (snap) => {
    renderTransactionsSnapshot(snap);
  }, (err) => {
    console.error('Transactions realtime failed', err);
    transContent.innerHTML = '<p>Failed to load transactions.</p>';
  });
}

if (transBtn && transModal) {
  transBtn.addEventListener('click', () => {
    subscribeTransactions();
    transModal.style.display = 'flex';
  });
}
if (closeTrans && transModal) {
  closeTrans.addEventListener("click", () => (transModal.style.display = "none"));
}
window.addEventListener("click", (e) => {
  if (e.target === transModal) transModal.style.display = "none";
});

// Refund reason modal handlers
if (closeRefundReason) {
  closeRefundReason.addEventListener('click', () => {
    if (refundReasonModal) refundReasonModal.style.display = 'none';
    REFUND_TARGET_TXID = null;
  });
}
if (cancelRefundReason) {
  cancelRefundReason.addEventListener('click', () => {
    if (refundReasonModal) refundReasonModal.style.display = 'none';
    REFUND_TARGET_TXID = null;
    clearRefundImages();
  });
}
window.addEventListener('click', (e) => {
  if (refundReasonModal && e.target === refundReasonModal) {
    refundReasonModal.style.display = 'none';
    REFUND_TARGET_TXID = null;
    clearRefundImages();
  }
});
if (refundReasonForm) {
  refundReasonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!REFUND_TARGET_TXID) { return; }
    const user = auth.currentUser; if (!user) return;
    const selected = refundReasonForm.querySelector('input[name="refundReason"]:checked');
    const reason = selected ? selected.value : '';
    if (!reason) { if (refundReasonMsg) refundReasonMsg.textContent = 'Please select a reason.'; return; }
    try {
      const txRef = doc(db, 'users', user.uid, 'transactions', REFUND_TARGET_TXID);
      const snap = await getDoc(txRef);
      if (!snap.exists()) throw new Error('Transaction missing');
      const data = snap.data() || {};
      const status = (data.status || '').toString().toLowerCase();
      if (status !== 'paid') { if (refundReasonMsg) refundReasonMsg.textContent = 'Only paid orders can be refunded.'; return; }
      // Include evidence images if provided
      const refundImages = REFUND_IMAGE_DATA.map(i => ({ name: i.name, type: i.type, dataUrl: i.dataUrl }));
      await updateDoc(txRef, { delivstatus: 'refund-processing', refundRequestedAt: serverTimestamp(), refundReason: reason, refundImages });
      if (refundReasonModal) refundReasonModal.style.display = 'none';
      REFUND_TARGET_TXID = null;
      clearRefundImages();
      alert('Refund request submitted.');
    } catch (err) {
      console.error('Submit refund reason failed', err);
      if (refundReasonMsg) refundReasonMsg.textContent = 'Failed to submit refund.';
    }
  });
}

// Transactions actions: delegated handlers for tabs, print, refund, cancel
if (transContent) {
  transContent.addEventListener('click', async (e) => {
    // Tab switching
    const tabBtn = e.target.closest('.tx-tab');
    if (tabBtn) {
      const tab = tabBtn.getAttribute('data-tab');
      transContent.querySelectorAll('.tx-tab').forEach(b => b.classList.toggle('active', b === tabBtn));
      transContent.querySelectorAll('.tx-panel').forEach(p => {
        p.style.display = (p.getAttribute('data-tab') === tab) ? '' : 'none';
      });
      return;
    }
    const user = auth.currentUser;
    // Rate button inside completed order items
    const rateBtn = e.target.closest('.btn-rate-book');
    if (rateBtn && user) {
      const bookId = rateBtn.getAttribute('data-book-id');
      let idToOpen = bookId;
      if (!idToOpen) {
        const title = rateBtn.getAttribute('data-title')||'';
        const author = rateBtn.getAttribute('data-author')||'';
        const match = BOOKS.find(b => b.title === title && (!author || b.author === author));
        if (match) idToOpen = match.id;
      }
      if (idToOpen) {
        openBookDetail(idToOpen);
        setTimeout(()=>{
          const reviewSection = document.getElementById('bdReviewsSection');
          if (reviewSection) reviewSection.scrollIntoView({behavior:'smooth'});
          if (bdReviewText) bdReviewText.focus({preventScroll:true});
        }, 300);
      }
      return; // stop further handling
    }
    const printBtn = e.target.closest('.btn-print');
    if (printBtn && user) {
      const txid = printBtn.getAttribute('data-txid');
      if (!txid) return;
      try {
        // block print when unpaid
        const txRef = doc(db, 'users', user.uid, 'transactions', txid);
        const snap = await getDoc(txRef);
        const data = snap.exists() ? snap.data() : {};
        const status = (data.status || '').toString().toLowerCase();
        if (status !== 'paid') { alert('Not yet paid'); return; }
        await printReceipt(user.uid, txid);
      } catch (err) { console.error('Print failed', err); }
      return;
    }
    const refundBtn = e.target.closest('.btn-refund');
    if (refundBtn && user) {
      const txid = refundBtn.getAttribute('data-txid');
      if (!txid) return;
      try {
        const txRef = doc(db, 'users', user.uid, 'transactions', txid);
        const snap = await getDoc(txRef);
        const data = snap.exists() ? snap.data() : {};
        const status = (data.status || '').toString().toLowerCase();
        if (status !== 'paid') { alert('Refund is only available for paid orders.'); return; }
        // Open reason modal
        REFUND_TARGET_TXID = txid;
        // Clear any previous selection
        if (refundReasonForm) {
          refundReasonForm.querySelectorAll('input[name="refundReason"]').forEach(r=> r.checked = false);
        }
        if (refundReasonMsg) refundReasonMsg.textContent = '';
        if (refundReasonModal) refundReasonModal.style.display = 'flex';
      } catch (err) {
        console.error('Prepare refund failed', err);
        alert('Failed to open refund request.');
      }
    }

    const cancelBtn = e.target.closest('.btn-cancel');
    if (cancelBtn && user) {
      const txid = cancelBtn.getAttribute('data-txid');
      if (!txid) return;
      try {
        const txRef = doc(db, 'users', user.uid, 'transactions', txid);
        const snap = await getDoc(txRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const deliv = (data.delivstatus || data.deliveryStatus || '').toString().toLowerCase();
        if (deliv !== 'pending') {
          alert('The order is now on process');
          return;
        }
        const ok = confirm('Are you sure you want to delete this order?');
        if (!ok) return;
        await deleteDoc(txRef);
        alert('Order cancelled.');
        await loadTransactions();
      } catch (err) {
        console.error('Cancel failed', err);
        alert('Failed to cancel the order.');
      }
    }
  });
}

// Ensure jsPDF is available (UMD)
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => resolve(window.jspdf?.jsPDF);
    s.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(s);
  });
}

// Load Unicode-capable fonts so the peso sign (₱) renders correctly
async function ensurePdfFonts(docPdf) {
  try {
    const fontList = (docPdf.getFontList && docPdf.getFontList()) || {};
    if (fontList.NotoSans || fontList.Roboto) return; // already added

    const fetchBase64 = async (url) => {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('Font fetch failed: ' + url);
      const buf = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    };

    // Try Noto Sans first (broad Unicode coverage)
    try {
      const notoReg = await fetchBase64('https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Regular.ttf');
      const notoBold = await fetchBase64('https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Bold.ttf');
      docPdf.addFileToVFS('NotoSans-Regular.ttf', notoReg);
      docPdf.addFileToVFS('NotoSans-Bold.ttf', notoBold);
      docPdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      docPdf.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      return;
    } catch (e) {
      // Fall back to Roboto if Noto Sans isn't reachable
    }

    // Fallback: pdfmake-hosted Roboto fonts (CORS enabled)
    const regularB64 = await fetchBase64('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto-Regular.ttf');
    const boldB64 = await fetchBase64('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto-Medium.ttf');
    docPdf.addFileToVFS('Roboto-Regular.ttf', regularB64);
    docPdf.addFileToVFS('Roboto-Bold.ttf', boldB64);
    docPdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    docPdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  } catch (e) {
    console.warn('Falling back to standard font; peso sign may not render:', e);
  }
}

async function printReceipt(uid, txid) {
  const txRef = doc(db, 'users', uid, 'transactions', txid);
  const snap = await getDoc(txRef);
  if (!snap.exists()) throw new Error('Transaction not found');
  const tx = snap.data();
  const when = tx.createdAt?.toDate ? tx.createdAt.toDate() : null;
  const whenStr = when ? when.toLocaleString() : '';
  const items = Array.isArray(tx.items) ? tx.items : [];
  const ship = tx.shipping || {};
  const total = typeof tx.total === 'number' ? tx.total : 0;
  const sub = typeof tx.subtotal === 'number' ? tx.subtotal : (items.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0));
  const fee = typeof tx.shippingFee === 'number' ? tx.shippingFee : (total - sub);
  const payMethod = tx.paymentMethod || '';
  const payStatus = tx.status || '';

  const jsPDF = await loadJsPDF();
  if (!jsPDF) throw new Error('jsPDF unavailable');
  const docPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  await ensurePdfFonts(docPdf);

  // Helpers
  const peso = (n, opts = {}) => {
    const num = Number(n || 0);
    const { min = 2, max = 2 } = opts;
    // Use Philippine locale; prefix with Unicode peso explicitly
    return "\u20B1" + num.toLocaleString('en-PH', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
  };

  // Header
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'bold');
  docPdf.setFontSize(20);
  docPdf.text('Prestige Pages', 105, 18, { align: 'center' });
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'normal');
  docPdf.setFontSize(11);
  docPdf.text(`Order #${txid}`, 14, 28);
  docPdf.text(`Date: ${whenStr}`, 14, 34);

  // Items header
  let y = 44;
  const pageW = docPdf.internal.pageSize.getWidth();
  const rightX = pageW - 14;
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'bold');
  docPdf.text('Items', 14, y);
  y += 6;
  docPdf.setLineWidth(0.2);
  docPdf.line(14, y, rightX, y);
  y += 6;
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'bold');
  docPdf.text('Title', 14, y);
  docPdf.text('Qty', 150, y, { align: 'right' });
  docPdf.text('Price', rightX, y, { align: 'right' });
  y += 4;
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'normal');

  const addLine = () => { y += 6; if (y > 280) { docPdf.addPage(); y = 20; } };

  if (items.length === 0) {
    docPdf.text('No items', 14, y); y += 6;
  } else {
    for (const it of items) {
      const title = it.title || 'Item';
      const qty = String(it.qty || 1);
  const price = "\u20B1" + Number(it.price||0).toLocaleString('en-PH');
      const titleLines = docPdf.splitTextToSize(title, 120);
      for (let i = 0; i < titleLines.length; i++) {
        docPdf.text(titleLines[i], 14, y);
        if (i === 0) {
          docPdf.text(qty, 150, y, { align: 'right' });
          docPdf.text(price, rightX, y, { align: 'right' });
        }
        addLine();
      }
    }
  }

  // Totals
  y += 2; if (y > 280) { docPdf.addPage(); y = 20; }
  docPdf.setLineWidth(0.2); docPdf.line(14, y, rightX, y); y += 6;
  docPdf.text('Subtotal:', 150, y, { align: 'right' });
  docPdf.text(peso(sub), rightX, y, { align: 'right' });
  y += 6;
  docPdf.text('Shipping:', 150, y, { align: 'right' });
  docPdf.text(peso(fee), rightX, y, { align: 'right' });
  y += 6;
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'bold');
  docPdf.text('Total:', 150, y, { align: 'right' });
  docPdf.text(peso(total), rightX, y, { align: 'right' });
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'normal');
  y += 10;

  // Payment and Shipping
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'bold');
  docPdf.text('Payment', 14, y); y += 6;
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'normal');
  docPdf.text(`Method: ${payMethod || '—'}`, 14, y); y += 6;
  docPdf.text(`Status: ${payStatus || '—'}`, 14, y); y += 10;

  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'bold');
  docPdf.text('Shipping', 14, y); y += 6;
  docPdf.setFont((docPdf.getFontList().NotoSans ? 'NotoSans' : 'Roboto'), 'normal');
  const shipLines = [
    `${ship.name || ''}`.trim(),
    `${ship.email || ''}`.trim(),
    `${ship.phone || ''}`.trim(),
    `${ship.unit || ''} ${ship.street || ''}`.trim(),
    `${ship.baranggay || ''}`.trim(),
    `${ship.city || ''}, ${ship.province || ''} ${ship.postal || ''}`.trim(),
  ].filter(Boolean);
  for (const line of shipLines) { docPdf.text(line, 14, y); addLine(); }

  y += 4;
  docPdf.setFontSize(10);
  docPdf.setTextColor(120);
  docPdf.text('Thank you for shopping with Prestige Pages!', 14, y);

  // Save PDF
  const filename = `PrestigePages-Receipt-${txid}.pdf`;
  docPdf.save(filename);
}

// Wishlist modal handlers
wishlistBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to view your wishlist");
    return;
  }

  // Refresh wishlist from Firestore
  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    USER_WISHLIST = docSnap.data().wishlist || [];
  }

  // Display wishlist items
  wishlistItemsEl.innerHTML = "";
  if (USER_WISHLIST.length === 0) {
    wishlistItemsEl.innerHTML = "<p>Your wishlist is empty</p>";
  } else {
    USER_WISHLIST.forEach((item) => {
      const div = document.createElement("div");
      div.className = "wishlist-item";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.gap = "15px";
      div.style.padding = "10px 0";
      div.style.borderBottom = "1px solid var(--line)";

      div.innerHTML = `
          <img src="${item.cover}" alt="${
        item.title
      }" style="width: 60px; height: 90px; object-fit: cover; border-radius: 6px;">
          <div style="flex: 1">
            <h4 style="margin: 0 0 5px">${item.title}</h4>
            <p style="margin: 0; color: var(--muted-ink)">by ${item.author}</p>
            <p style="margin: 5px 0 0">₱${item.price.toFixed(2)}</p>
          </div>
          <button class="remove-from-wishlist btn secondary small" data-title="${
            item.title
          }" data-author="${item.author}">Remove</button>
        `;

      div
        .querySelector(".remove-from-wishlist")
        .addEventListener("click", async () => {
          const user = auth.currentUser;
          if (!user) return;

          const userDocRef = doc(db, "users", user.uid);
          try {
            await updateDoc(userDocRef, {
              wishlist: arrayRemove(item),
            });
            USER_WISHLIST = USER_WISHLIST.filter(
              (b) => !(b.title === item.title && b.author === item.author)
            );
            div.remove();
            if (USER_WISHLIST.length === 0) {
              wishlistItemsEl.innerHTML = "<p>Your wishlist is empty</p>";
            }

            // Update heart button state if book is visible
            const heartBtn = document.querySelector(
              `.btn.icon.secondary.active[data-title="${CSS.escape(item.title)}"][data-author="${CSS.escape(item.author)}"]`
            );
            if (heartBtn) {
              heartBtn.classList.remove("active");
              const p = heartBtn.querySelector('svg path');
              if (p) p.setAttribute('fill', '#fff');
            } else {
              // Fallback: sync all if direct one not found
              if (typeof updateAllHeartStates === 'function') updateAllHeartStates();
            }
          } catch (err) {
            console.error("Failed to remove from wishlist:", err);
            alert("Failed to remove from wishlist");
          }
        });

      wishlistItemsEl.appendChild(div);
    });
  }

  wishlistModal.style.display = "flex";
});

closeWishlistBtn.addEventListener("click", () => {
  wishlistModal.style.display = "none";
});

// Close wishlist modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === wishlistModal) {
    wishlistModal.style.display = "none";
  }
});

 // Open modal
    if (openBtn && modal) {
      openBtn.onclick = () => {
        modal.style.display = "block";
      };
    }

    // Close modal
    if (closeBtn && modal) {
      closeBtn.onclick = () => {
        modal.style.display = "none";
      };
    }

    // Close modal when clicking outside
    window.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    };

    /* ------------------ Inactivity / Session Timeout ------------------
   - INACTIVITY_LIMIT_MINUTES: how many minutes of inactivity before warning+logout
   - WARNING_DURATION_SECONDS: how long (seconds) the warning modal shows before logout
   - Change INACTIVITY_LIMIT_MINUTES below to adjust the timeout duration.
--------------------------------------------------------------------- */
(function(){
  try {
    const INACTIVITY_LIMIT_MINUTES = 5; // ⚙️ Change this number to adjust timeout
    const WARNING_DURATION_SECONDS = 60; // Warning duration before logout (optional)
    const INACTIVITY_LIMIT_MS = INACTIVITY_LIMIT_MINUTES * 60 * 1000;
    const WARNING_OFFSET_MS = WARNING_DURATION_SECONDS * 1000;

    let inactivityTimer, warningTimer, countdownInterval;

    // Create small warning modal dynamically
    function createWarningModal() {
      if (document.getElementById('inactivityWarningModal')) return;
      const modal = document.createElement('div');
      modal.id = 'inactivityWarningModal';
      modal.className = 'modal';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:350px; text-align:center;">
          <h3>⚠️ Inactivity Detected</h3>
          <p>You will be logged out in <strong id="inactivityCountdown">${WARNING_DURATION_SECONDS}</strong> seconds.</p>
          <div style="margin-top:10px;">
            <button id="stayLoggedInBtn" class="btn small">Stay Logged In</button>
            <button id="logoutNowBtn" class="btn small secondary">Logout Now</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('stayLoggedInBtn').onclick = resetInactivity;
      document.getElementById('logoutNowBtn').onclick = logoutNow;

      // Do not cancel on backdrop click anymore
      modal.addEventListener('click', (e)=>{ /* no-op on backdrop */ });

    }

    function showModal() {
      const modal = document.getElementById('inactivityWarningModal');
      const countdownEl = document.getElementById('inactivityCountdown');
      if (!modal) return;
      modal.style.display = 'flex';
      let remaining = WARNING_DURATION_SECONDS;
      countdownEl.textContent = remaining;
      countdownInterval = setInterval(() => {
        remaining--;
        countdownEl.textContent = remaining;
        if (remaining <= 0) clearInterval(countdownInterval);
      }, 1000);
    }

    function hideModal() {
      const modal = document.getElementById('inactivityWarningModal');
      if (!modal) return;
      modal.style.display = 'none';
      if (countdownInterval) clearInterval(countdownInterval);
    }

    function scheduleTimers() {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      warningTimer = setTimeout(showModal, INACTIVITY_LIMIT_MS - WARNING_OFFSET_MS);
      inactivityTimer = setTimeout(logoutNow, INACTIVITY_LIMIT_MS);
    }

    function resetInactivity() {
      hideModal();
      scheduleTimers();
    }

    async function logoutNow() {
      hideModal();
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      try {
        await auth.signOut();
      } catch (err) {
        console.warn('Sign-out failed:', err);
      }
      window.location.href = 'login.html';
    }

    function initInactivityTracking() {
      createWarningModal();
      // ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
      //   document.addEventListener(evt, resetInactivity, { passive: true });
      // });
      // document.addEventListener('visibilitychange', () => {
      //   if (!document.hidden) resetInactivity();
      // });
      scheduleTimers();
    }

    onAuthStateChanged(auth, (user) => {
      if (user) initInactivityTracking();
      else {
        clearTimeout(inactivityTimer);
        clearTimeout(warningTimer);
      }
    });
  } catch (err) {
    console.error('Inactivity timeout setup failed:', err);
  }
})();
