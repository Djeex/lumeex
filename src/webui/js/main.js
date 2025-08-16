// Arrays to store gallery and hero images
let galleryImages = [];
let heroImages = [];

// Load images data from server
async function loadData() {
  try {
    // Fetch gallery images from API
    const galleryRes = await fetch('/api/gallery');
    galleryImages = await galleryRes.json();
    renderGallery(); // Render gallery images

    // Fetch hero images from API
    const heroRes = await fetch('/api/hero');
    heroImages = await heroRes.json();
    renderHero(); // Render hero images
  } catch(err) {
    console.error(err);
    alert("Error while loading images!");
  }
}

// Render gallery images in the page
function renderGallery() {
  const container = document.getElementById('gallery');
  container.innerHTML = ''; // Clear current content
  galleryImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'photo';
    div.innerHTML = `
      <img src="/photos/${img.src}">
      <input type="text" value="${(img.tags || []).join(', ')}"
        onchange="updateTags(${i}, this.value)">
      <button onclick="deleteGalleryImage(${i})">🗑 Delete</button>
    `;
    container.appendChild(div); // Add image div to container
  });
}

// Render hero images in the page
function renderHero() {
  const container = document.getElementById('hero');
  container.innerHTML = ''; // Clear current content
  heroImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'photo';
    div.innerHTML = `
      <img src="/photos/${img.src}">
      <button onclick="deleteHeroImage(${i})">🗑 Delete</button>
    `;
    container.appendChild(div); // Add image div to container
  });
}

// Update tags for a gallery image
function updateTags(index, value) {
  // Split tags by comma, trim spaces, and remove empty values
  galleryImages[index].tags = value.split(',').map(t => t.trim()).filter(t => t);
}

// Delete a gallery image
async function deleteGalleryImage(index) {
  const img = galleryImages[index];
  try {
    // Send only the filename to the server for deletion
    const res = await fetch('/api/gallery/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src: img.src.split('/').pop() }) // Keep only filename
    });
    const data = await res.json();
    if (res.ok) {
      // Remove image from array and re-render gallery
      galleryImages.splice(index, 1);
      renderGallery();
      await saveGallery(); // Save updated tags
    } else {
      alert("Error: " + data.error);
    }
  } catch(err) {
    console.error(err);
    alert("Server error!");
  }
}

// Delete a hero image
async function deleteHeroImage(index) {
  const img = heroImages[index];
  try {
    // Send only the filename to the server for deletion
    const res = await fetch('/api/hero/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src: img.src.split('/').pop() }) // Keep only filename
    });
    const data = await res.json();
    if (res.ok) {
      // Remove image from array and re-render hero section
      heroImages.splice(index, 1);
      renderHero();
      await saveHero(); // Save updated hero images
    } else {
      alert("Error: " + data.error);
    }
  } catch(err) {
    console.error(err);
    alert("Server error!");
  }
}

// Save gallery images (with tags) to the server
async function saveGallery() {
  await fetch('/api/gallery/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(galleryImages)
  });
}

// Save hero images to the server
async function saveHero() {
  await fetch('/api/hero/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(heroImages)
  });
}

// Save both gallery and hero changes
async function saveChanges() {
  await saveGallery();
  await saveHero();
  alert('✅ Changes saved!');
}

// Refresh gallery images from the server folder
async function refreshGallery() {
  await fetch('/api/gallery/refresh', { method: 'POST' });
  await loadData(); // Reload data after refresh
  alert('🔄 Gallery updated from photos/gallery folder');
}

// Refresh hero images from the server folder
async function refreshHero() {
  await fetch('/api/hero/refresh', { method: 'POST' });
  await loadData(); // Reload data after refresh
  alert('🔄 Hero updated from photos/hero folder');
}

// Initial load of images when page opens
loadData();
