import json
import logging
from html import escape
from pathlib import Path
from urllib.parse import quote


def render_template(template_path, context):
    """Render html templates"""
    with open(template_path, encoding="utf-8") as f:
        content = f.read()
    for key, value in context.items():
        placeholder = "{{ " + key + " }}"
        content = content.replace(placeholder, str(value) if value is not None else "")
    return content


def render_gallery_images(images):
    """Render the photo gallery"""
    html = ""
    for img in images:
        tags = " ".join(img.get("tags", []))
        tag_html = "".join(f'<span class="tag">#{t}</span>' for t in img.get("tags", []))
        # data-photo-id is what js/lumeex.js's photo menu builds the permalink from
        photo_id = img.get("photo_id")
        photo_id_attr = f' data-photo-id="{photo_id}"' if photo_id else ""
        html += f"""
        <div class="section" data-tags="{tags}"{photo_id_attr}>
            <div class="tags">{tag_html}</div>
            <img class="fade-in-img lazyload" data-src="/img/{img["src"]}" alt="{img.get("alt", "")}" loading="lazy">
        </div>
        """
    return html


def generate_gallery_json_from_images(images, output_dir):
    """Generte the hero carrousel photo list"""
    try:
        img_list = [img["src"] for img in images]
        output_path = output_dir / "data" / "gallery.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(img_list, f, indent=2)
        logging.info(f"[✓] Generated hero gallery JSON: {output_path}")
    except Exception as e:
        logging.error(f"[✗] Error generating gallery JSON: {e}")


def generate_robots_txt(canonical_url, allowed_paths, output_dir):
    """Generate the robot.txt"""
    robots_lines = ["User-agent: *"]

    # Block everything by default
    robots_lines.append("Disallow: /")

    # Explicitly allow certain paths
    for path in allowed_paths:
        if not path.startswith("/"):
            path = "/" + path
        robots_lines.append(f"Allow: {path}")

    robots_lines.append("")
    robots_lines.append(f"Sitemap: {canonical_url.rstrip('/')}/sitemap.xml")

    content = "\n".join(robots_lines)
    output_path = Path(output_dir) / "robots.txt"

    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        logging.info(f"[✓] robots.txt generated at {output_path}")

    except Exception as e:
        logging.error(f"[✗] Failed to write robots.txt: {e}")


def generate_sitemap_xml(canonical_url, allowed_paths, output_dir):
    """Generate the sitemap"""
    urlset_start = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    urlset_end = "</urlset>\n"
    urls = ""
    for path in allowed_paths:
        loc = canonical_url.rstrip("/") + path
        urls += f"  <url>\n    <loc>{loc}</loc>\n  </url>\n"
    sitemap_content = urlset_start + urls + urlset_end
    output_path = output_dir / "sitemap.xml"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(sitemap_content)
    logging.info(f"[✓] sitemap.xml generated at {output_path}")


def render_photo_page(
    photo_id, site_title, description, alt, page_url, image_url, image_size, signature
):
    """
    photo/<id>/index.html: the page a copied/shared photo link points at.
    Link-preview crawlers read its og:/twitter: tags (without running
    scripts) and show this photo; visitors are sent on to the gallery with
    ?photo=<id>. Kept out of search results with noindex rather than
    robots.txt, since preview crawlers such as Twitterbot honour robots.txt
    and would then never read the tags.
    """
    title = f"{alt} - {site_title}" if alt else site_title
    gallery_href = f"/?photo={quote(photo_id)}"
    width, height = image_size
    t = escape(title)
    return f"""<!DOCTYPE html>
{signature}
<html lang='en'>
<head>
    <meta charset="utf-8">
    <title>{t}</title>
    <meta name="robots" content="noindex, follow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <meta name="description" content="{escape(description)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="{escape(site_title)}" />
    <meta property="og:title" content="{t}" />
    <meta property="og:description" content="{escape(description)}" />
    <meta property="og:url" content="{escape(page_url)}" />
    <meta property="og:image" content="{escape(image_url)}" />
    <meta property="og:image:width" content="{width}" />
    <meta property="og:image:height" content="{height}" />
    <meta property="og:image:alt" content="{escape(alt)}" />
    <script>location.replace({json.dumps(gallery_href)});</script>
</head>
<body>
    <p><a href="{escape(gallery_href)}">{t}</a></p>
</body>
</html>"""
