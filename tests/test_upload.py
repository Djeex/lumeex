import io

from src.py.webui.upload import allowed_file, save_uploaded_file


def test_allowed_file_accepts_known_extensions():
    for name in ["a.jpg", "a.JPEG", "a.png", "a.webp"]:
        assert allowed_file(name) is True


def test_allowed_file_rejects_unknown_or_missing_extension():
    assert allowed_file("a.gif") is False
    assert allowed_file("noextension") is False


def test_save_uploaded_file_sanitizes_filename(tmp_path):
    class FakeFile:
        filename = "../../evil.jpg"

        def save(self, path):
            self.saved_path = path

    folder = tmp_path / "gallery"
    fake_file = FakeFile()

    result = save_uploaded_file(fake_file, folder)

    assert result == "evil.jpg"
    assert fake_file.saved_path == folder / "evil.jpg"
    assert folder.exists()


def test_upload_photo_invalid_section(client):
    resp = client.post(
        "/api/invalid/upload",
        data={"files": (io.BytesIO(b"data"), "a.jpg")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 400


def test_upload_photo_no_files_key(client):
    resp = client.post("/api/gallery/upload", data={}, content_type="multipart/form-data")
    assert resp.status_code == 400


def test_upload_photo_skips_disallowed_extensions(client):
    resp = client.post(
        "/api/gallery/upload",
        data={"files": (io.BytesIO(b"data"), "notes.txt")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 400
    assert "No valid files uploaded" in resp.get_json()["error"]


def test_upload_photo_saves_valid_files_and_updates_gallery(client, app_env):
    resp = client.post(
        "/api/gallery/upload",
        data={"files": (io.BytesIO(b"fake-jpg-bytes"), "photo.jpg")},
        content_type="multipart/form-data",
    )
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["uploaded"] == ["photo.jpg"]
    assert (app_env / "config" / "photos" / "gallery" / "photo.jpg").exists()

    gallery = client.get("/api/gallery").get_json()
    assert gallery[0]["src"] == "gallery/photo.jpg"


def test_upload_photo_hero_section(client, app_env):
    resp = client.post(
        "/api/hero/upload",
        data={"files": (io.BytesIO(b"fake-jpg-bytes"), "photo.jpg")},
        content_type="multipart/form-data",
    )
    assert resp.get_json()["status"] == "ok"
    assert (app_env / "config" / "photos" / "hero" / "photo.jpg").exists()

    hero = client.get("/api/hero").get_json()
    assert hero[0]["src"] == "hero/photo.jpg"
