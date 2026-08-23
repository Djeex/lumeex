import io
import zipfile

import yaml


def test_index_page(client):
    resp = client.get("/")
    assert resp.status_code == 200


def test_get_gallery_and_hero_start_empty(client):
    assert client.get("/api/gallery").get_json() == []
    assert client.get("/api/hero").get_json() == []


def test_update_gallery_and_hero(client, app_env):
    images = [{"src": "gallery/a.jpg", "tags": ["x"]}]
    resp = client.post("/api/gallery/update", json=images)
    assert resp.get_json() == {"status": "ok"}
    assert client.get("/api/gallery").get_json() == images

    hero_images = [{"src": "hero/a.jpg"}]
    resp = client.post("/api/hero/update", json=hero_images)
    assert resp.get_json() == {"status": "ok"}
    assert client.get("/api/hero").get_json() == hero_images


def test_refresh_gallery_and_hero_pick_up_new_files(client, app_env, make_image):
    make_image(app_env / "config" / "photos" / "gallery" / "new.jpg")
    make_image(app_env / "config" / "photos" / "hero" / "new.jpg")

    client.post("/api/gallery/refresh")
    client.post("/api/hero/refresh")

    gallery = client.get("/api/gallery").get_json()
    hero = client.get("/api/hero").get_json()
    assert gallery[0]["src"] == "gallery/new.jpg"
    assert hero[0]["src"] == "hero/new.jpg"


def test_delete_gallery_photo(client, app_env, make_image):
    make_image(app_env / "config" / "photos" / "gallery" / "a.jpg")

    resp = client.post("/api/gallery/delete", json={"src": "a.jpg"})
    assert resp.get_json() == {"status": "ok"}
    assert not (app_env / "config" / "photos" / "gallery" / "a.jpg").exists()


def test_delete_gallery_photo_not_found(client):
    resp = client.post("/api/gallery/delete", json={"src": "missing.jpg"})
    assert resp.status_code == 404


def test_delete_hero_photo(client, app_env, make_image):
    make_image(app_env / "config" / "photos" / "hero" / "a.jpg")

    resp = client.post("/api/hero/delete", json={"src": "a.jpg"})
    assert resp.get_json() == {"status": "ok"}
    assert not (app_env / "config" / "photos" / "hero" / "a.jpg").exists()


def test_delete_all_gallery_photos(client, app_env, make_image):
    make_image(app_env / "config" / "photos" / "gallery" / "a.jpg")
    make_image(app_env / "config" / "photos" / "gallery" / "b.jpg")
    client.post("/api/gallery/update", json=[{"src": "gallery/a.jpg"}, {"src": "gallery/b.jpg"}])

    resp = client.post("/api/gallery/delete_all")

    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["deleted"] == 2
    assert client.get("/api/gallery").get_json() == []
    assert list((app_env / "config" / "photos" / "gallery").iterdir()) == []


def test_delete_all_hero_photos(client, app_env, make_image):
    make_image(app_env / "config" / "photos" / "hero" / "a.jpg")
    client.post("/api/hero/update", json=[{"src": "hero/a.jpg"}])

    resp = client.post("/api/hero/delete_all")

    body = resp.get_json()
    assert body["deleted"] == 1
    assert client.get("/api/hero").get_json() == []


def test_serve_photo_by_section(client, app_env, make_image):
    make_image(app_env / "config" / "photos" / "gallery" / "a.jpg")
    resp = client.get("/photos/gallery/a.jpg")
    assert resp.status_code == 200


def test_serve_photo_at_root(client, app_env, make_image):
    make_image(app_env / "config" / "photos" / "thumbnail.png", fmt="PNG")
    resp = client.get("/photos/thumbnail.png")
    assert resp.status_code == 200


def test_site_info_get_and_post(client, app_env):
    resp = client.get("/api/site-info")
    data = resp.get_json()
    assert data["info"]["title"] == "Test"

    client.post("/api/site-info", json={"info": {"subtitle": "New subtitle"}, "social": {"instagram_url": "https://insta.example"}})

    updated = client.get("/api/site-info").get_json()
    assert updated["info"]["title"] == "Test"
    assert updated["info"]["subtitle"] == "New subtitle"
    assert updated["social"]["instagram_url"] == "https://insta.example"


def test_list_themes(client):
    assert client.get("/api/themes").get_json() == ["modern"]


def test_thumbnail_upload_and_remove(client, app_env):
    data = {"file": (io.BytesIO(b"fake-png-bytes"), "thumb.png")}
    resp = client.post("/api/thumbnail/upload", data=data, content_type="multipart/form-data")
    body = resp.get_json()
    assert body["status"] == "ok"
    assert (app_env / "config" / "photos" / "thumbnail.png").exists()

    site_info = client.get("/api/site-info").get_json()
    assert site_info["social"]["thumbnail"] == "thumbnail.png"

    resp = client.post("/api/thumbnail/remove")
    assert resp.get_json() == {"status": "ok"}
    assert not (app_env / "config" / "photos" / "thumbnail.png").exists()
    site_info = client.get("/api/site-info").get_json()
    assert site_info["social"]["thumbnail"] == ""


def test_thumbnail_upload_missing_file(client):
    resp = client.post("/api/thumbnail/upload", data={}, content_type="multipart/form-data")
    assert resp.status_code == 400


def test_theme_upload_and_remove(client, app_env):
    data = {
        "files": [
            (io.BytesIO(b"colors: {}"), "custom/theme.yaml"),
            (io.BytesIO(b"body{}"), "custom/theme.css"),
        ]
    }
    resp = client.post("/api/theme/upload", data=data, content_type="multipart/form-data")
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["theme"] == "custom"
    assert (app_env / "config" / "themes" / "custom" / "theme.yaml").exists()
    assert (app_env / "config" / "themes" / "custom" / "theme.css").exists()

    resp = client.post("/api/theme/remove", json={"theme": "custom"})
    assert resp.get_json() == {"status": "ok"}
    assert not (app_env / "config" / "themes" / "custom").exists()


def test_theme_remove_protected_theme(client):
    resp = client.post("/api/theme/remove", json={"theme": "modern"})
    assert resp.status_code == 400


def test_theme_remove_missing_theme(client):
    resp = client.post("/api/theme/remove", json={"theme": "does-not-exist"})
    assert resp.status_code == 404


def test_theme_info_get_and_post(client, app_env):
    resp = client.get("/api/theme-info")
    body = resp.get_json()
    assert body["theme_name"] == "modern"
    assert body["theme_yaml"]["favicon"]["path"] == "favicon.png"

    new_theme_yaml = dict(body["theme_yaml"])
    new_theme_yaml["colors"] = {"primary": "#123456"}
    resp = client.post(
        "/api/theme-info",
        json={"theme_name": "modern", "theme_yaml": new_theme_yaml},
    )
    assert resp.get_json() == {"status": "ok"}

    saved = yaml.safe_load((app_env / "config" / "themes" / "modern" / "theme.yaml").read_text())
    assert saved["colors"]["primary"] == "#123456"


def test_update_theme_google_fonts(client, app_env):
    resp = client.post(
        "/api/theme-google-fonts",
        json={"theme_name": "modern", "google_fonts": [{"family": "Lato"}]},
    )
    assert resp.get_json() == {"status": "ok"}

    saved = yaml.safe_load((app_env / "config" / "themes" / "modern" / "theme.yaml").read_text())
    assert saved["google_fonts"] == [{"family": "Lato"}]


def test_local_fonts_empty_then_populated(client, app_env):
    assert client.get("/api/local-fonts?theme=modern").get_json() == []

    fonts_dir = app_env / "config" / "themes" / "modern" / "fonts"
    fonts_dir.mkdir(parents=True)
    (fonts_dir / "trixie.woff2").write_bytes(b"fake")

    assert client.get("/api/local-fonts?theme=modern").get_json() == ["trixie.woff2"]


def test_favicon_upload_invalid_extension(client):
    data = {"theme": "modern", "file": (io.BytesIO(b"not-an-image"), "favicon.txt")}
    resp = client.post("/api/favicon/upload", data=data, content_type="multipart/form-data")
    assert resp.status_code == 400


def test_favicon_upload_and_remove(client, app_env):
    data = {"theme": "modern", "file": (io.BytesIO(b"fake-png"), "favicon.png")}
    resp = client.post("/api/favicon/upload", data=data, content_type="multipart/form-data")
    assert resp.get_json()["status"] == "ok"
    assert (app_env / "config" / "themes" / "modern" / "favicon.png").exists()

    resp = client.post("/api/favicon/remove", json={"theme": "modern"})
    assert resp.get_json() == {"status": "ok"}
    assert not (app_env / "config" / "themes" / "modern" / "favicon.png").exists()


def test_serve_theme_asset(client, app_env):
    (app_env / "config" / "themes" / "modern" / "theme.css").write_text("body{}", encoding="utf-8")
    resp = client.get("/themes/modern/theme.css")
    assert resp.status_code == 200


def test_font_upload_invalid_extension(client):
    data = {"theme": "modern", "file": (io.BytesIO(b"data"), "font.ttf")}
    resp = client.post("/api/font/upload", data=data, content_type="multipart/form-data")
    assert resp.status_code == 400


def test_font_upload_and_remove(client, app_env):
    data = {"theme": "modern", "file": (io.BytesIO(b"data"), "trixie.woff2")}
    resp = client.post("/api/font/upload", data=data, content_type="multipart/form-data")
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["filename"] == "trixie"

    resp = client.post("/api/font/remove", json={"theme": "modern", "font": "trixie.woff2"})
    assert resp.get_json() == {"status": "ok"}


def test_font_remove_missing(client):
    resp = client.post("/api/font/remove", json={"theme": "modern", "font": "missing.woff2"})
    assert resp.status_code == 404


def test_trigger_build_missing_site_yaml(client, app_env):
    (app_env / "config" / "site.yaml").unlink()
    resp = client.post("/api/build")
    assert resp.status_code == 400
    assert "site.yaml not found" in resp.get_json()["message"]


def test_trigger_build_missing_required_field(client, app_env):
    resp = client.post("/api/build")
    assert resp.status_code == 400
    assert "Site info are not set" in resp.get_json()["message"]


def test_trigger_build_success_invokes_subprocess(client, app_env, monkeypatch):
    import src.py.webui.webui as webui

    (app_env / "config" / "site.yaml").write_text(
        "info:\n  title: Test\n  canonical: https://example.com\nsocial:\n  thumbnail: t.png\n",
        encoding="utf-8",
    )

    calls = []
    monkeypatch.setattr(
        webui.subprocess, "run", lambda *a, **k: calls.append((a, k))
    )

    resp = client.post("/api/build")
    assert resp.get_json() == {"status": "ok"}
    assert calls


def test_trigger_build_subprocess_failure_returns_500(client, app_env, monkeypatch):
    import src.py.webui.webui as webui

    (app_env / "config" / "site.yaml").write_text(
        "info:\n  title: Test\n  canonical: https://example.com\nsocial:\n  thumbnail: t.png\n",
        encoding="utf-8",
    )

    def _raise(*a, **k):
        raise RuntimeError("boom")

    monkeypatch.setattr(webui.subprocess, "run", _raise)

    resp = client.post("/api/build")
    assert resp.status_code == 500
    assert "boom" in resp.get_json()["message"]


def test_download_output_zip(client, app_env):
    output_dir = app_env / "output"
    output_dir.mkdir()
    (output_dir / "index.html").write_text("<html></html>", encoding="utf-8")

    resp = client.post("/download-output-zip")

    assert resp.status_code == 200
    zip_bytes = io.BytesIO(resp.data)
    with zipfile.ZipFile(zip_bytes) as zf:
        assert "index.html" in zf.namelist()
    assert not (app_env / "site_output.zip").exists()
