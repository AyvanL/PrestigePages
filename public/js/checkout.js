// Import Firebase (CDN only)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let cart = []; // store cart items here

// Trigger pop-in animations when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-ready");
});

// ✅ Load cart from Firestore for current user
async function loadCartFromFirestore() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    // --- Fill profile fields ---
    const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
    document.getElementById("shippingFirstName").value = fullName;
    document.getElementById("shippingEmail").value =
      data.email || user.email || "";
    document.getElementById("shippingPhone").value = data.mobile || "";
    document.getElementById("shippingUnit").value = data.houseNo || "";
    document.getElementById("shippingStreet").value = data.street || "";
    document.getElementById("shippingCity").value = data.city || "";
    document.getElementById("shippingProvince").value = data.province || "";
    document.getElementById("shippingPostal").value = data.postal || "";

    // --- Load cart ---
    if (data.cart && Array.isArray(data.cart)) {
      cart = data.cart;
      await updateCart();
    }
  } else {
    console.log("No user profile found, fill manually.");
  }
}

// ✅ Update cart UI
async function updateCart() {
  const cartList = document.getElementById("cart-list");
  const cartTotal = document.getElementById("cart-total");
  cartList.innerHTML = "";

  let total = 0;
  cart.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img src="${item.cover}" alt="${item.title}" class="book-cover">
      <div class="book-details">
        <div class="book-title">${item.title}</div>
        <div class="book-author">by ${item.author}</div>
        <div class="book-price">₱${item.price}</div>
        <div class="book-quantity">Quantity: ${item.qty}</div>
      </div>
    `;
    // Re-trigger animation for newly appended items
    li.style.animation = "none";
    void li.offsetHeight; // force reflow
    li.style.animation = "";
    cartList.appendChild(li);
    total += item.price * item.qty;
  });

  cartTotal.innerHTML = `<strong>Total: ₱${total.toLocaleString()}</strong>`;
}

// ✅ Watch auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadCartFromFirestore();
  } else {
    console.log("User not logged in");
  }
});
