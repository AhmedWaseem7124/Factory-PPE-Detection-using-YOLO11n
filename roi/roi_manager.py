import json
import cv2
import numpy as np


class ROIManager:

    def __init__(self, roi_file="roi_polygons.json"):
        with open(roi_file, "r") as f:
            self.polygons = json.load(f)

    def apply(self, frame):

        h, w = frame.shape[:2]

        output = {}

        for name, pts in self.polygons.items():

            polygon = np.array(
                [[int(p["x"] * w), int(p["y"] * h)] for p in pts],
                dtype=np.int32,
            )

            mask = np.zeros((h, w), dtype=np.uint8)

            cv2.fillPoly(mask, [polygon], 255)

            roi = cv2.bitwise_and(frame, frame, mask=mask)

            output[name] = {
                "image": roi,
                "polygon": polygon,
            }

        return output
