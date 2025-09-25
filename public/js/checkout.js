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
  updateDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCC_14beDBhudrtoAIFqc29TCMY5zoa4AA",
  authDomain: "prestige-pages.firebaseapp.com",
  databaseURL: "https://prestige-pages-default-rtdb.firebaseio.com",
  projectId: "prestige-pages",
  storageBucket: "prestige-pages.appspot.com",
  messagingSenderId: "1065922943021",
  appId: "1:1065922943021:web:e5829dd09e206063b500a4",
  measurementId: "G-V0E6PXN1Z5",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let cart = []; // store cart items here

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
    cartList.appendChild(li);
    total += item.price * item.qty;
  });

  cartTotal.innerHTML = `<strong>Total: ₱${total.toLocaleString()}</strong>`;
}

// ✅ Save transaction when form is submitted
document.getElementById("shippingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to continue.");
    return;
  }

  const transaction = {
    fullName: document.getElementById("shippingFirstName").value,
    email: document.getElementById("shippingEmail").value,
    phone: document.getElementById("shippingPhone").value,
    unit: document.getElementById("shippingUnit").value,
    street: document.getElementById("shippingStreet").value,
    city: document.getElementById("shippingCity").value,
    province: document.getElementById("shippingProvince").value,
    postal: document.getElementById("shippingPostal").value,
    cart: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    timestamp: new Date().toISOString(),
  };

  try {
    const userDocRef = doc(db, "users", user.uid);

    // ✅ Append transaction and clear cart in Firestore
    await updateDoc(userDocRef, {
      transactions: arrayUnion(transaction),
      cart: [], // clear cart in Firestore
    });

    // ✅ Reset local cart + UI
    cart = [];
    await updateCart();

    alert("Transaction saved and cart cleared!");
    window.location.href = "checkout-deliv.html";
  } catch (error) {
    console.error("Error saving transaction:", error);
    alert("Failed to save transaction. Check console for details.");
  }
});

// ✅ Watch auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadCartFromFirestore();
  } else {
    console.log("User not logged in");
  }
});
