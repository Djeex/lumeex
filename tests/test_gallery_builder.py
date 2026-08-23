import yaml

from src.py.builder import gallery_builder as gb


def _setup_repo(tmp_path, monkeypatch):
    (tmp_path / "config" / "photos" / "gallery").mkdir(parents=True)
    (tmp_path / "config" / "photos" / "hero").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)


def test_load_yaml_missing_file(tmp_path, monkeypatch):
    _setup_repo(tmp_path, monkeypatch)
    assert gb.load_yaml("config/gallery.yaml") == {}


def test_load_yaml_and_save_yaml_roundtrip(tmp_path, monkeypatch):
    _setup_repo(tmp_path, monkeypatch)
    data = {"gallery": {"images": [{"src": "gallery/a.jpg", "tags": ["x"]}]}}
    gb.save_yaml(data, "config/gallery.yaml")

    loaded = gb.load_yaml("config/gallery.yaml")
    assert loaded == data


def test_get_all_image_paths_filters_and_sorts(tmp_path, monkeypatch, make_image):
    _setup_repo(tmp_path, monkeypatch)
    gallery_dir = tmp_path / "config" / "photos" / "gallery"
    make_image(gallery_dir / "b.jpg")
    make_image(gallery_dir / "a.png", fmt="PNG")
    (gallery_dir / "notes.txt").write_text("ignore me", encoding="utf-8")

    paths = gb.get_all_image_paths(gallery_dir)

    assert paths == ["gallery/a.png", "gallery/b.jpg"]


def test_update_gallery_adds_new_and_removes_deleted(tmp_path, monkeypatch, make_image, capsys):
    _setup_repo(tmp_path, monkeypatch)
    gallery_dir = tmp_path / "config" / "photos" / "gallery"
    make_image(gallery_dir / "kept.jpg")
    make_image(gallery_dir / "new.jpg")

    gb.save_yaml(
        {
            "gallery": {
                "images": [
                    {"src": "gallery/kept.jpg", "tags": ["portrait"]},
                    {"src": "gallery/gone.jpg", "tags": ["stale"]},
                ]
            }
        },
        gb.GALLERY_YAML,
    )

    gb.update_gallery()

    result = gb.load_yaml(gb.GALLERY_YAML)
    images = {img["src"]: img for img in result["gallery"]["images"]}
    assert set(images) == {"gallery/kept.jpg", "gallery/new.jpg"}
    assert images["gallery/kept.jpg"]["tags"] == ["portrait"]
    assert images["gallery/new.jpg"]["tags"] == []


def test_update_gallery_no_changes(tmp_path, monkeypatch, make_image, capsys):
    _setup_repo(tmp_path, monkeypatch)
    gallery_dir = tmp_path / "config" / "photos" / "gallery"
    make_image(gallery_dir / "only.jpg")
    gb.save_yaml(
        {"gallery": {"images": [{"src": "gallery/only.jpg", "tags": []}]}},
        gb.GALLERY_YAML,
    )

    gb.update_gallery()

    out = capsys.readouterr().out
    assert "No changes to gallery.yaml (gallery)" in out


def test_update_hero_adds_new_and_removes_deleted(tmp_path, monkeypatch, make_image):
    _setup_repo(tmp_path, monkeypatch)
    hero_dir = tmp_path / "config" / "photos" / "hero"
    make_image(hero_dir / "kept.jpg")
    make_image(hero_dir / "new.jpg")

    gb.save_yaml(
        {
            "hero": {
                "images": [
                    {"src": "hero/kept.jpg"},
                    {"src": "hero/gone.jpg"},
                ]
            }
        },
        gb.GALLERY_YAML,
    )

    gb.update_hero()

    result = gb.load_yaml(gb.GALLERY_YAML)
    srcs = {img["src"] for img in result["hero"]["images"]}
    assert srcs == {"hero/kept.jpg", "hero/new.jpg"}


def test_update_gallery_on_empty_yaml_initializes_section(tmp_path, monkeypatch, make_image):
    _setup_repo(tmp_path, monkeypatch)
    gallery_dir = tmp_path / "config" / "photos" / "gallery"
    make_image(gallery_dir / "only.jpg")

    gb.update_gallery()

    result = gb.load_yaml(gb.GALLERY_YAML)
    assert result["gallery"]["images"][0]["src"] == "gallery/only.jpg"
