import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs,
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const inquiriesList = document.getElementById('inquiriesList');
const inquirySearch = document.getElementById('inquirySearch');
const filterBtns = document.querySelectorAll('.filter-btn');
const viewInquiryModal = document.getElementById('viewInquiryModal');
const replyModal = document.getElementById('replyModal');
const replyForm = document.getElementById('replyForm');

// Statistics elements
const totalInquiriesEl = document.getElementById('totalInquiries');
const pendingInquiriesEl = document.getElementById('pendingInquiries');
const repliedInquiriesEl = document.getElementById('repliedInquiries');

// State
let INQUIRIES = [];
let CURRENT_INQUIRY_ID = null;
let currentFilter = 'all';

// EmailJS Configuration 
const EMAILJS_CONFIG = {
  serviceId: 'service_djt4mub', 
  templateId: 'template_1jyhcfc', 
  publicKey: 'eR0ojLOh2TJPBdRuB' 
};

// Initialize
function initFAQManagement() {
  loadInquiries();
  setupEventListeners();
  initEmailJS();
}

// Initialize EmailJS
function initEmailJS() {
  // Load EmailJS SDK
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
  script.onload = () => {
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_CONFIG.publicKey);
      console.log('EmailJS initialized successfully');
    }
  };
  document.head.appendChild(script);
}

// Load Customer Inquiries from Firestore
function loadInquiries() {
  showMessage('Loading customer inquiries...', 'loading');
  
  const inquiriesCol = collection(db, 'inquiries');
  const q = query(inquiriesCol, orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    INQUIRIES = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    updateStatistics();
    
    if (INQUIRIES.length === 0) {
      showMessage('No customer inquiries found.', 'empty');
    } else {
      renderInquiries(INQUIRIES);
    }
  }, (error) => {
    console.error('Error loading inquiries:', error);
    showMessage('Failed to load inquiries.', 'error');
  });
}

// Update statistics
function updateStatistics() {
  const total = INQUIRIES.length;
  const pending = INQUIRIES.filter(inquiry => inquiry.status === 'pending').length;
  const replied = INQUIRIES.filter(inquiry => inquiry.status === 'replied').length;
  
  if (totalInquiriesEl) totalInquiriesEl.textContent = total;
  if (pendingInquiriesEl) pendingInquiriesEl.textContent = pending;
  if (repliedInquiriesEl) repliedInquiriesEl.textContent = replied;
}

// Render Inquiries list
function renderInquiries(inquiries) {
  if (!inquiriesList) return;
  
  const filteredInquiries = filterInquiries(inquiries);
  
  if (filteredInquiries.length === 0) {
    showMessage('No inquiries match your current filter.', 'empty');
    return;
  }
  
  inquiriesList.innerHTML = filteredInquiries.map(inquiry => {
    const statusClass = `status-${inquiry.status || 'pending'}`;
    const statusText = (inquiry.status || 'pending').charAt(0).toUpperCase() + (inquiry.status || 'pending').slice(1);
    const date = inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleString() : 'Unknown date';
    const messagePreview = inquiry.message.length > 150 ? 
      inquiry.message.substring(0, 150) + '...' : inquiry.message;
    
    return `
      <div class="inquiry-item" data-id="${inquiry.id}" data-status="${inquiry.status || 'pending'}">
        <div class="inquiry-header">
          <div class="inquiry-name">${escapeHtml(inquiry.name || 'Unknown')}</div>
          <div class="status-badge ${statusClass}">${statusText}</div>
        </div>
        <div class="inquiry-email">${escapeHtml(inquiry.email || 'No email')}</div>
        <div class="inquiry-date">Received: ${date}</div>
        <div class="inquiry-message">${escapeHtml(messagePreview)}</div>
        <div class="inquiry-actions">
          <button class="btn btn-sm btn-primary view-inquiry" data-id="${inquiry.id}">
            <i class="fas fa-eye"></i> View
          </button>
          ${inquiry.status !== 'replied' ? `
            <button class="btn btn-sm btn-success reply-inquiry" data-id="${inquiry.id}">
              <i class="fas fa-reply"></i> Reply
            </button>
          ` : ''}
          <button class="btn btn-sm btn-danger delete-inquiry" data-id="${inquiry.id}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Filter inquiries based on current filter
function filterInquiries(inquiries) {
  if (currentFilter === 'all') return inquiries;
  return inquiries.filter(inquiry => inquiry.status === currentFilter);
}

// Show message state
function showMessage(text, type = '') {
  if (!inquiriesList) return;
  
  const icon = type === 'loading' ? '<i class="fas fa-spinner fa-spin"></i> ' : 
               type === 'empty' ? '<i class="fas fa-inbox"></i> ' :
               type === 'error' ? '<i class="fas fa-exclamation-triangle"></i> ' : '';
  
  inquiriesList.innerHTML = `<div class="empty-state">${icon}${text}</div>`;
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Open view inquiry modal
function openViewModal(inquiry) {
  CURRENT_INQUIRY_ID = inquiry.id;
  
  // Populate modal with inquiry details
  document.getElementById('detailName').textContent = inquiry.name || 'Unknown';
  document.getElementById('detailEmail').textContent = inquiry.email || 'No email';
  document.getElementById('detailDate').textContent = inquiry.createdAt?.toDate ? 
    inquiry.createdAt.toDate().toLocaleString() : 'Unknown date';
  document.getElementById('detailMessage').textContent = inquiry.message;
  
  // Set status badge
  const statusBadge = document.getElementById('detailStatus');
  statusBadge.textContent = (inquiry.status || 'pending').charAt(0).toUpperCase() + 
                           (inquiry.status || 'pending').slice(1);
  statusBadge.className = `status-badge status-${inquiry.status || 'pending'}`;
  
  // Show/hide actions based on status
  const markRepliedBtn = document.getElementById('markRepliedBtn');
  if (markRepliedBtn) {
    markRepliedBtn.style.display = inquiry.status === 'replied' ? 'none' : 'block';
  }
  
  viewInquiryModal.style.display = 'flex';
}

// Open reply modal
function openReplyModal(inquiry) {
  CURRENT_INQUIRY_ID = inquiry.id;
  
  document.getElementById('replyInquiryId').value = inquiry.id;
  document.getElementById('replyToEmail').textContent = inquiry.email || 'No email';
  document.getElementById('replySubject').value = `Re: Your Inquiry to PrestigePages`;
  document.getElementById('replyMessage').value = '';
  
  replyModal.style.display = 'flex';
}

// Close modals
function closeModals() {
  viewInquiryModal.style.display = 'none';
  replyModal.style.display = 'none';
  CURRENT_INQUIRY_ID = null;
}

// Send email using EmailJS
async function sendEmailToCustomer(customerEmail, customerName, subject, message) {
  if (!window.emailjs) {
    throw new Error('EmailJS not loaded yet. Please try again.');
  }

  console.log('Sending email to:', customerEmail); // Debug log
  console.log('Customer name:', customerName); // Debug log
  console.log('Subject:', subject); // Debug log

  const templateParams = {
    to_email: customerEmail, // This should be the customer's email
    to_name: customerName,
    subject: subject,
    message: message,
    from_name: 'PrestigePages Support',
    reply_to: 'support@prestigepages.com', // Your support email
    company_name: 'PrestigePages'
  };

  console.log('Template params:', templateParams); // Debug log

  try {
    const response = await window.emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );
    
    console.log('Email sent successfully to:', customerEmail, response);
    return response;
  } catch (error) {
    console.error('EmailJS error:', error);
    throw new Error(`Failed to send email: ${error.text || error.message}`);
  }
}

// Mark inquiry as replied and store response in Firebase
async function markInquiryReplied(id, responseData = null) {
  try {
    const inquiryRef = doc(db, 'inquiries', id);
    const updateData = {
      status: 'replied',
      repliedAt: serverTimestamp(),
      updatedAt: new Date()
    };

    // Store the response if provided
    if (responseData) {
      updateData.adminResponse = responseData.response;
      updateData.responseSubject = responseData.subject;
      updateData.responseSentAt = serverTimestamp();
      updateData.respondedBy = 'Admin';
    }

    await updateDoc(inquiryRef, updateData);
    return true;
  } catch (error) {
    console.error('Error marking inquiry as replied:', error);
    throw error;
  }
}

// Delete inquiry
async function deleteInquiry(id) {
  if (!confirm('Are you sure you want to delete this inquiry? This action cannot be undone.')) return;
  
  try {
    await deleteDoc(doc(db, 'inquiries', id));
    closeModals();
    alert('Inquiry deleted successfully!');
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    alert('Failed to delete inquiry. Please try again.');
  }
}

// Search inquiries
function searchInquiries(query) {
  const filtered = INQUIRIES.filter(inquiry => 
    inquiry.name?.toLowerCase().includes(query.toLowerCase()) ||
    inquiry.email?.toLowerCase().includes(query.toLowerCase()) ||
    inquiry.message?.toLowerCase().includes(query.toLowerCase())
  );
  renderInquiries(filtered);
}

// Event Listeners
function setupEventListeners() {
  // Search input
  inquirySearch?.addEventListener('input', (e) => {
    searchInquiries(e.target.value);
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-status');
      renderInquiries(INQUIRIES);
    });
  });

  // Inquiries list actions (delegated)
  inquiriesList?.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.view-inquiry');
    const replyBtn = e.target.closest('.reply-inquiry');
    const deleteBtn = e.target.closest('.delete-inquiry');
    
    if (viewBtn) {
      const id = viewBtn.getAttribute('data-id');
      const inquiry = INQUIRIES.find(i => i.id === id);
      if (inquiry) openViewModal(inquiry);
    }
    
    if (replyBtn) {
      const id = replyBtn.getAttribute('data-id');
      const inquiry = INQUIRIES.find(i => i.id === id);
      if (inquiry) openReplyModal(inquiry);
    }
    
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      deleteInquiry(id);
    }
  });

  // View modal actions
  document.getElementById('markRepliedBtn')?.addEventListener('click', () => {
    if (CURRENT_INQUIRY_ID) markInquiryReplied(CURRENT_INQUIRY_ID);
  });

  document.getElementById('deleteInquiryBtn')?.addEventListener('click', () => {
    if (CURRENT_INQUIRY_ID) deleteInquiry(CURRENT_INQUIRY_ID);
  });

  document.getElementById('closeViewModal')?.addEventListener('click', closeModals);

  // Reply form
  replyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const customerEmail = document.getElementById('replyToEmail').textContent;
    const subject = document.getElementById('replySubject').value.trim();
    const message = document.getElementById('replyMessage').value.trim();
    const submitBtn = replyForm.querySelector('button[type="submit"]');
    
    if (!message) {
      alert('Please enter a response message.');
      return;
    }

    if (!customerEmail || customerEmail === 'No email') {
      alert('Cannot send response: Customer email is missing.');
      return;
    }

    try {
      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      // Get customer name for personalization
      const inquiry = INQUIRIES.find(i => i.id === CURRENT_INQUIRY_ID);
      const customerName = inquiry?.name || 'Valued Customer';

      // Send email via EmailJS
      await sendEmailToCustomer(customerEmail, customerName, subject, message);
      
      // Mark as replied in Firebase and store response
      await markInquiryReplied(CURRENT_INQUIRY_ID, {
        response: message,
        subject: subject
      });
      
      closeModals();
      alert('✅ Email sent successfully and inquiry marked as replied!');
      
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(`❌ Failed to send email: ${error.message}`);
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Response';
    }
  });

  document.getElementById('cancelReply')?.addEventListener('click', closeModals);

  // Modal close events
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeModals);
  });
  
  // Close modals on backdrop click
  viewInquiryModal?.addEventListener('click', (e) => {
    if (e.target === viewInquiryModal) closeModals();
  });
  
  replyModal?.addEventListener('click', (e) => {
    if (e.target === replyModal) closeModals();
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initFAQManagement);