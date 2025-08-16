// --- Arrays to store gallery and hero images ---
let galleryImages = [];
let heroImages = [];

// --- Load images from server on page load ---
async function loadData() {
  try {
    const galleryRes = await fetch('/api/gallery');
    galleryImages = await galleryRes.json();
    renderGallery();

    const heroRes = await fetch('/api/hero');
    heroImages = await heroRes.json();
    renderHero();
  } catch(err) {
    console.error(err);
    alert("Error loading images!");
  }
}

// --- Render gallery images with tags and delete buttons ---
function renderGallery() {
  const container = document.getElementById('gallery');
  container.innerHTML = '';
  galleryImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'photo';
    div.innerHTML = `
      <img src="/photos/${img.src}">
      <input type="text" value="${(img.tags || []).join(', ')}"
        onchange="updateTags(${i}, this.value)">
      <button onclick="deleteGalleryImage(${i})">🗑 Delete</button>
    `;
    container.appendChild(div);
  });
}

// --- Render hero images with delete buttons ---
function renderHero() {
  const container = document.getElementById('hero');
  container.innerHTML = '';
  heroImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'photo';
    div.innerHTML = `
      <img src="/photos/${img.src}">
      <button onclick="deleteHeroImage(${i})">🗑 Delete</button>
    `;
    container.appendChild(div);
  });
}

// --- Update tags for gallery image ---
function updateTags(index, value) {
  galleryImages[index].tags = value.split(',').map(t => t.trim()).filter(t => t);
}

// --- Delete gallery image ---
async function deleteGalleryImage(index) {
  const img = galleryImages[index];
  try {
    const res = await fetch('/api/gallery/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ src: img.src.split('/').pop() })
    });
    const data = await res.json();
    if (res.ok) {
      galleryImages.splice(index, 1);
      renderGallery();
      await saveGallery();
    } else alert("Error: " + data.error);
  } catch(err) {
    console.error(err); alert("Server error!");
  }
}

// --- Delete hero image ---
async function deleteHeroImage(index) {
  const img = heroImages[index];
  try {
    const res = await fetch('/api/hero/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ src: img.src.split('/').pop() })
    });
    const data = await res.json();
    if (res.ok) {
      heroImages.splice(index, 1);
      renderHero();
      await saveHero();
    } else alert("Error: " + data.error);
  } catch(err) {
    console.error(err); alert("Server error!");
  }
}

// --- Save gallery to server ---
async function saveGallery() {
  await fetch('/api/gallery/update', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(galleryImages)
  });
}

// --- Save hero to server ---
async function saveHero() {
  await fetch('/api/hero/update', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(heroImages)
  });
}

// --- Save all changes ---
async function saveChanges() {
  await saveGallery();
  await saveHero();
  alert('✅ Changes saved!');
}

// --- Refresh gallery from folder ---
async function refreshGallery() {
  await fetch('/api/gallery/refresh', { method: 'POST' });
  await loadData();
  alert('🔄 Gallery updated from photos/gallery folder');
}

// --- Refresh hero from folder ---
async function refreshHero() {
  await fetch('/api/hero/refresh', { method: 'POST' });
  await loadData();
  alert('🔄 Hero updated from photos/hero folder');
}

// --- Initialize ---
loadData();
