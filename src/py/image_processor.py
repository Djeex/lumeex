import logging
from pathlib import Path
from PIL import Image
from shutil import copyfile

def convert_and_resize_image(input_path, output_path, resize=True, max_width=1140):
    try:
        img = Image.open(input_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        if resize:
            width, height = img.size
            if width > max_width:
                new_height = int((max_width / width) * height)
                img = img.resize((max_width, new_height), Image.LANCZOS)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, "WEBP", quality=100)
        logging.info(f"[✓] Processed: {input_path} → {output_path}")
    except Exception as e:
        logging.error(f"[✗] Failed to process {input_path}: {e}")

def process_images(images, resize_images, img_dir, build_dir):
    for img in images:
        src_path = img_dir / img["src"]
        webp_path = build_dir / "img" / Path(img["src"]).with_suffix(".webp")
        convert_and_resize_image(src_path, webp_path, resize=resize_images)
        img["src"] = str(Path(img["src"]).with_suffix(".webp"))

def copy_original_images(images, img_dir, build_dir):
    for img in images:
        src_path = img_dir / img["src"]
        dest_path = build_dir / "img" / img["src"]
        try:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            copyfile(src_path, dest_path)
            logging.info(f"[✓] Copied original: {src_path} → {dest_path}")
        except Exception as e:
            logging.error(f"[✗] Failed to copy {src_path}: {e}")

def generate_favicons_from_logo(theme_vars, theme_dir, output_dir):
    logo_path = get_favicon_path(theme_vars, theme_dir)
    if not logo_path:
        logging.warning("[~] No favicon path defined, skipping favicon PNGs.")
        return
    output_dir.mkdir(parents=True, exist_ok=True)
    specs = [(32, "favicon-32.png"), (96, "favicon-96.png"), (128, "favicon-128.png"),
             (192, "favicon-192.png"), (196, "favicon-196.png"), (152, "favicon-152.png"), (180, "favicon-180.png")]
    img = Image.open(logo_path).convert("RGBA")
    for size, name in specs:
        img.resize((size, size), Image.LANCZOS).save(output_dir / name, format="PNG")
    logging.info(f"[✓] Favicons generated in {output_dir}")

def generate_favicon_ico(theme_vars, theme_dir, output_path):
    logo_path = get_favicon_path(theme_vars, theme_dir)
    if not logo_path:
        logging.warning("[~] No favicon path defined, skipping .ico generation.")
        return
    try:
        img = Image.open(logo_path).convert("RGBA")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        logging.info(f"[✓] favicon.ico generated at {output_path}")
    except Exception as e:
        logging.error(f"[✗] Failed to generate favicon.ico: {e}")

def get_favicon_path(theme_vars, theme_dir):
    fav_path = theme_vars.get("favicon", {}).get("path")
    if not fav_path:
        return None
    path = Path(fav_path)
    if not path.is_absolute():
        path = theme_dir / path
    return path if path.exists() else None
