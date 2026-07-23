import cv2
import time

from camera.rtsp import RTSPCamera
from config import RTSP_URL


def main() -> None:
    camera = RTSPCamera(RTSP_URL)

    try:
        camera.connect()

        print("[CAMERA] Waiting for first frame...")

        frame = None
        for _ in range(100):
            frame = camera.read()

            if frame is not None:
                break

            time.sleep(0.1)

        if frame is None:
            raise RuntimeError("Camera connected, but no frame was received")

        while True:
            frame = camera.read()

            if frame is None:
                time.sleep(0.05)
                continue

            preview = cv2.resize(frame, (960, 540))
            cv2.imshow("Factory Camera", preview)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        camera.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
