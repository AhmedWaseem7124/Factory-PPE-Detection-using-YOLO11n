import os
import threading
import time

import cv2


class RTSPCamera:
    def __init__(self, source: str):
        self.source = source
        self.capture = None
        self.frame = None
        self.running = False
        self.thread = None
        self.lock = threading.Lock()

    def connect(self) -> None:
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

        self.capture = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
        self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not self.capture.isOpened():
            raise ConnectionError("Unable to open RTSP camera stream")

        self.running = True
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()

        print("[CAMERA] Connected")

    def _update(self) -> None:
        while self.running:
            success, frame = self.capture.read()

            if not success:
                time.sleep(0.1)
                continue

            with self.lock:
                self.frame = frame

    def read(self):
        with self.lock:
            if self.frame is None:
                return None

            return self.frame.copy()

    def release(self) -> None:
        self.running = False

        if self.thread is not None:
            self.thread.join(timeout=1)

        if self.capture is not None:
            self.capture.release()

        print("[CAMERA] Released")
