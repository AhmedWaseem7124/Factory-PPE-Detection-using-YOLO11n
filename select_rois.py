import json
import time

import cv2

from camera.rtsp import RTSPCamera
from config import RTSP_URL


DISPLAY_WIDTH = 1280
DISPLAY_HEIGHT = 720

zones = {}
current_points = []
current_zone = None
display_frame = None

scale_x = 1.0
scale_y = 1.0


def mouse_callback(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN and current_zone:
        current_points.append([x, y])


def main():
    global current_zone, current_points
    global display_frame, scale_x, scale_y

    camera = RTSPCamera(RTSP_URL)

    try:
        camera.connect()
        time.sleep(2)

        frame = camera.read()

        if frame is None:
            raise RuntimeError("No frame received")

        original_height, original_width = frame.shape[:2]

        scale_x = original_width / DISPLAY_WIDTH
        scale_y = original_height / DISPLAY_HEIGHT

        display_frame = cv2.resize(
            frame,
            (DISPLAY_WIDTH, DISPLAY_HEIGHT)
        )

        cv2.namedWindow(
            "ROI Selector",
            cv2.WINDOW_NORMAL | cv2.WINDOW_GUI_NORMAL
        )
        cv2.resizeWindow("ROI Selector", DISPLAY_WIDTH, DISPLAY_HEIGHT)
        cv2.setMouseCallback("ROI Selector", mouse_callback)

        zone_names = ["red", "green", "blue", "yellow"]

        for zone in zone_names:
            current_zone = zone
            current_points = []

            print(f"\nSelect {zone.upper()} zone")
            print("Left-click: add point")
            print("U: undo")
            print("Enter: save zone")
            print("Q: quit")

            while True:
                preview = display_frame.copy()

                if len(current_points) >= 2:
                    for index in range(1, len(current_points)):
                        cv2.line(
                            preview,
                            tuple(current_points[index - 1]),
                            tuple(current_points[index]),
                            (0, 255, 0),
                            2,
                        )

                for point in current_points:
                    cv2.circle(
                        preview,
                        tuple(point),
                        5,
                        (0, 0, 255),
                        -1
                    )

                cv2.putText(
                    preview,
                    f"Selecting: {zone.upper()}",
                    (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 255),
                    2,
                )

                cv2.imshow("ROI Selector", preview)
                key = cv2.waitKey(20) & 0xFF

                if key in (10, 13):  # Enter
                    if len(current_points) >= 3:
                        converted_points = [
                            [
                                int(point[0] * scale_x),
                                int(point[1] * scale_y),
                            ]
                            for point in current_points
                        ]

                        zones[zone] = converted_points
                        break

                elif key == ord("u"):
                    if current_points:
                        current_points.pop()

                elif key == ord("q"):
                    return

        with open("roi_polygons.json", "w", encoding="utf-8") as file:
            json.dump(zones, file, indent=4)

        print("[ROI] Saved to roi_polygons.json")

    finally:
        camera.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
