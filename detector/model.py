from ultralytics import YOLO


class PersonDetector:
    def __init__(self):
        self.model = YOLO("yolo11n.pt")

    def detect(self, frame):
        return self.model.predict(
            frame,
            classes=[0],
            conf=0.15,
            iou=0.45,
            imgsz=640,
            max_det=50,
            device="cpu",
            verbose=False
        )[0]
