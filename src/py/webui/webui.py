import logging
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, render_template
from src.py.builder.gallery_builder import (
    GALLERY_YAML, GALLERY_DIR, HERO_DIR,
    load_yaml, save_yaml, get_all_image_paths, update_gallery, update_hero
)
from src.py.webui.upload import upload_bp

# --- Logging configuration ---
# Logs messages to console with INFO level
logging.basicConfig(level=logging.INFO, format="%(message)s")

# --- Flask app setup ---
# WEBUI_PATH points to the web UI folder (templates + static)
WEBUI_PATH = Path(__file__).parents[2] / "webui"
app = Flask(
    __name__,
    template_folder=WEBUI_PATH,  # where Flask looks for templates
    static_folder=WEBUI_PATH,    # where Flask serves static files
    static_url_path=""            # URL path prefix for static files
)

# --- Absolute photos directory ---
# Used by upload.py and deletion endpoints
PHOTOS_DIR = Path(__file__).resolve().parents[3] / "config" / "photos"
app.config["PHOTOS_DIR"] = PHOTOS_DIR

# --- Register upload blueprint ---
# Handles /api/<section>/upload endpoints for gallery and hero images
app.register_blueprint(upload_bp)

# --- Existing API routes ---

# Serve main page
@app.route("/")
def index():
    return render_template("index.html")

# Get gallery images (returns JSON array)
@app.route("/api/gallery", methods=["GET"])
def get_gallery():
    data = load_yaml(GALLERY_YAML)
    return jsonify(data.get("gallery", {}).get("images", []))

# Get hero images (returns JSON array)
@app.route("/api/hero", methods=["GET"])
def get_hero():
    data = load_yaml(GALLERY_YAML)
    return jsonify(data.get("hero", {}).get("images", []))

# Update gallery images with new JSON data
@app.route("/api/gallery/update", methods=["POST"])
def update_gallery_api():
    images = request.json
    data = load_yaml(GALLERY_YAML)
    data["gallery"]["images"] = images
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok"})

# Update hero images with new JSON data
@app.route("/api/hero/update", methods=["POST"])
def update_hero_api():
    images = request.json
    data = load_yaml(GALLERY_YAML)
    data["hero"]["images"] = images
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok"})

# Refresh gallery from the folder (rebuild YAML)
@app.route("/api/gallery/refresh", methods=["POST"])
def refresh_gallery():
    update_gallery()
    return jsonify({"status": "ok"})

# Refresh hero images from the folder
@app.route("/api/hero/refresh", methods=["POST"])
def refresh_hero():
    update_hero()
    return jsonify({"status": "ok"})

# Delete a gallery image file
@app.route("/api/gallery/delete", methods=["POST"])
def delete_gallery_photo():
    data = request.json
    src = data.get("src")  # filename only
    file_path = PHOTOS_DIR / "gallery" / src
    if file_path.exists():
        file_path.unlink()  # remove the file
        return {"status": "ok"}
    return {"error": "File not found"}, 404

# Delete a hero image file
@app.route("/api/hero/delete", methods=["POST"])
def delete_hero_photo():
    data = request.json
    src = data.get("src")  # filename only
    file_path = PHOTOS_DIR / "hero" / src
    if file_path.exists():
        file_path.unlink()  # remove the file
        return {"status": "ok"}
    return {"error": "File not found"}, 404

# Serve photos from /photos/<section>/<filename>
@app.route("/photos/<section>/<path:filename>")
def photos(section, filename):
    return send_from_directory(PHOTOS_DIR / section, filename)

# --- Main entry point ---
if __name__ == "__main__":
    logging.info("Starting WebUI at http://127.0.0.1:5000")
    app.run(debug=True)
