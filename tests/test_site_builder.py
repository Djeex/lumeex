import yaml

from src.py.builder import site_builder


def test_build_end_to_end_with_demo_content(tmp_path, monkeypatch, demo_root):
    output_dir = tmp_path / "output"
    monkeypatch.setattr(site_builder, "BUILD_DIR", output_dir)
    monkeypatch.setattr(site_builder, "GALLERY_FILE", demo_root / "gallery.yaml")
    monkeypatch.setattr(site_builder, "SITE_FILE", demo_root / "site.yaml")
    monkeypatch.setattr(site_builder, "IMG_DIR", demo_root / "photos")
    monkeypatch.setattr(site_builder, "THEMES_DIR", demo_root / "themes")

    site_builder.build()

    index_html = (output_dir / "index.html").read_text(encoding="utf-8")
    assert "<h1>Lumeex</h1>" in index_html
    assert "https://lumeex.djeex.fr/" in index_html
    assert '<img class="fade-in-img lazyload"' in index_html

    assert (output_dir / "legals" / "index.html").exists()
    assert (output_dir / "robots.txt").exists()
    assert (output_dir / "sitemap.xml").exists()
    assert (output_dir / "data" / "gallery.json").exists()
    assert (output_dir / "style" / "colors.css").exists()
    assert (output_dir / "style" / "fonts.css").exists()
    assert (output_dir / "style" / "theme.css").exists()
    assert (output_dir / "favicon.ico").exists()
    assert (output_dir / "img" / "favicon" / "favicon-192.png").exists()
    assert (output_dir / "img" / "social").is_dir()
    assert any((output_dir / "img" / "social").iterdir())

    # convert_images=true in the demo config: originals become webp (or jpg fallback)
    processed = list((output_dir / "img" / "gallery").glob("*"))
    assert processed
    assert all(p.suffix in (".webp", ".jpg") for p in processed)


def test_build_generates_photo_share_pages(tmp_path, monkeypatch, demo_root):
    import hashlib
    import re

    output_dir = tmp_path / "output"
    monkeypatch.setattr(site_builder, "BUILD_DIR", output_dir)
    monkeypatch.setattr(site_builder, "GALLERY_FILE", demo_root / "gallery.yaml")
    monkeypatch.setattr(site_builder, "SITE_FILE", demo_root / "site.yaml")
    monkeypatch.setattr(site_builder, "IMG_DIR", demo_root / "photos")
    monkeypatch.setattr(site_builder, "THEMES_DIR", demo_root / "themes")

    site_builder.build()

    gallery = yaml.safe_load((demo_root / "gallery.yaml").read_text(encoding="utf-8"))
    sources = [img["src"] for img in gallery["gallery"]["images"]]
    index_html = (output_dir / "index.html").read_text(encoding="utf-8")
    ids = re.findall(r'data-photo-id="([^"]+)"', index_html)
    assert len(ids) == len(sources)
    first_hash = hashlib.sha256((demo_root / "photos" / sources[0]).read_bytes()).hexdigest()
    assert ids[0] == first_hash

    page = (output_dir / "photo" / first_hash / "index.html").read_text(encoding="utf-8")
    assert f'content="https://lumeex.djeex.fr/img/share/{first_hash}.jpg"' in page
    assert 'content="noindex, follow"' in page
    assert (output_dir / "img" / "share" / f"{first_hash}.jpg").exists()
    assert len(list((output_dir / "photo").iterdir())) == len(set(ids))
    assert "/photo/" not in (output_dir / "sitemap.xml").read_text(encoding="utf-8")


def test_build_without_image_conversion_copies_originals(tmp_path, monkeypatch, demo_root):
    site_data = yaml.safe_load((demo_root / "site.yaml").read_text(encoding="utf-8"))
    site_data["build"]["convert_images"] = False
    site_data["build"]["resize_images"] = False
    site_file = tmp_path / "site.yaml"
    site_file.write_text(yaml.dump(site_data), encoding="utf-8")

    output_dir = tmp_path / "output"
    monkeypatch.setattr(site_builder, "BUILD_DIR", output_dir)
    monkeypatch.setattr(site_builder, "GALLERY_FILE", demo_root / "gallery.yaml")
    monkeypatch.setattr(site_builder, "SITE_FILE", site_file)
    monkeypatch.setattr(site_builder, "IMG_DIR", demo_root / "photos")
    monkeypatch.setattr(site_builder, "THEMES_DIR", demo_root / "themes")

    site_builder.build()

    copied = list((output_dir / "img" / "gallery").glob("*.jpg"))
    assert copied, "original jpg files should be copied unmodified"


def test_build_minimal_site_skips_optional_sections(tmp_path, monkeypatch, demo_root):
    gallery_file = tmp_path / "gallery.yaml"
    gallery_file.write_text("hero:\n  images: []\ngallery:\n  images: []\n", encoding="utf-8")

    site_file = tmp_path / "site.yaml"
    site_file.write_text(
        "info:\n  title: Minimal\n"
        "menu:\n  items: []\n"
        "build:\n  theme: modern\n  convert_images: true\n  resize_images: true\n",
        encoding="utf-8",
    )

    output_dir = tmp_path / "output"
    monkeypatch.setattr(site_builder, "BUILD_DIR", output_dir)
    monkeypatch.setattr(site_builder, "GALLERY_FILE", gallery_file)
    monkeypatch.setattr(site_builder, "SITE_FILE", site_file)
    monkeypatch.setattr(site_builder, "IMG_DIR", demo_root / "photos")
    monkeypatch.setattr(site_builder, "THEMES_DIR", demo_root / "themes")

    site_builder.build()

    assert (output_dir / "index.html").exists()
    assert not (output_dir / "legals").exists()
    assert not (output_dir / "robots.txt").exists()
    assert not (output_dir / "sitemap.xml").exists()
    assert not (output_dir / "data" / "gallery.json").exists()
    assert not (output_dir / "img" / "social").exists()
