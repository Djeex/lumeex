# --- Imports ---
import logging
import yaml
import subprocess
import zipfile
import os
from pathlib import Path
from flask import (
    Flask, jsonify, request, send_from_directory, render_template,
    send_file, after_this_request
)
from src.py.builder.gallery_builder import (
    GALLERY_YAML, load_yaml, save_yaml, update_gallery, update_hero
)
from src.py.webui.upload import upload_bp

# --- Logging configuration ---
logging.basicConfig(level=logging.INFO, format="%(message)s")

# --- Flask app setup ---
VERSION_FILE = Path(__file__).resolve().parents[3] / "VERSION"
with open(VERSION_FILE, "r") as vf:
    lumeex_version = vf.read().strip()

WEBUI_PATH = Path(__file__).parents[2] / "webui"  # Path to static/templates
app = Flask(
    __name__,
    template_folder=WEBUI_PATH,
    static_folder=WEBUI_PATH,
    static_url_path=""
)

WEBUI_PORT = int(os.getenv("WEBUI_PORT", 5000))

# --- Config paths ---
SITE_YAML = Path(__file__).resolve().parents[3] / "config" / "site.yaml"
PHOTOS_DIR = Path(__file__).resolve().parents[3] / "config" / "photos"
app.config["PHOTOS_DIR"] = PHOTOS_DIR

# --- Register upload blueprint ---
app.register_blueprint(upload_bp)

# --- Theme editor helper functions ---
def get_theme_name():
    """Get current theme name from site.yaml."""
    site_yaml_path = Path(__file__).resolve().parents[3] / "config" / "site.yaml"
    with open(site_yaml_path, "r") as f:
        site_yaml = yaml.safe_load(f)
    return site_yaml.get("build", {}).get("theme", "modern")

def get_theme_yaml(theme_name):
    """Load theme.yaml for a given theme."""
    theme_yaml_path = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "theme.yaml"
    with open(theme_yaml_path, "r") as f:
        return yaml.safe_load(f)

def save_theme_yaml(theme_name, theme_yaml):
    """Save theme.yaml for a given theme."""
    theme_yaml_path = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "theme.yaml"
    with open(theme_yaml_path, "w") as f:
        yaml.safe_dump(theme_yaml, f, sort_keys=False, allow_unicode=True)

def get_local_fonts(theme_name):
    """List local font files for a theme."""
    fonts_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "fonts"
    if not fonts_dir.exists():
        return []
    return [f.name for f in fonts_dir.glob("*") if f.is_file() and f.suffix in [".woff", ".woff2"]]

# --- ROUTES ---

# --- Main page ---
@app.route("/")
def index():
    return render_template("index.html")

PREVIEW_PORT = int(os.getenv("PREVIEW_PORT", 3000))

@app.context_processor
def inject_version():
    return dict(
        lumeex_version=lumeex_version,
        preview_port=PREVIEW_PORT
    )

# --- Gallery & Hero API ---
@app.route("/gallery-editor")
def gallery_editor():
    """Render gallery editor page."""
    return render_template("gallery-editor/index.html")

@app.route("/api/gallery", methods=["GET"])
def get_gallery():
    """Get gallery images."""
    data = load_yaml(GALLERY_YAML)
    return jsonify(data.get("gallery", {}).get("images", []))

@app.route("/api/hero", methods=["GET"])
def get_hero():
    """Get hero images."""
    data = load_yaml(GALLERY_YAML)
    return jsonify(data.get("hero", {}).get("images", []))

@app.route("/api/gallery/update", methods=["POST"])
def update_gallery_api():
    """Update gallery images."""
    images = request.json
    data = load_yaml(GALLERY_YAML)
    data["gallery"]["images"] = images
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok"})

@app.route("/api/hero/update", methods=["POST"])
def update_hero_api():
    """Update hero images."""
    images = request.json
    data = load_yaml(GALLERY_YAML)
    data["hero"]["images"] = images
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok"})

@app.route("/api/gallery/refresh", methods=["POST"])
def refresh_gallery():
    """Refresh gallery images from disk."""
    update_gallery()
    return jsonify({"status": "ok"})

@app.route("/api/hero/refresh", methods=["POST"])
def refresh_hero():
    """Refresh hero images from disk."""
    update_hero()
    return jsonify({"status": "ok"})

# --- Gallery & Hero photo deletion ---
@app.route("/api/gallery/delete", methods=["POST"])
def delete_gallery_photo():
    """Delete a gallery photo."""
    data = request.json
    src = data.get("src")
    file_path = PHOTOS_DIR / "gallery" / src
    if file_path.exists():
        file_path.unlink()
        return {"status": "ok"}
    return {"error": "❌ File not found"}, 404

@app.route("/api/hero/delete", methods=["POST"])
def delete_hero_photo():
    """Delete a hero photo."""
    data = request.json
    src = data.get("src")
    file_path = PHOTOS_DIR / "hero" / src
    if file_path.exists():
        file_path.unlink()
        return {"status": "ok"}
    return {"error": "❌ File not found"}, 404

@app.route("/api/gallery/delete_all", methods=["POST"])
def delete_all_gallery_photos():
    """Delete all gallery photos."""
    gallery_dir = PHOTOS_DIR / "gallery"
    deleted = 0
    for file in gallery_dir.glob("*"):
        if file.is_file():
            file.unlink()
            deleted += 1
    data = load_yaml(GALLERY_YAML)
    data["gallery"]["images"] = []
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok", "deleted": deleted})

@app.route("/api/hero/delete_all", methods=["POST"])
def delete_all_hero_photos():
    """Delete all hero photos."""
    hero_dir = PHOTOS_DIR / "hero"
    deleted = 0
    for file in hero_dir.glob("*"):
        if file.is_file():
            file.unlink()
            deleted += 1
    data = load_yaml(GALLERY_YAML)
    data["hero"]["images"] = []
    save_yaml(data, GALLERY_YAML)
    return jsonify({"status": "ok", "deleted": deleted})

# --- Serve photos ---
@app.route("/photos/<section>/<path:filename>")
def photos(section, filename):
    """Serve a photo from a section."""
    return send_from_directory(PHOTOS_DIR / section, filename)

@app.route("/photos/<path:filename>")
def serve_photo(filename):
    """Serve a photo from the photos directory."""
    photos_dir = Path(__file__).resolve().parents[3] / "config" / "photos"
    return send_from_directory(photos_dir, filename)

# --- Site info page & API ---
@app.route("/site-info")
def site_info():
    """Render site info editor page."""
    return render_template("site-info/index.html")

@app.route("/api/site-info", methods=["GET"])
def get_site_info():
    """Get site info YAML as JSON."""
    with open(SITE_YAML, "r") as f:
        data = yaml.safe_load(f)
    return jsonify(data)

@app.route("/api/site-info", methods=["POST"])
def update_site_info():
    """Update site info YAML."""
    data = request.json
    with open(SITE_YAML, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})

# --- Theme management ---
@app.route("/api/themes")
def list_themes():
    """List available themes."""
    themes_dir = Path(__file__).resolve().parents[3] / "config" / "themes"
    themes = [d.name for d in themes_dir.iterdir() if d.is_dir()]
    return jsonify(themes)

# --- Thumbnail upload/remove ---
@app.route("/api/thumbnail/upload", methods=["POST"])
def upload_thumbnail():
    """Upload thumbnail image and update site.yaml."""
    PHOTOS_DIR = app.config["PHOTOS_DIR"]
    file = request.files.get("file")
    if not file:
        return {"error": "❌ No file provided"}, 400
    filename = "thumbnail.png"
    file.save(PHOTOS_DIR / filename)
    with open(SITE_YAML, "r") as f:
        data = yaml.safe_load(f)
    data.setdefault("social", {})["thumbnail"] = filename
    with open(SITE_YAML, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok", "filename": filename})

@app.route("/api/thumbnail/remove", methods=["POST"])
def remove_thumbnail():
    """Remove thumbnail image and update site.yaml."""
    PHOTOS_DIR = app.config["PHOTOS_DIR"]
    thumbnail_path = PHOTOS_DIR / "thumbnail.png"
    if thumbnail_path.exists():
        thumbnail_path.unlink()
    with open(SITE_YAML, "r") as f:
        data = yaml.safe_load(f)
    if "social" in data and "thumbnail" in data["social"]:
        data["social"]["thumbnail"] = ""
    with open(SITE_YAML, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})

# --- Theme upload ---
@app.route("/api/theme/upload", methods=["POST"])
def upload_theme():
    """Upload a custom theme folder."""
    themes_dir = Path(__file__).resolve().parents[3] / "config" / "themes"
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "❌ No files provided"}), 400
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

@app.route("/api/theme/remove", methods=["POST"])
def remove_theme():
    """Remove a custom theme folder."""
    data = request.get_json()
    theme_name = data.get("theme")
    if not theme_name:
        return jsonify({"error": "❌ Missing theme"}), 400
    themes_dir = Path(__file__).resolve().parents[3] / "config" / "themes"
    theme_folder = themes_dir / theme_name
    if not theme_folder.exists() or not theme_folder.is_dir():
        return jsonify({"error": "❌ Theme not found"}), 404
    # Prevent removing default themes
    if theme_name in ["modern", "classic"]:
        return jsonify({"error": "❌ Cannot remove default theme"}), 400
    # Remove folder and all contents
    import shutil
    shutil.rmtree(theme_folder)
    return jsonify({"status": "ok"})

# --- Theme editor page & API ---
@app.route("/theme-editor")
def theme_editor():
    """Render theme editor page."""
    return render_template("theme-editor/index.html")

@app.route("/api/theme-info", methods=["GET", "POST"])
def api_theme_info():
    """Get or update theme.yaml for current theme."""
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

@app.route("/api/theme-google-fonts", methods=["POST"])
def update_theme_google_fonts():
    """Update only google_fonts in theme.yaml for current theme."""
    data = request.get_json()
    theme_name = data.get("theme_name")
    google_fonts = data.get("google_fonts", [])
    theme_yaml_path = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "theme.yaml"
    with open(theme_yaml_path, "r") as f:
        theme_yaml = yaml.safe_load(f)
    theme_yaml["google_fonts"] = google_fonts
    with open(theme_yaml_path, "w") as f:
        yaml.safe_dump(theme_yaml, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})

@app.route("/api/local-fonts")
def api_local_fonts():
    """List local fonts for a theme."""
    theme_name = request.args.get("theme")
    fonts = get_local_fonts(theme_name)
    return jsonify(fonts)

# --- Favicon upload/remove ---
@app.route("/api/favicon/upload", methods=["POST"])
def upload_favicon():
    """Upload favicon for a theme."""
    theme_name = request.form.get("theme")
    file = request.files.get("file")
    if not file or not theme_name:
        return jsonify({"error": "❌ Missing file or theme"}), 400
    ext = Path(file.filename).suffix.lower()
    if ext not in [".png", ".jpg", ".jpeg", ".ico"]:
        return jsonify({"error": "❌ Invalid file type"}), 400
    filename = "favicon" + ext
    theme_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name
    file.save(theme_dir / filename)
    theme_yaml_path = theme_dir / "theme.yaml"
    with open(theme_yaml_path, "r") as f:
        theme_yaml = yaml.safe_load(f)
    theme_yaml.setdefault("favicon", {})["path"] = filename
    with open(theme_yaml_path, "w") as f:
        yaml.safe_dump(theme_yaml, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok", "filename": filename})

@app.route("/api/favicon/remove", methods=["POST"])
def remove_favicon():
    """Remove favicon for a theme."""
    data = request.get_json()
    theme_name = data.get("theme")
    if not theme_name:
        return jsonify({"error": "❌ Missing theme"}), 400
    theme_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name
    for ext in [".png", ".jpg", ".jpeg", ".ico"]:
        favicon_path = theme_dir / f"favicon{ext}"
        if favicon_path.exists():
            favicon_path.unlink()
    theme_yaml_path = theme_dir / "theme.yaml"
    with open(theme_yaml_path, "r") as f:
        theme_yaml = yaml.safe_load(f)
    if "favicon" in theme_yaml:
        theme_yaml["favicon"]["path"] = ""
    with open(theme_yaml_path, "w") as f:
        yaml.safe_dump(theme_yaml, f, sort_keys=False, allow_unicode=True)
    return jsonify({"status": "ok"})

# --- Serve theme assets ---
@app.route("/themes/<theme>/<filename>")
def serve_theme_asset(theme, filename):
    """Serve a theme asset file."""
    theme_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme
    return send_from_directory(theme_dir, filename)

# --- Font upload/remove ---
@app.route("/api/font/upload", methods=["POST"])
def upload_font():
    """Upload a font file for a theme."""
    theme_name = request.form.get("theme")
    file = request.files.get("file")
    if not file or not theme_name:
        return jsonify({"error": "❌ Missing theme or font"}), 400
    ext = Path(file.filename).suffix.lower()
    if ext not in [".woff", ".woff2"]:
        return jsonify({"error": "❌ Invalid font file type"}), 400
    fonts_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "fonts"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    file.save(fonts_dir / file.filename)
    return jsonify({"status": "ok", "filename": file.filename})

@app.route("/api/font/remove", methods=["POST"])
def remove_font():
    """Remove a font file for a theme."""
    data = request.get_json()
    theme_name = data.get("theme")
    font = data.get("font")
    if not theme_name or not font:
        return jsonify({"error": "❌ Missing theme or font"}), 400
    fonts_dir = Path(__file__).resolve().parents[3] / "config" / "themes" / theme_name / "fonts"
    font_path = fonts_dir / font
    if font_path.exists():
        font_path.unlink()
        return jsonify({"status": "ok"})
    return jsonify({"error": "❌ Font not found"}), 404

# --- Build & Download ZIP ---
@app.route("/api/build", methods=["POST"])
def trigger_build():
    """
    Validate site.yaml and run build.py.
    Does NOT create zip here; zip is created on demand in download route.
    """
    site_yaml_path = Path(__file__).resolve().parents[3] / "config" / "site.yaml"
    output_folder = Path(__file__).resolve().parents[3] / "output"

    if not site_yaml_path.exists():
        return jsonify({"status": "error", "message": "❌ site.yaml not found"}), 400

    with open(site_yaml_path, "r") as f:
        site_data = yaml.safe_load(f) or {}

    # Dynamically check all main sections and nested keys
    main_sections = list(site_data.keys())
    for section in main_sections:
        value = site_data.get(section)
        if not value:
            return jsonify({"status": "error", "message": f"❌ Site info are not set: missing {section}"}), 400
        if isinstance(value, dict):
            for k, v in value.items():
                if v is None or v == "" or (isinstance(v, list) and not v):
                    return jsonify({"status": "error", "message": f"❌ Site info are not set: missing {section}.{k}"}), 400
        elif isinstance(value, list):
            if not value:
                return jsonify({"status": "error", "message": f"❌ Site info are not set: missing {section}"}), 400
            for idx, item in enumerate(value):
                if isinstance(item, dict):
                    for k, v in item.items():
                        if v is None or v == "" or (isinstance(v, list) and not v):
                            return jsonify({"status": "error", "message": f"❌ Site info are not set: missing {section}[{idx}].{k}"}), 400
                elif item is None or item == "":
                    return jsonify({"status": "error", "message": f"❌ Site info are not set: missing {section}[{idx}]"}), 400
        else:
            if value is None or value == "":
                return jsonify({"status": "error", "message": f"❌ Site info are not set: missing {section}"}), 400

    try:
        subprocess.run(["python3", "build.py"], check=True)
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": f"❌ {str(e)}"}), 500

@app.route("/download-output-zip", methods=["POST"])
def download_output_zip():
    """
    Create output zip on demand and send it to the user.
    Zip is deleted after sending.
    """
    output_folder = Path(__file__).resolve().parents[3] / "output"
    zip_path = Path(__file__).resolve().parents[3] / "site_output.zip"  # Store in lumeex/ root

    # Create zip on demand
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for root, dirs, files in os.walk(output_folder):
            for file in files:
                file_path = Path(root) / file
                zipf.write(file_path, file_path.relative_to(output_folder))

    @after_this_request
    def remove_file(response):
        try:
            os.remove(zip_path)
        except Exception:
            pass
        return response

    return send_file(zip_path, as_attachment=True)

# --- Run server ---
if __name__ == "__main__":
    logging.info("Starting WebUI at http://0.0.0.0:5000")
    logging.info(f"Host port is {WEBUI_PORT}")
    app.run(host="0.0.0.0", port=5000, debug=True)