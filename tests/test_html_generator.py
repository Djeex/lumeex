import json

from src.py.builder import html_generator as hg


def test_render_template_replaces_placeholders(tmp_path):
    template = tmp_path / "t.html"
    template.write_text("<h1>{{ title }}</h1><p>{{ missing }}</p>", encoding="utf-8")

    result = hg.render_template(template, {"title": "Hello", "missing": None})

    assert result == "<h1>Hello</h1><p></p>"


def test_render_template_leaves_unknown_placeholders(tmp_path):
    template = tmp_path / "t.html"
    template.write_text("<h1>{{ title }}</h1>", encoding="utf-8")

    result = hg.render_template(template, {})

    assert result == "<h1>{{ title }}</h1>"


def test_render_gallery_images_with_and_without_tags():
    images = [
        {"src": "gallery/a.jpg", "tags": ["nature", "sky"], "alt": "A photo"},
        {"src": "gallery/b.jpg"},
    ]

    html = hg.render_gallery_images(images)

    assert 'data-tags="nature sky"' in html
    assert '<span class="tag">#nature</span>' in html
    assert '<span class="tag">#sky</span>' in html
    assert 'data-src="/img/gallery/a.jpg"' in html
    assert 'alt="A photo"' in html
    assert 'data-tags=""' in html
    assert 'data-src="/img/gallery/b.jpg"' in html
    assert 'alt=""' in html


def test_generate_gallery_json_from_images(tmp_path):
    images = [{"src": "hero/a.jpg"}, {"src": "hero/b.jpg"}]

    hg.generate_gallery_json_from_images(images, tmp_path)

    output_path = tmp_path / "data" / "gallery.json"
    assert json.loads(output_path.read_text(encoding="utf-8")) == ["hero/a.jpg", "hero/b.jpg"]


def test_generate_robots_txt(tmp_path):
    hg.generate_robots_txt("https://example.com/", ["/", "legals"], tmp_path)

    content = (tmp_path / "robots.txt").read_text(encoding="utf-8")
    assert "Disallow: /" in content
    assert "Allow: /" in content
    assert "Allow: /legals" in content
    assert "Sitemap: https://example.com/sitemap.xml" in content


def test_generate_sitemap_xml(tmp_path):
    hg.generate_sitemap_xml("https://example.com", ["/", "/legals/"], tmp_path)

    content = (tmp_path / "sitemap.xml").read_text(encoding="utf-8")
    assert "<loc>https://example.com/</loc>" in content
    assert "<loc>https://example.com/legals/</loc>" in content
    assert content.startswith('<?xml version="1.0" encoding="UTF-8"?>')
