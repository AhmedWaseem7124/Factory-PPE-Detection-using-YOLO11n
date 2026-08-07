import cv2
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPSHOT_DIR = os.path.join(BASE_DIR, "static", "snapshots")

os.makedirs(SNAPSHOT_DIR, exist_ok=True)

def save_snapshot(frame, track_id, bbox=None, label="NO HELMET"):
    """
    Saves an evidence snapshot for an officially confirmed incident.
    Draws a bright red 3px bounding box around the violating worker and a bold red/white text label.
    Preserves original image resolution and does NOT mutate the input live frame.
    """
    if frame is None:
        return ""

    # Copy frame so live monitoring feed is never modified
    annotated = frame.copy()

    if bbox is not None and len(bbox) == 4:
        h, w = annotated.shape[:2]
        x1 = max(0, min(int(bbox[0]), w - 1))
        y1 = max(0, min(int(bbox[1]), h - 1))
        x2 = max(0, min(int(bbox[2]), w - 1))
        y2 = max(0, min(int(bbox[3]), h - 1))

        # Bright Red Color (BGR: 0, 0, 255)
        red_color = (0, 0, 255)
        white_color = (255, 255, 255)
        thickness = 3

        # 1. Draw 3px bright red bounding box around the violating person only
        cv2.rectangle(annotated, (x1, y1), (x2, y2), red_color, thickness)

        # 2. Prepare text lines for label
        line1 = f"{label.upper()}"
        line2 = f"Track #{track_id}"

        font = cv2.FONT_HERSHEY_DUPLEX
        font_scale = 0.6
        font_thickness = 2

        (w1, h1), b1 = cv2.getTextSize(line1, font, font_scale, font_thickness)
        (w2, h2), b2 = cv2.getTextSize(line2, font, font_scale, font_thickness)

        max_w = max(w1, w2) + 14
        total_h = h1 + h2 + 14

        # Position label above bounding box if space exists, otherwise inside top
        label_y2 = y1 if (y1 - total_h) >= 0 else y1 + total_h
        label_y1 = label_y2 - total_h
        label_x2 = min(x1 + max_w, w - 1)

        # Draw red background filled box for text label
        cv2.rectangle(annotated, (x1, label_y1), (label_x2, label_y2), red_color, -1)

        # Draw white bold text for line 1 and line 2
        text_y1 = label_y1 + h1 + 4
        text_y2 = text_y1 + h2 + 4
        cv2.putText(annotated, line1, (x1 + 6, text_y1), font, font_scale, white_color, font_thickness, cv2.LINE_AA)
        cv2.putText(annotated, line2, (x1 + 6, text_y2), font, font_scale, white_color, font_thickness, cv2.LINE_AA)

    filename = (
        f"{datetime.now():%Y%m%d_%H%M%S}"
        f"_track_{track_id}.jpg"
    )

    path = os.path.join(SNAPSHOT_DIR, filename)
    cv2.imwrite(path, annotated)

    return filename
