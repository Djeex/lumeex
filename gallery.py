import yaml
import os
from pathlib import Path

# YAML file paths
GALLERY_YAML = "config/gallery.yaml"
SITE_YAML = "config/site.yaml"

# Image directories
GALLERY_DIR = Path("public/img/gallery")
HERO_DIR = Path("public/img/hero")

def load_yaml(path):
    print(f"[→] Loading {path}...")
    if not os.path.exists(path):
        print(f"[✗] File not found: {path}")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
        images = data.get("images") or []
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
    print("\n=== Updating gallery.yaml ===")
    gallery = load_yaml(GALLERY_YAML)
    gallery_images = gallery.get("images") or []
    known = {img["src"] for img in gallery_images}
    all_images = get_all_image_paths(GALLERY_DIR)

    new_images = [
        {"src": path, "tags": []}
        for path in all_images
        if path not in known
    ]

    if new_images:
        gallery_images.extend(new_images)
        gallery["images"] = gallery_images
        save_yaml(gallery, GALLERY_YAML)
        print(f"[✓] Added {len(new_images)} new image(s) to gallery.yaml")
    else:
        print("[✓] No new images to add to gallery.yaml")

def update_hero():
    print("\n=== Updating site.yaml (hero section) ===")
    site = load_yaml(SITE_YAML)
    hero_section = site.get("hero", {})
    hero_images = hero_section.get("images") or []
    known = {img["src"] for img in hero_images}
    all_images = get_all_image_paths(HERO_DIR)

    new_images = [
        {"src": path}
        for path in all_images
        if path not in known
    ]

    if new_images:
        hero_images.extend(new_images)
        site["hero"]["images"] = hero_images
        save_yaml(site, SITE_YAML)
        print(f"[✓] Added {len(new_images)} new image(s) to site.yaml (hero)")
    else:
        print("[✓] No new images to add to site.yaml")

if __name__ == "__main__":
    update_gallery()
    update_hero()
