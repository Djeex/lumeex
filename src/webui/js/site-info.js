document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("site-info-form");
  const status = document.getElementById("site-info-status");
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
        <input type="text" placeholder="Label" value="${item.label || ""}" style="flex:1;" data-idx="${idx}" data-type="label">
        <input type="text" placeholder="URL" value="${item.href || ""}" style="flex:2;" data-idx="${idx}" data-type="href">
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
        <input type="text" placeholder="Paragraph" value="${item.paragraph || ""}" style="flex:1;" data-idx="${idx}">
        <button type="button" class="remove-ip-paragraph" data-idx="${idx}">🗑</button>
      `;
      ipList.appendChild(div);
    });
  }

  function updateIpParagraphsFromInputs() {
    const inputs = ipList.querySelectorAll("input");
    ipParagraphs = Array.from(inputs).map(input => ({
      paragraph: input.value.trim()
    })).filter(item => item.paragraph !== "");
  }

  // --- Build checkboxes ---
  const convertImagesCheckbox = document.getElementById("convert-images-checkbox");
  const resizeImagesCheckbox = document.getElementById("resize-images-checkbox");

  // --- Theme select ---
  const themeSelect = document.getElementById("theme-select");

  // --- Thumbnail upload ---
  const thumbnailInput = form?.elements["social.thumbnail"];
  const thumbnailUpload = document.getElementById("thumbnail-upload");
  const thumbnailPreview = document.getElementById("thumbnail-preview");

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
        if (thumbnailPreview) {
          thumbnailPreview.src = `/photos/${result.filename}`;
          thumbnailPreview.style.display = "block";
        }
        status.textContent = "✅ Thumbnail uploaded!";
        setTimeout(() => status.textContent = "", 2000);
      } else {
        status.textContent = "❌ Error uploading thumbnail";
        setTimeout(() => status.textContent = "", 2000);
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

  // Load config
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
        if (thumbnailPreview && data.social?.thumbnail) {
          thumbnailPreview.src = `/photos/${data.social.thumbnail}`;
          thumbnailPreview.style.display = "block";
        }
        form.elements["footer.copyright"].value = data.footer?.copyright || "";
        form.elements["footer.legal_label"].value = data.footer?.legal_label || "";
        if (themeSelect) {
          themeSelect.value = data.build?.theme || "";
        }
        form.elements["legals.hoster_name"].value = data.legals?.hoster_name || "";
        form.elements["legals.hoster_adress"].value = data.legals?.hoster_adress || "";
        form.elements["legals.hoster_contact"].value = data.legals?.hoster_contact || "";
        // --- Build checkboxes ---
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

  // Save config
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      updateMenuItemsFromInputs();
      updateIpParagraphsFromInputs();

      // --- Build object with checkboxes and theme select ---
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
          hoster_adress: form.elements["legals.hoster_adress"].value,
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
      status.textContent = result.status === "ok" ? "✅ Saved!" : "❌ Error saving";
      setTimeout(() => status.textContent = "", 2000);
    });
  }
});