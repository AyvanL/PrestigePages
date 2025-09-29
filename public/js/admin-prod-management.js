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
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add Product Form Handler
const productForm = document.getElementById("productForm");
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("productTitle").value;
    const description = document.getElementById("productDescription").value;
    const price = parseFloat(document.getElementById("productPrice").value);
    const category = document.getElementById("productCategory").value;

    try {
        const newProduct = {
            title,
            description,
            price,
            category,
            status: "active",
            createdAt: new Date(),
        };

        // Add the product to Firestore
        await addDoc(collection(db, "products"), newProduct);
        alert("Product added successfully!");
        productForm.reset();
        loadProductList(); // Reload the product list
    } catch (error) {
        console.error("Error adding product: ", error);
        alert("Failed to add product.");
    }
});

// Load Product List
async function loadProductList() {
    const productList = document.getElementById("product-list");
    productList.innerHTML = ""; // Clear the list before loading new data

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${product.title}</td>
                <td>${product.price}</td>
                <td>${product.category}</td>
                <td class="status">${product.status}</td>
                <td>
                    <button class="edit" onclick="editProduct('${productId}')">Edit</button>
                    <button class="delete" onclick="deleteProduct('${productId}')">Delete</button>
                </td>
            `;
            productList.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading products: ", error);
        alert("Failed to load products.");
    }
}

// Delete Product Function
async function deleteProduct(productId) {
    try {
        const productDocRef = doc(db, "products", productId);
        await deleteDoc(productDocRef);
        alert("Product deleted successfully!");
        loadProductList(); // Reload the product list
    } catch (error) {
        console.error("Error deleting product: ", error);
        alert("Failed to delete product.");
    }
}

// Edit Product Function
async function editProduct(productId) {
    // Get product details
    const productDocRef = doc(db, "products", productId);
    const productDoc = await getDoc(productDocRef);
    const productData = productDoc.data();

    // Populate the modal form with existing data
    document.getElementById("editTitle").value = productData.title;
    document.getElementById("editDescription").value = productData.description;
    document.getElementById("editPrice").value = productData.price;
    document.getElementById("editCategory").value = productData.category;

    // Show the modal
    const editModal = document.getElementById("editModal");
    editModal.style.display = "block"; // Open the modal
    const closeModalBtn = document.getElementById("closeModalBtn");

    // Update product when the form is submitted
    const editForm = document.getElementById("editForm");
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const updatedProduct = {
            title: document.getElementById("editTitle").value,
            description: document.getElementById("editDescription").value,
            price: parseFloat(document.getElementById("editPrice").value),
            category: document.getElementById("editCategory").value,
        };

        try {
            await updateDoc(productDocRef, updatedProduct);
            alert("Product updated successfully!");
            loadProductList(); // Reload the product list
            editModal.style.display = "none"; // Close the modal
        } catch (error) {
            console.error("Error updating product: ", error);
            alert("Failed to update product.");
        }
    });

    // Close the modal when the close button is clicked
    closeModalBtn.addEventListener("click", () => {
        editModal.style.display = "none"; // Close the modal
    });
}

// Load product list on page load
loadProductList();
