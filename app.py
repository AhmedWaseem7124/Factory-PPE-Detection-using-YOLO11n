import json
import time
from pathlib import Path

import cv2
from flask import Flask, jsonify, render_template, request, Response

from camera.rtsp import RTSPCamera
from config import RTSP_URL


app = Flask(__name__)

camera = RTSPCamera(RTSP_URL)
camera.connect()

ROI_FILE = Path("roi_polygons.json")


@app.route("/")
def roi_editor():
    return render_template("roi_editor.html")


@app.route("/roi-frame")
def roi_frame():
    frame = None

    for _ in range(50):
        frame = camera.read()

        if frame is not None:
            break

        time.sleep(0.1)

    if frame is None:
        return "No camera frame available", 503

    preview = cv2.resize(frame, (1280, 720))

    success, encoded = cv2.imencode(
        ".jpg",
        preview,
        [cv2.IMWRITE_JPEG_QUALITY, 85],
    )

    if not success:
        return "Unable to encode frame", 500

    return Response(encoded.tobytes(), mimetype="image/jpeg")


@app.route("/save-rois", methods=["POST"])
def save_rois():
    try:
        zones = request.get_json()

        required_zones = {"red", "green", "blue", "yellow"}

        if not isinstance(zones, dict):
            return jsonify(
                success=False,
                error="Invalid ROI data",
            ), 400

        if set(zones.keys()) != required_zones:
            return jsonify(
                success=False,
                error="All four zones are required",
            ), 400

        for zone_name, points in zones.items():
            if not isinstance(points, list) or len(points) < 3:
                return jsonify(
                    success=False,
                    error=f"{zone_name} requires at least three points",
                ), 400

        ROI_FILE.write_text(
            json.dumps(zones, indent=4),
            encoding="utf-8",
        )

        return jsonify(success=True)

    except Exception as error:
        return jsonify(
            success=False,
            error=str(error),
        ), 500


if __name__ == "__main__":
    try:
        app.run(
            host="0.0.0.0",
            port=5000,
            debug=False,
            threaded=True,
        )
    finally:
        camera.release()
