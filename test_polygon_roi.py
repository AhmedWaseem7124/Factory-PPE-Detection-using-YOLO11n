import cv2
import time

from camera.rtsp import RTSPCamera
from config import RTSP_URL
from roi.roi_manager import ROIManager


camera = RTSPCamera(RTSP_URL)
roi = ROIManager()

camera.connect()

time.sleep(2)

while True:

    frame = camera.read()

    if frame is None:
        continue

    rois = roi.apply(frame)

    display = frame.copy()

    colors = {
        "red": (0, 0, 255),
        "green": (0, 255, 0),
        "blue": (255, 0, 0),
        "yellow": (0, 255, 255),
    }

    for name, data in rois.items():

        cv2.polylines(
            display,
            [data["polygon"]],
            True,
            colors[name],
            3,
        )

    display = cv2.resize(display, (1280, 720))

    cv2.imshow("Factory Zones", display)

    if cv2.waitKey(1) == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()
