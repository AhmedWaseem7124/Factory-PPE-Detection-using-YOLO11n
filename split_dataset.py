import random
import shutil
from pathlib import Path


SOURCE_IMAGES = Path("dataset/images")
SOURCE_LABELS = Path("dataset/labels")

TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

random.seed(42)


def main():
    images = sorted(
        list(SOURCE_IMAGES.glob("*.jpg"))
        + list(SOURCE_IMAGES.glob("*.jpeg"))
        + list(SOURCE_IMAGES.glob("*.png"))
    )

    if not images:
        print("No images found.")
        return

    random.shuffle(images)

    total = len(images)

    train_end = int(total * TRAIN_RATIO)
    val_end = train_end + int(total * VAL_RATIO)

    splits = {
        "train": images[:train_end],
        "val": images[train_end:val_end],
        "test": images[val_end:],
    }

    for split_name, split_images in splits.items():

        image_dir = Path(f"dataset/{split_name}/images")
        label_dir = Path(f"dataset/{split_name}/labels")

        image_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)

        for image_path in split_images:

            label_path = SOURCE_LABELS / f"{image_path.stem}.txt"

            if not label_path.exists():
                print(f"[WARNING] Missing label: {label_path}")
                continue

            shutil.copy2(
                image_path,
                image_dir / image_path.name,
            )

            shutil.copy2(
                label_path,
                label_dir / label_path.name,
            )

        print(
            f"{split_name}: "
            f"{len(split_images)} images"
        )

    print("\nDataset split complete.")


if __name__ == "__main__":
    main()
