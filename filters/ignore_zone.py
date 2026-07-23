import cv2
import numpy as np


class IgnoreZone:

    def __init__(self):

        self.polygons = [

            np.array([
                [2300, 0],
                [2560, 0],
                [2560, 500],
                [2300, 500]
            ], dtype=np.int32)

        ]

    def is_ignored(self, point):

        for polygon in self.polygons:

            if cv2.pointPolygonTest(
                polygon,
                point,
                False
            ) >= 0:

                return True

        return False
