// --- Arrays to store gallery and hero images ---
let galleryImages = [];
let heroImages = [];
let allTags = []; // global tag list

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
  galleryImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'photo';
    div.innerHTML = `
      <img src="/photos/${img.src}">
      <div class="tag-input" data-index="${i}"></div>
      <button onclick="deleteGalleryImage(${i})">🗑 Delete</button>
    `;
    container.appendChild(div);

    renderTags(div.querySelector('.tag-input'), img.tags || [], i);
  });
}

// --- Render tags for a single image ---
function renderTags(container, tags, imgIndex) {
  container.innerHTML = '';

  // Render existing tags
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
      renderTags(container, tags, imgIndex);
    };

    span.appendChild(remove);
    container.appendChild(span);
  });

  // Input for new tags
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Add tag...';
  container.appendChild(input);

  // Suggestion dropdown
  const suggestionBox = document.createElement('ul');
  suggestionBox.className = 'suggestions';
  container.appendChild(suggestionBox);

  let selectedIndex = -1;

  const addTag = (tag) => {
    tag = tag.trim();
    if (!tag) return;
    if (!tags.includes(tag)) tags.push(tag);
    updateTags(imgIndex, tags); // save to galleryImages and server
    renderTags(container, tags, imgIndex);
  };

  const updateSuggestions = () => {
    const value = input.value.toLowerCase();

    const allTagsFlat = galleryImages.flatMap(img => img.tags || []);
    const tagCount = {};
    allTagsFlat.forEach(t => tagCount[t] = (tagCount[t] || 0) + 1);

    const allTagsSorted = Object.keys(tagCount)
      .sort((a, b) => tagCount[b] - tagCount[a]);

    // Show suggestions that start with input (or all if empty)
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

  input.addEventListener('input', updateSuggestions);

  input.addEventListener('focus', updateSuggestions); // Show suggestions on focus

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
    } else if ([' ', ','].includes(e.key)) {
      e.preventDefault();
      addTag(input.value);
      input.value = '';
      updateSuggestions();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      suggestionBox.style.display = 'none';
      input.value = ''; // Clear input without saving
    }, 150);
  });

  input.focus();
  updateSuggestions(); // show suggestions on render
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
    div.className = 'photo';
    div.innerHTML = `
      <img src="/photos/${img.src}">
      <button onclick="deleteHeroImage(${i})">🗑 Delete</button>
    `;
    container.appendChild(div);
  });
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
      showToast("✅ Gallery image deleted!", "success");
    } else showToast("Error: " + data.error, "error");
  } catch(err) {
    console.error(err);
    showToast("Server error!", "error");
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
      showToast("✅ Hero image deleted!", "success");
    } else showToast("Error: " + data.error, "error");
  } catch(err) {
    console.error(err);
    showToast("Server error!", "error");
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

// --- Initialize ---
loadData();
