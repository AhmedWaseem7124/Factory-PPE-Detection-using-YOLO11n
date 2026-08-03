import os
import sys

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from flask import send_from_directory
from utils.snapshot import save_snapshot
from zone.zone_manager import ZoneManager
from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import threading
import time
import os
from dotenv import load_dotenv
from database.database import db
import numpy as np

load_dotenv()

RTSP_URL = os.getenv("RTSP_URL")
app = Flask(__name__)
CORS(app)

# =========================
# CONFIGURATION
# =========================

MODEL_PATH = "../runs/detect/runs/helmet_person_v2/weights/best.pt"

CONFIDENCE = 0.30

# Lower = faster CPU inference
IMAGE_SIZE = 1024

# =========================
# GLOBAL VARIABLES
# =========================

camera = None
latest_frame = None
annotated_frame = None
camera_lock = threading.Lock()
output_lock = threading.Lock()
camera_connected = False
running = True
active_incidents = {}

# =========================
# DETECTION STATISTICS
# =========================

detection_stats = {
    "persons": 0,
    "helmets": 0,
    "violations": 0,
    "compliance_rate": 0.0
}

stats_lock = threading.Lock()

# =========================
# LOAD MODEL
# =========================

print("[MODEL] Loading YOLO models...")

person_model = YOLO(MODEL_PATH)
helmet_model = YOLO(MODEL_PATH)

print("[MODEL] Model loaded successfully")

zone_manager = ZoneManager()

# =========================
# CAMERA CAPTURE THREAD
# =========================

def camera_capture():

    global camera
    global latest_frame
    global camera_connected

    while running:

        try:
            # Connect camera
            if camera is None or not camera.isOpened():
                print("[CAMERA] Connecting...")
                camera = cv2.VideoCapture(
                    RTSP_URL,
                    cv2.CAP_FFMPEG
                )

                # Reduce OpenCV buffering
                camera.set(
                    cv2.CAP_PROP_BUFFERSIZE,
                    1
                )
                if camera.isOpened():
                    camera_connected = True
                    print("[CAMERA] Connected")
                else:
                    camera_connected = False
                    print("[CAMERA] Connection failed")
                    time.sleep(2)
                    continue

            # Read frame
            success, frame = camera.read()

            if not success:
                print(
                    "[CAMERA] Frame read failed. Reconnecting..."
                )
                camera.release()
                camera = None
                camera_connected = False
                time.sleep(1)
                continue

            # Resize for faster processing
            frame = cv2.resize(
                frame,
                (704, 576)
            )

            # IMPORTANT:
            # Always replace old frame.
            # Never build a frame queue.

            with camera_lock:
                latest_frame = frame

        except Exception as e:
            print(
                f"[CAMERA ERROR] {e}"
            )

            if camera is not None:
                camera.release()
            camera = None
            camera_connected = False
            time.sleep(1)

# =========================
# TEMPORAL PPE TRACKING
# =========================

person_states = {}

# PPE status must remain stable for these durations
# before changing the person's confirmed state.

HELMET_CONFIRM_SECONDS = 1.0
NO_HELMET_CONFIRM_SECONDS = 2.0
PERSON_TIMEOUT_SECONDS = 10.0
EMAIL_DELAY_SECONDS = 2

def calculate_iou(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    if x2 <= x1 or y2 <= y1:
        return 0.0

    intersection = (x2 - x1) * (y2 - y1)

    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])

    union = area1 + area2 - intersection

    return intersection / union

def remove_duplicate_persons(persons, iou_threshold=0.60):

    if len(persons) <= 1:
        return persons

    persons = sorted(
        persons,
        key=lambda p: p["confidence"],
        reverse=True
    )

    filtered = []

    for person in persons:

        duplicate = False

        for kept in filtered:

            iou = calculate_iou(
                person["box"],
                kept["box"]
            )

            if iou > iou_threshold:
                duplicate = True
                break

        if not duplicate:
            filtered.append(person)

    return filtered

# =========================
# YOLO INFERENCE THREAD
# =========================

def format_duration(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    return f"{hours:02}:{minutes:02}:{seconds:02}"

def yolo_inference():

    global latest_frame
    global annotated_frame

    while running:
        frame = None

        # Get latest available frame
        with camera_lock:
            if latest_frame is not None:
                frame = latest_frame.copy()

        # No frame yet
        if frame is None:
            time.sleep(0.01)
            continue

        try:
            # =========================
            # YOLO INFERENCE
            # =========================

            person_results = person_model.track(
                frame,
                imgsz=IMAGE_SIZE,
                conf=CONFIDENCE,
                classes=[1],
                iou=0.50,
                tracker="/home/osamamansoor/factory-ppe-monitor/backend/bytetrack_custom.yaml",
                persist=True,
                verbose=False
            )

            person_result = person_results[0]

            print("\n===== TRACKING DEBUG =====")
            if person_result.boxes is not None:
                print("Number of detections:", len(person_result.boxes))
                print(
                    "Boxes:",
                    person_result.boxes.xyxy.tolist()
                )
                print(
                    "Confidence:",
                    person_result.boxes.conf.tolist()
                )
                print(
                    "IDs:",
                    person_result.boxes.id
                )
            else:
                print("NO PERSON DETECTIONS")
            print("==========================\n")


# =========================
# HELMET DETECTION
# =========================

            helmet_results = helmet_model(
                source=frame,
                imgsz=IMAGE_SIZE,
                conf=CONFIDENCE,
                classes=[0],  # Helmet only
                verbose=False
            )

            helmet_result = helmet_results[0]

# =========================
# DETECTION LISTS
# =========================

            persons = []
            helmets = []

# =========================
# PROCESS PERSON TRACKS
# =========================

            if person_result.boxes is not None:
                for box in person_result.boxes:

                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = map(
                        int,
                        box.xyxy[0]
                    )

                    if box.id is not None:
                        track_id = int(box.id[0])
                    else:
                        track_id = -1

                    detection = {
                        "box": (x1, y1, x2, y2),
                        "confidence": confidence,
                        "track_id": track_id
                    }

                    persons.append(detection)
 
            persons = remove_duplicate_persons(persons)

            print(f"Persons after duplicate removal: {len(persons)}")

# =========================
# REMOVE DUPLICATE PERSON DETECTIONS
# =========================

            before_count = len(persons)

            persons = remove_duplicate_persons(
                persons,
                iou_threshold=0.70
            )

            after_count = len(persons)

            if before_count != after_count:
                print(
                    f"[DUPLICATE FILTER] "
                    f"{before_count} detections -> "
                    f"{after_count} detections"
                )

# =========================
# PROCESS HELMET DETECTIONS
# =========================

            if helmet_result.boxes is not None:
                for box in helmet_result.boxes:
                    confidence = float(box.conf[0])

                    x1, y1, x2, y2 = map(
                        int,
                        box.xyxy[0]
                    )

                    detection = {
                        "box": (x1, y1, x2, y2),
                        "confidence": confidence
                    }

                    helmets.append(detection)

# =========================
# PERSON-HELMET ASSOCIATION
# =========================

            compliant_people = 0
            violations = 0

            for person in persons:
                track_id = person["track_id"]

                current_time = time.time()

                if track_id not in person_states:
                    person_states[track_id] = {
                    "status": "unknown",
                    "helmet_detected_since": None,
                    "helmet_missing_since": None,
                    "violation_duration": 0,
                    "last_seen": current_time,
                    "violation_sent": False,
                    "snapshot_saved": False,
                    "incident_started_at": None,
                    "snapshot_path": None 
                }

                state = person_states[track_id]
                state["last_seen"] = current_time

                px1, py1, px2, py2 = person["box"]
                person_width = px2 - px1
                person_height = py2 - py1

    # Person center

                person_center_x = (
                    px1 + px2
                ) / 2

                person_center_y = (
                    py1 + py2
                ) / 2


                current_zone = zone_manager.get_zone(
                    (
                        int(person_center_x),
                        int(person_center_y)
                    )
                )

                if current_zone is None:
                    current_zone = "Unknown"

                helmet_found = False
                best_helmet_distance = float("inf")


    # =========================
    # FIND BEST HELMET MATCH
    # =========================

                current_time = time.time()

                expired_tracks = []

                for tid, state in person_states.items():

                    if current_time - state["last_seen"] > PERSON_TIMEOUT_SECONDS:
                        expired_tracks.append(tid)

                for tid in expired_tracks:

    # Finish incident before removing track
                    if tid in active_incidents:

                        incident = active_incidents[tid]

                        duration = int(
                            current_time - incident["start_time"]
                        )

                        print("========== INCIDENT FINISHED ==========")

                        db.insert_event(
                            track_id=tid,
                            event_type=incident["event_type"],
                            zone=incident["zone"],
                            snapshot_path=incident["snapshot_path"]
                        )

                        print(
                            f"Track {tid} finished | Duration: {duration} sec"
                        )

                        del active_incidents[tid]

                    del person_states[tid]

                print(person_states)

                for helmet in helmets:
                    hx1, hy1, hx2, hy2 = helmet["box"]

        # Helmet center

                    helmet_center_x = (
                        hx1 + hx2
                    ) / 2

                    helmet_center_y = (
                        hy1 + hy2
                    ) / 2

        # =========================
        # HORIZONTAL ALIGNMENT
        # =========================

                    horizontal_offset = abs(
                        helmet_center_x - person_center_x
                    )

        # Allow helmet center to be
        # within 60% of person's width
        # from person's center.

                    max_horizontal_distance = (
                        person_width * 0.60
                    )

                    if (
                        horizontal_offset
                        > max_horizontal_distance
                    ):

                        continue

        # =========================
        # VERTICAL DISTANCE
        # =========================

        # Distance from helmet center
        # to person's top boundary.

                    vertical_distance = (
                        helmet_center_y
                        - py1
                    )

        # Allow helmet to appear anywhere
        # from the top of the person to
        # approximately 70% down the body.
        #
        # This handles bending/crouching.

                    max_vertical_distance = (
                        person_height * 0.70
                    )

                    if vertical_distance < -(
                        person_height * 0.20
                    ):

                        continue

                    if (
                        vertical_distance
                        > max_vertical_distance
                    ):

                        continue

        # =========================
        # CALCULATE DISTANCE SCORE
        # =========================

                    normalized_horizontal = (
                        horizontal_offset
                        / max(
                            person_width,
                            1
                        )
                    )

                    normalized_vertical = (
                        max(
                            vertical_distance,
                            0
                        )
                        / max(
                            person_height,
                            1
                        )
                    )

                    distance_score = (
                        normalized_horizontal
                        + normalized_vertical
                    )

        # Keep closest valid helmet

                    if (
                        distance_score
                        < best_helmet_distance
                    ):
                        best_helmet_distance = (
                            distance_score
                        )
                        helmet_found = True

# =========================
# TEMPORAL PPE SMOOTHING
                # =========================

                current_time = time.time()

                # =========================
                # VALID TRACK ID
                # =========================

                if track_id != -1:

                    # Initialize state for this person
                    if track_id not in person_states:
                        person_states[track_id] = {
                            "helmet_detected_since": None,
                            "helmet_missing_since": None,
                            "status": "UNKNOWN"
                        }

                    state = person_states[track_id]

                    # =========================
                    # HELMET DETECTED
                    # =========================

                    if helmet_found:

                        # Start helmet confirmation timer
                        if state["helmet_detected_since"] is None:
                            state["helmet_detected_since"] = current_time

                        # Reset NO HELMET timer
                        state["helmet_missing_since"] = None
                        state["violation_duration"] = 0

                        # Calculate detection duration
                        helmet_duration = (
                            current_time
                            - state["helmet_detected_since"]
                        )

                        # Confirm HELMET
                        if helmet_duration >= HELMET_CONFIRM_SECONDS:
                            state["status"] = "HELMET"
                            state["violation_sent"] = False
                            state["snapshot_saved"] = False

                    # ========================
                    # HELMET NOT DETECTED
                    # =========================
                    else:
                        # Start NO HELMET confirmation timer
                        if state["helmet_missing_since"] is None:
                            state["helmet_missing_since"] = current_time

                        # Reset helmet detection timer
                        state["helmet_detected_since"] = None

                        # Calculate missing duration
                        missing_duration = (
                            current_time
                            - state["helmet_missing_since"]
                        )

                        state["violation_duration"] = int(missing_duration)

                        # Confirm NO HELMET
                        if missing_duration >= NO_HELMET_CONFIRM_SECONDS:
                            state["status"] = "NO HELMET"

                        print(
                            "Duration:",
                            state["violation_duration"],
                            "Delay:",
                            EMAIL_DELAY_SECONDS,
                            "Sent:",
                            state["violation_sent"]
                        )

                        if (
                            not state["violation_sent"]
                            and state["violation_duration"] >= EMAIL_DELAY_SECONDS
                        ):

                            if track_id not in active_incidents:

                                print("========== NEW INCIDENT ==========")

                                filename = save_snapshot(frame, track_id)

                                active_incidents[track_id] = {
                                    "start_time": current_time,
                                    "snapshot_path": filename,
                                    "zone": current_zone,
                                    "event_type": "Helmet Missing"
                                }

                                print(
                                    f"Incident started for Track {track_id}"
                                )

                            state["snapshot_saved"] = True
                            state["violation_sent"] = True

                    # Get stable status
                    ppe_status = state["status"]

                # =========================
                # NO TRACK ID
                # =========================
                else:

                    # Do NOT use person_states[-1].
                    # Multiple untracked people would otherwise
                    # share the exact same PPE state.

                    if helmet_found:
                        ppe_status = "HELMET"
                    else:
                        ppe_status = "NO HELMET"

    # =========================
    # GET STABLE PPE STATUS
    # =========================

                ppe_status = state["status"]

# =========================
# UPDATE LIVE DATABASE
# =========================

                db.update_detection(
                    track_id=track_id,
                    helmet=1 if ppe_status == "HELMET" else 0,
                    zone=current_zone
                )

    # =========================
    # HANDLE UNKNOWN STATE
    # =========================

                if ppe_status == "UNKNOWN":

        # During initial confirmation period,
        # don't count as a violation.

                    label = (
                        f"PERSON #{track_id} | CHECKING | "
                        f"{person['confidence']:.2f}"
                    )

                    box_color = (
                        0,
                        255,
                        255
                    )

    # =========================
    # HELMET CONFIRMED
    # =========================

                elif ppe_status == "HELMET":
                    compliant_people += 1
                    label = (
                        f"PERSON #{track_id} | HELMET | "
                        f"{person['confidence']:.2f}"
                    )

                    box_color = (
                        0,
                        255,
                        0
                    )

    # =========================
    # NO HELMET CONFIRMED
    # =========================

                else:
                    violations += 1
                    label = (
                        f"PERSON #{track_id} | NO HELMET | "
                        f"{person['confidence']:.2f}"
                    )
                    box_color = (
                        0,
                        0,
                        255
                    )

    # =========================
    # DRAW PERSON BOUNDING BOX
    # =========================

                cv2.rectangle(
                    frame,
                    (px1, py1),
                    (px2, py2),
                    box_color,
                    2
                )

    # =========================
    # DRAW LABEL BACKGROUND
    # =========================

                cv2.rectangle(
                    frame,
                    (px1, py1 - 30),
                    (px1 + 250, py1),
                    box_color,
                    -1
                )

    # =========================
    # DRAW LABEL
    # =========================

                cv2.putText(
                    frame,
                    label,
                    (px1 + 5, py1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA
                )
            # =========================
            # DRAW HELMET BOUNDING BOXES
            # =========================

            for helmet in helmets:

                hx1, hy1, hx2, hy2 = helmet["box"]

                cv2.rectangle(
                    frame,
                    (hx1, hy1),
                    (hx2, hy2),
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    f"HELMET {helmet['confidence']:.2f}",
                    (hx1, hy1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.4,
                    (0, 255, 0),
                    1,
                    cv2.LINE_AA
                )

# =========================
# FINAL STATISTICS
# =========================

            person_count = len(persons)
            helmet_count = len(helmets)

            if person_count > 0:
                compliance_rate = (
                    compliant_people
                    / person_count
                ) * 100
            else:
                compliance_rate = 100.0

# =========================
# UPDATE GLOBAL STATS
# =========================

            with stats_lock:
                detection_stats["persons"] = (
                    person_count
                )
                detection_stats["helmets"] = (
                    helmet_count
                )
                detection_stats["violations"] = (
                    violations
                )
                detection_stats["compliance_rate"] = round(
                    compliance_rate,
                    1
                )

# =========================
# DISPLAY GLOBAL COUNTER
# =========================

            cv2.rectangle(
                frame,
                (10, 10),
                (300, 100),
                (0, 0, 0),
                -1
            )

            cv2.putText(
                frame,
                f"Persons: {person_count}",
                (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2
            )

            cv2.putText(
                frame,
                f"Compliant: {compliant_people}",
                (20, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

            cv2.putText(
                frame,
                f"Violations: {violations}",
                (20, 85),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 0, 255),
                2
            )

            # Store latest processed frame
            with output_lock:
                annotated_frame = frame

        except Exception as e:
            print(
                f"[YOLO ERROR] {e}"
            )

            time.sleep(0.1)

# =========================
# VIDEO STREAM GENERATOR
# =========================

def generate_frames():

    global annotated_frame
    while True:
        frame = None

        # Get newest processed frame
        with output_lock:
            if annotated_frame is not None:
                frame = annotated_frame.copy()

        if frame is None:
            time.sleep(0.01)
            continue

        # Encode JPEG
        success, buffer = cv2.imencode(
            ".jpg",
            frame,
            [
                cv2.IMWRITE_JPEG_QUALITY,
                70
            ]
        )


        if not success:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )

# =========================
# HOME
# =========================

@app.route("/")
def home():
    return jsonify({
        "system":
        "Factory PPE Monitoring System",
        "status":
        "online"
    })

# =========================
# CAMERA STATUS
# =========================
@app.route("/camera/status")
def camera_status():
    return jsonify({
        "connected":
        camera_connected,
        "model":
        MODEL_PATH,
        "confidence":
        CONFIDENCE
    })

@app.route("/detection/stats")
def detection_stats_api():

    try:
        stats = db.get_dashboard_stats()
        return jsonify(stats)

    except Exception as e:
        print(f"Dashboard API Error: {e}")

        return jsonify({
            "persons": 0,
            "helmets": 0,
            "violations": 0,
            "compliance_rate": 0
        }), 500

@app.route("/events")
def events_api():

    events = db.get_recent_events(20)

    return jsonify([
        {
            "timestamp": row[0],
            "zone": row[1],
            "event_type": row[2],
            "snapshot_path": row[3]
        }
        for row in events
    ])


@app.route("/zones")
def zones_api():

    conn = db.connect()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            zone,
            COUNT(*),
            SUM(CASE WHEN helmet=0 THEN 1 ELSE 0 END)
        FROM detections
        GROUP BY zone
    """)

    rows = cursor.fetchall()
    conn.close()

    zones = []

    for zone, workers, violations in rows:

        violations = violations or 0

        if violations == 0:
            status = "Safe"
        elif violations < 3:
            status = "Warning"
        else:
            status = "Violation"

        zones.append({
            "name": zone,
            "people": workers,
            "violations": violations,
            "status": status
        })

    return jsonify(zones)

@app.route("/snapshots/<filename>")
def snapshots(filename):
    return send_from_directory(
        "static/snapshots",
        filename
    )

# =========================
# VIDEO FEED
# =========================

@app.route("/video_feed")
def video_feed():

    return Response(
        generate_frames(),
        mimetype=
        "multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/analytics")
def analytics():

    return jsonify(
        db.get_analytics()
    )

# =========================
# START SYSTEM
# =========================

if __name__ == "__main__":

    print(
        "[SYSTEM] Starting Factory PPE Monitoring Backend"
    )

    # Start camera thread
    camera_thread = threading.Thread(
        target=camera_capture,
        daemon=True
    )

    camera_thread.start()

    # Start YOLO thread

    yolo_thread = threading.Thread(
        target=yolo_inference,
        daemon=True
    )

    yolo_thread.start()

    print(
        "[SYSTEM] Camera thread started"
    )

    print(
        "[SYSTEM] YOLO thread started"
    )

    # Start Flask

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        threaded=True
    )
