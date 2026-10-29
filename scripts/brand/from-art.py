"""
Builds LaxVault's icons, favicons, lockups and social card from the logo art
in scripts/brand/art/ (emblem: LV square with the wordmark; crest: helmet and
sticks with "Practice · Plan · Play"; wordmark: horizontal lockup with the
tagline). Run from the repo root: python3 scripts/brand/from-art.py
Needs Pillow. Replaces the placeholder images render.cjs used to make.
"""
from pathlib import Path
from PIL import Image

ART = Path("scripts/brand/art")
OUT = [Path("public"), Path("marketing")]
emblem = Image.open(ART / "emblem.webp").convert("RGB")
crest = Image.open(ART / "crest.webp").convert("RGB")
word = Image.open(ART / "wordmark.webp").convert("RGB")

# The LV square alone (no wordmark) is the app icon.
square = emblem.crop((207, 79, 1047, 919))
BG = square.getpixel((4, 4))


def fit(img, size, pad=0.0, bg=BG):
    """img scaled into a size x size square, with `pad` of the side left clear."""
    canvas = Image.new("RGB", (size, size), bg)
    inner = round(size * (1 - 2 * pad))
    scaled = img.resize((inner, inner), Image.LANCZOS)
    canvas.paste(scaled, ((size - inner) // 2, (size - inner) // 2))
    return canvas


def save(img, name, where=OUT):
    for d in where:
        if d == Path("marketing") and not (d / name).exists():
            continue
        p = d / name
        p.parent.mkdir(parents=True, exist_ok=True)
        if p.suffix == ".webp":
            img.save(p, "WEBP", quality=90)
        else:
            img.save(p, optimize=True)


for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png"), (48, "favicon-48.png"), (32, "favicon-32.png")]:
    save(fit(square, size), name)
# Maskable: the platform may crop to a circle, so keep the square inside the middle 80%.
save(fit(square, 512, pad=0.1), "icon-maskable-512.png", [Path("public")])

save(emblem.resize((640, 640), Image.LANCZOS), "brand/icon.webp", [Path("public")])
save(crest.resize((640, 640), Image.LANCZOS), "brand/lockup-stacked.webp", [Path("public")])

# Horizontal lockup: the wordmark trimmed to its art with a little room.
w = word.crop((175, 118, 2012, 610))
save(w.resize((1200, round(1200 * w.height / w.width)), Image.LANCZOS), "brand/lockup-horizontal.webp", [Path("public")])

# Social card 1200 x 630: the whole wordmark art (its edges are plain black) centred on black.
card = Image.new("RGB", (1200, 630), word.getpixel((4, 4)))
lock = word.resize((1200, round(1200 * word.height / word.width)), Image.LANCZOS)
card.paste(lock, (0, (630 - lock.height) // 2))
save(card, "social-card.png")
print("brand images written")
