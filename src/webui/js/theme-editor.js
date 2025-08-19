async function fetchThemeInfo() {
  const res = await fetch("/api/theme-info");
  return await res.json();
}

async function fetchLocalFonts(theme) {
  const res = await fetch(`/api/local-fonts?theme=${encodeURIComponent(theme)}`);
  return await res.json();
}

async function removeFont(theme, font) {
  const res = await fetch("/api/font/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme, font })
  });
  return await res.json();
}

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
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

function setupColorPicker(colorId, btnId, textId, initial) {
  const colorInput = document.getElementById(colorId);
  const colorBtn = document.getElementById(btnId);
  const textInput = document.getElementById(textId);

  colorInput.value = initial;
  colorBtn.style.background = initial;
  textInput.value = initial.toUpperCase();

  // Color input is positioned over the button and is clickable
  colorInput.addEventListener("input", () => {
    colorBtn.style.background = colorInput.value;
    textInput.value = colorInput.value.toUpperCase();
  });

  textInput.addEventListener("input", () => {
    if (/^#[0-9A-F]{6}$/i.test(textInput.value)) {
      colorInput.value = textInput.value;
      colorBtn.style.background = textInput.value;
    }
  });
}

function setFontDropdown(selectId, value, options) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = options.map(opt =>
    `<option value="${opt}"${opt === value ? " selected" : ""}>${opt}</option>`
  ).join("");
}

function setFallbackDropdown(selectId, value) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.value = (value === "serif" || value === "sans-serif") ? value : "sans-serif";
}

function setTextInput(inputId, value) {
  const input = document.getElementById(inputId);
  if (input) input.value = value;
}

function renderGoogleFonts(googleFonts) {
  const container = document.getElementById("google-fonts-fields");
  container.innerHTML = "";
  googleFonts.forEach((font, idx) => {
    container.innerHTML += `
      <div class="input-field" data-idx="${idx}">
        <label>Family</label>
        <input type="text" name="google_fonts[${idx}][family]" value="${font.family || ""}">
        <label>Weights (comma separated)</label>
        <input type="text" name="google_fonts[${idx}][weights]" value="${(font.weights || []).join(',')}">
        <button type="button" class="remove-google-font remove-btn" data-idx="${idx}"> 🗑️ Remove</button>
      </div>
    `;
  });
}

function renderLocalFonts(fonts) {
  const listDiv = document.getElementById("local-fonts-list");
  if (!listDiv) return;
  listDiv.innerHTML = "";
  fonts.forEach(font => {
    listDiv.innerHTML += `
      <div class="font-item">
        <span>${font}</span>
        <button type="button" class="remove-font-btn danger" data-font="${font}">Remove</button>
      </div>
    `;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const themeInfo = await fetchThemeInfo();
  const themeNameSpan = document.getElementById("current-theme");
  if (themeNameSpan) themeNameSpan.textContent = themeInfo.theme_name;

  const themeYaml = themeInfo.theme_yaml;
  const googleFonts = themeYaml.google_fonts ? JSON.parse(JSON.stringify(themeYaml.google_fonts)) : [];
  let localFonts = await fetchLocalFonts(themeInfo.theme_name);

  // Colors
  if (themeYaml.colors) {
    setupColorPicker("color-primary", "color-primary-btn", "color-primary-text", themeYaml.colors.primary || "#0065a1");
    setupColorPicker("color-primary-dark", "color-primary-dark-btn", "color-primary-dark-text", themeYaml.colors.primary_dark || "#005384");
    setupColorPicker("color-secondary", "color-secondary-btn", "color-secondary-text", themeYaml.colors.secondary || "#00b0f0");
    setupColorPicker("color-accent", "color-accent-btn", "color-accent-text", themeYaml.colors.accent || "#ffc700");
    setupColorPicker("color-text-dark", "color-text-dark-btn", "color-text-dark-text", themeYaml.colors.text_dark || "#616161");
    setupColorPicker("color-background", "color-background-btn", "color-background-text", themeYaml.colors.background || "#fff");
    setupColorPicker("color-browser-color", "color-browser-color-btn", "color-browser-color-text", themeYaml.colors.browser_color || "#fff");
  }

  // Fonts
  function refreshFontDropdowns() {
    setFontDropdown("font-primary", document.getElementById("font-primary").value, [
      ...googleFonts.map(f => f.family),
      ...localFonts
    ]);
    setFontDropdown("font-secondary", document.getElementById("font-secondary").value, [
      ...googleFonts.map(f => f.family),
      ...localFonts
    ]);
  }
  if (themeYaml.fonts) {
    setFontDropdown("font-primary", themeYaml.fonts.primary?.name || "Lato", [
      ...googleFonts.map(f => f.family),
      ...localFonts
    ]);
    setFallbackDropdown("font-primary-fallback", themeYaml.fonts.primary?.fallback || "sans-serif");
    setFontDropdown("font-secondary", themeYaml.fonts.secondary?.name || "Montserrat", [
      ...googleFonts.map(f => f.family),
      ...localFonts
    ]);
    setFallbackDropdown("font-secondary-fallback", themeYaml.fonts.secondary?.fallback || "serif");
  }

  // Font upload logic
  const fontUploadInput = document.getElementById("font-upload");
  const chooseFontBtn = document.getElementById("choose-font-btn");
  const fontUploadStatus = document.getElementById("font-upload-status");
  const localFontsList = document.getElementById("local-fonts-list");

  // Modal logic for font deletion
  const deleteFontModal = document.getElementById("delete-font-modal");
  const deleteFontModalClose = document.getElementById("delete-font-modal-close");
  const deleteFontModalConfirm = document.getElementById("delete-font-modal-confirm");
  const deleteFontModalCancel = document.getElementById("delete-font-modal-cancel");
  let fontToDelete = null;

  function refreshLocalFonts() {
    renderLocalFonts(localFonts);
    refreshFontDropdowns();
  }

  if (chooseFontBtn && fontUploadInput) {
    chooseFontBtn.addEventListener("click", () => fontUploadInput.click());
  }

  if (fontUploadInput) {
    fontUploadInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (!["woff", "woff2"].includes(ext)) {
        fontUploadStatus.textContent = "Only .woff and .woff2 fonts are allowed.";
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("theme", themeInfo.theme_name);
      const res = await fetch("/api/font/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (result.status === "ok") {
        fontUploadStatus.textContent = "Font uploaded!";
        showToast("Font uploaded!", "success");
        localFonts = await fetchLocalFonts(themeInfo.theme_name);
        refreshLocalFonts();
      } else {
        fontUploadStatus.textContent = "Error uploading font.";
        showToast("Error uploading font.", "error");
      }
    });
  }

  // Remove font button triggers modal
  if (localFontsList) {
    localFontsList.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-font-btn")) {
        fontToDelete = e.target.dataset.font;
        document.getElementById("delete-font-modal-text").textContent =
          `Are you sure you want to remove the font "${fontToDelete}"?`;
        deleteFontModal.style.display = "flex";
      }
    });
  }

  // Modal logic for font deletion
  if (deleteFontModal && deleteFontModalClose && deleteFontModalConfirm && deleteFontModalCancel) {
    deleteFontModalClose.onclick = deleteFontModalCancel.onclick = () => {
      deleteFontModal.style.display = "none";
      fontToDelete = null;
    };
    window.onclick = function(event) {
      if (event.target === deleteFontModal) {
        deleteFontModal.style.display = "none";
        fontToDelete = null;
      }
    };
    deleteFontModalConfirm.onclick = async () => {
      if (!fontToDelete) return;
      const result = await removeFont(themeInfo.theme_name, fontToDelete);
      if (result.status === "ok") {
        showToast("Font removed!", "success");
        localFonts = await fetchLocalFonts(themeInfo.theme_name);
        refreshLocalFonts();
      } else {
        showToast("Error removing font.", "error");
      }
      deleteFontModal.style.display = "none";
      fontToDelete = null;
    };
  }

  // Initial render of local fonts
  refreshLocalFonts();

  // Favicon logic
  const faviconInput = document.getElementById("favicon-path");
  const faviconUpload = document.getElementById("favicon-upload");
  const chooseFaviconBtn = document.getElementById("choose-favicon-btn");
  const faviconPreview = document.getElementById("favicon-preview");
  const removeFaviconBtn = document.getElementById("remove-favicon-btn");
  const deleteFaviconModal = document.getElementById("delete-favicon-modal");
  const deleteFaviconModalClose = document.getElementById("delete-favicon-modal-close");
  const deleteFaviconModalConfirm = document.getElementById("delete-favicon-modal-confirm");
  const deleteFaviconModalCancel = document.getElementById("delete-favicon-modal-cancel");

  function updateFaviconPreview(src) {
    if (faviconPreview) {
      faviconPreview.src = src || "";
      faviconPreview.style.display = src ? "block" : "none";
    }
    if (removeFaviconBtn) {
      removeFaviconBtn.style.display = src ? "block" : "none";
    }
    if (chooseFaviconBtn) {
      chooseFaviconBtn.style.display = src ? "none" : "block";
    }
  }

  if (chooseFaviconBtn && faviconUpload) {
    chooseFaviconBtn.addEventListener("click", () => faviconUpload.click());
  }

  if (faviconUpload) {
    faviconUpload.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (!["png", "jpg", "jpeg", "ico"].includes(ext)) {
        showToast("Invalid file type for favicon.", "error");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("theme", themeInfo.theme_name);
      const res = await fetch("/api/favicon/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (result.status === "ok") {
        faviconInput.value = result.filename;
        updateFaviconPreview(`/themes/${themeInfo.theme_name}/${result.filename}?t=${Date.now()}`);
        showToast("Favicon uploaded!", "success");
      } else {
        showToast("Error uploading favicon", "error");
      }
    });
  }

  if (removeFaviconBtn) {
    removeFaviconBtn.addEventListener("click", () => {
      deleteFaviconModal.style.display = "flex";
    });
  }

  if (deleteFaviconModal && deleteFaviconModalClose && deleteFaviconModalConfirm && deleteFaviconModalCancel) {
    deleteFaviconModalClose.onclick = deleteFaviconModalCancel.onclick = () => {
      deleteFaviconModal.style.display = "none";
    };
    window.onclick = function(event) {
      if (event.target === deleteFaviconModal) {
        deleteFaviconModal.style.display = "none";
      }
    };
    deleteFaviconModalConfirm.onclick = async () => {
      const res = await fetch("/api/favicon/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeInfo.theme_name })
      });
      const result = await res.json();
      if (result.status === "ok") {
        faviconInput.value = "";
        updateFaviconPreview("");
        showToast("Favicon removed!", "success");
      } else {
        showToast("Error removing favicon", "error");
      }
      deleteFaviconModal.style.display = "none";
    };
  }

  if (themeYaml.favicon && themeYaml.favicon.path) {
    faviconInput.value = themeYaml.favicon.path;
    updateFaviconPreview(`/themes/${themeInfo.theme_name}/${themeYaml.favicon.path}?t=${Date.now()}`);
  } else {
    updateFaviconPreview("");
  }

  // Google Fonts
  renderGoogleFonts(googleFonts);

  // Add Google Font
  const addGoogleFontBtn = document.getElementById("add-google-font");
  if (addGoogleFontBtn) {
    addGoogleFontBtn.addEventListener("click", () => {
      googleFonts.push({ family: "", weights: [] });
      renderGoogleFonts(googleFonts);
    });
  }

  // Remove Google Font
  const googleFontsFields = document.getElementById("google-fonts-fields");
  if (googleFontsFields) {
    googleFontsFields.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-google-font")) {
        const idx = parseInt(e.target.dataset.idx, 10);
        googleFonts.splice(idx, 1);
        renderGoogleFonts(googleFonts);
      }
    });
  }

  // Form submit
  document.getElementById("theme-editor-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    data.colors = {
      primary: document.getElementById("color-primary-text").value,
      primary_dark: document.getElementById("color-primary-dark-text").value,
      secondary: document.getElementById("color-secondary-text").value,
      accent: document.getElementById("color-accent-text").value,
      text_dark: document.getElementById("color-text-dark-text").value,
      background: document.getElementById("color-background-text").value,
      browser_color: document.getElementById("color-browser-color-text").value
    };
    data.fonts = {
      primary: {
        name: document.getElementById("font-primary").value,
        fallback: document.getElementById("font-primary-fallback").value
      },
      secondary: {
        name: document.getElementById("font-secondary").value,
        fallback: document.getElementById("font-secondary-fallback").value
      }
    };
    data.favicon = {
      path: faviconInput.value
    };
    data.google_fonts = [];
    document.querySelectorAll("#google-fonts-fields .input-field").forEach(field => {
      const family = field.querySelector('input[name^="google_fonts"][name$="[family]"]').value;
      const weights = field.querySelector('input[name^="google_fonts"][name$="[weights]"]').value
        .split(",").map(w => w.trim()).filter(w => w);
      if (family) data.google_fonts.push({ family, weights });
    });

    const res = await fetch("/api/theme-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_name: themeInfo.theme_name, theme_yaml: data })
    });
    if (res.ok) {
      showToast("Theme saved!", "success");
    } else {
      showToast("Error saving theme.", "error");
    }
  });
});