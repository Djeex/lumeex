// js for Lumeex
// https://git.djeex.fr/Djeex/lumeex

// The site is always served from the domain root (see the /img/ and
// /data/ paths below); the photo menu builds its permalinks from this.
const siteRoot = `${window.location.origin}/`;

// Fade in effect for elements with class 'appear'
const setupIntersectionObserver = () => {
  document.querySelectorAll('.appear').forEach(parent => {
    const children = parent.querySelectorAll('.appear');
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.2}s`;
    });
  });

  const items = document.querySelectorAll('.appear');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('inview', entry.isIntersecting);
    });
  });
  items.forEach((item) => io.observe(item));
};

// Loader fade out after page load
const setupLoader = () => {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.querySelector('.page-loader');
      if (loader) loader.classList.add('hidden');
    }, 50);
  });
};

// Hero background randomizer
const randomizeHeroBackground = () => {
  const heroBg = document.querySelector(".hero-background");
  if (!heroBg) return;
  fetch("/data/gallery.json")
    .then((res) => res.json())
    .then((images) => {
      if (images.length === 0) return;
      let currentIndex = Math.floor(Math.random() * images.length);
      heroBg.style.backgroundImage = `url(/img/${images[currentIndex]})`;
      if (images.length < 2) return; // <-- Prevent interval if only one image
      setInterval(() => {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * images.length);
        } while (nextIndex === currentIndex);
        const nextImage = images[nextIndex];
        heroBg.style.setProperty("--next-image", `url(/img/${nextImage})`);
        heroBg.classList.add("fade-in");
        const onTransitionEnd = () => {
          heroBg.style.backgroundImage = `url(/img/${nextImage})`;
          heroBg.classList.remove("fade-in");
          heroBg.removeEventListener("transitionend", onTransitionEnd);
        };
        heroBg.addEventListener("transitionend", onTransitionEnd);
        currentIndex = nextIndex;
      }, 7000);
    })
    .catch(console.error);
};

// Gallery randomizer to shuffle gallery sections on page load
const shuffleGallery = () => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  const sections = Array.from(gallery.querySelectorAll('.section'));
  while (sections.length) {
    const randomIndex = Math.floor(Math.random() * sections.length);
    gallery.appendChild(sections.splice(randomIndex, 1)[0]);
  }
};

// Tags filter functionality
const setupTagFilter = () => {
  const galleryContainer = document.querySelector('#gallery');
  const allSections = document.querySelectorAll('.section[data-tags]');
  const allTags = document.querySelectorAll('.tag');
  let activeTags = [];
  let lastClickedTag = null; // remembers the last clicked tag
  let lastClickedSection = null; // remembers the last clicked section (photo)

  const applyFilter = () => {
    let filteredSections = [];
    let matchingSection = null;

    allSections.forEach((section) => {
      const sectionTags = section.dataset.tags.toLowerCase().split(/\s+/);
      const hasAllTags = activeTags.every((tag) => sectionTags.includes(tag));
      section.style.display = hasAllTags ? '' : 'none';

      if (hasAllTags) {
        if (lastClickedSection === section) {
          matchingSection = section;
        } else {
          filteredSections.push(section);
        }
      }
    });

    // Remove all filtered sections from DOM before reordering
    if (galleryContainer) {
      [matchingSection, ...filteredSections].forEach(section => {
        if (section && galleryContainer.contains(section)) {
          galleryContainer.removeChild(section);
        }
      });
      if (matchingSection) {
        galleryContainer.prepend(matchingSection);
      }
      filteredSections.forEach(section => {
        galleryContainer.appendChild(section);
      });
    }

    // Update tag styles
    allTags.forEach((tagEl) => {
      const tagText = tagEl.textContent.replace('#', '').toLowerCase();
      tagEl.classList.toggle('active', activeTags.includes(tagText));
    });

    // Update the URL
    const base = window.location.pathname;
    const query = activeTags.length > 0 ? `?tag=${activeTags.join(',')}` : '';
    window.history.pushState({}, '', base + query);

    // Scroll to the gallery
    if (galleryContainer) {
      galleryContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  allTags.forEach((tagEl) => {
    tagEl.addEventListener('click', () => {
      const tagText = tagEl.textContent.replace('#', '').toLowerCase();
      lastClickedTag = tagText; // remembers the last clicked tag
      lastClickedSection = tagEl.closest('.section'); // remembers the last clicked section

      if (activeTags.includes(tagText)) {
        activeTags = activeTags.filter((t) => t !== tagText);
      } else {
        activeTags.push(tagText);
      }
      applyFilter();
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const urlTags = params.get('tag');
    if (urlTags) {
      activeTags = urlTags.split(',').map((t) => t.toLowerCase());
      lastClickedTag = activeTags[activeTags.length - 1] || null;
      lastClickedSection = null; // No section selected from URL
      applyFilter();
    }
  });
};

// Disable right click and drag
const disableRightClickAndDrag = () => {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());
};

// Photo menu: right click (or long press on touch screens) on a gallery
// photo opens a small menu to copy its permalink or share it. The
// permalink points at photo/<id>/, a tiny page generated per photo that
// carries the photo's own preview tags for social networks and sends
// visitors back to the gallery with ?photo=<id>. The id is a hash of the
// original photo file, so the link survives reordering and rebuilds.
const PHOTO_MENU_TEXT = {
  en: { copy: 'Copy link', share: 'Share…', copied: 'Link copied', copyFailed: 'Could not copy the link' },
  fr: { copy: 'Copier le lien', share: 'Partager…', copied: 'Lien copié', copyFailed: 'Impossible de copier le lien' },
};

const PHOTO_MENU_ICONS = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
};

const setupPhotoMenu = () => {
  const lang = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const text = PHOTO_MENU_TEXT[lang];
  const canShare = typeof navigator.share === 'function';
  let menu = null;
  let toast = null;
  let toastTimer = null;
  let currentUrl = '';
  let pressTimer = null;
  let pressStart = null;
  let openScrollY = 0;

  const photoAt = (el) => el.closest && el.closest('.section[data-photo-id] img');
  const permalinkFor = (img) => `${siteRoot}photo/${img.closest('.section').dataset.photoId}/`;

  const showToast = (message) => {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'photo-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Clipboard API missing (plain http) or refused: fall back to the
      // legacy selection-based copy.
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
      return ok;
    }
  };

  const close = () => {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
  };

  const buildMenu = () => {
    menu = document.createElement('div');
    menu.className = 'photo-menu';
    menu.setAttribute('role', 'menu');
    menu.tabIndex = -1;
    menu.hidden = true;
    const actions = canShare ? ['copy', 'share'] : ['copy'];
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.dataset.action = action;
      button.innerHTML = PHOTO_MENU_ICONS[action];
      button.append(text[action]);
      menu.appendChild(button);
    });
    menu.addEventListener('click', async (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      const url = currentUrl;
      close();
      if (button.dataset.action === 'copy') {
        showToast((await copyText(url)) ? text.copied : text.copyFailed);
      } else {
        // AbortError just means the visitor dismissed the share sheet.
        navigator.share({ title: document.title, url }).catch(() => {});
      }
    });
    menu.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const items = Array.from(menu.querySelectorAll('button'));
      const i = items.indexOf(document.activeElement);
      const next = i === -1
        ? (e.key === 'ArrowDown' ? 0 : items.length - 1)
        : (i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      items[next].focus();
    });
    document.body.appendChild(menu);
  };

  const open = (img, x, y) => {
    if (!menu) buildMenu();
    currentUrl = permalinkFor(img);
    openScrollY = window.scrollY;
    menu.hidden = false;
    // Keep the whole menu inside the viewport near the pointer.
    const margin = 8;
    const left = Math.min(x, window.innerWidth - menu.offsetWidth - margin);
    const top = Math.min(y, window.innerHeight - menu.offsetHeight - margin);
    menu.style.left = `${Math.max(margin, left)}px`;
    menu.style.top = `${Math.max(margin, top)}px`;
    // Focus the menu itself (not its first item) so Escape and the arrow
    // keys work without a focus ring showing after a mouse right click.
    menu.focus({ preventScroll: true });
  };

  document.addEventListener('contextmenu', (e) => {
    const img = photoAt(e.target);
    if (img) open(img, e.clientX, e.clientY);
    else close();
  });

  // iOS never fires contextmenu on a long press, so time it by hand.
  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };
  document.addEventListener('pointerdown', (e) => {
    if (menu && !menu.hidden && !menu.contains(e.target)) close();
    if (e.pointerType === 'mouse') return;
    const img = photoAt(e.target);
    if (!img) return;
    pressStart = { x: e.clientX, y: e.clientY };
    cancelPress();
    pressTimer = setTimeout(() => open(img, pressStart.x, pressStart.y), 500);
  });
  document.addEventListener('pointermove', (e) => {
    if (pressTimer && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10) cancelPress();
  });
  ['pointerup', 'pointercancel'].forEach((type) => document.addEventListener(type, cancelPress));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  // Only a real scroll closes the menu: lazy-loaded photos shifting the
  // layout also fire small scroll events (scroll anchoring).
  window.addEventListener('scroll', () => {
    if (Math.abs(window.scrollY - openScrollY) > 40) close();
  }, { passive: true });
  window.addEventListener('resize', close);
  window.addEventListener('blur', close);
};

// Permalink landing: ?photo=<id> moves that photo to the top of the
// gallery (after the shuffle) and scrolls to it.
const openLinkedPhoto = () => {
  const id = new URLSearchParams(window.location.search).get('photo');
  if (!id) return;
  const gallery = document.querySelector('#gallery');
  const section = gallery && Array.from(gallery.querySelectorAll('.section[data-photo-id]'))
    .find((el) => el.dataset.photoId === id);
  if (!section) return;
  gallery.prepend(section);
  section.classList.add('photo-linked');
  // Wait for the loader to fade out so the scroll lands on the final layout.
  window.addEventListener('load', () => {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};

// Scroll-to-top button functionality
const setupScrollToTopButton = () => {
  const scrollBtn = document.getElementById("scrollToTop");
  window.addEventListener("scroll", () => {
    scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
  });
  scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
};

// Adjust navigation list items
const fixNavSeparators = () => {
  const items = document.querySelectorAll('.nav-list li');
  let prevTop = null;
  items.forEach((item) => {
    const top = item.getBoundingClientRect().top;
    item.classList.toggle('first-on-line', prevTop !== null && top !== prevTop);
    prevTop = top;
  });
};

// Initialize all functions
document.addEventListener("DOMContentLoaded", () => {
  setupIntersectionObserver();
  setupLoader();
  shuffleGallery();
  openLinkedPhoto();
  randomizeHeroBackground();
  setupTagFilter();
  disableRightClickAndDrag();
  setupPhotoMenu();
  setupScrollToTopButton();
  fixNavSeparators();
});

window.addEventListener('resize', fixNavSeparators);