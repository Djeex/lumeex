import logging
from pathlib import Path
from flask import Blueprint, request, current_app
from werkzeug.utils import secure_filename

# Create a Flask blueprint for upload routes
upload_bp = Blueprint("upload", __name__)

# Allowed file extensions for uploads
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

# Function to check if a file has an allowed extension
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# Function to save uploaded file to a given folder
def save_uploaded_file(file, folder: Path):
    folder.mkdir(parents=True, exist_ok=True)  # Create folder if it doesn't exist
    filename = secure_filename(file.filename)  # Sanitize filename
    file.save(folder / filename)  # Save file to folder
    logging.info(f"[✓] Uploaded {filename} to {folder}")
    return filename  # Return saved filename

# Route to handle photo uploads for gallery or hero
@upload_bp.route("/api/<section>/upload", methods=["POST"])
def upload_photo(section: str):
    # Validate section
    if section not in ["gallery", "hero"]:
        return {"error": "Invalid section"}, 400

    # Check if the request contains a file
    if "file" not in request.files:
        return {"error": "No file part"}, 400
    file = request.files["file"]

    # Check if a file was actually selected
    if file.filename == "":
        return {"error": "No selected file"}, 400

    # Check file type and save it
    if file and allowed_file(file.filename):
        PHOTOS_DIR = current_app.config.get("PHOTOS_DIR")  # Get base photos directory from config
        if not PHOTOS_DIR:
            return {"error": "Server misconfiguration"}, 500
        folder = PHOTOS_DIR / section  # Target folder (gallery or hero)
        filename = save_uploaded_file(file, folder)
        return {"status": "ok", "filename": filename}

    # If file type is not allowed
    return {"error": "File type not allowed"}, 400
