import logging
from src.py.gallery_builder import update_gallery, update_hero

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    update_gallery()
    update_hero()