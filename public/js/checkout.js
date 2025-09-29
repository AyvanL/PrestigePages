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
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let cart = [];
let currentSubtotal = 0;

// Trigger pop-in animations when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-ready");

  // Populate delivery options if empty
  ensureDeliveryOptions();

  // Wire submit even if the button is outside the form
  const form = document.getElementById("shippingForm");
  const continueBtn = document.querySelector(".conbtn");
  if (continueBtn && form && !continueBtn.getAttribute("form")) {
    continueBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (form.reportValidity()) {
        if (form.requestSubmit) form.requestSubmit();
        else form.submit();
      }
    });
  }
  form?.addEventListener("submit", onSubmitCheckout);

  // Update totals when delivery option changes
  document.getElementById("delivery")?.addEventListener("change", updateTotals);
});

// Helpers
const setVal = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.value = val ?? "";
};
const setHTML = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};
const getVal = (id) => document.getElementById(id)?.value?.trim() || "";

// Ensure delivery select has options
function ensureDeliveryOptions() {
  const sel = document.getElementById("delivery");
  if (!sel) return;
  if (sel.options.length > 0) return;
  sel.innerHTML = `
    <option value="" disabled selected>Select delivery</option>
    <option value="normal">Normal Delivery (+₱49)</option>
    <option value="express">Express Delivery (+₱100)</option>
  `;
}

// Delivery fee
function getShippingFee() {
  const val = document.getElementById("delivery")?.value;
  if (val === "normal") return 49;
  if (val === "express") return 100;
  return 0;
}
function getDeliveryLabel() {
  const val = document.getElementById("delivery")?.value;
  if (val === "normal") return "Normal Delivery";
  if (val === "express") return "Express Delivery";
  return "Select delivery";
}

// Update totals + shipping line
function updateTotals() {
  const fee = getShippingFee();
  const total = currentSubtotal + fee;

  const totalEl =
    document.getElementById("cart-total") ||
    document.querySelector(".order-summary");
  if (totalEl) totalEl.textContent = `₱${total.toLocaleString()}`;

  const shipMethodEl = document.getElementById("shipping-method");
  const shipAmtEl = document.getElementById("shipping-amount");
  if (shipMethodEl) shipMethodEl.textContent = getDeliveryLabel();
  if (shipAmtEl) shipAmtEl.textContent = `₱${fee.toLocaleString()}`;
}

// Load cart and profile
async function loadCartFromFirestore() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
  setVal("shippingFirstName", fullName);
  setVal("shippingEmail", data.email || user.email || "");
  setVal("shippingPhone", data.mobile || "");
  setVal("shippingUnit", data.houseNo || "");
  setVal("shippingStreet", data.street || "");
  setVal("shippingCity", data.city || "");
  setVal("shippingProvince", data.province || "");
  setVal("shippingPostal", data.postal || "");

  if (Array.isArray(data.cart)) {
    cart = data.cart;
    await updateCart();
  }
}

// Render cart
async function updateCart() {
  const cartList =
    document.getElementById("cart-list") ||
    document.querySelector(".order-items");
  if (!cartList) return;

  cartList.innerHTML = "";

  let subtotal = 0;
  cart.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img src="${item.cover}" alt="${item.title}" class="book-cover">
      <div class="book-details">
        <div class="book-title">${item.title}</div>
        <div class="book-author">by ${item.author}</div>
        <div class="book-price">₱${Number(item.price).toLocaleString()}</div>
        <div class="book-quantity">Quantity: ${Number(item.qty || 1)}</div>
      </div>
    `;
    li.style.animation = "none";
    void li.offsetHeight;
    li.style.animation = "";
    cartList.appendChild(li);

    subtotal += Number(item.price) * Number(item.qty || 1);
  });

  currentSubtotal = subtotal;
  updateTotals();
}

// Create PayMongo Checkout Session via your Vercel function
async function createCheckoutSession({ amount, email, reference, description }) {
  // Detect correct base for return URLs (Live Server uses /public)
  const hasPublic = location.pathname.includes("/public/");
  const returnBase = location.origin + (hasPublic ? "/public" : "");

  // Endpoint selection: allow override, use localhost in dev, or your deployed function in prod
    const CHECKOUT_API =
      (typeof window !== "undefined" && window.PAYMENTS_API_BASE) ||
      "https://prestige-pages-backend.vercel.app/api/create-checkout"; // TODO: replace with your real URL

  // Choose payload shape based on endpoint
  const isServerless = /\/api\//.test(CHECKOUT_API) || CHECKOUT_API.includes("create-checkout");
  const payload = isServerless
    ? {
        items: [
          {
            name: description || "PrestigePages Order",
            description: description || `Order ${reference}`,
            images: [
              `${returnBase}/images/Logo.png`, // ensure at least one image URL
            ],
            amount: Number(amount),
            quantity: 1,
          },
        ],
        success_url: `${returnBase}/thankyou.html?ref=${encodeURIComponent(reference)}`,
        cancel_url: `${returnBase}/checkout.html?canceled=1`,
        email,
        reference,
        metadata: { reference: String(reference || ""), email: String(email || "") },
      }
    : {
        amount: Number(amount),
        email,
        reference,
        description,
      };

    let res;
    try {
      res = await fetch(CHECKOUT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      console.error("Network error calling checkout API:", networkErr);
      throw new Error("Failed to fetch (network/CORS)");
    }

  const bodyText = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("Checkout API error:", res.status, bodyText);
    throw new Error(`Server ${res.status}: ${bodyText}`);
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error("Invalid JSON from checkout API: " + bodyText);
  }

  // Support both { checkout_url } and PayMongo-like { data.attributes.checkout_url }
  const checkout_url = data?.checkout_url || data?.data?.attributes?.checkout_url;
  const id = data?.id || data?.data?.id || null;
  if (!checkout_url) throw new Error("No checkout_url in response");
  return { checkout_url, id };
}

async function onSubmitCheckout(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) { alert("Please log in first."); window.location.href = "login.html"; return; }
  if (!cart.length) { alert("Your cart is empty."); return; }

  // Prevent double submit
  const btn = document.querySelector(".conbtn");
  btn?.setAttribute("disabled", "disabled");

  const shipping = {
    name: getVal("shippingFirstName"),
    email: getVal("shippingEmail"),
    phone: getVal("shippingPhone"),
    unit: getVal("shippingUnit"),
    street: getVal("shippingStreet"),
    city: getVal("shippingCity"),
    province: getVal("shippingProvince"),
    postal: getVal("shippingPostal"),
  };
  const deliveryMethod = document.getElementById("delivery")?.value || "";
  const paymentMethod = document.getElementById("payment")?.value || "";

  if (!deliveryMethod) { alert("Please choose a delivery option."); btn?.removeAttribute("disabled"); return; }
  if (!paymentMethod) { alert("Please choose a payment method."); btn?.removeAttribute("disabled"); return; }

  const subtotal = cart.reduce((sum, it) => sum + Number(it.price) * Number(it.qty || 1), 0);
  const shippingFee = getShippingFee();
  const total = subtotal + shippingFee;
  const amountCentavos = Math.round(total * 100);

  const items = cart.map((it) => ({
    title: it.title, author: it.author, cover: it.cover,
    price: Number(it.price), qty: Number(it.qty || 1),
  }));

  let txRef = null;
  try {
    // 1) Create a pending transaction inside user
    const order = {
      userId: user.uid,
      items, subtotal, shippingFee, total, shipping,
      deliveryMethod, paymentMethod, status: "initiated",
      createdAt: serverTimestamp(),
    };
    txRef = await addDoc(collection(db, "users", user.uid, "transactions"), order);

    // 2) Pay via PayMongo (E-wallet etc.)
    const { checkout_url, id: checkoutId } = await createCheckoutSession({
      amount: amountCentavos,
      email: shipping.email || user.email,
      reference: txRef.id,
      description: `PrestigePages Order ${txRef.id}`,
    });

    // 3) Link session to transaction and redirect
    await updateDoc(doc(db, "users", user.uid, "transactions", txRef.id), {
      checkoutSessionId: checkoutId || null,
    });
    await updateDoc(doc(db, "users", user.uid), {
      lastTransactionId: txRef.id, lastTransactionAt: serverTimestamp(),
    });

    window.location.href = checkout_url;
  } catch (err) {
    console.error("Checkout failed:", err);
    alert(`Failed to start payment. ${err?.message || ""}`);
    if (txRef) {
      try {
        await updateDoc(doc(db, "users", user.uid, "transactions", txRef.id), { status: "failed" });
      } catch {}
    }
  } finally {
    btn?.removeAttribute("disabled");
  }
}

// Auth
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadCartFromFirestore();
  } else {
    console.log("User not logged in");
  }
});