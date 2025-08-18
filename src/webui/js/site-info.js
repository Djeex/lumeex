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

document.addEventListener("DOMContentLoaded", () => {
  // Form and menu logic
  const form = document.getElementById("site-info-form");
  const menuList = document.getElementById("menu-items-list");
  const addMenuBtn = document.getElementById("add-menu-item");

  let menuItems = [];

  // Render menu items
  function renderMenuItems() {
    menuList.innerHTML = "";
    menuItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.gap = "8px";
      div.style.marginBottom = "6px";
      div.innerHTML = `
        <input type="text" placeholder="Label" value="${item.label || ""}" style="flex:1;" data-idx="${idx}" data-type="label">
        <input type="text" placeholder="?tag=tag1,tag2" value="${item.href || ""}" style="flex:2;" data-idx="${idx}" data-type="href">
        <button type="button" class="remove-menu-item" data-idx="${idx}">🗑</button>
      `;
      menuList.appendChild(div);
    });
  }

  // Update menu items from inputs
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

  // Intellectual property paragraphs logic
  const ipList = document.getElementById("ip-list");
  const addIpBtn = document.getElementById("add-ip-paragraph");
  let ipParagraphs = [];

  // Render IP paragraphs
  function renderIpParagraphs() {
    ipList.innerHTML = "";
    ipParagraphs.forEach((item, idx) => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.gap = "8px";
      div.style.marginBottom = "6px";
      div.innerHTML = `
        <textarea placeholder="Paragraph" style="flex:1;" data-idx="${idx}">${item.paragraph || ""}</textarea>
        <button type="button" class="remove-ip-paragraph" data-idx="${idx}">🗑</button>
      `;
      ipList.appendChild(div);
    });
  }

  // Update IP paragraphs from textareas
  function updateIpParagraphsFromInputs() {
    const textareas = ipList.querySelectorAll("textarea");
    ipParagraphs = Array.from(textareas).map(textarea => ({
      paragraph: textarea.value.trim()
    })).filter(item => item.paragraph !== "");
  }

  // Build options
  const convertImagesCheckbox = document.getElementById("convert-images-checkbox");
  const resizeImagesCheckbox = document.getElementById("resize-images-checkbox");

  // Theme select
  const themeSelect = document.getElementById("theme-select");

  // Thumbnail upload and modal logic
  const thumbnailInput = form?.elements["social.thumbnail"];
  const thumbnailUpload = document.getElementById("thumbnail-upload");
  const chooseThumbnailBtn = document.getElementById("choose-thumbnail-btn");
  const thumbnailPreview = document.getElementById("thumbnail-preview");
  const removeThumbnailBtn = document.getElementById("remove-thumbnail-btn");

  // Modal elements for delete confirmation
  const deleteModal = document.getElementById("delete-modal");
  const deleteModalClose = document.getElementById("delete-modal-close");
  const deleteModalConfirm = document.getElementById("delete-modal-confirm");
  const deleteModalCancel = document.getElementById("delete-modal-cancel");

  // Show/hide thumbnail preview, remove button, and choose button
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

  // Choose thumbnail button triggers file input
  if (chooseThumbnailBtn && thumbnailUpload) {
    chooseThumbnailBtn.addEventListener("click", () => thumbnailUpload.click());
  }

  // Handle thumbnail upload and refresh preview (with cache busting)
  if (thumbnailUpload) {
    thumbnailUpload.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/thumbnail/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (result.status === "ok") {
        if (thumbnailInput) thumbnailInput.value = result.filename;
        updateThumbnailPreview(`/photos/${result.filename}?t=${Date.now()}`);
        showToast("Thumbnail uploaded!", "success");
      } else {
        showToast("Error uploading thumbnail", "error");
      }
    });
  }

  // Remove thumbnail button triggers modal
  if (removeThumbnailBtn) {
    removeThumbnailBtn.addEventListener("click", () => {
      deleteModal.style.display = "flex";
    });
  }

  // Modal logic for thumbnail deletion
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
        showToast("Thumbnail removed!", "success");
      } else {
        showToast("Error removing thumbnail", "error");
      }
      deleteModal.style.display = "none";
    };
  }

  // Theme upload logic (custom theme folder)
  const themeUpload = document.getElementById("theme-upload");
  const chooseThemeBtn = document.getElementById("choose-theme-btn");
  if (chooseThemeBtn && themeUpload) {
    chooseThemeBtn.addEventListener("click", () => themeUpload.click());
    themeUpload.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      const formData = new FormData();
      files.forEach(file => {
        formData.append("files", file, file.webkitRelativePath || file.name);
      });
      const res = await fetch("/api/theme/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (result.status === "ok") {
        showToast("Theme uploaded!", "success");
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
        showToast("Error uploading theme", "error");
      }
    });
  }

  // Fetch theme list and populate select
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
        // Set selected value after loading config
        fetch("/api/site-info")
          .then(res => res.json())
          .then(data => {
            themeSelect.value = data.build?.theme || "";
          });
      });
  }

  // Load config from server and populate form
  if (form) {
    fetch("/api/site-info")
      .then(res => res.json())
      .then(data => {
        ipParagraphs = Array.isArray(data.legals?.intellectual_property)
          ? data.legals.intellectual_property
          : [];
        renderIpParagraphs();
        menuItems = Array.isArray(data.menu?.items) ? data.menu.items : [];
        renderMenuItems();
        form.elements["info.title"].value = data.info?.title || "";
        form.elements["info.subtitle"].value = data.info?.subtitle || "";
        form.elements["info.description"].value = data.info?.description || "";
        form.elements["info.canonical"].value = data.info?.canonical || "";
        form.elements["info.keywords"].value = Array.isArray(data.info?.keywords) ? data.info.keywords.join(", ") : (data.info?.keywords || "");
        form.elements["info.author"].value = data.info?.author || "";
        form.elements["social.instagram_url"].value = data.social?.instagram_url || "";
        if (thumbnailInput) thumbnailInput.value = data.social?.thumbnail || "";
        updateThumbnailPreview(data.social?.thumbnail ? `/photos/${data.social.thumbnail}?t=${Date.now()}` : "");
        form.elements["footer.copyright"].value = data.footer?.copyright || "";
        form.elements["footer.legal_label"].value = data.footer?.legal_label || "";
        if (themeSelect) {
          themeSelect.value = data.build?.theme || "";
        }
        form.elements["legals.hoster_name"].value = data.legals?.hoster_name || "";
        form.elements["legals.hoster_address"].value = data.legals?.hoster_address || "";
        form.elements["legals.hoster_contact"].value = data.legals?.hoster_contact || "";
        // Build checkboxes
        if (convertImagesCheckbox) {
          convertImagesCheckbox.checked = !!data.build?.convert_images;
        }
        if (resizeImagesCheckbox) {
          resizeImagesCheckbox.checked = !!data.build?.resize_images;
        }
      });
  }

  // Add menu item
  if (addMenuBtn) {
    addMenuBtn.addEventListener("click", () => {
      menuItems.push({ label: "", href: "" });
      renderMenuItems();
    });
  }

  // Remove menu item
  menuList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-menu-item")) {
      const idx = parseInt(e.target.getAttribute("data-idx"));
      menuItems.splice(idx, 1);
      renderMenuItems();
    }
  });

  // Update menuItems on input change
  menuList.addEventListener("input", () => {
    updateMenuItemsFromInputs();
  });

  // Add paragraph
  if (addIpBtn) {
    addIpBtn.addEventListener("click", () => {
      ipParagraphs.push({ paragraph: "" });
      renderIpParagraphs();
    });
  }

  // Remove paragraph
  ipList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-ip-paragraph")) {
      const idx = parseInt(e.target.getAttribute("data-idx"));
      ipParagraphs.splice(idx, 1);
      renderIpParagraphs();
    }
  });

  // Update ipParagraphs on input change
  ipList.addEventListener("input", () => {
    updateIpParagraphsFromInputs();
  });

  // Save config to server
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      updateMenuItemsFromInputs();
      updateIpParagraphsFromInputs();

      const build = {
        theme: themeSelect ? themeSelect.value : "",
        convert_images: !!(convertImagesCheckbox && convertImagesCheckbox.checked),
        resize_images: !!(resizeImagesCheckbox && resizeImagesCheckbox.checked)
      };

      const payload = {
        info: {
          title: form.elements["info.title"].value,
          subtitle: form.elements["info.subtitle"].value,
          description: form.elements["info.description"].value,
          canonical: form.elements["info.canonical"].value,
          keywords: form.elements["info.keywords"].value.split(",").map(i => i.trim()).filter(Boolean),
          author: form.elements["info.author"].value
        },
        social: {
          instagram_url: form.elements["social.instagram_url"].value,
          thumbnail: thumbnailInput ? thumbnailInput.value : ""
        },
        menu: {
          items: menuItems
        },
        footer: {
          copyright: form.elements["footer.copyright"].value,
          legal_label: form.elements["footer.legal_label"].value
        },
        build,
        legals: {
          hoster_name: form.elements["legals.hoster_name"].value,
          hoster_address: form.elements["legals.hoster_address"].value,
          hoster_contact: form.elements["legals.hoster_contact"].value,
          intellectual_property: ipParagraphs
        }
      };
      const res = await fetch("/api/site-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.status === "ok") {
        showToast("✅ Site info saved!", "success");
      } else {
        showToast("❌ Error saving site info", "error");
      }
    });
  }
});