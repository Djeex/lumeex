// --- Upload gallery images ---
document.getElementById('upload-gallery').addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  const formData = new FormData();
  for (const file of files) formData.append('files', file);

  try {
    const res = await fetch('/api/gallery/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.uploaded.length} gallery image(s) uploaded!`);
      refreshGallery();
    } else alert('Error: ' + data.error);
  } catch(err) {
    console.error(err); alert('Server error!');
  } finally { e.target.value = ''; }
});

// --- Upload hero images ---
document.getElementById('upload-hero').addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  const formData = new FormData();
  for (const file of files) formData.append('files', file);

  try {
    const res = await fetch('/api/hero/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.uploaded.length} hero image(s) uploaded!`);
      refreshHero();
    } else alert('Error: ' + data.error);
  } catch(err) {
    console.error(err); alert('Server error!');
  } finally { e.target.value = ''; }
});
