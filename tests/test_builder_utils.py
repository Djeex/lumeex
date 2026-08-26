from src.py.builder import utils


def test_load_yaml_missing_file_returns_empty_dict(tmp_path, caplog):
    result = utils.load_yaml(tmp_path / "missing.yaml")
    assert result == {}


def test_load_yaml_parses_existing_file(tmp_path):
    path = tmp_path / "data.yaml"
    path.write_text("foo: bar\nnum: 1\n", encoding="utf-8")
    assert utils.load_yaml(path) == {"foo": "bar", "num": 1}


def test_load_theme_config_success(tmp_path):
    themes_dir = tmp_path / "themes"
    theme_dir = themes_dir / "modern"
    theme_dir.mkdir(parents=True)
    (theme_dir / "theme.yaml").write_text("colors:\n  primary: '#000'\n", encoding="utf-8")

    theme_vars, returned_dir = utils.load_theme_config("modern", themes_dir)

    assert theme_vars == {"colors": {"primary": "#000"}}
    assert returned_dir == theme_dir


def test_load_theme_config_missing_raises(tmp_path):
    themes_dir = tmp_path / "themes"
    try:
        utils.load_theme_config("missing", themes_dir)
        raise AssertionError("expected FileNotFoundError")
    except FileNotFoundError:
        pass


def test_clear_dir_creates_missing_dir(tmp_path):
    target = tmp_path / "out"
    utils.clear_dir(target)
    assert target.is_dir()
    assert list(target.iterdir()) == []


def test_clear_dir_removes_existing_content(tmp_path):
    target = tmp_path / "out"
    target.mkdir()
    (target / "file.txt").write_text("x", encoding="utf-8")
    sub = target / "sub"
    sub.mkdir()
    (sub / "nested.txt").write_text("y", encoding="utf-8")

    utils.clear_dir(target)

    assert target.is_dir()
    assert list(target.iterdir()) == []


def test_ensure_dir_creates_and_clears(tmp_path):
    target = tmp_path / "out"
    utils.ensure_dir(target)
    assert target.is_dir()

    (target / "stale.txt").write_text("x", encoding="utf-8")
    utils.ensure_dir(target)
    assert list(target.iterdir()) == []


def test_copy_assets_copies_existing_folders(tmp_path):
    js_dir = tmp_path / "js"
    style_dir = tmp_path / "style"
    build_dir = tmp_path / "output"
    js_dir.mkdir()
    style_dir.mkdir()
    (js_dir / "app.js").write_text("console.log(1)", encoding="utf-8")
    (style_dir / "style.css").write_text("body{}", encoding="utf-8")

    utils.copy_assets(js_dir, style_dir, build_dir)

    assert (build_dir / "js" / "app.js").exists()
    assert (build_dir / "style" / "style.css").exists()


def test_copy_assets_skips_missing_folder(tmp_path, caplog):
    js_dir = tmp_path / "missing_js"
    style_dir = tmp_path / "style"
    style_dir.mkdir()
    build_dir = tmp_path / "output"

    utils.copy_assets(js_dir, style_dir, build_dir)

    assert not (build_dir / "missing_js").exists()
    assert (build_dir / "style").exists()
