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

document.addEventListener("DOMContentLoaded", () => {
  // --- Section Forms ---
  const forms = {
    info: document.getElementById("info-form"),
    social: document.getElementById("social-form"),
    menu: document.getElementById("menu-form"),
    footer: document.getElementById("footer-form"),
    legals: document.getElementById("legals-form"),
    build: document.getElementById("build-form")
  };

  // --- Menu logic ---
  const menuList = document.getElementById("menu-items-list");
  const addMenuBtn = document.getElementById("add-menu-item");
  let menuItems = [];
  function renderMenuItems() {
    menuList.innerHTML = "";
    menuItems.forEach((item, idx) => {
      menuList.innerHTML += `
        <div style="display:flex;gap:8px;margin-bottom:6px;">
          <input type="text" placeholder="Label" value="${item.label || ""}" style="flex:1;" data-idx="${idx}" data-type="label" required>
          <input type="text" placeholder="?tag=tag1,tag2" value="${item.href || ""}" style="flex:2;" data-idx="${idx}" data-type="href" required>
          <button type="button" class="remove-menu-item" data-idx="${idx}">🗑</button>
        </div>
      `;
    });
  }
  function updateMenuItemsFromInputs() {
    const inputs = menuList.querySelectorAll("input");
    menuItems = [];
    for (let i = 0; i < inputs.length; i += 2) {
      const label = inputs[i].value.trim();
      const href = inputs[i + 1].value.trim();
      if (label || href) menuItems.push({ label, href });
    }
  }

  // --- Intellectual property paragraphs logic ---
  const ipList = document.getElementById("ip-list");
  const addIpBtn = document.getElementById("add-ip-paragraph");
  let ipParagraphs = [];
  function renderIpParagraphs() {
    ipList.innerHTML = "";
    ipParagraphs.forEach((item, idx) => {
      ipList.innerHTML += `
        <div style="display:flex;gap:8px;margin-bottom:6px;">
          <textarea placeholder="Paragraph" required style="flex:1;" data-idx="${idx}">${item.paragraph || ""}</textarea>
          <button type="button" class="remove-ip-paragraph" data-idx="${idx}">🗑</button>
        </div>
      `;
    });
  }
  function updateIpParagraphsFromInputs() {
    ipParagraphs = Array.from(ipList.querySelectorAll("textarea"))
      .map(textarea => ({ paragraph: textarea.value.trim() }))
      .filter(item => item.paragraph !== "");
  }

  // --- Build options & Theme select ---
  const convertImagesCheckbox = document.getElementById("convert-images-checkbox");
  const resizeImagesCheckbox = document.getElementById("resize-images-checkbox");
  const themeSelect = document.getElementById("theme-select");

  // --- Thumbnail upload and modal logic ---
  const thumbnailInput = document.getElementById("social-thumbnail");
  const thumbnailUpload = document.getElementById("thumbnail-upload");
  const chooseThumbnailBtn = document.getElementById("choose-thumbnail-btn");
  const thumbnailPreview = document.getElementById("thumbnail-preview");
  const removeThumbnailBtn = document.getElementById("remove-thumbnail-btn");

  // --- Modal helpers ---
  function setupModal(modal, closeBtn, confirmBtn, cancelBtn, onConfirm) {
    if (!modal) return;
    if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
    if (cancelBtn) cancelBtn.onclick = () => modal.style.display = "none";
    window.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
    if (confirmBtn && onConfirm) confirmBtn.onclick = onConfirm;
  }

  // --- Thumbnail preview logic ---
  function updateThumbnailPreview(src) {
    if (thumbnailPreview) {
      thumbnailPreview.src = src || "";
      thumbnailPreview.style.display = src ? "block" : "none";
    }
    if (removeThumbnailBtn) removeThumbnailBtn.style.display = src ? "inline-block" : "none";
    if (chooseThumbnailBtn) chooseThumbnailBtn.style.display = src ? "none" : "inline-block";
  }

  if (chooseThumbnailBtn && thumbnailUpload) {
    chooseThumbnailBtn.addEventListener("click", () => thumbnailUpload.click());
  }
  if (thumbnailUpload) {
    thumbnailUpload.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showLoader("Uploading thumbnail...");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/thumbnail/upload", { method: "POST", body: formData });
      const result = await res.json();
      hideLoader();
      if (result.status === "ok") {
        if (thumbnailInput) thumbnailInput.value = result.filename;
        updateThumbnailPreview(`/photos/${result.filename}?t=${Date.now()}`);
        showToast("✅ Thumbnail uploaded!", "success");
      } else {
        showToast("❌ Error uploading thumbnail", "error");
      }
      updateSectionStatus("social");
    });
  }
  if (removeThumbnailBtn) {
    removeThumbnailBtn.addEventListener("click", () => {
      document.getElementById("delete-modal").style.display = "flex";
    });
  }
  setupModal(
    document.getElementById("delete-modal"),
    document.getElementById("delete-modal-close"),
    document.getElementById("delete-modal-confirm"),
    document.getElementById("delete-modal-cancel"),
    async () => {
      const res = await fetch("/api/thumbnail/remove", { method: "POST" });
      const result = await res.json();
      if (result.status === "ok") {
        if (thumbnailInput) thumbnailInput.value = "";
        updateThumbnailPreview("");
        showToast("✅ Thumbnail removed!", "success");
      } else {
        showToast("❌ Error removing thumbnail", "error");
      }
      document.getElementById("delete-modal").style.display = "none";
      updateSectionStatus("social");
    }
  );

  // --- Theme upload logic ---
  const themeUpload = document.getElementById("theme-upload");
  const chooseThemeBtn = document.getElementById("choose-theme-btn");
  if (chooseThemeBtn && themeUpload) {
    chooseThemeBtn.addEventListener("click", () => themeUpload.click());
    themeUpload.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      showLoader("Uploading theme...");
      const formData = new FormData();
      files.forEach(file => formData.append("files", file, file.webkitRelativePath || file.name));
      const res = await fetch("/api/theme/upload", { method: "POST", body: formData });
      const result = await res.json();
      hideLoader();
      if (result.status === "ok") {
        showToast("✅ Theme uploaded!", "success");
        refreshThemes();
      } else {
        showToast("❌ Error uploading theme", "error");
      }
      updateSectionStatus("build");
    });
  }

  // --- Remove theme logic ---
  const removeThemeBtn = document.getElementById("remove-theme-btn");
  let themeToDelete = null;
  if (removeThemeBtn && themeSelect) {
    removeThemeBtn.addEventListener("click", () => {
      const theme = themeSelect.value;
      if (!theme) return showToast("❌ No theme selected", "error");
      if (["modern", "classic"].includes(theme)) {
        showToast("❌ Cannot remove default theme", "error");
        return;
      }
      themeToDelete = theme;
      document.getElementById("delete-theme-modal-text").textContent = `Are you sure you want to remove theme "${theme}"?`;
      document.getElementById("delete-theme-modal").style.display = "flex";
    });
  }
  setupModal(
    document.getElementById("delete-theme-modal"),
    document.getElementById("delete-theme-modal-close"),
    document.getElementById("delete-theme-modal-confirm"),
    document.getElementById("delete-theme-modal-cancel"),
    async () => {
      if (!themeToDelete) return;
      showLoader("Removing theme...");
      const res = await fetch("/api/theme/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeToDelete })
      });
      const result = await res.json();
      hideLoader();
      if (result.status === "ok") {
        showToast("✅ Theme removed!", "success");
        refreshThemes();
      } else {
        showToast(result.error || "❌ Error removing theme", "error");
      }
      document.getElementById("delete-theme-modal").style.display = "none";
      themeToDelete = null;
      updateSectionStatus("build");
    }
  );

  // --- Theme select refresh ---
  function refreshThemes() {
    fetch("/api/themes")
      .then(res => res.json())
      .then(themes => {
        themeSelect.innerHTML = "";
        themes.forEach(theme => {
          const option = document.createElement("option");
          option.value = theme;
          option.textContent = theme;
          themeSelect.appendChild(option);
        });
        loadConfigAndUpdateBuildStatus();
      });
  }

  // --- Config loading ---
  let loadedConfig = {};
  function loadConfigAndUpdateBuildStatus() {
    fetch("/api/site-info")
      .then(res => res.json())
      .then(data => {
        loadedConfig = data;
        // Info
        if (forms.info) {
          forms.info.elements["info.title"].value = data.info?.title || "";
          forms.info.elements["info.subtitle"].value = data.info?.subtitle || "";
          forms.info.elements["info.description"].value = data.info?.description || "";
          forms.info.elements["info.canonical"].value = data.info?.canonical || "";
          forms.info.elements["info.keywords"].value = Array.isArray(data.info?.keywords) ? data.info.keywords.join(", ") : (data.info?.keywords || "");
          forms.info.elements["info.author"].value = data.info?.author || "";
        }
        // Social
        if (forms.social) {
          forms.social.elements["social.instagram_url"].value = data.social?.instagram_url || "";
          if (thumbnailInput) thumbnailInput.value = data.social?.thumbnail || "";
          updateThumbnailPreview(data.social?.thumbnail ? `/photos/${data.social.thumbnail}?t=${Date.now()}` : "");
        }
        // Menu
        menuItems = Array.isArray(data.menu?.items) ? data.menu.items : [];
        renderMenuItems();
        // Footer
        if (forms.footer) {
          forms.footer.elements["footer.copyright"].value = data.footer?.copyright || "";
          forms.footer.elements["footer.legal_label"].value = data.footer?.legal_label || "";
        }
        // Legals
        ipParagraphs = Array.isArray(data.legals?.intellectual_property)
          ? data.legals.intellectual_property
          : [];
        renderIpParagraphs();
        if (forms.legals) {
          forms.legals.elements["legals.hoster_name"].value = data.legals?.hoster_name || "";
          forms.legals.elements["legals.hoster_address"].value = data.legals?.hoster_address || "";
          forms.legals.elements["legals.hoster_contact"].value = data.legals?.hoster_contact || "";
        }
        // Build
        if (themeSelect) themeSelect.value = data.build?.theme || "";
        if (convertImagesCheckbox) convertImagesCheckbox.checked = !!data.build?.convert_images;
        if (resizeImagesCheckbox) resizeImagesCheckbox.checked = !!data.build?.resize_images;
        ["info", "social", "menu", "footer", "legals"].forEach(updateSectionStatus);
        updateSectionStatus("build");
      });
  }
  if (themeSelect) refreshThemes();
  else loadConfigAndUpdateBuildStatus();

  // --- Add/remove menu items ---
  if (addMenuBtn) addMenuBtn.addEventListener("click", () => {
    menuItems.push({ label: "", href: "" });
    renderMenuItems();
    updateSectionStatus("menu");
  });
  menuList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-menu-item")) {
      const idx = parseInt(e.target.getAttribute("data-idx"));
      menuItems.splice(idx, 1);
      renderMenuItems();
      updateSectionStatus("menu");
    }
  });
  menuList.addEventListener("input", () => {
    updateMenuItemsFromInputs();
    updateSectionStatus("menu");
  });

  // --- Add/remove IP paragraphs ---
  if (addIpBtn) addIpBtn.addEventListener("click", () => {
    ipParagraphs.push({ paragraph: "" });
    renderIpParagraphs();
    updateSectionStatus("legals");
  });
  ipList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-ip-paragraph")) {
      const idx = parseInt(e.target.getAttribute("data-idx"));
      ipParagraphs.splice(idx, 1);
      renderIpParagraphs();
      updateSectionStatus("legals");
    }
  });
  ipList.addEventListener("input", () => {
    updateIpParagraphsFromInputs();
    updateSectionStatus("legals");
  });

  // --- Section value helpers ---
  function getSectionValues(section) {
    switch (section) {
      case "info":
        return {
          title: forms.info.elements["info.title"].value,
          subtitle: forms.info.elements["info.subtitle"].value,
          description: forms.info.elements["info.description"].value,
          canonical: forms.info.elements["info.canonical"].value,
          keywords: forms.info.elements["info.keywords"].value.split(",").map(i => i.trim()).filter(Boolean),
          author: forms.info.elements["info.author"].value
        };
      case "social":
        return {
          instagram_url: forms.social.elements["social.instagram_url"].value,
          thumbnail: thumbnailInput ? thumbnailInput.value : ""
        };
      case "menu":
        updateMenuItemsFromInputs();
        return { items: menuItems };
      case "footer":
        return {
          copyright: forms.footer.elements["footer.copyright"].value,
          legal_label: forms.footer.elements["footer.legal_label"].value
        };
      case "legals":
        updateIpParagraphsFromInputs();
        return {
          hoster_name: forms.legals.elements["legals.hoster_name"].value,
          hoster_address: forms.legals.elements["legals.hoster_address"].value,
          hoster_contact: forms.legals.elements["legals.hoster_contact"].value,
          intellectual_property: ipParagraphs
        };
      case "build":
        return {
          theme: themeSelect ? themeSelect.value : "",
          convert_images: !!(convertImagesCheckbox && convertImagesCheckbox.checked),
          resize_images: !!(resizeImagesCheckbox && resizeImagesCheckbox.checked)
        };
      default:
        return {};
    }
  }

  function isSectionSaved(section) {
    const values = getSectionValues(section);
    const config = loadedConfig[section] || {};
    function normalizeMenuItems(items) {
      return (items || []).map(item => ({
        label: item.label || "",
        href: item.href || ""
      }));
    }
    switch (section) {
      case "info":
        return Object.keys(values).every(
          key => values[key] && (
            key === "keywords"
              ? Array.isArray(config.keywords) && values.keywords.join(",") === config.keywords.join(",")
              : values[key] === (config[key] || "")
          )
        );
      case "social":
        return values.instagram_url && values.thumbnail &&
          values.instagram_url === (config.instagram_url || "") &&
          values.thumbnail === (config.thumbnail || "");
      case "menu":
        return JSON.stringify(normalizeMenuItems(values.items)) === JSON.stringify(normalizeMenuItems(config.items));
      case "footer":
        return values.copyright && values.legal_label &&
          values.copyright === (config.copyright || "") &&
          values.legal_label === (config.legal_label || "");
      case "legals":
        return values.hoster_name && values.hoster_address && values.hoster_contact &&
          values.hoster_name === (config.hoster_name || "") &&
          values.hoster_address === (config.hoster_address || "") &&
          values.hoster_contact === (config.hoster_contact || "") &&
          JSON.stringify(values.intellectual_property) === JSON.stringify(config.intellectual_property || []);
      case "build":
        return values.theme === (config.theme || "") &&
          !!values.convert_images === !!config.convert_images &&
          !!values.resize_images === !!config.resize_images;
      default:
        return true;
    }
  }

  function isSectionComplete(section) {
    const values = getSectionValues(section);
    switch (section) {
      case "info":
        return (
          values.title &&
          values.subtitle &&
          values.description &&
          values.canonical &&
          values.keywords.length > 0 &&
          values.author
        );
      case "social":
        return values.instagram_url && values.thumbnail;
      case "menu":
        return Array.isArray(values.items) && values.items.every(item => item.label && item.href);
      case "footer":
        return values.copyright && values.legal_label;
      case "legals":
        return (
          values.hoster_name &&
          values.hoster_address &&
          values.hoster_contact &&
          Array.isArray(values.intellectual_property) &&
          values.intellectual_property.length > 0 &&
          values.intellectual_property.every(ip => ip.paragraph)
        );
      case "build":
        return !!values.theme;
      default:
        return true;
    }
  }

  function updateSectionStatus(section) {
    const statusEl = document.querySelector(`#${section}-section .section-status`);
    if (!statusEl) return;
    if (!isSectionComplete(section)) {
      statusEl.innerHTML = "⚠️ Section not yet saved. Please fill required fields";
      statusEl.style.color = "#ffc700";
      statusEl.style.display = "";
      statusEl.style.fontStyle = "normal";
      return;
    }
    if (isSectionSaved(section)) {
      statusEl.innerHTML = "";
      statusEl.style.display = "none";
    } else {
      statusEl.innerHTML = "⚠️ Section not yet saved";
      statusEl.style.color = "#ffc700";
      statusEl.style.display = "";
      statusEl.style.fontStyle = "normal";
    }
  }

  // --- Listen for changes in each section ---
  Object.entries(forms).forEach(([section, form]) => {
    if (!form) return;
    form.addEventListener("input", () => updateSectionStatus(section));
    form.addEventListener("change", () => updateSectionStatus(section));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) {
        showToast("❌ Please fill all required fields before saving.", "error");
        updateSectionStatus(section);
        return;
      }
      if (section === "social" && (!thumbnailInput || !thumbnailInput.value)) {
        showToast("❌ Thumbnail is required.", "error");
        updateSectionStatus(section);
        return;
      }
      if (section === "menu") {
        updateMenuItemsFromInputs();
        if (!menuItems.length || !menuItems.every(item => item.label && item.href)) {
          showToast("❌ Please fill all menu item fields.", "error");
          updateSectionStatus(section);
          return;
        }
      }
      if (section === "legals") {
        updateIpParagraphsFromInputs();
        if (!ipParagraphs.length || !ipParagraphs.every(ip => ip.paragraph)) {
          showToast("❌ Please fill all intellectual property paragraphs.", "error");
          updateSectionStatus(section);
          return;
        }
      }
      let payload = {};
      payload[section] = getSectionValues(section);
      const res = await fetch("/api/site-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.status === "ok") {
        showToast("✅ Section saved!", "success");
        fetch("/api/site-info")
          .then(res => res.json())
          .then(data => {
            loadedConfig = data;
            updateSectionStatus(section);
          });
      } else {
        showToast("❌ Error saving section", "error");
      }
    });
  });
});