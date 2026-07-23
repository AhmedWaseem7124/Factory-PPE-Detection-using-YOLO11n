import time

import cv2
import supervision as sv

from camera.rtsp import RTSPCamera
from config import RTSP_URL
from detector.model import PersonDetector
from detector.converter import yolo_to_sv
from tracker.tracker import PersonTracker
from zone.zone_manager import ZoneManager
from filters.ignore_zone import IgnoreZone


ignore_zone = IgnoreZone()

camera = RTSPCamera(RTSP_URL)
detector = PersonDetector()
tracker = PersonTracker()
zone_manager = ZoneManager()

box_annotator = sv.BoxAnnotator()
label_annotator = sv.LabelAnnotator()

camera.connect()
time.sleep(2)

center = (center_x, center_y)

if ignore_zone.is_ignored(center):
    continue

try:
    while True:
        frame = camera.read()

        if frame is None:
            time.sleep(0.05)
            continue

        result = detector.detect(frame)

        detections = yolo_to_sv(result)
        detections = tracker.update(detections)

        labels = []

        for box, tracker_id in zip(
            detections.xyxy,
            detections.tracker_id
        ):
            x1, y1, x2, y2 = map(int, box)

            center_x = (x1 + x2) // 2
            center_y = y2  # bottom-center is better for floor zones

            zone = zone_manager.get_zone((center_x, center_y))

            labels.append(
                f"ID:{tracker_id} | Zone:{zone or 'outside'}"
            )

            cv2.circle(
                frame,
                (center_x, center_y),
                5,
                (255, 255, 255),
                -1
            )

        frame = box_annotator.annotate(
            scene=frame,
            detections=detections
        )

        frame = label_annotator.annotate(
            scene=frame,
            detections=detections,
            labels=labels
        )

        preview = cv2.resize(frame, (1280, 720))
        cv2.imshow("Person Tracking", preview)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

finally:
    camera.release()
    cv2.destroyAllWindows()
