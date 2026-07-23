import time

import cv2

from camera.rtsp import RTSPCamera
from config import RTSP_URL
from roi.roi_manager import ROIManager


camera = RTSPCamera(RTSP_URL)
roi_manager = ROIManager()

try:
    camera.connect()
    time.sleep(2)

    while True:
        frame = camera.read()

        if frame is None:
            time.sleep(0.05)
            continue

        crops = roi_manager.crop(frame)

        green = cv2.resize(crops["green"], (640, 360))
        yellow = cv2.resize(crops["yellow"], (640, 360))
        red = cv2.resize(crops["red"], (640, 360))

        cv2.imshow("Green ROI", green)
        cv2.imshow("Yellow ROI", yellow)
        cv2.imshow("Red ROI", red)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

finally:
    camera.release()
    cv2.destroyAllWindows()
