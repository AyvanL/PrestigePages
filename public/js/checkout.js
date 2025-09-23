// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase config
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


onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Get Firestore user doc
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Combine first + last name into Full Name input
      const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
      document.getElementById("shippingFirstName").value = fullName;

      // Email (fallback to Firebase Auth email if missing)
      document.getElementById("shippingEmail").value = data.email || user.email || "";

      // Phone number
      document.getElementById("shippingPhone").value = data.mobile || "";

      // Address fields (optional)
      document.getElementById("shippingUnit").value = data.unit || "";
      document.getElementById("shippingStreet").value = data.street || "";
      document.getElementById("shippingCity").value = data.city || "";
      document.getElementById("shippingProvince").value = data.province || "";
      document.getElementById("shippingPostal").value = data.postal || "";
    } else {
      console.log("No profile found, user must fill details manually.");
    }
  } else {
    console.log("User not logged in");
  }
});

