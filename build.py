import logging
from src.py.builder import build

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build()