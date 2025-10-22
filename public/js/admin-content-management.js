import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Form elements
const heroForm = document.getElementById('heroForm');
const heroEyebrow = document.getElementById('heroEyebrow');
const heroTitle = document.getElementById('heroTitle');
const heroDescription = document.getElementById('heroDescription');
const heroImage = document.getElementById('heroImage');

// Preview elements
const previewBtn = document.getElementById('previewBtn');
const previewSection = document.getElementById('previewSection');
const previewEyebrow = document.getElementById('previewEyebrow');
const previewTitle = document.getElementById('previewTitle');
const previewDescription = document.getElementById('previewDescription');
const previewImage = document.getElementById('previewImage');

// Current content display
const currentContent = document.getElementById('currentContent');

// About Us Form elements
const aboutForm = document.getElementById('aboutForm');
const aboutTitle = document.getElementById('aboutTitle');
const aboutParagraph1 = document.getElementById('aboutParagraph1');
const aboutParagraph2 = document.getElementById('aboutParagraph2');
const currentAboutContent = document.getElementById('currentAboutContent');

// Load current hero content
async function loadHeroContent() {
  try {
    const docRef = doc(db, 'content', 'hero-section');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Populate form
      heroEyebrow.value = data.eyebrow || 'New Arrivals';
      heroTitle.value = data.title || 'Experience our\nNew Exclusive Books';
      heroDescription.value = data.description || 'Discover hand‑picked titles from acclaimed authors. Enjoy quality hardbacks, digital editions, and secure shipping right to your door.';
      heroImage.value = data.imageUrl || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=700&auto=format&fit=crop';
      
      // Display current content
      displayCurrentContent(data);
    } else {
      // Set default values
      heroEyebrow.value = 'New Arrivals';
      heroTitle.value = 'Experience our\nNew Exclusive Books';
      heroDescription.value = 'Discover hand‑picked titles from acclaimed authors. Enjoy quality hardbacks, digital editions, and secure shipping right to your door.';
      heroImage.value = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=700&auto=format&fit=crop';
      
      currentContent.innerHTML = '<p style="color:#999;">No custom content saved yet. Using default values.</p>';
    }
  } catch (error) {
    console.error('Error loading hero content:', error);
    currentContent.innerHTML = '<p style="color:#dc3545;">Error loading content. Please refresh the page.</p>';
  }
}

// Display current content
function displayCurrentContent(data) {
  const titleDisplay = (data.title || '').replace(/\n/g, '<br>');
  currentContent.innerHTML = `
    <p><strong>Eyebrow:</strong> ${data.eyebrow || 'N/A'}</p>
    <p><strong>Title:</strong> ${titleDisplay}</p>
    <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
    <p><strong>Image URL:</strong> ${data.imageUrl || 'N/A'}</p>
    <p style="color:#666; font-size:12px; margin-top:12px;"><em>Last updated: ${data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'Never'}</em></p>
  `;
}

// Preview functionality
previewBtn.addEventListener('click', () => {
  const titleWithBreaks = heroTitle.value.replace(/\n/g, '<br>');
  
  previewEyebrow.textContent = heroEyebrow.value || 'New Arrivals';
  previewTitle.innerHTML = titleWithBreaks || 'Experience our<br />New Exclusive Books';
  previewDescription.textContent = heroDescription.value || 'Discover hand‑picked titles from acclaimed authors. Enjoy quality hardbacks, digital editions, and secure shipping right to your door.';
  previewImage.src = heroImage.value || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=700&auto=format&fit=crop';
  
  previewSection.style.display = 'block';
  previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// Save hero content
heroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.submitter;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  submitBtn.disabled = true;
  
  try {
    const heroData = {
      eyebrow: heroEyebrow.value.trim(),
      title: heroTitle.value.trim(),
      description: heroDescription.value.trim(),
      imageUrl: heroImage.value.trim(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'content', 'hero-section'), heroData);
    
    // Update current content display
    displayCurrentContent(heroData);
    
    // Show success message
    alert('✅ Hero section updated successfully! Changes will appear on the homepage.');
    
    // Hide preview
    previewSection.style.display = 'none';
    
  } catch (error) {
    console.error('Error saving hero content:', error);
    alert('❌ Error saving content. Please try again.');
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// Initialize
loadHeroContent();

// Load current About Us content
async function loadAboutContent() {
  try {
    const docRef = doc(db, 'content', 'about-us');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      aboutTitle.value = data.title || '';
      aboutParagraph1.value = data.paragraph1 || '';
      aboutParagraph2.value = data.paragraph2 || '';
      displayCurrentAboutContent(data);
    } else {
      currentAboutContent.innerHTML = '<p style="color: #666;">No content saved yet. Save your first version above.</p>';
    }
  } catch (error) {
    console.error('Error loading About Us content:', error);
    currentAboutContent.innerHTML = '<p style="color: #e74c3c;">Error loading content.</p>';
  }
}

// Display current About Us content
function displayCurrentAboutContent(data) {
  const lastUpdated = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'Never';
  
  currentAboutContent.innerHTML = `
    <div style="display: grid; gap: 15px;">
      <div>
        <strong style="color: #2c3e50;">Title:</strong>
        <div style="padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; margin-top: 5px;">
          ${data.title || 'Not set'}
        </div>
      </div>
      <div>
        <strong style="color: #2c3e50;">First Paragraph:</strong>
        <div style="padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; margin-top: 5px; white-space: pre-wrap;">
          ${data.paragraph1 || 'Not set'}
        </div>
      </div>
      <div>
        <strong style="color: #2c3e50;">Second Paragraph:</strong>
        <div style="padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; margin-top: 5px; white-space: pre-wrap;">
          ${data.paragraph2 || 'Not set'}
        </div>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; color: #666;">
        <small><i class="fas fa-clock"></i> Last updated: ${lastUpdated}</small>
      </div>
    </div>
  `;
}

// Save About Us content
aboutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.submitter;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  submitBtn.disabled = true;
  
  try {
    const aboutData = {
      title: aboutTitle.value.trim(),
      paragraph1: aboutParagraph1.value.trim(),
      paragraph2: aboutParagraph2.value.trim(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'content', 'about-us'), aboutData);
    
    // Update current content display
    displayCurrentAboutContent(aboutData);
    
    // Show success message
    alert('✅ About Us content updated successfully! Changes will appear on the About Us page.');
    
  } catch (error) {
    console.error('Error saving About Us content:', error);
    alert('❌ Error saving content. Please try again.');
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// Initialize About Us content
loadAboutContent();
