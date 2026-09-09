from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image

ROOT = Path(__file__).resolve().parent
RUNTIME = [
    ROOT / "index.html",
    ROOT / "styles.css",
    ROOT / "script.js",
    ROOT / "link-config.js",
    ROOT / "runtime-config.js",
]
REQUIRED = RUNTIME + [
    ROOT / "asset-manifest.json",
    ROOT / ".env.example",
    ROOT / "package.json",
    ROOT / "vercel.json",
    ROOT / "REFERENCE-AUDIT.md",
    ROOT / "qa/rebuild/responsive-check.html",
    ROOT / "qa/rebuild/contact-sheet.html",
]
EXPECTED_RUNTIME_ASSETS = {
    "assets/generated/apple-touch-icon.png",
    "assets/generated/benefits-background.webp",
    "assets/generated/brand-mark.webp",
    "assets/generated/cat-closeup.webp",
    "assets/generated/community-scene.webp",
    "assets/generated/favicon-64.png",
    "assets/generated/hero-scene.webp",
}
EXPECTED_HTML_ASSETS = EXPECTED_RUNTIME_ASSETS - {"assets/generated/benefits-background.webp"}
LEGACY_NAMES = {
    "hero-cat.svg",
    "about-cat.svg",
    "community-cat.svg",
    "global-cat.svg",
    "privacy-shield.svg",
    "meme-spark.svg",
    "community-paws.svg",
    "brand-mark.svg",
}
EXPECTED_BRAND = "Luke the Moonshot"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[str] = []
        self.ids: set[str] = set()
        self.hash_refs: set[str] = set()
        self.images: list[dict[str, str]] = []
        self.link_kinds: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if values.get("id"):
            self.ids.add(values["id"])
        for key in ("src", "href"):
            value = values.get(key)
            if not value:
                continue
            if value.startswith("#"):
                self.hash_refs.add(value[1:])
            elif not value.startswith(("mailto:", "tel:")):
                self.refs.append(value)
        if tag == "img":
            self.images.append(values)
        if tag == "a" and values.get("data-link"):
            self.link_kinds.append(values["data-link"])


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def check_file(path: Path) -> None:
    if not path.is_file() or path.stat().st_size == 0:
        fail(f"missing or empty required file: {path.relative_to(ROOT)}")


def check_image(rel: str, expected_dimensions: str, expected_hash: str) -> None:
    path = ROOT / rel
    check_file(path)
    with Image.open(path) as image:
        dimensions = f"{image.width}x{image.height}"
        if dimensions != expected_dimensions:
            fail(f"dimension mismatch for {rel}: {dimensions} != {expected_dimensions}")
        if "A" in image.getbands():
            fail(f"unexpected alpha channel in opaque production asset: {rel}")
    actual_hash = sha256(path)
    if actual_hash != expected_hash:
        fail(f"SHA-256 mismatch for {rel}: {actual_hash}")


for required in REQUIRED:
    check_file(required)

runtime_text = "\n".join(path.read_text(encoding="utf-8") for path in RUNTIME)
index_text = (ROOT / "index.html").read_text(encoding="utf-8")
if EXPECTED_BRAND not in index_text:
    fail(f"expected brand is missing: {EXPECTED_BRAND}")
if "Monero Cat" in index_text:
    fail("stale Monero Cat branding remains in the page")
if "$CAT" in index_text:
    fail("stale $CAT ticker remains in the page")
if index_text.count("Buy $LUKE") != 3:
    fail("expected exactly three visible Buy $LUKE buttons")
if re.search(r"Telegram community|Discord community", index_text, re.I):
    fail("Telegram or Discord community control remains in the page")
if "pagina.png".casefold() in runtime_text.casefold():
    fail("the canonical screenshot is referenced by runtime code")
if "pending-art" in runtime_text:
    fail("placeholder styling remains in runtime code")
for legacy_name in LEGACY_NAMES:
    if legacy_name in runtime_text:
        fail(f"legacy asset remains connected: {legacy_name}")

parser = PageParser()
parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
expected_link_kinds = Counter({"buy": 4, "community": 1, "twitter": 1, "reddit": 1})
if Counter(parser.link_kinds) != expected_link_kinds:
    fail(f"public link bindings mismatch: {Counter(parser.link_kinds)} != {expected_link_kinds}")
for ref in parser.refs:
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc or ref.startswith("//"):
        fail(f"unexpected external runtime request: {ref}")
    local_path = ROOT / parsed.path
    if not local_path.is_file():
        fail(f"unresolved HTML reference: {ref}")

missing_anchor_targets = parser.hash_refs - parser.ids
if missing_anchor_targets:
    fail(f"unresolved internal anchors: {sorted(missing_anchor_targets)}")

runtime_assets = {urlsplit(ref).path for ref in parser.refs if ref.startswith("assets/generated/")}
if runtime_assets != EXPECTED_HTML_ASSETS:
    fail(
        "runtime asset set mismatch: "
        f"missing={sorted(EXPECTED_HTML_ASSETS - runtime_assets)}, "
        f"unexpected={sorted(runtime_assets - EXPECTED_HTML_ASSETS)}"
    )

image_by_class = {image.get("class", ""): image for image in parser.images}
hero = image_by_class.get("hero-art")
if not hero or hero.get("loading") == "lazy" or hero.get("fetchpriority") != "high":
    fail("hero image must be eager and fetchpriority=high")
for image in parser.images:
    if image.get("src", "").endswith(("cat-closeup.webp", "community-scene.webp")):
        if image.get("loading") != "lazy" or not image.get("alt", "").strip():
            fail(f"lower artwork needs lazy loading and meaningful alt text: {image.get('src')}")

manifest = json.loads((ROOT / "asset-manifest.json").read_text(encoding="utf-8"))
assets = manifest.get("assets")
if not isinstance(assets, list) or len(assets) != 5:
    fail("asset manifest must contain the five generated asset families")

validated_production: set[str] = set()
for asset in assets:
    source = asset.get("source")
    if not source:
        fail("manifest asset is missing its preserved source")
    check_image(source, asset["source_dimensions"], asset["source_sha256"])

    outputs = asset.get("outputs")
    if outputs is None:
        outputs = [{
            "path": asset["output"],
            "dimensions": asset["output_dimensions"],
            "sha256": asset["output_sha256"],
        }]
    for output in outputs:
        check_image(output["path"], output["dimensions"], output["sha256"])
        validated_production.add(output["path"])

if validated_production != EXPECTED_RUNTIME_ASSETS:
    fail("manifested production files do not match the runtime asset set")

css = (ROOT / "styles.css").read_text(encoding="utf-8")
if 'url("assets/generated/benefits-background.webp")' not in css:
    fail("benefits background is not connected in CSS")
for breakpoint in ("920px", "640px"):
    if breakpoint not in css:
        fail(f"missing responsive breakpoint: {breakpoint}")
if "overflow-x: hidden" not in css:
    fail("document overflow guard is missing")
if not re.search(r"prefers-reduced-motion\s*:\s*reduce", css):
    fail("reduced-motion handling is missing")

print(f"PASS: {len(REQUIRED)} required project files present")
print(f"PASS: {len(EXPECTED_RUNTIME_ASSETS)} production assets resolve and are integrated")
print("PASS: five generated source families match manifested dimensions and SHA-256 hashes")
print("PASS: no concept screenshot, legacy SVG, placeholder, or external runtime request is connected")
print("PASS: Luke the Moonshot/$LUKE branding applied; Telegram and Discord controls absent")
print("PASS: Buy, Community, X, and Reddit controls are bound to their public link groups")
print("PASS: internal anchors, loading policy, alt text, responsive breakpoints, and reduced motion validated")
