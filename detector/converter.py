import supervision as sv


def yolo_to_sv(result):
    return sv.Detections.from_ultralytics(result)
