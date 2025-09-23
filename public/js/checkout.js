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
    li.textContent = `${item.title} - ₱${item.price} x ${item.qty}`;
    cartList.appendChild(li);
    li.innerHTML = `
  <img src="${item.cover}" alt="${item.title}" width="40" style="margin-right:8px;vertical-align:middle;">
  <span><strong>${item.title}</strong> by ${item.author} - ₱${item.price} x ${item.qty}</span>
`;

    total += item.price * item.qty;
  });

  cartTotal.innerHTML = `<strong>Total: ₱${total}</strong>`;
}

// ✅ Watch auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadCartFromFirestore();
  } else {
    console.log("User not logged in");
  }
});
