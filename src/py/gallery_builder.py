import yaml
import os
from pathlib import Path

# YAML file paths
GALLERY_YAML = "config/gallery.yaml"

# Image directories
GALLERY_DIR = Path("config/photos/gallery")
HERO_DIR = Path("config/photos/hero")

def load_yaml(path):
    print(f"[→] Loading {path}...")
    if not os.path.exists(path):
        print(f"[✗] File not found: {path}")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
        images = data.get("images", []) or []
        print(f"[✓] Loaded {len(images)} image(s) from {path}")
        return data

def save_yaml(data, path):
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, sort_keys=False, allow_unicode=True)
    print(f"[✓] Saved updated YAML to {path}")

def get_all_image_paths(directory):
    return sorted([
        str(p.relative_to(directory.parent)).replace("\\", "/")
        for p in directory.rglob("*")
        if p.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
    ])

def update_gallery():
    print("\n=== Updating gallery.yaml (gallery section) ===")
    gallery = load_yaml(GALLERY_YAML)

    # Access the 'gallery' section within the gallery data, or initialize it if it doesn't exist
    gallery_section = gallery.get("gallery", {})

    # Access the 'images' list within the 'gallery' section, or initialize it if it doesn't exist
    gallery_images = gallery_section.get("images", [])

    all_images = set(get_all_image_paths(GALLERY_DIR))
    known_images = {img["src"] for img in gallery_images}

    # Add new images
    new_images = [
        {"src": path, "tags": []}
        for path in all_images
        if path not in known_images
    ]
    if new_images:
        gallery_images.extend(new_images)
        print(f"[✓] Added {len(new_images)} new image(s) to gallery.yaml (gallery)")

    # Remove deleted images
    deleted_images = known_images - all_images
    if deleted_images:
        gallery_images = [img for img in gallery_images if img["src"] not in deleted_images]
        print(f"[✓] Removed {len(deleted_images)} deleted image(s) from gallery.yaml (gallery)")

    # Update the 'gallery' section with the modified 'images' list
    gallery_section["images"] = gallery_images
    gallery["gallery"] = gallery_section

    save_yaml(gallery, GALLERY_YAML)

    if not new_images and not deleted_images:
        print("[✓] No changes to gallery.yaml (gallery)")

def update_hero():
    print("\n=== Updating gallery.yaml (hero section) ===")
    gallery = load_yaml(GALLERY_YAML)

    # Access the 'hero' section within the gallery data, or initialize it if it doesn't exist
    hero_section = gallery.get("hero", {})

    # Access the 'images' list within the 'hero' section, or initialize it if it doesn't exist
    hero_images = hero_section.get("images", [])

    all_images = set(get_all_image_paths(HERO_DIR))
    known_images = {img["src"] for img in hero_images}

    # Add new images
    new_images = [
        {"src": path}
        for path in all_images
        if path not in known_images
    ]
    if new_images:
        hero_images.extend(new_images)
        print(f"[✓] Added {len(new_images)} new image(s) to gallery.yaml (hero)")

    # Remove deleted images
    deleted_images = known_images - all_images
    if deleted_images:
        hero_images = [img for img in hero_images if img["src"] not in deleted_images]
        print(f"[✓] Removed {len(deleted_images)} deleted image(s) from gallery.yaml (hero)")

    # Update the 'hero' section with the modified 'images' list
    hero_section["images"] = hero_images
    gallery["hero"] = hero_section

    save_yaml(gallery, GALLERY_YAML)

    if not new_images and not deleted_images:
        print("[✓] No changes to gallery.yaml (hero)")
