import yaml
import logging
from pathlib import Path
from shutil import copytree, rmtree, copyfile

def load_yaml(path):
    if not path.exists():
        logging.warning(f"[!] YAML file not found: {path}")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def load_theme_config(theme_name, themes_dir):
    theme_dir = themes_dir / theme_name
    theme_config_path = theme_dir / "theme.yaml"
    if not theme_config_path.exists():
        raise FileNotFoundError(f"[✗] Theme config not found: {theme_config_path}")
    with open(theme_config_path, "r", encoding="utf-8") as f:
        theme_vars = yaml.safe_load(f)
    return theme_vars, theme_dir

def ensure_dir(path):
    if path.exists():
        rmtree(path)
    path.mkdir(parents=True)

def copy_assets(js_dir, style_dir, build_dir):
    for folder in [js_dir, style_dir]:
        if folder.exists():
            dest = build_dir / folder.name
            copytree(folder, dest)
            logging.info(f"[✓] Copied assets from {folder.name}")
        else:
            logging.warning(f"[~] Skipped missing folder: {folder.name}")
