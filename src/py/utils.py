import yaml
import logging
from pathlib import Path
from shutil import copytree, rmtree, copyfile

def load_yaml(path):
    """Load gallery and site .yaml conf"""
    if not path.exists():
        logging.warning(f"[!] YAML file not found: {path}")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def load_theme_config(theme_name, themes_dir):
    """Load theme.yaml"""
    theme_dir = themes_dir / theme_name
    theme_config_path = theme_dir / "theme.yaml"
    if not theme_config_path.exists():
        raise FileNotFoundError(f"[✗] Theme config not found: {theme_config_path}")
    with open(theme_config_path, "r", encoding="utf-8") as f:
        theme_vars = yaml.safe_load(f)
    return theme_vars, theme_dir

def clear_dir(path: Path):
    """Clear the output dir"""
    if not path.exists():
        path.mkdir(parents=True)
        return
    for child in path.iterdir():
        if child.is_file() or child.is_symlink():
            child.unlink()
        elif child.is_dir():
            rmtree(child)

def ensure_dir(path: Path):
    """Create the output dir if it does not exist"""
    if not path.exists():
        path.mkdir(parents=True)
    else:
        clear_dir(path)

def copy_assets(js_dir, style_dir, build_dir):
    """Copy public assets to output dir"""
    for folder in [js_dir, style_dir]:
        if folder.exists():
            dest = build_dir / folder.name
            copytree(folder, dest)
            logging.info(f"[✓] Copied assets from {folder.name}")
        else:
            logging.warning(f"[~] Skipped missing folder: {folder.name}")
