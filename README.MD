<h1 align="center">Lumeex</h1>
<div align="center" >
    <img src="https://git.djeex.fr/Djeex/lumeex/raw/branch/main/illustration/lumeex.png" alt="Lumeex Screenshot">
</div>

**Lumeex** - Yet another minimalist photo gallery with a static site generator.

Lumeex is a static site generator that builds a minimalist photo gallery. The project was born from the need to create a gallery focused more on the artworks than the author, while allowing users to organize works using tags and share filtered views. In this spirit, each page load displays the photos in random order, allowing users to discover new content they might not have seen before.

The project comes with two themes: one modern, the other more minimalistic, both designed to keep the focus on the artworks:
  - Modern 👉 [demo](https://modern.djeex.fr)
  - Typewriter 👉 [demo](https://typewriter.djeex.fr)

> [!NOTE]
> _This GitHub repository is a mirror of https://git.djeex.fr/Djeex/lumeex. You’ll find the complete package, history, and release notes there. An LLM is used for bug checking._

## 📌 Table of Contents

- [Features](#-features)
- [Python Installation](#-python-installation)
- [Configuration](#-configuration)
- [Build the Site](#-build-the-site)

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
pip install requirements.txt
```

You're ready to go!

## Configuration

All user configuration files are located in the `config` folder.

```sh
Lumeex/
└── config/
    ├── photos/
    │   ├── gallery
    │   └── hero
    ├── themes/
    │   ├── modern
    │   └── typewriter
    ├── gallery.yaml
    └── site.yaml
```

**`photos/`**

- `gallery/`: place your gallery photos here.  
- `hero/`: place carousel photos for the homepage here.

> [!TIP]
> You can use `gallery.py` to automatically reference all photos in `gallery/` and `hero/` into `gallery.yaml` and `site.yaml` by running `python3 gallery.py` from the `lumeex` directory.  
> You’ll just need to tag the photos in `gallery.yaml`.

**`site.yaml`**

This file contains all your site’s metadata and settings. For example:

```yaml
info:
  title: your title
  subtitle: your subtitle
  description: your description
  canonical: all, your, keywords
  author: you
  google_analytics_id: G-XXXXXXX # optional

social:
  instagram_url: https://www.instagram.com/yourprofile
  thumbnail: gallery/anyphoto.png # put the path from your photo folder to your file
menu:
  items:
  - label: your_home
    href: /
  - label: your_second_menu
    href: /?tag=yourtag1
  - label: Your_third_menu
    href: /?tag=yourtag2

hero:
  images:
  - src: hero/your_photo_1.jpg
  - src: hero/your_photo_2.jpg
  - src: hero/your_photo_3.jpg

footer:
  copyright: Copyright © 2025 – You
  legal_link: '/legals.html'
  legal_label: Legal notice

build:
  theme: modern
  convert_images: false
  resize_images: false

legals:
  hoster_name: Your_hoster
  hoster_adress: Your hoster address
  hoster_contact: Your hoster contact
  intellectual_property:
    - paragraph: "Your text here"
    - paragraph: "Your second paragraph here"
    - paragraph: "Etc..."
```

**`gallery.yaml`**

Use this file to reference the images in `photos/gallery/`. You can do this manually or automatically by running `python3 gallery.py`. You can also assign tags to the photos here.

```yaml
images:
- src: gallery/your_photo_1.jpg
  tags: ["portrait"]
- src: gallery/your_photo_2.jpg
  tags: ["portrait", "sunset", "boat"]
- src: gallery/your_photo_3.jpg
  tags: ["landscape", "sea", "beach", "sand"]
```

**`themes/`**

```sh
themes/
└── yourtheme/
    ├── fonts (optional)
    ├── theme.yaml
    ├── theme.css (optional)
    └── favicon.png
```

**Lumeex** is shipped with two prebuilt themes:
  - Modern 👉 [demo](https://modern.djeex.fr)
  - Typewriter 👉 [demo](https://typewriter.djeex.fr)

You can edit existing themes or create your own. Each theme can include:
- **Required:** a `theme.yaml` file for visual settings (colors, fonts, etc.)
- *(Optional)* a `theme.css` file for additional styling
- *(Optional)* a `fonts` folder for local fonts
- *(Optional)* a square `favicon.png` (min 196px) that will be automatically converted to all required formats.

Example `theme.yaml`:

```yaml
colors:
  primary: '#0065a1'
  primary_dark: '#005384'
  secondary: '#00b0f0'
  accent: '#ffc700'
  text_dark: '#333'
  background: '#fff'
  browser_color: '#fff'
favicon:
  path: favicon.png
google_fonts:
  - family: Lato 
    weights:
    - '200'
    - '400'
    - '700'
  - family: Montserrat
    weights:
    - '200'
    - '400'
    - '700'
fonts:
  primary:
    name: Lato
    fallback: sans-serif
  secondary:
    name: Montserrat
    fallback: serif
```

## Build the Site

Once everything is configured, make sure you're in the `lumeex` directory and your Python virtual environment is activated (`source .venv/bin/activate`).

- *(Optional)* Run `python3 gallery.py` to auto-fill `gallery.yaml` and add carousel photos to `site.yaml`. Don't forget to add tags to your photos in `gallery.yaml`.
- Run `python3 build.py` to generate the static site.
- *(Optional)* Serve locally with:

```sh
python3 -m http.server 3000 --directory .output
```

Then visit `http://localhost:3000` or, if remote, `http://your-server-ip:3000`. 

> [!WARNING]
> Use this only to test your site. Don't use python server for production !

- Finally, copy the contents of the `.output/` directory to your favorite web server.
