// Upload handler for gallery images
document.getElementById('upload-gallery').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return; // Exit if no file is selected

  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', file); // Key must match what upload.py expects

  try {
    // Send POST request to the gallery upload endpoint
    const res = await fetch('/api/gallery/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      alert('✅ Gallery image uploaded!');
      refreshGallery(); // Refresh the gallery list from the server
    } else {
      alert('Error: ' + data.error); // Show server error if upload failed
    }
  } catch (err) {
    console.error(err);
    alert('Server error!'); // Network or server failure
  } finally {
    e.target.value = ''; // Reset file input so the same file can be uploaded again if needed
  }
});

// Upload handler for hero images
document.getElementById('upload-hero').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return; // Exit if no file is selected

  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', file); // Key must match what upload.py expects

  try {
    // Send POST request to the hero upload endpoint
    const res = await fetch('/api/hero/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      alert('✅ Hero image uploaded!');
      refreshHero(); // Refresh the hero list from the server
    } else {
      alert('Error: ' + data.error); // Show server error if upload failed
    }
  } catch (err) {
    console.error(err);
    alert('Server error!'); // Network or server failure
  } finally {
    e.target.value = ''; // Reset file input so the same file can be uploaded again if needed
  }
});
