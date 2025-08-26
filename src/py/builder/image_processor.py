import logging
from pathlib import Path
from PIL import Image, features
from shutil import copyfile

def convert_and_resize_image(input_path, output_path, resize=True, max_width=1140):
    """Convert an image to WebP (or JPEG fallback) and optionally resize it."""
    try:
        if not input_path.exists():
            logging.error(f"[✗] Image file not found: {input_path}")
            return

        img = Image.open(input_path)
        if img.mode != "RGB":
            img = img.convert("RGB")

        if resize:
            width, height = img.size
            if width > max_width:
                new_height = int((max_width / width) * height)
                img = img.resize((max_width, new_height), Image.LANCZOS)

        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Check WebP support, otherwise fallback to JPEG
        fmt = "WEBP" if features.check("webp") else "JPEG"
        if fmt == "JPEG":
            output_path = output_path.with_suffix(".jpg")

        img.save(output_path, fmt, quality=90 if fmt == "JPEG" else 100)
        logging.info(f"[✓] Processed image: {input_path} → {output_path}")

    except Exception as e:
        logging.error(f"[✗] Error processing image {input_path}: {e}")

def process_images(images, resize_images, img_dir, build_dir):
    """Process a list of image references and update paths to optimized versions."""
    for img in images:
        src_path = img_dir / img["src"]
        webp_path = build_dir / "img" / Path(img["src"]).with_suffix(".webp")
        convert_and_resize_image(src_path, webp_path, resize=resize_images)

        if webp_path.exists():
            img["src"] = str(Path(img["src"]).with_suffix(".webp"))
        else:
            # Fallback if WebP not created
            jpg_path = webp_path.with_suffix(".jpg")
            if jpg_path.exists():
                img["src"] = str(Path(img["src"]).with_suffix(".jpg"))

def copy_original_images(images, img_dir, build_dir):
    """Copy original image files without processing."""
    for img in images:
        src_path = img_dir / img["src"]
        dest_path = build_dir / "img" / img["src"]

        try:
            if not src_path.exists():
                logging.error(f"[✗] Original image not found: {src_path}")
                continue

            dest_path.parent.mkdir(parents=True, exist_ok=True)
            copyfile(src_path, dest_path)
            logging.info(f"[✓] Copied original: {src_path} → {dest_path}")

        except Exception as e:
            logging.error(f"[✗] Error copying {src_path}: {e}")

def get_favicon_path(theme_vars, theme_dir):
    """Retrieve the favicon path from theme variables, ensuring it exists."""
    fav_path = theme_vars.get("favicon", {}).get("path")
    if not fav_path:
        logging.warning("[~] No favicon path defined in theme.yaml")
        return None

    path = Path(fav_path)
    if not path.is_absolute():
        path = theme_dir / path

    if not path.exists():
        logging.error(f"[✗] Favicon not found: {path}")
        return None

    return path

def generate_favicons_from_logo(theme_vars, theme_dir, output_dir):
    """Generate multiple PNG favicons from a single source image."""
    logo_path = get_favicon_path(theme_vars, theme_dir)
    if not logo_path:
        logging.warning("[~] PNG favicons not generated.")
        return

    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        specs = [
            (32, "favicon-32.png"), (96, "favicon-96.png"), (128, "favicon-128.png"),
            (192, "favicon-192.png"), (196, "favicon-196.png"),
            (152, "favicon-152.png"), (180, "favicon-180.png")
        ]
        img = Image.open(logo_path).convert("RGBA")
        for size, name in specs:
            img.resize((size, size), Image.LANCZOS).save(output_dir / name, format="PNG")

        logging.info(f"[✓] PNG favicons generated in {output_dir}")

    except Exception as e:
        logging.error(f"[✗] Error generating PNG favicons: {e}")

def generate_favicon_ico(theme_vars, theme_dir, output_path):
    """Generate a multi-size favicon.ico from a source image."""
    logo_path = get_favicon_path(theme_vars, theme_dir)
    if not logo_path:
        logging.warning("[~] favicon.ico not generated.")
        return

    try:
        img = Image.open(logo_path).convert("RGBA")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        logging.info(f"[✓] favicon.ico generated in {output_path}")

    except Exception as e:
        logging.error(f"[✗] Error generating favicon.ico: {e}")
