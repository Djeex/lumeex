// --- Loader helpers ---
function showLoader(text = "Uploading...") {
  const loader = document.getElementById("global-loader");
  if (loader) {
    loader.style.display = "flex";
    document.getElementById("loader-text").textContent = text;
  }
}
function hideLoader() {
  const loader = document.getElementById("global-loader");
  if (loader) loader.style.display = "none";
}

// --- Upload gallery images ---
const galleryInput = document.getElementById('upload-gallery');
if (galleryInput) {
  galleryInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    showLoader("Uploading photos...");
    const formData = new FormData();
    for (const file of files) formData.append('files', file);

    try {
      const res = await fetch('/api/gallery/upload', { method: 'POST', body: formData });
      const data = await res.json();
      hideLoader();
      if (res.ok) {
        showToast(`✅ ${data.uploaded.length} gallery image(s) uploaded!`, "success");
        if (typeof refreshGallery === "function") refreshGallery();
      } else showToast('Error: ' + data.error, "error");
    } catch(err) {
      hideLoader();
      console.error(err);
      showToast('Server error!', "error");
    } finally { e.target.value = ''; }
  });
}

// --- Upload hero images ---
const heroInput = document.getElementById('upload-hero');
if (heroInput) {
  heroInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    showLoader("Uploading hero photos...");
    const formData = new FormData();
    for (const file of files) formData.append('files', file);

    try {
      const res = await fetch('/api/hero/upload', { method: 'POST', body: formData });
      const data = await res.json();
      hideLoader();
      if (res.ok) {
        showToast(`✅ ${data.uploaded.length} hero image(s) uploaded!`, "success");
        if (typeof refreshHero === "function") refreshHero();
      } else showToast('Error: ' + data.error, "error");
    } catch(err) {
      hideLoader();
      console.error(err);
      showToast('Server error!', "error");
    } finally { e.target.value = ''; }
  });
}