// js for Lumeex
// https://git.djeex.fr/Djeex/lumeex

window.addEventListener("DOMContentLoaded", () => {
  // Lazy loading
  const lazyImages = document.querySelectorAll('img.lazyload');

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        console.log("Lazy-loading image:", img.dataset.src);
        img.src = img.dataset.src;
        img.onload = () => {
          img.classList.add("loaded");
        };
        obs.unobserve(img);
      }
    });
  }, {
    rootMargin: "0px 0px 300px 0px",
    threshold: 0.01
  });

  lazyImages.forEach(img => observer.observe(img));

  // Fade-in effect for loaded images (even outside lazy ones)
  const fadeImages = document.querySelectorAll("img.fade-in-img");

  fadeImages.forEach(img => {
    const onLoad = () => {
      console.log("Image loaded (fade-in):", img.src);
      img.classList.add("loaded");
    };

    if (img.complete && img.naturalHeight !== 0) {
      onLoad(); // already loaded
    } else {
      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", () => {
        console.warn("Image failed to load:", img.dataset.src || img.src);
      });
    }
  });
});
