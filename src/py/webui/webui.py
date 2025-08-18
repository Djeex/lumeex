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

# --- Helper functions for theme editor ---
def get_theme_name():
    site_yaml_path = Path(__file__).resolve().parents[3] / "config" / "site.yaml"
    with open(site_yaml_path, "r") as f:
        site_yaml = yaml.safe_load(f)
    return site_yaml.get("build", {}).get("theme", "modern")

def get_theme_yaml(theme_name):
    theme_yaml_path = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "theme.yaml"
    with open(theme_yaml_path, "r") as f:
        return yaml.safe_load(f)

def save_theme_yaml(theme_name, theme_yaml):
    theme_yaml_path = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "theme.yaml"
    with open(theme_yaml_path, "w") as f:
        yaml.safe_dump(theme_yaml, f, sort_keys=False, allow_unicode=True)

def get_local_fonts(theme_name):
    fonts_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "fonts"
    if not fonts_dir.exists():
        return []
    # Return full filenames, not just stem
    return [f.name for f in fonts_dir.glob("*") if f.is_file() and f.suffix in [".woff", ".woff2"]]

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
    """Serve uploaded photos from disk for a specific section."""
    return send_from_directory(PHOTOS_DIR / section, filename)

@app.route("/photos/<path:filename>")
def serve_photo(filename):
    """Serve uploaded photos from disk (generic)."""
    photos_dir = Path(__file__).resolve().parents[3] / "config" / "photos"
    return send_from_directory(photos_dir, filename)

@app.route("/site-info")
def site_info():
    """Serve the site info editor page."""
    return render_template("site-info/index.html")

@app.route("/api/site-info", methods=["GET"])
def get_site_info():
    """Return the site info YAML as JSON."""
    with open(SITE_YAML, "r") as f:
        data = yaml.safe_load(f)
    return jsonify(data)

@app.route("/api/site-info", methods=["POST"])
def update_site_info():
    """Update the site info YAML from frontend JSON."""
    data = request.json
    with open(SITE_YAML, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})

@app.route("/api/themes")
def list_themes():
    """List available themes (folders in config/themes)."""
    themes_dir = Path(__file__).resolve().parents[3] / "config" / "themes"
    themes = [d.name for d in themes_dir.iterdir() if d.is_dir()]
    return jsonify(themes)

@app.route("/api/thumbnail/upload", methods=["POST"])
def upload_thumbnail():
    """Upload a thumbnail image and update site.yaml."""
    PHOTOS_DIR = app.config["PHOTOS_DIR"]
    file = request.files.get("file")
    if not file:
        return {"error": "No file provided"}, 400
    filename = "thumbnail.png"
    file.save(PHOTOS_DIR / filename)
    # Update site.yaml
    with open(SITE_YAML, "r") as f:
        data = yaml.safe_load(f)
    data.setdefault("social", {})["thumbnail"] = filename
    with open(SITE_YAML, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok", "filename": filename})

@app.route("/api/thumbnail/remove", methods=["POST"])
def remove_thumbnail():
    """Remove the thumbnail image and update site.yaml."""
    PHOTOS_DIR = app.config["PHOTOS_DIR"]
    thumbnail_path = PHOTOS_DIR / "thumbnail.png"
    # Remove thumbnail file if exists
    if thumbnail_path.exists():
        thumbnail_path.unlink()
    # Update site.yaml to remove thumbnail key
    with open(SITE_YAML, "r") as f:
        data = yaml.safe_load(f)
    if "social" in data and "thumbnail" in data["social"]:
        data["social"]["thumbnail"] = ""
    with open(SITE_YAML, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})

@app.route("/api/theme/upload", methods=["POST"])
def upload_theme():
    """Upload a custom theme folder and save it in config/themes."""
    themes_dir = Path(__file__).resolve().parents[3] / "config" / "themes"
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files provided"}), 400
    # Get folder name from first file's webkitRelativePath
    first_path = files[0].filename
    folder_name = first_path.split("/")[0] if "/" in first_path else "custom"
    theme_folder = themes_dir / folder_name
    theme_folder.mkdir(parents=True, exist_ok=True)
    for file in files:
        rel_path = Path(file.filename)
        dest_path = theme_folder / rel_path.relative_to(folder_name)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        file.save(dest_path)
    return jsonify({"status": "ok", "theme": folder_name})

# --- Theme Editor API ---
@app.route("/theme-editor")
def theme_editor():
    """Serve the theme editor page."""
    return render_template("theme-editor/index.html")

@app.route("/api/theme-info", methods=["GET", "POST"])
def api_theme_info():
    theme_name = get_theme_name()
    if request.method == "GET":
        theme_yaml = get_theme_yaml(theme_name)
        google_fonts = theme_yaml.get("google_fonts", [])
        return jsonify({
            "theme_name": theme_name,
            "theme_yaml": theme_yaml,
            "google_fonts": google_fonts
        })
    else:
        data = request.get_json()
        theme_yaml = data.get("theme_yaml")
        theme_name = data.get("theme_name", theme_name)
        save_theme_yaml(theme_name, theme_yaml)
        return jsonify({"status": "ok"})

@app.route("/api/local-fonts")
def api_local_fonts():
    theme_name = request.args.get("theme")
    fonts = get_local_fonts(theme_name)
    return jsonify(fonts)


@app.route("/api/favicon/upload", methods=["POST"])
def upload_favicon():
    """Upload favicon to theme folder and update theme.yaml."""
    theme_name = request.form.get("theme")
    file = request.files.get("file")
    if not file or not theme_name:
        return jsonify({"error": "Missing file or theme"}), 400
    ext = Path(file.filename).suffix.lower()
    if ext not in [".png", ".jpg", ".jpeg", ".ico"]:
        return jsonify({"error": "Invalid file type"}), 400
    filename = "favicon" + ext
    theme_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name
    file.save(theme_dir / filename)
    # Update theme.yaml
    theme_yaml_path = theme_dir / "theme.yaml"
    with open(theme_yaml_path, "r") as f:
        theme_yaml = yaml.safe_load(f)
    theme_yaml.setdefault("favicon", {})["path"] = filename
    with open(theme_yaml_path, "w") as f:
        yaml.safe_dump(theme_yaml, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok", "filename": filename})

@app.route("/api/favicon/remove", methods=["POST"])
def remove_favicon():
    """Remove favicon from theme folder and update theme.yaml."""
    data = request.get_json()
    theme_name = data.get("theme")
    if not theme_name:
        return jsonify({"error": "Missing theme"}), 400
    theme_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name
    # Remove favicon file
    for ext in [".png", ".jpg", ".jpeg", ".ico"]:
        favicon_path = theme_dir / f"favicon{ext}"
        if favicon_path.exists():
            favicon_path.unlink()
    # Update theme.yaml
    theme_yaml_path = theme_dir / "theme.yaml"
    with open(theme_yaml_path, "r") as f:
        theme_yaml = yaml.safe_load(f)
    if "favicon" in theme_yaml:
        theme_yaml["favicon"]["path"] = ""
    with open(theme_yaml_path, "w") as f:
        yaml.safe_dump(theme_yaml, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})

@app.route("/themes/<theme>/<filename>")
def serve_theme_asset(theme, filename):
    theme_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme
    return send_from_directory(theme_dir, filename)

@app.route("/api/font/upload", methods=["POST"])
def upload_font():
    """Upload a font file to the theme's fonts folder (only .woff/.woff2 allowed)."""
    theme_name = request.form.get("theme")
    file = request.files.get("file")
    if not file or not theme_name:
        return jsonify({"error": "Missing file or theme"}), 400
    ext = Path(file.filename).suffix.lower()
    if ext not in [".woff", ".woff2"]:
        return jsonify({"error": "Invalid font file type"}), 400
    fonts_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "fonts"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    file.save(fonts_dir / file.filename)
    return jsonify({"status": "ok", "filename": file.filename})

@app.route("/api/font/remove", methods=["POST"])
def remove_font():
    """Remove a font file from the theme's fonts folder."""
    data = request.get_json()
    theme_name = data.get("theme")
    font = data.get("font")
    if not theme_name or not font:
        return jsonify({"error": "Missing theme or font"}), 400
    fonts_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "fonts"
    font_path = fonts_dir / font
    if font_path.exists():
        font_path.unlink()
        return jsonify({"status": "ok"})
    return jsonify({"error": "Font not found"}), 404

# --- Run server ---
if __name__ == "__main__":
    logging.info("Starting WebUI at http://127.0.0.1:5000")
    app.run(debug=True)