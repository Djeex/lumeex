from PIL import Image

from src.py.builder import image_processor as ip


def test_convert_and_resize_image_missing_input_logs_and_skips(tmp_path):
    output_path = tmp_path / "out.webp"
    ip.convert_and_resize_image(tmp_path / "missing.jpg", output_path)
    assert not output_path.exists()


def test_convert_and_resize_image_resizes_down(tmp_path, make_image):
    input_path = make_image(tmp_path / "in.jpg", size=(2000, 1000))
    output_path = tmp_path / "out.webp"

    ip.convert_and_resize_image(input_path, output_path, resize=True, max_width=1000)

    actual_output = output_path if output_path.exists() else output_path.with_suffix(".jpg")
    assert actual_output.exists()
    with Image.open(actual_output) as img:
        assert img.width == 1000
        assert img.height == 500


def test_convert_and_resize_image_no_resize_keeps_dimensions(tmp_path, make_image):
    input_path = make_image(tmp_path / "in.jpg", size=(500, 300))
    output_path = tmp_path / "out.webp"

    ip.convert_and_resize_image(input_path, output_path, resize=False)

    actual_output = output_path if output_path.exists() else output_path.with_suffix(".jpg")
    with Image.open(actual_output) as img:
        assert img.size == (500, 300)


def test_convert_and_resize_image_preserves_icc_profile(tmp_path):
    input_path = tmp_path / "in.jpg"
    icc_bytes = b"fake-icc-profile-bytes"
    Image.new("RGB", (100, 80), (10, 20, 30)).save(input_path, "JPEG", icc_profile=icc_bytes)
    output_path = tmp_path / "out.webp"

    ip.convert_and_resize_image(input_path, output_path, resize=False)

    actual_output = output_path if output_path.exists() else output_path.with_suffix(".jpg")
    with Image.open(actual_output) as img:
        assert img.info.get("icc_profile") == icc_bytes


def test_process_images_updates_src_to_processed_extension(tmp_path, make_image):
    img_dir = tmp_path / "photos"
    build_dir = tmp_path / "output"
    make_image(img_dir / "gallery" / "a.jpg", size=(200, 200))
    images = [{"src": "gallery/a.jpg", "tags": []}]

    ip.process_images(images, resize_images=True, img_dir=img_dir, build_dir=build_dir)

    assert images[0]["src"] in ("gallery/a.webp", "gallery/a.jpg")
    produced = build_dir / "img" / images[0]["src"]
    assert produced.exists()


def test_copy_original_images_copies_existing_and_skips_missing(tmp_path, make_image, caplog):
    img_dir = tmp_path / "photos"
    build_dir = tmp_path / "output"
    make_image(img_dir / "gallery" / "present.jpg")
    images = [{"src": "gallery/present.jpg"}, {"src": "gallery/absent.jpg"}]

    ip.copy_original_images(images, img_dir, build_dir)

    assert (build_dir / "img" / "gallery" / "present.jpg").exists()
    assert not (build_dir / "img" / "gallery" / "absent.jpg").exists()


def test_get_favicon_path_missing_config_returns_none(tmp_path):
    assert ip.get_favicon_path({}, tmp_path) is None


def test_get_favicon_path_relative_and_absolute(tmp_path, make_image):
    theme_dir = tmp_path / "theme"
    icon_path = make_image(theme_dir / "favicon.png", fmt="PNG")

    result = ip.get_favicon_path({"favicon": {"path": "favicon.png"}}, theme_dir)
    assert result == icon_path

    absolute_result = ip.get_favicon_path({"favicon": {"path": str(icon_path)}}, theme_dir)
    assert absolute_result == icon_path


def test_get_favicon_path_file_not_found(tmp_path):
    result = ip.get_favicon_path({"favicon": {"path": "missing.png"}}, tmp_path)
    assert result is None


def test_generate_favicons_from_logo_creates_all_sizes(tmp_path, make_image):
    theme_dir = tmp_path / "theme"
    make_image(theme_dir / "favicon.png", size=(256, 256), fmt="PNG")
    output_dir = tmp_path / "output" / "favicon"

    ip.generate_favicons_from_logo({"favicon": {"path": "favicon.png"}}, theme_dir, output_dir)

    expected = [
        "favicon-32.png",
        "favicon-96.png",
        "favicon-128.png",
        "favicon-192.png",
        "favicon-196.png",
        "favicon-152.png",
        "favicon-180.png",
    ]
    for name in expected:
        assert (output_dir / name).exists()
    with Image.open(output_dir / "favicon-32.png") as img:
        assert img.size == (32, 32)


def test_generate_favicons_from_logo_no_favicon_skips(tmp_path):
    output_dir = tmp_path / "output" / "favicon"
    ip.generate_favicons_from_logo({}, tmp_path, output_dir)
    assert not output_dir.exists()


def test_generate_favicon_ico_creates_file(tmp_path, make_image):
    theme_dir = tmp_path / "theme"
    make_image(theme_dir / "favicon.png", size=(64, 64), fmt="PNG")
    output_path = tmp_path / "output" / "favicon.ico"

    ip.generate_favicon_ico({"favicon": {"path": "favicon.png"}}, theme_dir, output_path)

    assert output_path.exists()
    with Image.open(output_path) as img:
        assert img.format == "ICO"


def test_generate_favicon_ico_no_favicon_skips(tmp_path):
    output_path = tmp_path / "output" / "favicon.ico"
    ip.generate_favicon_ico({}, tmp_path, output_path)
    assert not output_path.exists()


def test_compute_photo_ids_hashes_original_files(tmp_path, make_image):
    import hashlib

    img_dir = tmp_path / "photos"
    a = make_image(img_dir / "gallery" / "a.jpg", color=(1, 2, 3))
    make_image(img_dir / "gallery" / "b.jpg", color=(200, 10, 10))
    images = [{"src": "gallery/a.jpg"}, {"src": "gallery/b.jpg"}, {"src": "gallery/missing.jpg"}]

    ip.compute_photo_ids(images, img_dir)

    assert images[0]["photo_id"] == hashlib.sha256(a.read_bytes()).hexdigest()
    assert len(images[1]["photo_id"]) == 64
    assert images[0]["photo_id"] != images[1]["photo_id"]
    assert "photo_id" not in images[2]


def test_compute_photo_ids_is_independent_of_order_and_name(tmp_path, make_image):
    img_dir = tmp_path / "photos"
    make_image(img_dir / "gallery" / "a.jpg", color=(1, 2, 3))
    (img_dir / "gallery" / "renamed.jpg").write_bytes((img_dir / "gallery" / "a.jpg").read_bytes())
    make_image(img_dir / "gallery" / "b.jpg", color=(9, 9, 9))
    first = [{"src": "gallery/a.jpg"}, {"src": "gallery/b.jpg"}]
    second = [{"src": "gallery/b.jpg"}, {"src": "gallery/renamed.jpg"}]

    ip.compute_photo_ids(first, img_dir)
    ip.compute_photo_ids(second, img_dir)

    assert first[0]["photo_id"] == second[1]["photo_id"]
    assert first[1]["photo_id"] == second[0]["photo_id"]


def test_compute_photo_ids_suffixes_duplicates(tmp_path, make_image):
    img_dir = tmp_path / "photos"
    make_image(img_dir / "gallery" / "a.jpg")
    images = [{"src": "gallery/a.jpg"}, {"src": "gallery/a.jpg"}, {"src": "gallery/a.jpg"}]

    ip.compute_photo_ids(images, img_dir)

    base = images[0]["photo_id"]
    assert images[1]["photo_id"] == f"{base}-2"
    assert images[2]["photo_id"] == f"{base}-3"


def test_generate_share_preview_resizes_to_jpeg(tmp_path, make_image):
    input_path = make_image(tmp_path / "in.png", size=(2400, 1600), fmt="PNG")
    output_path = tmp_path / "share" / "x.jpg"

    size = ip.generate_share_preview(input_path, output_path)

    assert size == (1200, 800)
    with Image.open(output_path) as img:
        assert img.format == "JPEG"
        assert img.size == (1200, 800)


def test_generate_share_preview_converts_embedded_profile_to_srgb(tmp_path):
    from PIL import ImageCms

    input_path = tmp_path / "in.jpg"
    srgb_bytes = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    Image.new("RGB", (300, 200), (10, 200, 30)).save(input_path, "JPEG", icc_profile=srgb_bytes)
    output_path = tmp_path / "out.jpg"

    size = ip.generate_share_preview(input_path, output_path)

    assert size == (300, 200)
    with Image.open(output_path) as img:
        assert img.mode == "RGB"


def test_generate_share_preview_failure_returns_none(tmp_path):
    bad = tmp_path / "bad.jpg"
    bad.write_bytes(b"not an image")
    assert ip.generate_share_preview(bad, tmp_path / "out.jpg") is None
