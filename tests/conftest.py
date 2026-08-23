from pathlib import Path

import pytest
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
DEMO_ROOT = REPO_ROOT / "demo" / "config"


@pytest.fixture
def repo_root():
    return REPO_ROOT


@pytest.fixture
def demo_root():
    return DEMO_ROOT


@pytest.fixture
def make_image():
    """Factory that writes a small real image to disk and returns its path."""

    def _make(path: Path, size=(64, 48), color=(200, 100, 50), fmt="JPEG", **save_kwargs):
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", size, color).save(path, fmt, **save_kwargs)
        return path

    return _make


@pytest.fixture
def app_env(tmp_path, monkeypatch, make_image):
    """
    Isolate the Flask webui from the real repo filesystem.

    webui.py resolves most config paths from `Path(__file__).resolve().parents[3]`
    (recomputed inline in most routes) or from module-level globals computed once
    at import time (PHOTOS_DIR, SITE_YAML). We patch `__file__` so inline lookups
    land in a throwaway tmp_path repo skeleton, patch the two import-time globals
    directly, and chdir so the plain-relative paths used by gallery_builder
    (GALLERY_YAML, GALLERY_DIR, HERO_DIR) resolve there too.
    """
    import src.py.webui.webui as webui

    root = tmp_path
    (root / "config" / "photos" / "gallery").mkdir(parents=True)
    (root / "config" / "photos" / "hero").mkdir(parents=True)

    theme_dir = root / "config" / "themes" / "modern"
    theme_dir.mkdir(parents=True)
    (theme_dir / "theme.yaml").write_text(
        "colors:\n  browser_color: '#ffffff'\n"
        "favicon:\n  path: favicon.png\n"
        "google_fonts: []\n",
        encoding="utf-8",
    )
    make_image(theme_dir / "favicon.png", size=(32, 32), fmt="PNG")

    (root / "config" / "gallery.yaml").write_text(
        "hero:\n  images: []\ngallery:\n  images: []\n", encoding="utf-8"
    )
    (root / "config" / "site.yaml").write_text(
        "info:\n  title: Test\n  canonical: https://example.com\n"
        "social:\n  thumbnail: ''\n",
        encoding="utf-8",
    )

    fake_module_file = root / "src" / "py" / "webui" / "webui.py"
    fake_module_file.parent.mkdir(parents=True, exist_ok=True)

    monkeypatch.chdir(root)
    monkeypatch.setattr(webui, "__file__", str(fake_module_file))
    monkeypatch.setattr(webui, "PHOTOS_DIR", root / "config" / "photos")
    monkeypatch.setattr(webui, "SITE_YAML", root / "config" / "site.yaml")
    webui.app.config["PHOTOS_DIR"] = root / "config" / "photos"
    webui.app.config["TESTING"] = True

    return root


@pytest.fixture
def client(app_env):
    import src.py.webui.webui as webui

    return webui.app.test_client()
