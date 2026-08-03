import cv2
from datetime import datetime

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPSHOT_DIR = os.path.join(BASE_DIR, "static", "snapshots")

os.makedirs(SNAPSHOT_DIR, exist_ok=True)

def save_snapshot(frame, track_id):

    filename = (
        f"{datetime.now():%Y%m%d_%H%M%S}"
        f"_track_{track_id}.jpg"
    )

    path = os.path.join(
        SNAPSHOT_DIR,
        filename
    )

    cv2.imwrite(path, frame)

    return filename
