import json
import logging
from pathlib import Path

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
        html += f"""
        <div class="section" data-tags="{tags}">
            <div class="tags">{tag_html}</div>
            <img class="fade-in-img lazyload" data-src="/img/{img['src']}" alt="{img.get('alt', '')}" loading="lazy">
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
    urlset_end = '</urlset>\n'
    urls = ""
    for path in allowed_paths:
        loc = canonical_url.rstrip("/") + path
        urls += f"  <url>\n    <loc>{loc}</loc>\n  </url>\n"
    sitemap_content = urlset_start + urls + urlset_end
    output_path = output_dir / "sitemap.xml"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(sitemap_content)
    logging.info(f"[✓] sitemap.xml generated at {output_path}")
