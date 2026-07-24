import time
from pathlib import Path

import cv2

from camera.rtsp import RTSPCamera
from config import RTSP_URL
from detector.model import PersonDetector
from filters.ignore_zone import IgnoreZone

FULL_FRAME_DIR = Path("dataset/full_frames")
PERSON_CROP_DIR = Path("dataset/person_crops")

CAPTURE_INTERVAL = 5
MIN_CONFIDENCE = 0.20

MAX_FRAMES = 2000

def main() -> None:
    FULL_FRAME_DIR.mkdir(parents=True, exist_ok=True)
    PERSON_CROP_DIR.mkdir(parents=True, exist_ok=True)

    camera = RTSPCamera(RTSP_URL)
    detector = PersonDetector()

    camera.connect()
    time.sleep(2)

    last_capture = 0.0
    saved_frames = 0
    saved_crops = 0

    ignore_zone = IgnoreZone()

    try:
        while True:
            frame = camera.read()

            if frame is None:
                time.sleep(0.05)
                continue

            now = time.time()

            if now - last_capture >= CAPTURE_INTERVAL:
                result = detector.detect(frame)

                valid_boxes = []

                if result.boxes is not None:
                    for box in result.boxes:
                        confidence = float(box.conf[0])

                        if confidence < MIN_CONFIDENCE:
                            continue

                        x1, y1, x2, y2 = map(
                            int,
                            box.xyxy[0].tolist(),
                        )

                        center_x = (x1 + x2) // 2
                        center_y = y2

                        if ignore_zone.is_ignored((center_x, center_y)):
                            continue

                        valid_boxes.append((x1, y1, x2, y2, confidence))

                if valid_boxes:
                    timestamp = int(now * 1000)

                    full_frame_path = (
                        FULL_FRAME_DIR / f"frame_{timestamp}.jpg"
                    )

                    cv2.imwrite(
                        str(full_frame_path),
                        frame,
                        [cv2.IMWRITE_JPEG_QUALITY, 90],
                    )

                    saved_frames += 1

                    if saved_frames >= MAX_FRAMES:
                        print(f"\n[INFO] Target of {MAX_FRAMES} frames reached.")
                        print("[INFO] Stopping dataset collection...")
                        break

                    height, width = frame.shape[:2]

                    for index, (x1, y1, x2, y2, confidence) in enumerate(
                        valid_boxes
                    ):
                        x1 = max(0, x1)
                        y1 = max(0, y1)
                        x2 = min(width, x2)
                        y2 = min(height, y2)

                        crop = frame[y1:y2, x1:x2]

                        if crop.size == 0:
                            continue

                        crop_path = PERSON_CROP_DIR / (
                            f"frame_{timestamp}_person_{index}_"
                            f"{confidence:.2f}.jpg"
                        )

                        cv2.imwrite(
                            str(crop_path),
                            crop,
                            [cv2.IMWRITE_JPEG_QUALITY, 95],
                        )

                        saved_crops += 1

                    print(
                        f"[SAVED] Frame: {saved_frames} | "
                        f"Person crops: {saved_crops} | "
                        f"Persons in frame: {len(valid_boxes)}"
                    )

                last_capture = now

            preview = cv2.resize(frame, (960, 540))

            cv2.putText(
                preview,
                f"Frames: {saved_frames}/{MAX_FRAMES} | Crops: {saved_crops}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (0, 255, 0),
                2,
            )

           # cv2.imshow("Factory Dataset Collection", preview)

#            if cv2.waitKey(1) & 0xFF == ord("q"):
 #               break

    finally:
        camera.release()
#        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
