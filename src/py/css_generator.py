import logging
from pathlib import Path
from shutil import copyfile

def generate_css_variables(colors_dict, output_path):
    css_lines = [":root {"]
    for key, value in colors_dict.items():
        css_lines.append(f"  --color-{key.replace('_', '-')}: {value};")
    css_lines.append("}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(css_lines))
    logging.info(f"[✓] CSS variables written to {output_path}")

def generate_fonts_css(fonts_dir, output_path, fonts_cfg=None):
    font_files = list(fonts_dir.glob("*"))
    font_faces = {}
    preload_links = []
    format_map = {".woff2": "woff2", ".woff": "woff", ".ttf": "truetype", ".otf": "opentype"}

    for font_file in font_files:
        name = font_file.stem
        ext = font_file.suffix.lower()
        if ext not in format_map:
            continue
        font_faces.setdefault(name, []).append((font_file.name, format_map[ext]))
        dest_font_path = output_path.parent.parent / "fonts" / font_file.name
        dest_font_path.parent.mkdir(parents=True, exist_ok=True)
        copyfile(font_file, dest_font_path)
        preload_links.append(
            f'<link rel="preload" href="fonts/{font_file.name}" as="font" type="font/{format_map[ext]}" crossorigin>'
        )

    css_lines = []
    for font_name, sources in font_faces.items():
        css_lines.append(f"@font-face {{")
        css_lines.append(f"  font-family: '{font_name}';")
        srcs = [f"url('../fonts/{file}') format('{fmt}')" for file, fmt in sorted(sources)]
        css_lines.append(f"  src: {', '.join(srcs)};")
        css_lines.append("  font-weight: normal;")
        css_lines.append("  font-style: normal;")
        css_lines.append("}")

    if fonts_cfg:
        css_lines.append(":root {")
        if "primary" in fonts_cfg:
            p = fonts_cfg["primary"]
            css_lines.append(f"  --font-primary: '{p['name']}', {p['fallback']};")
        if "secondary" in fonts_cfg:
            s = fonts_cfg["secondary"]
            css_lines.append(f"  --font-secondary: '{s['name']}', {s['fallback']};")
        css_lines.append("}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n\n".join(css_lines), encoding="utf-8")
    logging.info(f"[✓] Generated fonts CSS: {output_path}")
    return preload_links

def generate_google_fonts_link(fonts):
    if not fonts:
        return ""
    families = []
    for font in fonts:
        family = font["family"].replace(" ", "+")
        weights = font.get("weights", [])
        if weights:
            families.append(f"{family}:wght@{';'.join(weights)}")
        else:
            families.append(family)
    href = "https://fonts.googleapis.com/css2?" + "&".join(f"family={f}" for f in families) + "&display=swap"
    return f'<link href="{href}" rel="stylesheet">'
