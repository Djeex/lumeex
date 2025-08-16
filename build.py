import logging
from src.py.builder.site_builder import build

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build()