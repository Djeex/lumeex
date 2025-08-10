<h1 align="center">Lumeex</h1>
<div align="center" >
    <img src="https://git.djeex.fr/Djeex/lumeex/raw/branch/main/illustration/lumeex.png" alt="Lumeex Screenshot">
</div>

**Lumeex** - Yet another minimalist very light photo gallery with a static site generator.

Lumeex is a static site generator that builds a minimalist photo gallery. The project was born from the need to create a gallery focused more on the artworks than the author, while allowing users to organize works using tags and share filtered views. In this spirit, each page load displays the photos in random order, allowing users to discover new content they might not have seen before.

The project comes with two themes: one modern, the other more minimalistic, both designed to keep the focus on the artworks:
  - Modern 👉 [check the demo](https://modern.djeex.fr)
  - Typewriter 👉 [check the demo](https://typewriter.djeex.fr)

> [!NOTE]
> _This GitHub repository is a mirror of https://git.djeex.fr/Djeex/lumeex. You’ll find the complete package, history, and release notes there. An LLM is used for bug checking._

## 📌 Table of Contents

- [Features](#features)
- [Python Installation](#python-installation)
- [Configuration](#configuration)

## Features

**Gallery (Static Website)**  
- Photos displayed in a random order on each page load.  
- Tag-based filtering (with the ability to combine multiple tags).  
- Shareable URLs with active tag filters.  
- A photo carousel on the landing page.  
- A legal notice page.  
- Two visual themes (easily customizable):
  - Modern 👉 [demo](https://modern.djeex.fr)
  - Typewriter 👉 [demo](https://typewriter.djeex.fr)
- Supports Google Fonts and local fonts.

**No-Code Builder Based on YAML Files**  
- YAML files to configure site information, SEO, colors, fonts, etc.—no code needed
- YAML files to reference and tag photos—no code needed.  
- *(Optional)* Automatically add photos to the reference file.

**Simple Build Process**  
- Compiles from YAML config files (theme selection, template building, fonts, colors, etc.).  
- Automatically converts the favicon to all required formats.
- Automatically resize social thumbnail
- *(Optional)* Automatically resizes photos to a max width of 1140px.  
- *(Optional)* Converts images to WebP for better performance.  
- Outputs a fully generated static website, ready to be copied to any web server.

## Python Installation

Instructions to run the Python scripts directly.

**Requirements**

- Python 3.11 or higher  
- PyYAML  
- Pillow

**Installation**

```sh
git clone https://git.djeex.fr/Djeex/lumeex.git
cd lumeex
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

You're ready to go!

## Configuration

For detailed documentation about configuration options, customization and demo, visit https://lumeex.djeex.fr