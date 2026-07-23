import threading
import time

import cv2

from camera.rtsp import RTSPCamera
from config import RTSP_URL
from detector.model import PersonDetector


camera = RTSPCamera(RTSP_URL)
detector = PersonDetector()

latest_frame = None
annotated_frame = None
lock = threading.Lock()
running = True


def detection_worker():
    global annotated_frame

    while running:
        with lock:
            frame = None if latest_frame is None else latest_frame.copy()

        if frame is None:
            time.sleep(0.05)
            continue

        # Reduce inference load while preserving reasonable detail
        inference_frame = cv2.resize(frame, (1600, 900))

        result = detector.detect(inference_frame)
        output = result.plot()

        with lock:
            annotated_frame = output

        time.sleep(0.5)


camera.connect()
time.sleep(2)

thread = threading.Thread(target=detection_worker, daemon=True)
thread.start()

try:
    while True:
        frame = camera.read()

        if frame is None:
            continue

        with lock:
            latest_frame = frame
            display = (
                annotated_frame.copy()
                if annotated_frame is not None
                else cv2.resize(frame, (1280, 720))
            )

        cv2.imshow("Multiple Person Detection", display)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

finally:
    running = False
    thread.join(timeout=2)
    camera.release()
    cv2.destroyAllWindows()
