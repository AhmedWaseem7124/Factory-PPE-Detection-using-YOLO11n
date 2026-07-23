from pathlib import Path

DATASET_DIR = Path("dataset")

SPLITS = ["train", "val", "test"]

NUM_CLASSES = 2

total_images = 0
total_labels = 0
errors = 0

for split in SPLITS:

    image_dir = DATASET_DIR / split / "images"
    label_dir = DATASET_DIR / split / "labels"

    images = list(image_dir.glob("*.jpg"))
    images += list(image_dir.glob("*.jpeg"))
    images += list(image_dir.glob("*.png"))

    print(f"\n[{split.upper()}]")
    print(f"Images: {len(images)}")

    for image in images:

        total_images += 1

        label = label_dir / f"{image.stem}.txt"

        if not label.exists():
            print(f"[ERROR] Missing label: {image.name}")
            errors += 1
            continue

        total_labels += 1

        with open(label, "r") as f:

            for line_number, line in enumerate(f, start=1):

                values = line.strip().split()

                if len(values) != 5:
                    print(
                        f"[ERROR] Invalid format: "
                        f"{label} line {line_number}"
                    )
                    errors += 1
                    continue

                try:
                    class_id = int(values[0])
                    x, y, w, h = map(float, values[1:])

                except ValueError:
                    print(
                        f"[ERROR] Invalid values: "
                        f"{label} line {line_number}"
                    )
                    errors += 1
                    continue

                if class_id < 0 or class_id >= NUM_CLASSES:
                    print(
                        f"[ERROR] Invalid class ID "
                        f"{class_id}: {label}"
                    )
                    errors += 1

                if not (0 <= x <= 1):
                    print(f"[ERROR] Invalid X: {label}")
                    errors += 1

                if not (0 <= y <= 1):
                    print(f"[ERROR] Invalid Y: {label}")
                    errors += 1

                if not (0 < w <= 1):
                    print(f"[ERROR] Invalid width: {label}")
                    errors += 1

                if not (0 < h <= 1):
                    print(f"[ERROR] Invalid height: {label}")
                    errors += 1


print("\n==============================")
print("DATASET VALIDATION COMPLETE")
print("==============================")

print(f"Total images: {total_images}")
print(f"Images with labels: {total_labels}")
print(f"Errors: {errors}")

if errors == 0:
    print("\nSUCCESS: Dataset is ready for training.")
else:
    print("\nWARNING: Fix the errors before training.")
