import logging
import yaml
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, render_template
from src.py.builder.gallery_builder import (
    GALLERY_YAML, load_yaml, save_yaml, update_gallery, update_hero
)
from src.py.webui.upload import upload_bp

# --- Logging configuration ---
logging.basicConfig(level=logging.INFO, format="%(message)s")

# --- Flask app setup ---
WEBUI_PATH = Path(__file__).parents[2] / "webui"  # Path to static/templates
app = Flask(
    __name__,
    template_folder=WEBUI_PATH,
    static_folder=WEBUI_PATH,
    static_url_path=""
)

SITE_YAML = Path(__file__).resolve().parents[3] / "config" / "site.yaml"

# --- Photos directory (configurable) ---
PHOTOS_DIR = Path(__file__).resolve().parents[3] / "config" / "photos"
app.config["PHOTOS_DIR"] = PHOTOS_DIR

# --- Register upload blueprint ---
app.register_blueprint(upload_bp)

# --- Routes ---

@app.route("/")
def index():
    """Serve the main HTML page."""
    return render_template("index.html")

@app.route("/api/gallery", methods=["GET"])
def get_gallery():
    """Return JSON list of gallery images from YAML."""
    data = load_yaml(GALLERY_YAML)
    return jsonify(data.get("gallery", {}).get("images", []))

@app.route("/api/hero", methods=["GET"])
def get_hero():
    """Return JSON list of hero images from YAML."""
    data = load_yaml(GALLERY_YAML)
    return jsonify(data.get("hero", {}).get("images", []))

@app.route("/api/gallery/update", methods=["POST"])
def update_gallery_api():
    """Update gallery images in YAML from frontend JSON."""
    images = request.json
    data = load_yaml(GALLERY_YAML)
    data["gallery"]["images"] = images
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok"})

@app.route("/api/hero/update", methods=["POST"])
def update_hero_api():
    """Update hero images in YAML from frontend JSON."""
    images = request.json
    data = load_yaml(GALLERY_YAML)
    data["hero"]["images"] = images
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok"})

@app.route("/api/gallery/refresh", methods=["POST"])
def refresh_gallery():
    """Refresh gallery YAML from photos/gallery folder."""
    update_gallery()
    return jsonify({"status": "ok"})

@app.route("/api/hero/refresh", methods=["POST"])
def refresh_hero():
    """Refresh hero YAML from photos/hero folder."""
    update_hero()
    return jsonify({"status": "ok"})

@app.route("/api/gallery/delete", methods=["POST"])
def delete_gallery_photo():
    """Delete a gallery photo from disk and return status."""
    data = request.json
    src = data.get("src")
    file_path = PHOTOS_DIR / "gallery" / src
    if file_path.exists():
        file_path.unlink()
        return {"status": "ok"}
    return {"error": "File not found"}, 404

@app.route("/api/hero/delete", methods=["POST"])
def delete_hero_photo():
    """Delete a hero photo from disk and return status."""
    data = request.json
    src = data.get("src")
    file_path = PHOTOS_DIR / "hero" / src
    if file_path.exists():
        file_path.unlink()
        return {"status": "ok"}
    return {"error": "File not found"}, 404

@app.route("/api/gallery/delete_all", methods=["POST"])
def delete_all_gallery_photos():
    """Delete all gallery photos from disk and YAML."""
    gallery_dir = PHOTOS_DIR / "gallery"
    deleted = 0
    # Remove all files in gallery folder
    for file in gallery_dir.glob("*"):
        if file.is_file():
            file.unlink()
            deleted += 1
    # Clear YAML gallery images
    data = load_yaml(GALLERY_YAML)
    data["gallery"]["images"] = []
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok", "deleted": deleted})

@app.route("/api/hero/delete_all", methods=["POST"])
def delete_all_hero_photos():
    """Delete all hero photos from disk and YAML."""
    hero_dir = PHOTOS_DIR / "hero"
    deleted = 0
    # Remove all files in hero folder
    for file in hero_dir.glob("*"):
        if file.is_file():
            file.unlink()
            deleted += 1
    # Clear YAML hero images
    data = load_yaml(GALLERY_YAML)
    data["hero"]["images"] = []
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok", "deleted": deleted})

@app.route("/photos/<section>/<path:filename>")
def photos(section, filename):
    """Serve uploaded photos from disk."""
    return send_from_directory(PHOTOS_DIR / section, filename)


@app.route("/site-info")
def site_info():
    return render_template("site-info/index.html")

@app.route("/api/site-info", methods=["GET"])
def get_site_info():
    with open(SITE_YAML, "r") as f:
        data = yaml.safe_load(f)
    return jsonify(data)

@app.route("/api/site-info", methods=["POST"])
def update_site_info():
    data = request.json
    with open(SITE_YAML, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})


# --- Run server ---
if __name__ == "__main__":
    logging.info("Starting WebUI at http://127.0.0.1:5000")
    app.run(debug=True)
