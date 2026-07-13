from pathlib import Path
from PIL import Image

ASSET_DIR = Path("/home/ubuntu/webdev-static-assets")
OUTPUT = Path("/home/ubuntu/nyc-cleaning-redesign/docs/final-image-dimensions.txt")

required = {
    "nyc-cleaning-hero.png",
    "nyc-cleaning-about-team.png",
    "nyc-cleaning-careers.png",
    "nyc-cleaning-contact.png",
    "nyc-cleaning-service-area.png",
    "nyc-cleaning-commercial-cleaning.png",
    "nyc-cleaning-deep-cleaning.png",
    "nyc-cleaning-common-area.png",
    "nyc-cleaning-staffing.png",
    "nyc-cleaning-house-cleaning.png",
    "nyc-cleaning-property-maintenance.png",
    "nyc-cleaning-repair.png",
    "nyc-cleaning-building-maintenance.png",
    "nyc-cleaning-janitorial.png",
    "nyc-cleaning-maintenance-management.png",
    "nyc-cleaning-doorman.png",
    "nyc-cleaning-garbage-bin.png",
    "nyc-cleaning-office-cleaning.png",
    "nyc-cleaning-porter.png",
    "nyc-cleaning-apartment-cleaning.png",
    "nyc-cleaning-pricing.png",
    "nyc-cleaning-property-cleaning.png",
    "nyc-cleaning-sweeping-trash.png",
}

lines = []
missing = []
invalid = []
for name in sorted(required):
    path = ASSET_DIR / name
    if not path.exists():
        missing.append(name)
        continue
    try:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            width, height = image.size
        if width < 800 or height < 500:
            invalid.append(f"{name} ({width}x{height})")
        lines.append(f"{name} {width}x{height}")
    except Exception as error:
        invalid.append(f"{name} ({error})")

OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"verified={len(lines)} missing={len(missing)} invalid={len(invalid)}")
if missing:
    print("missing=" + ",".join(missing))
if invalid:
    print("invalid=" + ",".join(invalid))
raise SystemExit(1 if missing or invalid else 0)
