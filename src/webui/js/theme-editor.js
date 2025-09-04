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

// --- Color Picker
function setupColorPicker(colorId, btnId, textId, initial) {
  const colorInput = document.getElementById(colorId);
  const colorBtn = document.getElementById(btnId);
  const textInput = document.getElementById(textId);

  colorInput.value = initial;
  colorBtn.style.background = initial;
  textInput.value = initial.toUpperCase();

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
  select.innerHTML = options.map(opt => {
    // Remove extension if present
    const base = opt.replace(/\.(woff2?|ttf|otf)$/, "");
    return `<option value="${base}"${base === value ? " selected" : ""}>${base}</option>`;
  }).join("");
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
        <span class="font-name">${font}</span>
        <button type="button" class="remove-font-btn danger remove-btn" data-font="${font}">🗑️</button>
      </div>
    `;
  });
}

// --- Section helpers ---
function getSectionValues(section) {
  switch (section) {
    case "colors":
      return {
        primary: document.getElementById("color-primary-text").value,
        primary_dark: document.getElementById("color-primary-dark-text").value,
        secondary: document.getElementById("color-secondary-text").value,
        accent: document.getElementById("color-accent-text").value,
        text_dark: document.getElementById("color-text-dark-text").value,
        background: document.getElementById("color-background-text").value,
        browser_color: document.getElementById("color-browser-color-text").value
      };
    case "google-fonts":
      const googleFontsFields = document.getElementById("google-fonts-fields");
      const fonts = [];
      if (googleFontsFields) {
        googleFontsFields.querySelectorAll(".input-field").forEach(field => {
          const family = field.querySelector('input[name^="google_fonts"][name$="[family]"]').value.trim();
          const weights = field.querySelector('input[name^="google_fonts"][name$="[weights]"]').value
            .split(",").map(w => w.trim()).filter(Boolean);
          if (family) fonts.push({ family, weights });
        });
      }
      return fonts;
    case "fonts":
      return {
        primary: {
          name: document.getElementById("font-primary").value,
          fallback: document.getElementById("font-primary-fallback").value
        },
        secondary: {
          name: document.getElementById("font-secondary").value,
          fallback: document.getElementById("font-secondary-fallback").value
        }
      };
    case "favicon":
      return {
        path: document.getElementById("favicon-path").value
      };
    default:
      return {};
  }
}

function isSectionComplete(section) {
  switch (section) {
    case "colors":
      const v = getSectionValues("colors");
      return (
        v.primary &&
        v.primary_dark &&
        v.secondary &&
        v.accent &&
        v.text_dark &&
        v.background &&
        v.browser_color
      );
    case "google-fonts":
      const fonts = getSectionValues("google-fonts");
      return fonts.every(f => f.family);
    case "fonts":
      const f = getSectionValues("fonts");
      return f.primary.name && f.primary.fallback && f.secondary.name && f.secondary.fallback;
    case "favicon":
      const fav = getSectionValues("favicon");
      return !!fav.path;
    default:
      return true;
  }
}

function isSectionSaved(section, loadedConfig) {
  switch (section) {
    case "colors":
      const v = getSectionValues("colors");
      const c = loadedConfig.colors || {};
      return (
        v.primary === c.primary &&
        v.primary_dark === c.primary_dark &&
        v.secondary === c.secondary &&
        v.accent === c.accent &&
        v.text_dark === c.text_dark &&
        v.background === c.background &&
        v.browser_color === c.browser_color
      );
    case "google-fonts":
      const fonts = getSectionValues("google-fonts");
      const cf = loadedConfig.google_fonts || [];
      return JSON.stringify(fonts) === JSON.stringify(cf);
    case "fonts":
      const f = getSectionValues("fonts");
      const cfnt = loadedConfig.fonts || {};
      return (
        f.primary.name === (cfnt.primary?.name || "") &&
        f.primary.fallback === (cfnt.primary?.fallback || "") &&
        f.secondary.name === (cfnt.secondary?.name || "") &&
        f.secondary.fallback === (cfnt.secondary?.fallback || "")
      );
    case "favicon":
      const fav = getSectionValues("favicon");
      const cfav = loadedConfig.favicon || {};
      return fav.path === (cfav.path || "");
    default:
      return true;
  }
}

function updateSectionStatus(section, loadedConfig) {
  const statusEl = document.querySelector(`#${section}-form .section-status`);
  if (!statusEl) return;
  if (!isSectionComplete(section)) {
    statusEl.innerHTML = "⚠️ Section not yet saved. Please fill required fields";
    statusEl.style.color = "#ffc700";
    statusEl.style.display = "";
    statusEl.style.fontStyle = "normal";
    return;
  }
  if (isSectionSaved(section, loadedConfig)) {
    statusEl.innerHTML = "";
    statusEl.style.display = "none";
  } else {
    statusEl.innerHTML = "⚠️ Section not yet saved";
    statusEl.style.color = "#ffc700";
    statusEl.style.display = "";
    statusEl.style.fontStyle = "normal";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const themeInfo = await fetchThemeInfo();
  const themeNameSpan = document.getElementById("current-theme");
  if (themeNameSpan) themeNameSpan.textContent = themeInfo.theme_name;

  let loadedConfig = themeInfo.theme_yaml;
  let googleFonts = loadedConfig.google_fonts ? JSON.parse(JSON.stringify(loadedConfig.google_fonts)) : [];
  let localFonts = await fetchLocalFonts(themeInfo.theme_name);

  // Colors
  if (loadedConfig.colors) {
    setupColorPicker("color-primary", "color-primary-btn", "color-primary-text", loadedConfig.colors.primary || "#0065a1");
    setupColorPicker("color-primary-dark", "color-primary-dark-btn", "color-primary-dark-text", loadedConfig.colors.primary_dark || "#005384");
    setupColorPicker("color-secondary", "color-secondary-btn", "color-secondary-text", loadedConfig.colors.secondary || "#00b0f0");
    setupColorPicker("color-accent", "color-accent-btn", "color-accent-text", loadedConfig.colors.accent || "#ffc700");
    setupColorPicker("color-text-dark", "color-text-dark-btn", "color-text-dark-text", loadedConfig.colors.text_dark || "#616161");
    setupColorPicker("color-background", "color-background-btn", "color-background-text", loadedConfig.colors.background || "#fff");
    setupColorPicker("color-browser-color", "color-browser-color-btn", "color-browser-color-text", loadedConfig.colors.browser_color || "#fff");
  }

  // Fonts
  function refreshFontDropdowns() {
    setFontDropdown("font-primary", loadedConfig.fonts?.primary?.name || "Lato", [
      ...googleFonts.map(f => f.family),
      ...localFonts
    ]);
    setFontDropdown("font-secondary", loadedConfig.fonts?.secondary?.name || "Montserrat", [
      ...googleFonts.map(f => f.family),
      ...localFonts
    ]);
    setFallbackDropdown("font-primary-fallback", loadedConfig.fonts?.primary?.fallback || "sans-serif");
    setFallbackDropdown("font-secondary-fallback", loadedConfig.fonts?.secondary?.fallback || "serif");
  }
  refreshFontDropdowns();

  // Font upload logic
  const fontUploadInput = document.getElementById("font-upload");
  const chooseFontBtn = document.getElementById("choose-font-btn");
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
        showToast("Only .woff and .woff2 fonts are allowed.", "error");
        return;
      }
      showLoader("Uploading font...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("theme", themeInfo.theme_name);
      const res = await fetch("/api/font/upload", { method: "POST", body: formData });
      const result = await res.json();
      hideLoader();
      if (result.status === "ok") {
        showToast("✅ Font uploaded!", "success");
        localFonts = await fetchLocalFonts(themeInfo.theme_name);
        refreshLocalFonts();
      } else {
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
      showLoader("Removing font...");
      const result = await removeFont(themeInfo.theme_name, fontToDelete);
      hideLoader();
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
      showLoader("Uploading favicon...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("theme", themeInfo.theme_name);
      const res = await fetch("/api/favicon/upload", { method: "POST", body: formData });
      const result = await res.json();
      hideLoader();
      if (result.status === "ok") {
        faviconInput.value = result.filename;
        updateFaviconPreview(`/themes/${themeInfo.theme_name}/${result.filename}?t=${Date.now()}`);
        showToast("✅ Favicon uploaded!", "success");
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
      showLoader("Removing favicon...");
      const res = await fetch("/api/favicon/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeInfo.theme_name })
      });
      const result = await res.json();
      hideLoader();
      if (result.status === "ok") {
        faviconInput.value = "";
        updateFaviconPreview("");
        showToast("✅ Favicon removed!", "success");
      } else {
        showToast("Error removing favicon", "error");
      }
      deleteFaviconModal.style.display = "none";
    };
  }

  if (loadedConfig.favicon && loadedConfig.favicon.path) {
    faviconInput.value = loadedConfig.favicon.path;
    updateFaviconPreview(`/themes/${themeInfo.theme_name}/${loadedConfig.favicon.path}?t=${Date.now()}`);
  } else {
    updateFaviconPreview("");
  }

  // Google Fonts
  renderGoogleFonts(googleFonts);

  // Add Google Font
  const addGoogleFontBtn = document.getElementById("add-google-font");
  if (addGoogleFontBtn) {
    addGoogleFontBtn.addEventListener("click", async () => {
      googleFonts.push({ family: "", weights: [] });
      await fetch("/api/theme-google-fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_name: themeInfo.theme_name, google_fonts: googleFonts })
      });
      const updatedThemeInfo = await fetchThemeInfo();
      const updatedGoogleFonts = updatedThemeInfo.theme_yaml.google_fonts || [];
      googleFonts.length = 0;
      googleFonts.push(...updatedGoogleFonts);
      renderGoogleFonts(googleFonts);
      refreshFontDropdowns();
      updateSectionStatus("google-fonts", loadedConfig);
    });
  }

  const googleFontsFields = document.getElementById("google-fonts-fields");
  if (googleFontsFields) {
    googleFontsFields.addEventListener("blur", async (e) => {
      if (
        e.target.name &&
        (e.target.name.endsWith("[family]") || e.target.name.endsWith("[weights]"))
      ) {
        const fontFields = googleFontsFields.querySelectorAll(".input-field");
        googleFonts.length = 0;
        fontFields.forEach(field => {
          const family = field.querySelector('input[name^="google_fonts"][name$="[family]"]').value.trim();
          const weights = field.querySelector('input[name^="google_fonts"][name$="[weights]"]').value
            .split(",").map(w => w.trim()).filter(Boolean);
          googleFonts.push({ family, weights });
        });
        await fetch("/api/theme-google-fonts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme_name: themeInfo.theme_name, google_fonts: googleFonts })
        });
        const updatedThemeInfo = await fetchThemeInfo();
        const updatedGoogleFonts = updatedThemeInfo.theme_yaml.google_fonts || [];
        googleFonts.length = 0;
        googleFonts.push(...updatedGoogleFonts);
        renderGoogleFonts(googleFonts);
        refreshFontDropdowns();
        updateSectionStatus("google-fonts", loadedConfig);
      }
    }, true);

    googleFontsFields.addEventListener("click", async (e) => {
      if (e.target.classList.contains("remove-google-font")) {
        const idx = Number(e.target.dataset.idx);
        googleFonts.splice(idx, 1);
        await fetch("/api/theme-google-fonts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme_name: themeInfo.theme_name, google_fonts: googleFonts })
        });
        const updatedThemeInfo = await fetchThemeInfo();
        const updatedGoogleFonts = updatedThemeInfo.theme_yaml.google_fonts || [];
        googleFonts.length = 0;
        googleFonts.push(...updatedGoogleFonts);
        renderGoogleFonts(googleFonts);
        refreshFontDropdowns();
        updateSectionStatus("google-fonts", loadedConfig);
      }
    });
  }

  // --- Section status listeners ---
  [
    { form: document.getElementById("colors-form"), section: "colors" },
    { form: document.getElementById("google-fonts-form"), section: "google-fonts" },
    { form: document.getElementById("fonts-form"), section: "fonts" },
    { form: document.getElementById("favicon-form"), section: "favicon" }
  ].forEach(({ form, section }) => {
    if (!form) return;
    form.addEventListener("input", () => updateSectionStatus(section, loadedConfig));
    form.addEventListener("change", () => updateSectionStatus(section, loadedConfig));
  });

  // --- Section save handlers ---
  [
    { form: document.getElementById("colors-form"), section: "colors" },
    { form: document.getElementById("google-fonts-form"), section: "google-fonts" },
    { form: document.getElementById("fonts-form"), section: "fonts" },
    { form: document.getElementById("favicon-form"), section: "favicon" }
  ].forEach(({ form, section }) => {
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity() || !isSectionComplete(section)) {
        showToast("❌ Please fill all required fields before saving.", "error");
        updateSectionStatus(section, loadedConfig);
        return;
      }
      // Merge with loadedConfig to avoid overwriting other sections
      let payload = { ...loadedConfig };
      switch (section) {
        case "colors":
          payload.colors = getSectionValues("colors");
          break;
        case "google-fonts":
          payload.google_fonts = getSectionValues("google-fonts");
          break;
        case "fonts":
          payload.fonts = getSectionValues("fonts");
          break;
        case "favicon":
          payload.favicon = getSectionValues("favicon");
          break;
      }
      showLoader("Saving...");
      const res = await fetch("/api/theme-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_name: themeInfo.theme_name, theme_yaml: payload })
      });
      hideLoader();
      if (res.ok) {
        showToast("✅ Section saved!", "success");
        const updatedThemeInfo = await fetchThemeInfo();
        loadedConfig = updatedThemeInfo.theme_yaml;
        updateSectionStatus(section, loadedConfig);
      } else {
        showToast("Error saving section.", "error");
      }
    });
  });

  // Initial status update
  ["colors", "google-fonts", "fonts", "favicon"].forEach(section => updateSectionStatus(section, loadedConfig));
});