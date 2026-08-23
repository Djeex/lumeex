from src.py.builder import css_generator as cg


def test_generate_css_variables(tmp_path):
    output_path = tmp_path / "style" / "colors.css"
    cg.generate_css_variables({"primary_dark": "#005384", "accent": "#FFC700"}, output_path)

    content = output_path.read_text(encoding="utf-8")
    assert ":root {" in content
    assert "--color-primary-dark: #005384;" in content
    assert "--color-accent: #FFC700;" in content


def test_generate_fonts_css_with_font_files_and_config(tmp_path):
    fonts_dir = tmp_path / "theme" / "fonts"
    fonts_dir.mkdir(parents=True)
    (fonts_dir / "trixie.woff2").write_bytes(b"fake-woff2")
    (fonts_dir / "trixie.woff").write_bytes(b"fake-woff")
    (fonts_dir / "readme.txt").write_text("skip me", encoding="utf-8")

    output_path = tmp_path / "build" / "style" / "fonts.css"
    fonts_cfg = {
        "primary": {"name": "Lato", "fallback": "sans-serif"},
        "secondary": {"name": "Trixie", "fallback": "monospace"},
    }

    preload_links = cg.generate_fonts_css(fonts_dir, output_path, fonts_cfg=fonts_cfg)

    content = output_path.read_text(encoding="utf-8")
    assert "@font-face {" in content
    assert "font-family: 'trixie';" in content
    assert "--font-primary: 'Lato', sans-serif;" in content
    assert "--font-secondary: 'Trixie', monospace;" in content

    assert (tmp_path / "build" / "fonts" / "trixie.woff2").exists()
    assert (tmp_path / "build" / "fonts" / "trixie.woff").exists()
    assert len(preload_links) == 2
    assert any("trixie.woff2" in link for link in preload_links)


def test_generate_fonts_css_with_no_fonts(tmp_path):
    fonts_dir = tmp_path / "empty_fonts"
    fonts_dir.mkdir()
    output_path = tmp_path / "build" / "fonts.css"

    preload_links = cg.generate_fonts_css(fonts_dir, output_path)

    assert preload_links == []
    assert output_path.exists()


def test_generate_google_fonts_link_empty():
    assert cg.generate_google_fonts_link([]) == ""
    assert cg.generate_google_fonts_link(None) == ""


def test_generate_google_fonts_link_with_weights():
    fonts = [
        {"family": "Lato", "weights": ["200", "400", "700"]},
        {"family": "Open Sans"},
    ]

    link = cg.generate_google_fonts_link(fonts)

    assert "family=Lato:wght@200;400;700" in link
    assert "family=Open+Sans" in link
    assert link.startswith('<link href="https://fonts.googleapis.com/css2?')
    assert link.endswith('&display=swap" rel="stylesheet">')
