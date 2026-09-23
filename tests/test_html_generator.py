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


def test_render_gallery_images_adds_photo_id_when_present():
    html = hg.render_gallery_images(
        [{"src": "gallery/a.jpg", "photo_id": "abc123"}, {"src": "gallery/b.jpg"}]
    )

    assert html.count("data-photo-id=") == 1
    assert 'data-photo-id="abc123"' in html


def _photo_page(**overrides):
    kwargs = {
        "photo_id": "ab12",
        "site_title": "My photos",
        "description": "A gallery",
        "alt": "Sunset",
        "page_url": "https://example.com/photo/ab12/",
        "image_url": "https://example.com/img/share/ab12.jpg",
        "image_size": (1200, 800),
        "signature": "<!-- sig -->",
    }
    kwargs.update(overrides)
    return hg.render_photo_page(**kwargs)


def test_render_photo_page_preview_tags_and_noindex():
    page = _photo_page()

    assert '<meta name="robots" content="noindex, follow">' in page
    assert '<meta property="og:image" content="https://example.com/img/share/ab12.jpg" />' in page
    assert '<meta property="og:url" content="https://example.com/photo/ab12/" />' in page
    assert '<meta property="og:image:width" content="1200" />' in page
    assert "<title>Sunset - My photos</title>" in page
    assert 'rel="canonical"' not in page


def test_render_photo_page_redirects_to_gallery():
    page = _photo_page()

    assert 'location.replace("/?photo=ab12")' in page
    assert '<a href="/?photo=ab12">' in page


def test_render_photo_page_escapes_text():
    page = _photo_page(alt="", site_title='"><script>alert(1)</script>')

    assert "<script>alert(1)" not in page
    assert "<title>&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>" in page


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
