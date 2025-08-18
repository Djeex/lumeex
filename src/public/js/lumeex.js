// js for Lumeex
// https://git.djeex.fr/Djeex/lumeex

// Fade in effect for elements with class 'appear'
const setupIntersectionObserver = () => {
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
  let lastClickedTag = null; // mémorise le dernier tag cliqué

  const applyFilter = () => {
    let filteredSections = [];
    let matchingSection = null;

    allSections.forEach((section) => {
      const sectionTags = section.dataset.tags.toLowerCase().split(/\s+/);
      const hasAllTags = activeTags.every((tag) => sectionTags.includes(tag));
      section.style.display = hasAllTags ? '' : 'none';

      if (hasAllTags) {
        filteredSections.push(section);
        if (lastClickedTag && sectionTags.includes(lastClickedTag) && !matchingSection) {
          matchingSection = section;
        }
      }
    });

    // Réorganise : la photo correspondante au dernier tag cliqué en premier
    if (matchingSection && galleryContainer.contains(matchingSection)) {
      galleryContainer.prepend(matchingSection);
    }

    // Met à jour le style des tags
    allTags.forEach((tagEl) => {
      const tagText = tagEl.textContent.replace('#', '').toLowerCase();
      tagEl.classList.toggle('active', activeTags.includes(tagText));
    });

    // Met à jour l'URL
    const base = window.location.pathname;
    const query = activeTags.length > 0 ? `?tag=${activeTags.join(',')}` : '';
    window.history.pushState({}, '', base + query);

    // Scroll jusqu'à la galerie
    if (galleryContainer) {
      galleryContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  allTags.forEach((tagEl) => {
    tagEl.addEventListener('click', () => {
      const tagText = tagEl.textContent.replace('#', '').toLowerCase();
      lastClickedTag = tagText; // mémorise le dernier tag cliqué

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
      applyFilter();
    }
  });
};

// Disable right click and drag
const disableRightClickAndDrag = () => {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());
};

// Scroll to top button
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
  randomizeHeroBackground();
  setupTagFilter();
  disableRightClickAndDrag();
  setupScrollToTopButton();
  fixNavSeparators();
});

window.addEventListener('resize', fixNavSeparators);
