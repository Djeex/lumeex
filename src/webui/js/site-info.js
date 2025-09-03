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

document.addEventListener("DOMContentLoaded", () => {
  // --- Section Forms ---
  const infoForm = document.getElementById("info-form");
  const socialForm = document.getElementById("social-form");
  const menuForm = document.getElementById("menu-form");
  const footerForm = document.getElementById("footer-form");
  const legalsForm = document.getElementById("legals-form");
  const buildForm = document.getElementById("build-form");

  // --- Menu logic ---
  const menuList = document.getElementById("menu-items-list");
  const addMenuBtn = document.getElementById("add-menu-item");
  let menuItems = [];

  function renderMenuItems() {
    menuList.innerHTML = "";
    menuItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.gap = "8px";
      div.style.marginBottom = "6px";
      div.innerHTML = `
        <input type="text" placeholder="Label" value="${item.label || ""}" style="flex:1;" data-idx="${idx}" data-type="label" required>
        <input type="text" placeholder="?tag=tag1,tag2" value="${item.href || ""}" style="flex:2;" data-idx="${idx}" data-type="href" required>
        <button type="button" class="remove-menu-item" data-idx="${idx}">🗑</button>
      `;
      menuList.appendChild(div);
    });
  }

  function updateMenuItemsFromInputs() {
    const inputs = menuList.querySelectorAll("input");
    const items = [];
    for (let i = 0; i < inputs.length; i += 2) {
      const label = inputs[i].value.trim();
      const href = inputs[i + 1].value.trim();
      if (label || href) items.push({ label, href });
    }
    menuItems = items;
  }

  // --- Intellectual property paragraphs logic ---
  const ipList = document.getElementById("ip-list");
  const addIpBtn = document.getElementById("add-ip-paragraph");
  let ipParagraphs = [];

  function renderIpParagraphs() {
    ipList.innerHTML = "";
    ipParagraphs.forEach((item, idx) => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.gap = "8px";
      div.style.marginBottom = "6px";
      div.innerHTML = `
        <textarea placeholder="Paragraph" required style="flex:1;" data-idx="${idx}">${item.paragraph || ""}</textarea>
        <button type="button" class="remove-ip-paragraph" data-idx="${idx}">🗑</button>
      `;
      ipList.appendChild(div);
    });
  }

  function updateIpParagraphsFromInputs() {
    const textareas = ipList.querySelectorAll("textarea");
    ipParagraphs = Array.from(textareas).map(textarea => ({
      paragraph: textarea.value.trim()
    })).filter(item => item.paragraph !== "");
  }

  // --- Build options ---
  const convertImagesCheckbox = document.getElementById("convert-images-checkbox");
  const resizeImagesCheckbox = document.getElementById("resize-images-checkbox");

  // --- Theme select ---
  const themeSelect = document.getElementById("theme-select");

  // --- Thumbnail upload and modal logic ---
  const thumbnailInput = document.getElementById("social-thumbnail");
  const thumbnailUpload = document.getElementById("thumbnail-upload");
  const chooseThumbnailBtn = document.getElementById("choose-thumbnail-btn");
  const thumbnailPreview = document.getElementById("thumbnail-preview");
  const removeThumbnailBtn = document.getElementById("remove-thumbnail-btn");

  // --- Modal elements for delete confirmation ---
  const deleteModal = document.getElementById("delete-modal");
  const deleteModalClose = document.getElementById("delete-modal-close");
  const deleteModalConfirm = document.getElementById("delete-modal-confirm");
  const deleteModalCancel = document.getElementById("delete-modal-cancel");

  // --- Modal elements for theme deletion ---
  const deleteThemeModal = document.getElementById("delete-theme-modal");
  const deleteThemeModalClose = document.getElementById("delete-theme-modal-close");
  const deleteThemeModalConfirm = document.getElementById("delete-theme-modal-confirm");
  const deleteThemeModalCancel = document.getElementById("delete-theme-modal-cancel");
  const deleteThemeModalText = document.getElementById("delete-theme-modal-text");
  let themeToDelete = null;

  // --- Show/hide thumbnail preview, remove button, and choose button ---
  function updateThumbnailPreview(src) {
    if (thumbnailPreview) {
      thumbnailPreview.src = src || "";
      thumbnailPreview.style.display = src ? "block" : "none";
    }
    if (removeThumbnailBtn) {
      removeThumbnailBtn.style.display = src ? "inline-block" : "none";
    }
    if (chooseThumbnailBtn) {
      chooseThumbnailBtn.style.display = src ? "none" : "inline-block";
    }
  }

  // --- Choose thumbnail button triggers file input ---
  if (chooseThumbnailBtn && thumbnailUpload) {
    chooseThumbnailBtn.addEventListener("click", () => thumbnailUpload.click());
  }

  // --- Handle thumbnail upload and refresh preview (with cache busting) ---
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

  // --- Remove thumbnail button triggers modal ---
  if (removeThumbnailBtn) {
    removeThumbnailBtn.addEventListener("click", () => {
      deleteModal.style.display = "flex";
    });
  }

  // --- Modal logic for thumbnail deletion ---
  if (deleteModal && deleteModalClose && deleteModalConfirm && deleteModalCancel) {
    deleteModalClose.onclick = deleteModalCancel.onclick = () => {
      deleteModal.style.display = "none";
    };
    window.onclick = function(event) {
      if (event.target === deleteModal) {
        deleteModal.style.display = "none";
      }
    };
    deleteModalConfirm.onclick = async () => {
      const res = await fetch("/api/thumbnail/remove", { method: "POST" });
      const result = await res.json();
      if (result.status === "ok") {
        if (thumbnailInput) thumbnailInput.value = "";
        updateThumbnailPreview("");
        showToast("✅ Thumbnail removed!", "success");
      } else {
        showToast("❌ Error removing thumbnail", "error");
      }
      deleteModal.style.display = "none";
      updateSectionStatus("social");
    };
  }

  // --- Theme upload logic (custom theme folder) ---
  const themeUpload = document.getElementById("theme-upload");
  const chooseThemeBtn = document.getElementById("choose-theme-btn");
  if (chooseThemeBtn && themeUpload) {
    chooseThemeBtn.addEventListener("click", () => themeUpload.click());
    themeUpload.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      showLoader("Uploading theme...");
      const formData = new FormData();
      files.forEach(file => {
        formData.append("files", file, file.webkitRelativePath || file.name);
      });
      const res = await fetch("/api/theme/upload", { method: "POST", body: formData });
      const result = await res.json();
      hideLoader();
      if (result.status === "ok") {
        showToast("✅ Theme uploaded!", "success");
        // Refresh theme select after upload
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
          });
      } else {
        showToast("❌ Error uploading theme", "error");
      }
      updateSectionStatus("build");
    });
  }

  // --- Remove theme button triggers modal ---
  const removeThemeBtn = document.getElementById("remove-theme-btn");
  if (removeThemeBtn && themeSelect) {
    removeThemeBtn.addEventListener("click", () => {
      const theme = themeSelect.value;
      if (!theme) return showToast("❌ No theme selected", "error");
      if (["modern", "classic"].includes(theme)) {
        showToast("❌ Cannot remove default theme", "error");
        return;
      }
      themeToDelete = theme;
      deleteThemeModalText.textContent = `Are you sure you want to remove theme "${theme}"?`;
      deleteThemeModal.style.display = "flex";
    });
  }

  // --- Modal logic for theme deletion ---
  if (deleteThemeModal && deleteThemeModalClose && deleteThemeModalConfirm && deleteThemeModalCancel) {
    deleteThemeModalClose.onclick = deleteThemeModalCancel.onclick = () => {
      deleteThemeModal.style.display = "none";
      themeToDelete = null;
    };
    window.onclick = function(event) {
      if (event.target === deleteThemeModal) {
        deleteThemeModal.style.display = "none";
        themeToDelete = null;
      }
    };
    deleteThemeModalConfirm.onclick = async () => {
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
        // Refresh theme select
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
          });
      } else {
        showToast(result.error || "❌ Error removing theme", "error");
      }
      deleteThemeModal.style.display = "none";
      themeToDelete = null;
      updateSectionStatus("build");
    };
  }

  // --- Fetch theme list and populate select, then load config and update build status ---
  let loadedConfig = {};
  function loadConfigAndUpdateBuildStatus() {
    fetch("/api/site-info")
      .then(res => res.json())
      .then(data => {
        loadedConfig = data;
        // Info
        if (infoForm) {
          infoForm.elements["info.title"].value = data.info?.title || "";
          infoForm.elements["info.subtitle"].value = data.info?.subtitle || "";
          infoForm.elements["info.description"].value = data.info?.description || "";
          infoForm.elements["info.canonical"].value = data.info?.canonical || "";
          infoForm.elements["info.keywords"].value = Array.isArray(data.info?.keywords) ? data.info.keywords.join(", ") : (data.info?.keywords || "");
          infoForm.elements["info.author"].value = data.info?.author || "";
        }
        // Social
        if (socialForm) {
          socialForm.elements["social.instagram_url"].value = data.social?.instagram_url || "";
          if (thumbnailInput) thumbnailInput.value = data.social?.thumbnail || "";
          updateThumbnailPreview(data.social?.thumbnail ? `/photos/${data.social.thumbnail}?t=${Date.now()}` : "");
        }
        // Menu
        menuItems = Array.isArray(data.menu?.items) ? data.menu.items : [];
        renderMenuItems();
        // Footer
        if (footerForm) {
          footerForm.elements["footer.copyright"].value = data.footer?.copyright || "";
          footerForm.elements["footer.legal_label"].value = data.footer?.legal_label || "";
        }
        // Legals
        ipParagraphs = Array.isArray(data.legals?.intellectual_property)
          ? data.legals.intellectual_property
          : [];
        renderIpParagraphs();
        if (legalsForm) {
          legalsForm.elements["legals.hoster_name"].value = data.legals?.hoster_name || "";
          legalsForm.elements["legals.hoster_address"].value = data.legals?.hoster_address || "";
          legalsForm.elements["legals.hoster_contact"].value = data.legals?.hoster_contact || "";
        }
        // Build
        if (themeSelect) {
          themeSelect.value = data.build?.theme || "";
        }
        if (convertImagesCheckbox) {
          convertImagesCheckbox.checked = !!data.build?.convert_images;
        }
        if (resizeImagesCheckbox) {
          resizeImagesCheckbox.checked = !!data.build?.resize_images;
        }
        // Initial status update for all sections except build
        ["info", "social", "menu", "footer", "legals"].forEach(updateSectionStatus);
        // For build, update status after theme select is set
        updateSectionStatus("build");
      });
  }

  if (themeSelect) {
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
        // Now load config and update build status after theme select is ready
        loadConfigAndUpdateBuildStatus();
      });
  } else {
    // If no theme select, just load config
    loadConfigAndUpdateBuildStatus();
  }

  // --- Add menu item ---
  if (addMenuBtn) {
    addMenuBtn.addEventListener("click", () => {
      menuItems.push({ label: "", href: "" });
      renderMenuItems();
      updateSectionStatus("menu");
    });
  }

  // --- Remove menu item ---
  menuList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-menu-item")) {
      const idx = parseInt(e.target.getAttribute("data-idx"));
      menuItems.splice(idx, 1);
      renderMenuItems();
      updateSectionStatus("menu");
    }
  });

  // --- Update menuItems on input change ---
  menuList.addEventListener("input", () => {
    updateMenuItemsFromInputs();
    updateSectionStatus("menu");
  });

  // --- Add paragraph ---
  if (addIpBtn) {
    addIpBtn.addEventListener("click", () => {
      ipParagraphs.push({ paragraph: "" });
      renderIpParagraphs();
      updateSectionStatus("legals");
    });
  }

  // --- Remove paragraph ---
  ipList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-ip-paragraph")) {
      const idx = parseInt(e.target.getAttribute("data-idx"));
      ipParagraphs.splice(idx, 1);
      renderIpParagraphs();
      updateSectionStatus("legals");
    }
  });

  // --- Update ipParagraphs on input change ---
  ipList.addEventListener("input", () => {
    updateIpParagraphsFromInputs();
    updateSectionStatus("legals");
  });

  // --- Section value helpers ---
  function getSectionValues(section) {
    switch (section) {
      case "info":
        return {
          title: infoForm.elements["info.title"].value,
          subtitle: infoForm.elements["info.subtitle"].value,
          description: infoForm.elements["info.description"].value,
          canonical: infoForm.elements["info.canonical"].value,
          keywords: infoForm.elements["info.keywords"].value.split(",").map(i => i.trim()).filter(Boolean),
          author: infoForm.elements["info.author"].value
        };
      case "social":
        return {
          instagram_url: socialForm.elements["social.instagram_url"].value,
          thumbnail: thumbnailInput ? thumbnailInput.value : ""
        };
      case "menu":
        updateMenuItemsFromInputs();
        return { items: menuItems };
      case "footer":
        return {
          copyright: footerForm.elements["footer.copyright"].value,
          legal_label: footerForm.elements["footer.legal_label"].value
        };
      case "legals":
        updateIpParagraphsFromInputs();
        return {
          hoster_name: legalsForm.elements["legals.hoster_name"].value,
          hoster_address: legalsForm.elements["legals.hoster_address"].value,
          hoster_contact: legalsForm.elements["legals.hoster_contact"].value,
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
        return !!values.theme; // Only check theme is present
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
  [
    { form: infoForm, section: "info" },
    { form: socialForm, section: "social" },
    { form: menuForm, section: "menu" },
    { form: footerForm, section: "footer" },
    { form: legalsForm, section: "legals" },
    { form: buildForm, section: "build" }
  ].forEach(({ form, section }) => {
    if (!form) return;
    form.addEventListener("input", () => updateSectionStatus(section));
    form.addEventListener("change", () => updateSectionStatus(section));
  });

  // --- Save section handler (form submit) ---
  [
    { form: infoForm, section: "info" },
    { form: socialForm, section: "social" },
    { form: menuForm, section: "menu" },
    { form: footerForm, section: "footer" },
    { form: legalsForm, section: "legals" },
    { form: buildForm, section: "build" }
  ].forEach(({ form, section }) => {
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Native browser validation
      if (!form.reportValidity()) {
        showToast("❌ Please fill all required fields before saving.", "error");
        updateSectionStatus(section);
        return;
      }
      // Social section: check thumbnail
      if (section === "social") {
        if (!thumbnailInput || !thumbnailInput.value) {
          showToast("❌ Thumbnail is required.", "error");
          updateSectionStatus(section);
          return;
        }
      }
      // Menu section: check all menu items
      if (section === "menu") {
        updateMenuItemsFromInputs();
        if (!menuItems.length || !menuItems.every(item => item.label && item.href)) {
          showToast("❌ Please fill all menu item fields.", "error");
          updateSectionStatus(section);
          return;
        }
      }
      // Legals section: check all paragraphs
      if (section === "legals") {
        updateIpParagraphsFromInputs();
        if (!ipParagraphs.length || !ipParagraphs.every(ip => ip.paragraph)) {
          showToast("❌ Please fill all intellectual property paragraphs.", "error");
          updateSectionStatus(section);
          return;
        }
      }
      // Build payload for this section only
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
        // Reload config for this section
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