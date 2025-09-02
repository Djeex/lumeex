// --- Arrays to store gallery and hero images ---
let galleryImages = [];
let heroImages = [];
let allTags = []; // global tag list
let showOnlyUntagged = false;

// --- Load images from server on page load ---
async function loadData() {
  try {
    const galleryRes = await fetch('/api/gallery');
    galleryImages = await galleryRes.json();
    updateAllTags();
    renderGallery();

    const heroRes = await fetch('/api/hero');
    heroImages = await heroRes.json();
    renderHero();
  } catch(err) {
    console.error(err);
    showToast("Error loading images!", "error");
  }
}

// --- Update global tag list from galleryImages ---
function updateAllTags() {
  allTags = [];
  galleryImages.forEach(img => {
    if (img.tags) img.tags.forEach(t => {
      if (!allTags.includes(t)) allTags.push(t);
    });
  });
}

// --- Render gallery images with tags and delete buttons ---
function renderGallery() {
  const container = document.getElementById('gallery');
  container.innerHTML = '';

  // Filter images if toggle is on
  let imagesToShow = galleryImages;
  if (showOnlyUntagged) {
    imagesToShow = galleryImages.filter(img => !img.tags || img.tags.length === 0);
  }

  imagesToShow.forEach((img) => {
    const i = galleryImages.indexOf(img); // Use real index for tag/delete actions
    const div = document.createElement('div');
    div.className = 'photo flex-item flex-column';
    div.innerHTML = `
        <div class="flex-item">
          <img class="fade-in-img" src="/photos/${img.src}">
        </div>
      <div class="tags-display" data-index="${i}"></div>
      <div class="flex-item flex-full">
        <div class="flex-item flex-end">
          <button onclick="showDeleteModal('gallery', ${i})">🗑 Delete</button>
        </div>
        <div class="tag-input" data-index="${i}"></div>
      </div>
    `;
    container.appendChild(div);

    renderTags(i, img.tags || []);
  });

  // Update gallery count (top)
  const galleryCount = document.getElementById('gallery-count');
  if (galleryCount) {
    galleryCount.innerHTML = `<p>${imagesToShow.length} photos</p>`;
  }

  // Update gallery count (bottom)
  const galleryCountBottom = document.getElementById('gallery-count-bottom');
  if (galleryCountBottom) {
    galleryCountBottom.innerHTML = `<p>${imagesToShow.length} photos</p>`;
  }

  // Show/hide Remove All button (top)
  const removeAllBtn = document.getElementById('remove-all-gallery');
  if (removeAllBtn) {
    removeAllBtn.style.display = imagesToShow.length > 0 ? 'inline-block' : 'none';
  }

  // Show/hide bottom upload row
  const bottomGalleryUpload = document.getElementById('bottom-gallery-upload');
  if (bottomGalleryUpload) {
    bottomGalleryUpload.style.display = imagesToShow.length > 0 ? 'flex' : 'none';
  }

  // Show/hide Remove All button (bottom)
  const removeAllBtnBottom = document.getElementById('remove-all-gallery-bottom');
  if (removeAllBtnBottom) {
    removeAllBtnBottom.style.display = imagesToShow.length > 0 ? 'inline-block' : 'none';
  }

  // Fade-in effect for loaded images
  const fadeImages = document.querySelectorAll("img.fade-in-img");
  fadeImages.forEach(img => {
    const onLoad = () => {
      img.classList.add("loaded");
    };
    if (img.complete && img.naturalHeight !== 0) {
      onLoad();
    } else {
      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", () => {
        console.warn("Image failed to load:", img.dataset.src || img.src);
      });
    }
  });
}

// --- Render tags for a single image ---
function renderTags(imgIndex, tags) {
  const tagsDisplay = document.querySelector(`.tags-display[data-index="${imgIndex}"]`);
  const inputContainer = document.querySelector(`.tag-input[data-index="${imgIndex}"]`);

  tagsDisplay.innerHTML = '';
  inputContainer.innerHTML = '';

  tags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;

    const remove = document.createElement('span');
    remove.className = 'remove-tag';
    remove.textContent = '×';
    remove.onclick = () => {
      tags.splice(tags.indexOf(tag), 1);
      updateTags(imgIndex, tags);
      renderTags(imgIndex, tags);
    };

    span.appendChild(remove);
    tagsDisplay.appendChild(span);
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Add tag...';
  inputContainer.appendChild(input);

  // --- Validate button ---
  const validateBtn = document.createElement('button');
  validateBtn.textContent = '✔️';
  validateBtn.className = 'validate-tag-btn';
  validateBtn.style.display = 'none'; // hidden by default
  validateBtn.style.marginLeft = '4px';
  inputContainer.appendChild(validateBtn);

  const suggestionBox = document.createElement('ul');
  suggestionBox.className = 'suggestions';
  inputContainer.appendChild(suggestionBox);

  let selectedIndex = -1;

  const addTag = (tag) => {
    tag = tag.trim();
    if (!tag) return;
    if (!tags.includes(tag)) tags.push(tag);
    updateTags(imgIndex, tags);
    renderTags(imgIndex, tags);
  };

  const updateSuggestions = () => {
    const value = input.value.toLowerCase();

    const allTagsFlat = galleryImages.flatMap(img => img.tags || []);
    const tagCount = {};
    allTagsFlat.forEach(t => tagCount[t] = (tagCount[t] || 0) + 1);

    const allTagsSorted = Object.keys(tagCount)
      .sort((a, b) => tagCount[b] - tagCount[a]);

    const suggestions = allTagsSorted.filter(t => t.toLowerCase().startsWith(value) && !tags.includes(t));

    suggestionBox.innerHTML = '';
    selectedIndex = -1;

    if (suggestions.length) {
      suggestionBox.style.display = 'block';
      suggestions.forEach((s, idx) => {
        const li = document.createElement('li');
        li.style.fontStyle = 'italic';
        li.style.textAlign = 'left';

        const boldPart = `<b>${s.substring(0, input.value.length)}</b>`;
        const rest = s.substring(input.value.length);
        li.innerHTML = boldPart + rest;

        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          addTag(s);
          input.value = '';
          input.focus();
          updateSuggestions();
        });

        li.onmouseover = () => selectedIndex = idx;
        suggestionBox.appendChild(li);
      });
    } else {
      suggestionBox.style.display = 'none';
    }
  };

  input.addEventListener('input', () => {
    updateSuggestions();
    validateBtn.style.display = input.value.trim() ? 'inline-block' : 'none';
  });
  input.addEventListener('focus', () => {
    updateSuggestions();
    validateBtn.style.display = input.value.trim() ? 'inline-block' : 'none';
  });

  input.addEventListener('keydown', (e) => {
    const items = suggestionBox.querySelectorAll('li');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      selectedIndex = (selectedIndex + 1) % items.length;
      items.forEach((li, i) => li.classList.toggle('selected', i === selectedIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      items.forEach((li, i) => li.classList.toggle('selected', i === selectedIndex));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        addTag(items[selectedIndex].textContent);
      } else {
        addTag(input.value);
      }
      input.value = '';
      updateSuggestions();
      validateBtn.style.display = 'none';
    } else if ([' ', ','].includes(e.key)) {
      e.preventDefault();
      addTag(input.value);
      input.value = '';
      updateSuggestions();
      validateBtn.style.display = 'none';
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      suggestionBox.style.display = 'none';
      input.value = '';
      validateBtn.style.display = 'none';
    }, 150);
  });

  // --- Validate button action ---
  validateBtn.onclick = () => {
    if (input.value.trim()) {
      addTag(input.value.trim());
      input.value = '';
      updateSuggestions();
      validateBtn.style.display = 'none';
    }
  };

  input.focus();
  updateSuggestions();
}

// --- Update tags in galleryImages array ---
function updateTags(index, tags) {
  galleryImages[index].tags = tags;
  saveGallery();
}

// --- Render hero images with delete buttons ---
function renderHero() {
  const container = document.getElementById('hero');
  container.innerHTML = '';
  heroImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'photo flex-item flex-column';
    div.innerHTML = `
      <div class="flex-item">
        <img src="/photos/${img.src}">
      </div>
      <div class="flex-item flex-full">
        <div class="flex-item flex-end">
          <button onclick="showDeleteModal('hero', ${i})">🗑 Delete</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  // Update hero count (top)
  const heroCount = document.getElementById('hero-count');
  if (heroCount) {
    heroCount.innerHTML = `<p>${heroImages.length} photos</p>`;
  }

  // Update hero count (bottom)
  const heroCountBottom = document.getElementById('hero-count-bottom');
  if (heroCountBottom) {
    heroCountBottom.innerHTML = `<p>${heroImages.length} photos</p>`;
  }

  // Show/hide Remove All button (top)
  const removeAllBtn = document.getElementById('remove-all-hero');
  if (removeAllBtn) {
    removeAllBtn.style.display = heroImages.length > 0 ? 'inline-block' : 'none';
  }

  // Show/hide bottom upload row
  const bottomHeroUpload = document.getElementById('bottom-hero-upload');
  if (bottomHeroUpload) {
    bottomHeroUpload.style.display = heroImages.length > 0 ? 'flex' : 'none';
  }

  // Show/hide Remove All button (bottom)
  const removeAllBtnBottom = document.getElementById('remove-all-hero-bottom');
  if (removeAllBtnBottom) {
    removeAllBtnBottom.style.display = heroImages.length > 0 ? 'inline-block' : 'none';
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
  showToast('✅ Changes saved!', "success");
}

// --- Refresh gallery from folder ---
async function refreshGallery() {
  await fetch('/api/gallery/refresh', { method: 'POST' });
  await loadData();
  showToast('🔄 Gallery updated from photos/gallery folder', "success");
}

// --- Refresh hero from folder ---
async function refreshHero() {
  await fetch('/api/hero/refresh', { method: 'POST' });
  await loadData();
  showToast('🔄 Hero updated from photos/hero folder', "success");
}

// --- Show toast notification ---
function showToast(message, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
}

let pendingDelete = null; // { type: 'gallery'|'hero'|'gallery-all'|'hero-all', index: number|null }

// --- Show delete confirmation modal ---
function showDeleteModal(type, index = null) {
  pendingDelete = { type, index };
  const modalText = document.getElementById('delete-modal-text');
  if (type === 'gallery-all') {
    modalText.textContent = "Are you sure you want to delete ALL gallery images?";
  } else if (type === 'hero-all') {
    modalText.textContent = "Are you sure you want to delete ALL hero images?";
  } else {
    modalText.textContent = "Are you sure you want to delete this image?";
  }
  document.getElementById('delete-modal').style.display = 'flex';
}

// --- Hide modal ---
function hideDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  pendingDelete = null;
}

// --- Confirm deletion ---
async function confirmDelete() {
  if (!pendingDelete) return;
  if (pendingDelete.type === 'gallery') {
    await actuallyDeleteGalleryImage(pendingDelete.index);
  } else if (pendingDelete.type === 'hero') {
    await actuallyDeleteHeroImage(pendingDelete.index);
  } else if (pendingDelete.type === 'gallery-all') {
    await actuallyDeleteAllGalleryImages();
  } else if (pendingDelete.type === 'hero-all') {
    await actuallyDeleteAllHeroImages();
  }
  hideDeleteModal();
}

// --- Actual delete functions ---
async function actuallyDeleteGalleryImage(index) {
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
      showToast("✅ Gallery image deleted!", "success");
    } else showToast("Error: " + data.error, "error");
  } catch(err) {
    console.error(err);
    showToast("Server error!", "error");
  }
}

async function actuallyDeleteHeroImage(index) {
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
      showToast("✅ Hero image deleted!", "success");
    } else showToast("Error: " + data.error, "error");
  } catch(err) {
    console.error(err);
    showToast("Server error!", "error");
  }
}

// --- Bulk delete functions ---
async function actuallyDeleteAllGalleryImages() {
  try {
    const res = await fetch('/api/gallery/delete_all', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      galleryImages = [];
      renderGallery();
      await saveGallery();
      showToast("✅ All gallery images removed!", "success");
    } else showToast("Error: " + data.error, "error");
  } catch(err) {
    console.error(err);
    showToast("Server error!", "error");
  }
}

async function actuallyDeleteAllHeroImages() {
  try {
    const res = await fetch('/api/hero/delete_all', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      heroImages = [];
      renderHero();
      await saveHero();
      showToast("✅ All hero images removed!", "success");
    } else showToast("Error: " + data.error, "error");
  } catch(err) {
    console.error(err);
    showToast("Server error!", "error");
  }
}

// --- Modal event listeners and bulk delete buttons ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('delete-modal-close').onclick = hideDeleteModal;
  document.getElementById('delete-modal-cancel').onclick = hideDeleteModal;
  document.getElementById('delete-modal-confirm').onclick = confirmDelete;

  // --- Radio toggle for gallery filter ---
  const showAllRadio = document.getElementById('show-all-radio');
  const showUntaggedRadio = document.getElementById('show-untagged-radio');

  if (showAllRadio && showUntaggedRadio) {
    showAllRadio.addEventListener('change', () => {
      if (showAllRadio.checked) {
        showOnlyUntagged = false;
        renderGallery();
      }
    });
    showUntaggedRadio.addEventListener('change', () => {
      if (showUntaggedRadio.checked) {
        showOnlyUntagged = true;
        renderGallery();
      }
    });
  }

  // Bulk delete buttons
  const removeAllGalleryBtn = document.getElementById('remove-all-gallery');
  const removeAllGalleryBtnBottom = document.getElementById('remove-all-gallery-bottom');
  const removeAllHeroBtn = document.getElementById('remove-all-hero');
  const removeAllHeroBtnBottom = document.getElementById('remove-all-hero-bottom');
  if (removeAllGalleryBtn) removeAllGalleryBtn.onclick = () => showDeleteModal('gallery-all');
  if (removeAllGalleryBtnBottom) removeAllGalleryBtnBottom.onclick = () => showDeleteModal('gallery-all');
  if (removeAllHeroBtn) removeAllHeroBtn.onclick = () => showDeleteModal('hero-all');
  if (removeAllHeroBtnBottom) removeAllHeroBtnBottom.onclick = () => showDeleteModal('hero-all');
});



// --- Initialize ---
loadData();