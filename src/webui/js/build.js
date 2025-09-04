/**
 * Show a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - "success" or "error".
 * @param {number} duration - Duration in ms.
 */

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

// --- Toast helpers ---
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

document.addEventListener("DOMContentLoaded", () => {
  // Get build button and modal elements
  const buildBtn = document.getElementById("build-btn");
  const stepperBuildBtn = document.getElementById("stepper-build"); // Added for stepper build button
  const buildModal = document.getElementById("build-success-modal");
  const buildModalClose = document.getElementById("build-success-modal-close");
  const downloadZipBtn = document.getElementById("download-zip-btn");
  const zipLoader = document.getElementById("zip-loader");

  // Build action handler
  async function handleBuildClick() {
    showLoader("Building static site...");
    // Trigger build on backend
    const res = await fetch("/api/build", { method: "POST" });
    const result = await res.json();
    hideLoader();
    if (result.status === "ok") {
      // Show build success modal
      if (buildModal) buildModal.style.display = "flex";
    } else {
      showToast(result.message || "❌ Build failed!", "error");
    }
  }

  // Handle build button click
  if (buildBtn) {
    buildBtn.addEventListener("click", handleBuildClick);
  }
  // Handle stepper-build button click
  if (stepperBuildBtn) {
    stepperBuildBtn.addEventListener("click", handleBuildClick);
  }

  // Handle download zip button click
  if (downloadZipBtn) {
    downloadZipBtn.addEventListener("click", async () => {
      if (zipLoader) zipLoader.style.display = "block";
      downloadZipBtn.disabled = true;

      // Request zip creation and download from backend
      const res = await fetch("/download-output-zip", { method: "POST" });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "site_output.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        showToast("❌ Error creating ZIP", "error");
      }
      if (zipLoader) zipLoader.style.display = "none";
      downloadZipBtn.disabled = false;
    });
  }

  // Preview Site button
  const previewBtn = document.getElementById("preview-site-btn");
  if (previewBtn) {
    const previewPort = previewBtn.getAttribute("data-preview-port") || "3000";
    previewBtn.onclick = () => {
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      const url = `${protocol}//${host}:${previewPort}/`;
      window.open(url, "_blank");
    };
  }
  
  // Modal close logic
  if (buildModal && buildModalClose) {
    buildModalClose.onclick = () => {
      buildModal.style.display = "none";
    };
    window.onclick = function(event) {
      if (event.target === buildModal) {
        buildModal.style.display = "none";
      }
    };
  }
});