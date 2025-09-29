import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getFirestore,
    doc,
    updateDoc,
    collection,
    getDocs,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load all orders into the table
async function loadOrders() {
  const orderList = document.getElementById("order-list");
  orderList.innerHTML = ""; // Clear existing rows

  try {
    const querySnapshot = await getDocs(collection(db, "orders"));
    querySnapshot.forEach((doc) => {
      const order = doc.data();
      const orderId = doc.id;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${order.orderId}</td>
        <td>${order.customerName}</td>
        <td>${order.orderDate}</td>
        <td class="status ${order.status}">${order.status}</td>
        <td>
          <button onclick="viewOrderDetails('${orderId}')">View</button>
          <button onclick="updateOrderStatus('${orderId}')">Update Status</button>
          <button onclick="printInvoice('${orderId}')">Print Invoice</button>
          <button onclick="manageReturn('${orderId}')">Manage Return/Refund</button>
        </td>
      `;
      orderList.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading orders: ", error);
    alert("Failed to load orders.");
  }
}

// View Order Details in modal
async function viewOrderDetails(orderId) {
  const orderDetailsContent = document.getElementById("orderDetailsContent");

  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId));
    const order = orderDoc.data();

    orderDetailsContent.innerHTML = `
      <p><strong>Customer:</strong> ${order.customerName}</p>
      <p><strong>Order Date:</strong> ${order.orderDate}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Items:</strong> ${order.items.join(", ")}</p>
      <p><strong>Total Amount:</strong> ₱${order.totalAmount}</p>
    `;
    // Show the modal
    document.getElementById("orderDetailsModal").style.display = "block";
  } catch (error) {
    console.error("Error fetching order details: ", error);
    alert("Failed to load order details.");
  }
}

// Close the order details modal
document.getElementById("closeModalBtn").addEventListener("click", () => {
  document.getElementById("orderDetailsModal").style.display = "none";
});

// Update order status (Pending, Processing, Shipped, Delivered, Cancelled)
async function updateOrderStatus(orderId) {
  const newStatus = prompt("Enter new status (e.g., Pending, Processing, Shipped, Delivered, Cancelled):");

  if (newStatus) {
    try {
      const orderDocRef = doc(db, "orders", orderId);
      await updateDoc(orderDocRef, {
        status: newStatus
      });
      alert("Order status updated successfully!");
      loadOrders(); // Reload the orders after updating
    } catch (error) {
      console.error("Error updating order status: ", error);
      alert("Failed to update order status.");
    }
  } else {
    alert("Invalid status. Please try again.");
  }
}

// Print the invoice or packing slip for the order
async function printInvoice(orderId) {
  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId));
    const order = orderDoc.data();

    const invoiceContent = `
      <h2>Invoice for Order ${order.orderId}</h2>
      <p><strong>Customer:</strong> ${order.customerName}</p>
      <p><strong>Order Date:</strong> ${order.orderDate}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Items:</strong> ${order.items.join(", ")}</p>
      <p><strong>Total Amount:</strong> ₱${order.totalAmount}</p>
    `;

    const printWindow = window.open('', '', 'height=500,width=800');
    printWindow.document.write('<html><head><title>Invoice</title></head><body>');
    printWindow.document.write(invoiceContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error("Error printing invoice: ", error);
    alert("Failed to print invoice.");
  }
}

// Manage order returns and refunds
async function manageReturn(orderId) {
  const action = prompt("Enter action (e.g., 'Return', 'Refund'):");

  if (action) {
    try {
      const orderDocRef = doc(db, "orders", orderId);
      await updateDoc(orderDocRef, {
        returnRefundStatus: action
      });
      alert("Return/Refund action updated successfully!");
      loadOrders(); // Reload the orders after managing return/refund
    } catch (error) {
      console.error("Error managing return/refund: ", error);
      alert("Failed to manage return/refund.");
    }
  } else {
    alert("Invalid action. Please try again.");
  }
}

// Load orders on page load
loadOrders();
