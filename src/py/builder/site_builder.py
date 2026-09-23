import logging
from datetime import datetime
from pathlib import Path
from shutil import copyfile

from PIL import Image

from .css_generator import generate_css_variables, generate_fonts_css, generate_google_fonts_link
from .html_generator import (
    generate_gallery_json_from_images,
    generate_robots_txt,
    generate_sitemap_xml,
    render_gallery_images,
    render_photo_page,
    render_template,
)
from .image_processor import (
    compute_photo_ids,
    copy_original_images,
    generate_favicon_ico,
    generate_favicons_from_logo,
    generate_share_preview,
    process_images,
)
from .utils import copy_assets, ensure_dir, load_theme_config, load_yaml

# Configure logging to display only the messages
logging.basicConfig(level=logging.INFO, format="%(message)s")

# Define key directories used throughout the script
SRC_DIR = Path.cwd()
BUILD_DIR = SRC_DIR / "output"
TEMPLATE_DIR = SRC_DIR / "src/templates"
IMG_DIR = SRC_DIR / "config/photos"
JS_DIR = SRC_DIR / "src/public/js"
STYLE_DIR = SRC_DIR / "src/public/style"
GALLERY_FILE = SRC_DIR / "config/gallery.yaml"
SITE_FILE = SRC_DIR / "config/site.yaml"
THEMES_DIR = SRC_DIR / "config/themes"
VERSION_FILE = SRC_DIR / "VERSION"
with open(VERSION_FILE) as vf:
    build_version = vf.read().strip()


def build():
    logging.info("\n")
    logging.info("=" * 24)
    logging.info(f"🚀 Lumeex builder v{build_version}")
    logging.info("=" * 24)
    logging.info("\n === Starting build === ")
    ensure_dir(BUILD_DIR)
    copy_assets(JS_DIR, STYLE_DIR, BUILD_DIR)

    # Defining build vars
    build_date = datetime.now().strftime("%Y%m%d%H%M%S")
    build_date_version = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    site_vars = load_yaml(SITE_FILE)
    gallery_vars = load_yaml(GALLERY_FILE)
    build_section = site_vars.get("build", {})
    theme_name = site_vars.get("build", {}).get("theme", "default")
    theme_vars, theme_dir = load_theme_config(theme_name, THEMES_DIR)
    fonts_dir = theme_dir / "fonts"
    theme_css_path = theme_dir / "theme.css"
    canonical_url = site_vars.get("info", {}).get("canonical", "").rstrip("/")
    canonical_home = f"{canonical_url}/"
    canonical_legals = f"{canonical_url}/legals/"

    # Copying theme.css if existing
    if theme_css_path.exists():
        dest_theme_css = BUILD_DIR / "style" / "theme.css"
        dest_theme_css.parent.mkdir(parents=True, exist_ok=True)
        copyfile(theme_css_path, dest_theme_css)
        theme_css = f'<link rel="stylesheet" href="/style/theme.css?build_date={build_date}">'
        logging.info(f"[✓] Theme CSS found, copied to build folder: {dest_theme_css}")
    else:
        theme_css = ""
        logging.warning(
            f"[~] No theme.css found in {theme_css_path}, skipping theme CSS injection."
        )

    preload_links = generate_fonts_css(
        fonts_dir, BUILD_DIR / "style" / "fonts.css", fonts_cfg=theme_vars.get("fonts")
    )
    generate_css_variables(theme_vars.get("colors", {}), BUILD_DIR / "style" / "colors.css")
    generate_favicons_from_logo(theme_vars, theme_dir, BUILD_DIR / "img" / "favicon")
    generate_favicon_ico(theme_vars, theme_dir, BUILD_DIR / "favicon.ico")

    # Converting and resizing images if enabled
    convert_images = build_section.get("convert_images", True)
    resize_images = build_section.get("resize_images", True)
    logging.info(f"[~] convert_images = {convert_images}")
    logging.info(f"[~] resize_images = {resize_images}")

    hero_images = gallery_vars.get("hero", {}).get("images", [])
    gallery_images = gallery_vars.get("gallery", {}).get("images", [])

    # Permalink ids for gallery photos (not the hero carousel), hashed from
    # the original files — before process_images rewrites their src
    compute_photo_ids(gallery_images, IMG_DIR)
    original_src_by_photo_id = {
        img["photo_id"]: img["src"] for img in gallery_images if "photo_id" in img
    }

    if convert_images:
        process_images(hero_images, resize_images, IMG_DIR, BUILD_DIR)
        process_images(gallery_images, resize_images, IMG_DIR, BUILD_DIR)
    else:
        copy_original_images(hero_images, IMG_DIR, BUILD_DIR)
        copy_original_images(gallery_images, IMG_DIR, BUILD_DIR)

    if "hero" not in site_vars:
        site_vars["hero"] = {}  # Initialize an empty hero section

    # Adding menu
    menu_html = "\n".join(
        f'<li class="nav-item appear"><a href="{item["href"]}">{item["label"]}</a></li>'
        for item in site_vars.get("menu", {}).get("items", [])
    )
    site_vars["hero"]["menu_items"] = menu_html
    if "footer" in site_vars:
        site_vars["footer"]["menu_items"] = menu_html

    # Adding Google fonts if existing
    google_fonts_link = generate_google_fonts_link(theme_vars.get("google_fonts", []))
    logging.info("[✓] Google Fonts link generated")

    # Generating thumbnail
    thumbnail_path = site_vars.get("social", {}).get("thumbnail")
    if thumbnail_path:
        src_thumb = IMG_DIR / thumbnail_path
        dest_thumb_dir = BUILD_DIR / "img" / "social"
        dest_thumb_dir.mkdir(parents=True, exist_ok=True)
        dest_thumb = dest_thumb_dir / Path(thumbnail_path).name
        try:
            img = Image.open(src_thumb)
            img = img.convert("RGB")
            img = img.resize((1200, 630), Image.LANCZOS)
            img.save(dest_thumb, "JPEG", quality=90)
            logging.info(f"[✓] Thumbnail resized and saved to {dest_thumb}")
        except Exception as e:
            logging.error(f"[✗] Failed to process thumbnail: {e}")
    else:
        logging.warning("[~] No thumbnail found in social section")

    # Defining head variables
    head_vars = dict(site_vars.get("info", {}))
    head_vars.update(theme_vars.get("colors", {}))
    head_vars.update(site_vars.get("social", {}))
    head_vars["thumbnail"] = f"/img/social/{Path(thumbnail_path).name}" if thumbnail_path else ""
    head_vars["google_fonts_link"] = google_fonts_link
    head_vars["font_preloads"] = "\n".join(preload_links)
    head_vars["theme_css"] = theme_css
    head_vars["build_date"] = build_date
    head_vars["canonical"] = canonical_home

    # Render the home page
    head = render_template(TEMPLATE_DIR / "head.html", head_vars)
    hero = render_template(TEMPLATE_DIR / "hero.html", {**site_vars["hero"], **head_vars})
    footer = render_template(
        TEMPLATE_DIR / "footer.html", {**site_vars.get("footer", {}), **head_vars}
    )
    gallery_html = render_gallery_images(gallery_images)
    gallery = render_template(TEMPLATE_DIR / "gallery.html", {"gallery_images": gallery_html})

    signature = f"<!-- Build with Lumeex {build_version} | https://git.djeex.fr/Djeex/lumeex | {build_date_version} -->"
    body = f"""
    <body>
        <div class="page-loader"><div class="spinner"></div></div>
        {hero}
        {gallery}
        {footer}
    </body>
    """
    output_file = BUILD_DIR / "index.html"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"<!DOCTYPE html>\n{signature}\n<html lang='en'>\n{head}\n{body}\n</html>")
    logging.info(f"[✓] HTML generated: {output_file}")

    # Rendering legals page
    head_vars["canonical"] = canonical_legals

    legals_vars = site_vars.get("legals", {})
    if legals_vars:
        head = render_template(TEMPLATE_DIR / "head.html", head_vars)

        ip_paragraphs = legals_vars.get("intellectual_property", [])
        paragraphs_html = "\n".join(f"<p>{item['paragraph']}</p>" for item in ip_paragraphs)
        legals_context = {
            "hoster_name": legals_vars.get("hoster_name", ""),
            "hoster_adress": legals_vars.get("hoster_adress", ""),
            "hoster_contact": legals_vars.get("hoster_contact", ""),
            "intellectual_property": paragraphs_html,
        }
        legals_body = render_template(TEMPLATE_DIR / "legals.html", legals_context)
        legals_html = f"<!DOCTYPE html>\n{signature}\n<html lang='en'>\n{head}\n{legals_body}\n{footer}\n</html>"
        output_legals = BUILD_DIR / "legals" / "index.html"
        output_legals.parent.mkdir(parents=True, exist_ok=True)
        with open(output_legals, "w", encoding="utf-8") as f:
            f.write(legals_html)
        logging.info(f"[✓] Legals page generated: {output_legals}")
    else:
        logging.warning("[~] No legals section found in site.yaml")

    # One link-preview page + preview image per gallery photo. og:image and
    # og:url must be absolute for crawlers, hence the canonical URL.
    site_info = site_vars.get("info", {})
    share_pages = 0
    for img in gallery_images:
        photo_id = img.get("photo_id")
        if not photo_id:
            continue
        preview_path = BUILD_DIR / "img" / "share" / f"{photo_id}.jpg"
        size = generate_share_preview(IMG_DIR / original_src_by_photo_id[photo_id], preview_path)
        if not size:
            continue
        page = render_photo_page(
            photo_id,
            site_title=site_info.get("title", ""),
            description=site_info.get("description", ""),
            alt=img.get("alt", ""),
            page_url=f"{canonical_url}/photo/{photo_id}/",
            image_url=f"{canonical_url}/img/share/{photo_id}.jpg",
            image_size=size,
            signature=signature,
        )
        page_path = BUILD_DIR / "photo" / photo_id / "index.html"
        page_path.parent.mkdir(parents=True, exist_ok=True)
        page_path.write_text(page, encoding="utf-8")
        share_pages += 1
    logging.info(f"[✓] Photo share pages generated: {share_pages}")

    # Hero carrousel generator
    if hero_images:
        generate_gallery_json_from_images(hero_images, BUILD_DIR)
    else:
        logging.warning("[~] No hero images found, skipping JSON generation.")

    # Sitemap and robot.txt generator
    site_info = site_vars.get("info", {})
    canonical_url = site_info.get("canonical", "").rstrip("/")
    if canonical_url:
        allowed_pages = ["/", "/legals/"]
        generate_robots_txt(canonical_url, allowed_pages, BUILD_DIR)
        generate_sitemap_xml(canonical_url, allowed_pages, BUILD_DIR)
    else:
        logging.warning(
            "[~] No canonical URL found in site.yaml info section, skipping robots.txt and sitemap.xml generation."
        )

    logging.info("✅ Build complete.")
