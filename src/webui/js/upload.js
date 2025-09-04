// --- Loader helpers ---
function showLoader(text = "Uploading...") {
  const loader = document.getElementById("global-loader");
  if (loader) {
    loader.classList.add("active");
    document.getElementById("loader-text").textContent = text;
  }
}
function hideLoader() {
  const loader = document.getElementById("global-loader");
  if (loader) loader.classList.remove("active");
}

// --- Generic upload handler ---
function setupUpload(inputId, apiUrl, loaderText, successMsg, refreshFn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    showLoader(loaderText);
    const formData = new FormData();
    for (const file of files) formData.append('files', file);

    try {
      const res = await fetch(apiUrl, { method: 'POST', body: formData });
      const data = await res.json();
      hideLoader();
      if (res.ok) {
        showToast(`✅ ${data.uploaded.length} ${successMsg}`, "success");
        if (typeof refreshFn === "function") refreshFn();
      } else showToast('Error: ' + data.error, "error");
    } catch(err) {
      hideLoader();
      console.error(err);
      showToast('Server error!', "error");
    } finally {
      e.target.value = '';
    }
  });
}

// --- Setup all upload inputs ---
setupUpload('upload-gallery', '/api/gallery/upload', "Uploading photos...", "gallery image(s) uploaded!", refreshGallery);
setupUpload('upload-hero', '/api/hero/upload', "Uploading hero photos...", "hero image(s) uploaded!", refreshHero);
setupUpload('upload-gallery-bottom', '/api/gallery/upload', "Uploading photos...", "gallery image(s) uploaded!", refreshGallery);
setupUpload('upload-hero-bottom', '/api/hero/upload', "Uploading hero photos...", "hero image(s) uploaded!", refreshHero);