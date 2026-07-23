import cv2
import numpy as np
import json


class ZoneManager:

    def __init__(self, file="roi_polygons.json"):

        with open(file) as f:
            data = json.load(f)

        self.polygons = {}

        for name, pts in data.items():

            polygon = np.array([
                (int(p["x"] * 2560), int(p["y"] * 1440))
                for p in pts
            ])

            self.polygons[name] = polygon

    def get_zone(self, center):
        priority = ["green", "blue", "yellow", "red"]

        for name in priority:
            polygon = self.polygons.get(name)

            if polygon is not None and cv2.pointPolygonTest(
                polygon,
                center,
                False
            ) >= 0:
                return name

        return None








































