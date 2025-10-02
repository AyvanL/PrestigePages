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
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    }
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
      const firstName = docSnap.data().firstName;
      welcomeEl.textContent = firstName;
      // Load wishlist if available
      USER_WISHLIST = docSnap.data().wishlist || [];
    } else {
      welcomeEl.textContent = "Welcome User!";
    }

    // Load cart from Firestore
    await loadCartFromFirestore();

    // Render books after wishlist is loaded
    renderBooks(BOOKS);
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

// --- Demo data -------------------------------------------------------
const BOOKS = [
  {
    title: "For the Record",
    author: "Emma Lord",
    price: 1025.99,
    rating: 4,
    category: "romance",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1726945848i/217387723.jpg",
  },
  {
    title: "High Seasons",
    author: "Katie Bishop",
    price: 1709.94,
    rating: 3.83,
    category: "mystery",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1728226919i/217388179.jpg",
  },
  {
    title:
      "We Are Eating the Earth: The Race to Fix Our Food System and Save Our Climate",
    author: "Michael Grunwarld",
    price: 1708.17,
    rating: 4.26,
    category: "science",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1732454271i/220595471.jpg",
  },
  {
    title: "Hotshot: A Life on Fire",
    author: "River Selby",
    price: 1200,
    rating: 3.81,
    category: "non-fiction",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1739100108i/219301091.jpg",
  },
  {
    title: "Ghost Circus",
    author: "Adrienne Kress, Jade Zhang",
    price: 799,
    rating: 4,
    category: "children",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1740594745i/218681305.jpg",
  },
  {
    title: "The Fellowship of the Ring",
    author: "J.R.R. Tolkien",
    price: 799,
    rating: 4,
    category: "classics",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1654215925i/61215351.jpg",
  },
  {
    title: "Psylocke Vol. 1: Guardian",
    author: "Alyssa Wong",
    price: 799,
    rating: 3.52,
    category: "comics",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1728445659i/220240990.jpg",
  },
  {
    title: "Abundance",
    author: "Ezra Klein, Derek Thompson",
    price: 799,
    rating: 4.02,
    category: "business",
    cover:
      "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1737312514i/176444106.jpg",
  },
];

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

    const img = el("img", "cover");
    img.alt = `${b.title} cover`;
    img.src = b.cover;
    card.appendChild(img);

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
    priceRow.appendChild(el("div", "pill", "In stock"));
    body.appendChild(priceRow);

    const actions = el("div", "actions-row");

    const addBtn = el("button", "btn small");
    addBtn.textContent = "Add to Cart";
    addBtn.addEventListener("click", async () => {
      const existing = cart.find((c) => c.title === b.title);
      if (existing) {
        existing.qty++;
      } else {
        cart.push({ ...b, qty: 1 });
      }
      await saveCartToFirestore();
      await updateCart();
      alert(`Added "${b.title}" to cart.`);
    });

    const heart = el("button", "btn icon secondary");
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
      item.qty++;
      await updateCart();
      await saveCartToFirestore();
    });

    cartItemsEl.appendChild(div);
  });

  cartTotalEl.textContent = `Total: ₱${total.toFixed(2)}`;
  cartCount.textContent = cart.length;
}

// Show/hide cart modal
if (cartBtn) {
  cartBtn.addEventListener("click", async () => {
    await loadCartFromFirestore();
    cartModal.style.display = "flex";
  });
}

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

// ---------- Transactions Modal ----------
async function loadTransactions() {
  if (!transContent) return;
  const user = auth.currentUser;
  if (!user) {
    transContent.innerHTML = `<p>Please log in to see your transactions.</p>`;
    return;
  }
  transContent.innerHTML = `<p>Loading...</p>`;
  try {
    const q = query(collection(db, "users", user.uid, "transactions"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      transContent.innerHTML = `<p>No transactions yet.</p>`;
      return;
    }

    const rows = [];
    snap.forEach((d) => {
      const data = d.data();
      const date = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      const when = date ? date.toLocaleString() : "";
      const total = typeof data.total === "number" ? `₱${data.total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}` : "";
      const paymentStatus = data.status || "initiated"; // payment status (paid/initiated)
      const deliveryStatus = data.delivstatus || data.deliveryStatus || data.fulfillmentStatus || "pending"; // shipping status
      const shipFee = typeof data.shippingFee === "number"
        ? `₱${data.shippingFee.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`
        : "₱0.00";

      const items = (Array.isArray(data.items) ? data.items : []).map((it) => {
        const price = typeof it.price === "number" ? `₱${it.price.toLocaleString()}` : "";
        const qty = it.qty || 1;
        const cover = it.cover || "";
        return `
          <li style="display:flex; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid var(--line)">
            <img src="${cover}" alt="" style="width:50px; height:70px; object-fit:cover; border-radius:6px; background:#eee;" />
            <div style="flex:1">
              <div style="font-weight:700">${it.title || 'Item'}</div>
              <div style="font-size:12px; color:var(--muted-ink)">${it.author || ''}</div>
            </div>
            <div style="white-space:nowrap;">x${qty}</div>
            <div style="min-width:90px; text-align:right; font-weight:700;">${price}</div>
          </li>`;
      }).join("");

      rows.push(`
        <li style="border-bottom:1px solid var(--line);">
          <details>
            <summary style="display:flex; align-items:center; gap:10px; list-style:none; cursor:pointer;">
              <span class=\"tx-chevron\" aria-hidden=\"true\" style=\"margin-right:6px; display:inline-flex;\">
                <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"> 
                  <path d=\"M6 9l6 6 6-6\" stroke=\"#7E6E5B\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>
                </svg>
              </span>
              <div style="flex:1">
                <div style="font-weight:700">Order #${d.id}</div>
                <div style="font-size:12px; color:var(--muted-ink)">${when}</div>
              </div>
              <div style="min-width:90px; font-weight:700;">${total}</div>
              <div class=\"pill\" style=\"white-space:nowrap; text-transform:capitalize;\">${deliveryStatus}</div>
            </summary>
            <div style="margin-top:10px; font-size:13px; color:var(--muted-ink);">
              <div style=\"display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:8px;\">
                <span><strong>Payment:</strong> ${paymentStatus}</span>
                <span><strong>Delivery:</strong> ${deliveryStatus}</span>
                <span><strong>Delivery fee:</strong> ${shipFee}</span>
              </div>
            </div>
            <ul style="list-style:none; padding:0; margin:10px 0 0;">${items || '<li style="padding:8px 0;">No items</li>'}</ul>
          </details>
        </li>`);
    });

    transContent.innerHTML = `<ul style="list-style:none; padding:0; margin:0">${rows.join("")}</ul>`;
  } catch (err) {
    console.error("Failed to load transactions", err);
    transContent.innerHTML = `<p>Failed to load transactions.</p>`;
  }
}

if (transBtn && transModal) {
  transBtn.addEventListener("click", async () => {
    await loadTransactions();
    transModal.style.display = "flex";
  });
}
if (closeTrans && transModal) {
  closeTrans.addEventListener("click", () => (transModal.style.display = "none"));
}
window.addEventListener("click", (e) => {
  if (e.target === transModal) transModal.style.display = "none";
});

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
            const bookCard = document.querySelector(
              `.card:has(button.active[data-title="${item.title}"])`
            );
            if (bookCard) {
              const heartBtn = bookCard.querySelector(".btn.icon.secondary");
              heartBtn.classList.remove("active");
              heartBtn.querySelector("svg path").setAttribute("fill", "#fff");
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



