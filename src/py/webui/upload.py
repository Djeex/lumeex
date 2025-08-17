import logging
from pathlib import Path
from flask import Blueprint, request, current_app
from werkzeug.utils import secure_filename
from src.py.builder.gallery_builder import update_gallery, update_hero

# --- Create Flask blueprint for upload routes ---
upload_bp = Blueprint("upload", __name__)

# --- Allowed file types ---
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

def allowed_file(filename: str) -> bool:
    """Check if the uploaded file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file, folder: Path):
    """Save an uploaded file to the specified folder."""
    folder.mkdir(parents=True, exist_ok=True)  # Create folder if not exists
    filename = secure_filename(file.filename)  # Sanitize filename
    file.save(folder / filename)  # Save to disk
    logging.info(f"[✓] Uploaded {filename} to {folder}")
    return filename

@upload_bp.route("/api/<section>/upload", methods=["POST"])
def upload_photo(section: str):
    """
    Handle file uploads for gallery or hero section.
    Accepts multiple files under 'files'.
    """
    # Validate section
    if section not in ["gallery", "hero"]:
        return {"error": "Invalid section"}, 400

    # Check if files are provided
    if "files" not in request.files:
        return {"error": "No files provided"}, 400
    
    files = request.files.getlist("files")
    if not files:
        return {"error": "No selected files"}, 400

    # Get photos directory from app config
    PHOTOS_DIR = current_app.config.get("PHOTOS_DIR")
    if not PHOTOS_DIR:
        return {"error": "Server misconfiguration"}, 500

    folder = PHOTOS_DIR / section  # Target folder
    uploaded = []

    # Save each valid file
    for file in files:
        if file and allowed_file(file.filename):
            filename = save_uploaded_file(file, folder)
            uploaded.append(filename)

    # Update YAML if any files were uploaded
    if uploaded:
        if section == "gallery":
            update_gallery()
        else:
            update_hero()
        return {"status": "ok", "uploaded": uploaded}

    return {"error": "No valid files uploaded"}, 400

