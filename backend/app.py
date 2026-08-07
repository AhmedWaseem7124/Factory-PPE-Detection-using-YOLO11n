import os
import sys

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import io
from flask import send_from_directory, send_file
from utils.snapshot import save_snapshot
from utils.video_recorder import RollingFrameBuffer, record_evidence_clip_async, EVIDENCE_VIDEO_DIR
from utils.video_cleanup import start_video_cleanup_daemon, cleanup_old_videos
from utils.excel_export import (
    generate_daily_summary_excel,
    generate_incident_investigation_excel,
    generate_executive_analytics_excel
)
from utils.pdf_export import (
    generate_daily_summary_pdf,
    generate_investigation_pdf,
    generate_executive_pdf,
    generate_executive_analytics_pdf
)
from zone.zone_manager import ZoneManager
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import threading
import time
import os
import jwt
import bcrypt
from functools import wraps
from datetime import datetime, timedelta
from dotenv import load_dotenv
from database.database import db
import numpy as np


load_dotenv()

RTSP_URL = os.getenv("RTSP_URL")
app = Flask(__name__)
CORS(app)

rolling_buffer = RollingFrameBuffer(duration_seconds=3.0)

def get_latest_annotated_frame():
    with output_lock:
        if annotated_frame is not None:
            return annotated_frame.copy()
        return None

# =========================
# JWT AUTHENTICATION & RBAC
# =========================

JWT_SECRET = os.getenv("JWT_SECRET", "factory_ppe_monitoring_super_secret_jwt_key_2026")
JWT_ALGORITHM = "HS256"

def encode_token(user, remember_me=False):
    exp_delta = timedelta(days=30) if remember_me else timedelta(hours=24)
    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "email": user["email"],
        "exp": datetime.utcnow() + exp_delta
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        if not token:
            token = request.args.get("token")
        
        if not token:
            return jsonify({"error": "Unauthorized", "message": "Authentication token missing"}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Unauthorized", "message": "Token is invalid or expired"}), 401
        
        current_user = db.get_user_by_id(payload.get("user_id"))
        if not current_user or current_user.get("is_active") == 0:
            return jsonify({"error": "Unauthorized", "message": "User account inactive or disabled"}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden", "message": f"Role '{current_user.get('role')}' is not authorized for this resource"}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator


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

INITIAL_OBSERVATION_SECONDS = 2.0
HELMET_CONFIRM_SECONDS = 1.0
NO_HELMET_CONFIRM_SECONDS = 3.0
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
            current_time = time.time()

            # Debug print every frame
            print(f"[DEBUG FRAME] Detected Track IDs: {[p['track_id'] for p in persons]}")
            print(f"[DEBUG FRAME] Current person_states keys: {list(person_states.keys())}")
            print(f"[DEBUG FRAME] Current active_incidents keys: {list(active_incidents.keys())}")

            # Clean up expired tracks once per frame
            expired_tracks = []
            for tid, state in person_states.items():
                if current_time - state["last_seen"] > PERSON_TIMEOUT_SECONDS:
                    expired_tracks.append(tid)

            for tid in expired_tracks:
                print("TRACK TIMEOUT")
                print(f"track_id: {tid}")
                print(f"last_seen: {person_states[tid].get('last_seen')}")
                print(f"current_time: {current_time}")

                if tid in active_incidents:
                    incident = active_incidents[tid]
                    event_id = incident.get("event_id")
                    start_time = incident["start_time"]
                    end_time = current_time
                    duration = max(1, int(round(end_time - start_time)))

                    if event_id is not None:
                        print("UPDATING EVENT")
                        print(f"event_id: {event_id}")
                        print(f"track_id: {tid}")
                        print(f"start_time: {start_time}")
                        print(f"end_time: {end_time}")
                        print(f"duration: {duration}")

                        print("active_incidents BEFORE update:", active_incidents)
                        db.update_event(
                            event_id=event_id,
                            end_time=end_time,
                            duration=duration,
                            resolved=1
                        )
                        del active_incidents[tid]
                        print("active_incidents AFTER deletion:", active_incidents)
                    else:
                        del active_incidents[tid]

                del person_states[tid]

            for person in persons:
                track_id = person["track_id"]
                current_time = time.time()

                if track_id != -1 and track_id not in person_states:
                    person_states[track_id] = {
                        "status": "UNKNOWN",
                        "first_seen": current_time,
                        "helmet_detected_since": None,
                        "helmet_missing_since": None,
                        "violation_duration": 0,
                        "last_seen": current_time,
                        "violation_sent": False,
                        "snapshot_saved": False
                    }

                if track_id != -1:
                    state = person_states[track_id]
                    state["last_seen"] = current_time

                px1, py1, px2, py2 = person["box"]
                person_width = px2 - px1
                person_height = py2 - py1

                person_center_x = (px1 + px2) / 2
                person_center_y = (py1 + py2) / 2

                current_zone = zone_manager.get_zone(
                    (int(person_center_x), int(person_center_y))
                )

                if current_zone is None:
                    current_zone = "Unknown"

                helmet_found = False
                best_helmet_distance = float("inf")

                # =========================
                # FIND BEST HELMET MATCH
                # =========================

                for helmet in helmets:
                    hx1, hy1, hx2, hy2 = helmet["box"]

                    helmet_center_x = (hx1 + hx2) / 2
                    helmet_center_y = (hy1 + hy2) / 2

                    horizontal_offset = abs(helmet_center_x - person_center_x)
                    max_horizontal_distance = person_width * 0.60

                    if horizontal_offset > max_horizontal_distance:
                        continue

                    vertical_distance = helmet_center_y - py1
                    max_vertical_distance = person_height * 0.70

                    if vertical_distance < -(person_height * 0.20):
                        continue

                    if vertical_distance > max_vertical_distance:
                        continue

                    normalized_horizontal = horizontal_offset / max(person_width, 1)
                    normalized_vertical = max(vertical_distance, 0) / max(person_height, 1)

                    distance_score = normalized_horizontal + normalized_vertical

                    if distance_score < best_helmet_distance:
                        best_helmet_distance = distance_score
                        helmet_found = True

                # =========================
                # TEMPORAL PPE SMOOTHING
                # =========================

                if track_id != -1:
                    state = person_states[track_id]
                    first_seen = state.get("first_seen", current_time)
                    observation_elapsed = current_time - first_seen

                    if helmet_found:
                        if state["helmet_detected_since"] is None:
                            state["helmet_detected_since"] = current_time

                        helmet_duration = current_time - state["helmet_detected_since"]

                        if helmet_duration >= HELMET_CONFIRM_SECONDS:
                            print("HELMET CONFIRMATION REACHED")
                            print(f"track_id: {track_id}")
                            print(f"helmet_duration: {helmet_duration}")

                            state["status"] = "HELMET"
                            state["helmet_missing_since"] = None
                            state["violation_duration"] = 0
                            state["violation_sent"] = False
                            state["snapshot_saved"] = False

                            # Helmet is back on: finish active incident if any
                            if track_id in active_incidents:
                                incident = active_incidents[track_id]
                                event_id = incident.get("event_id")
                                start_time = incident["start_time"]
                                end_time = current_time
                                duration = max(1, int(round(end_time - start_time)))

                                if event_id is not None:
                                    print("UPDATING EVENT")
                                    print(f"event_id: {event_id}")
                                    print(f"track_id: {track_id}")
                                    print(f"start_time: {start_time}")
                                    print(f"end_time: {end_time}")
                                    print(f"duration: {duration}")

                                    print("active_incidents BEFORE update:", active_incidents)
                                    db.update_event(
                                        event_id=event_id,
                                        end_time=end_time,
                                        duration=duration,
                                        resolved=1
                                    )
                                    del active_incidents[track_id]
                                    print("active_incidents AFTER deletion:", active_incidents)
                                else:
                                    del active_incidents[track_id]

                    else:
                        if state["helmet_missing_since"] is None:
                            state["helmet_missing_since"] = current_time

                        missing_duration = current_time - state["helmet_missing_since"]
                        state["violation_duration"] = int(missing_duration)

                        # TWO-STAGE CONFIRMATION PROCESS:
                        # Stage 1: Observe track for at least INITIAL_OBSERVATION_SECONDS (2.0s). No DB inserts or snapshots allowed during observation.
                        # Stage 2: Require NO_HELMET_CONFIRM_SECONDS (3.0s) of continuous missing helmet detection.
                        if observation_elapsed >= INITIAL_OBSERVATION_SECONDS and missing_duration >= NO_HELMET_CONFIRM_SECONDS:
                            print("NO HELMET CONFIRMATION REACHED (TWO-STAGE VERIFIED)")
                            print(f"track_id: {track_id}")
                            print(f"observation_elapsed: {observation_elapsed:.2f}s")
                            print(f"missing_duration: {missing_duration:.2f}s")

                            state["status"] = "NO HELMET"
                            state["helmet_detected_since"] = None

                            if track_id not in active_incidents:
                                filename = save_snapshot(frame, track_id, bbox=[px1, py1, px2, py2], label="NO HELMET")

                                event_id = db.insert_event(
                                    track_id=track_id,
                                    event_type="Helmet Missing",
                                    zone=current_zone,
                                    snapshot_path=filename,
                                    start_time=current_time,
                                    end_time=None,
                                    duration=0
                                )

                                active_incidents[track_id] = {
                                    "event_id": event_id,
                                    "start_time": current_time,
                                    "snapshot_path": filename,
                                    "zone": current_zone,
                                    "event_type": "Helmet Missing"
                                }

                                print("========== NEW INCIDENT STARTED ==========")
                                print(f"Track: {track_id}")
                                print(f"Event ID: {event_id}")
                                print(f"Start Time: {current_time}")

                                # Trigger Evidence Video Recording (3s pre + 3s post)
                                pre_frames = rolling_buffer.get_snapshot()
                                record_evidence_clip_async(
                                    event_id=event_id,
                                    track_id=track_id,
                                    pre_frames=pre_frames,
                                    frame_provider_func=get_latest_annotated_frame,
                                    db_instance=db,
                                    fps=rolling_buffer.fps,
                                    post_duration_seconds=3.0
                                )

                            state["snapshot_saved"] = True
                            state["violation_sent"] = True

                    ppe_status = state["status"]

                    print("============================")
                    print(f"TRACK {track_id}")
                    print(f"Current Status: {state.get('status')}")
                    print(f"helmet_detected_since: {state.get('helmet_detected_since')}")
                    print(f"helmet_missing_since: {state.get('helmet_missing_since')}")
                    print(f"last_seen: {state.get('last_seen')}")
                    print(f"status: {state.get('status')}")
                    print(f"violation_sent: {state.get('violation_sent')}")
                    print(f"snapshot_saved: {state.get('snapshot_saved')}")
                    print(f"Incident Exists: {track_id in active_incidents}")
                    print(f"Event ID: {active_incidents[track_id].get('event_id') if track_id in active_incidents else 'N/A'}")
                    print("============================")
                else:
                    ppe_status = "HELMET" if helmet_found else "NO HELMET"

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

            # Append rendered frame to in-memory rolling circular buffer
            rolling_buffer.append(frame)

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
        "system": "Factory PPE Monitoring System",
        "status": "online"
    })

# =========================
# AUTHENTICATION & PROFILE
# =========================

@app.route("/api/login", methods=["POST"])
def login_api():
    try:
        data = request.get_json() or {}
        username_or_email = data.get("username", "").strip()
        password = data.get("password", "").strip()
        remember_me = bool(data.get("remember_me", False))

        if not username_or_email or not password:
            return jsonify({"error": "Bad Request", "message": "Username/email and password are required"}), 400

        user = db.get_user_by_username(username_or_email)
        if not user:
            return jsonify({"error": "Unauthorized", "message": "Invalid credentials"}), 401

        if user.get("is_active") == 0:
            return jsonify({"error": "Unauthorized", "message": "Account is deactivated. Contact Administrator."}), 401

        # Verify password using bcrypt
        valid_password = False
        try:
            valid_password = bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8"))
        except Exception as e:
            print(f"Bcrypt error during login: {e}")
            valid_password = False

        if not valid_password:
            return jsonify({"error": "Unauthorized", "message": "Invalid credentials"}), 401

        last_login_time = db.update_last_login(user["id"])
        user["last_login"] = last_login_time

        token = encode_token(user, remember_me=remember_me)
        is_default_admin = (user["username"] == "admin" and password == "admin123")

        user_info = {
            "id": user["id"],
            "full_name": user["full_name"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "last_login": user["last_login"]
        }

        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": user_info,
            "is_default_admin": is_default_admin
        }), 200
    except Exception as e:
        print(f"Login API Error: {e}")
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/me", methods=["GET"])
@token_required
def get_current_user_api(current_user):
    user_info = {
        "id": current_user["id"],
        "full_name": current_user["full_name"],
        "username": current_user["username"],
        "email": current_user["email"],
        "role": current_user["role"],
        "last_login": current_user["last_login"]
    }
    return jsonify(user_info), 200


@app.route("/api/me/password", methods=["PUT"])
@token_required
def change_own_password_api(current_user):
    try:
        data = request.get_json() or {}
        current_pass = data.get("current_password", "").strip()
        new_pass = data.get("new_password", "").strip()
        confirm_pass = data.get("confirm_password", "").strip()

        if not current_pass or not new_pass:
            return jsonify({"error": "Bad Request", "message": "Current password and new password are required"}), 400

        if confirm_pass and new_pass != confirm_pass:
            return jsonify({"error": "Bad Request", "message": "New password and confirmation password do not match"}), 400

        # Check Old Password with bcrypt
        db_hash = current_user.get("password_hash", "")
        old_pass_valid = bcrypt.checkpw(current_pass.encode("utf-8"), db_hash.encode("utf-8")) if db_hash else False

        if not old_pass_valid:
            return jsonify({"error": "Unauthorized", "message": "Incorrect current password"}), 401

        if len(new_pass) < 6:
            return jsonify({"error": "Bad Request", "message": "New password must be at least 6 characters long"}), 400

        # Password Reuse Check
        reused = bcrypt.checkpw(new_pass.encode("utf-8"), db_hash.encode("utf-8"))
        if reused:
            return jsonify({"error": "Bad Request", "message": "New password cannot be the same as current password"}), 400

        new_hash = bcrypt.hashpw(new_pass.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.update_user_password(current_user["id"], new_hash)

        return jsonify({"message": "Password changed successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500



# =========================
# REPORTS MODULE APIS (ZERO MOCK DATA)
# =========================

@app.route("/api/reports/daily_summary", methods=["GET"])
@token_required
def daily_summary_report_api(current_user):
    try:
        date_str = request.args.get("date")
        report_data = db.get_daily_hse_summary_report(target_date=date_str)
        return jsonify(report_data), 200
    except Exception as e:
        print(f"Daily Summary Report API Error: {e}")
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/reports/incident_investigation", methods=["GET"])
@token_required
def incident_investigation_report_api(current_user):
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        zone = request.args.get("zone")
        event_type = request.args.get("event_type")
        status = request.args.get("status")

        report_data = db.get_incident_investigation_report(
            start_date=start_date,
            end_date=end_date,
            zone=zone,
            event_type=event_type,
            status=status
        )
        return jsonify(report_data), 200
    except Exception as e:
        print(f"Incident Investigation Report API Error: {e}")
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/reports/executive_analytics", methods=["GET"])
@token_required
def executive_analytics_report_api(current_user):
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        report_data = db.get_executive_analytics_report(start_date=start_date, end_date=end_date)
        return jsonify(report_data), 200
    except Exception as e:
        print(f"Executive Analytics Report API Error: {e}")
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/reports/export_excel", methods=["GET"])
@token_required
def export_excel_report_api(current_user):
    try:
        report_type = request.args.get("report_type", "daily_summary")
        user_name = current_user.get("full_name") or current_user.get("username", "HSE Officer")
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M")

        if report_type == "daily_summary":
            date_str = request.args.get("date")
            report_data = db.get_daily_hse_summary_report(target_date=date_str)
            excel_bytes = generate_daily_summary_excel(report_data, generated_by=user_name)
            filename = f"Daily_HSE_Summary_{timestamp_str}.xlsx"

        elif report_type == "incident_investigation":
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            zone = request.args.get("zone")
            event_type = request.args.get("event_type")
            status = request.args.get("status")

            filters = {
                "start_date": start_date,
                "end_date": end_date,
                "zone": zone,
                "event_type": event_type,
                "status": status
            }

            report_data = db.get_incident_investigation_report(
                start_date=start_date,
                end_date=end_date,
                zone=zone,
                event_type=event_type,
                status=status
            )
            excel_bytes = generate_incident_investigation_excel(report_data, filters=filters, generated_by=user_name)
            filename = f"Incident_Investigation_{timestamp_str}.xlsx"

        elif report_type == "executive_analytics":
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            report_data = db.get_executive_analytics_report(start_date=start_date, end_date=end_date)
            excel_bytes = generate_executive_analytics_excel(report_data, generated_by=user_name)
            filename = f"Executive_Report_{timestamp_str}.xlsx"

        else:
            return jsonify({"error": "Bad Request", "message": f"Unsupported report_type: {report_type}"}), 400

        return send_file(
            io.BytesIO(excel_bytes),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        print(f"Export Excel Report API Error: {e}")
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/reports/export_pdf", methods=["GET"])
@app.route("/api/reports/daily_summary/pdf", methods=["GET"])
@app.route("/api/reports/incident_investigation/pdf", methods=["GET"])
@app.route("/api/reports/executive_analytics/pdf", methods=["GET"])
@token_required
def export_pdf_report_api(current_user):
    try:
        req_path = request.path
        if "daily_summary" in req_path:
            report_type = "daily_summary"
        elif "incident_investigation" in req_path:
            report_type = "incident_investigation"
        elif "executive_analytics" in req_path:
            report_type = "executive_analytics"
        else:
            report_type = request.args.get("report_type", "daily_summary")

        user_name = current_user.get("full_name") or current_user.get("username", "HSE Officer")
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M")

        if report_type == "daily_summary":
            date_str = request.args.get("date")
            report_data = db.get_daily_hse_summary_report(target_date=date_str)
            pdf_bytes = generate_daily_summary_pdf(report_data, generated_by=user_name)
            filename = f"Daily_HSE_Summary_{timestamp_str}.pdf"

        elif report_type == "incident_investigation":
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            zone = request.args.get("zone")
            event_type = request.args.get("event_type")
            status = request.args.get("status")

            filters = {
                "start_date": start_date,
                "end_date": end_date,
                "zone": zone,
                "event_type": event_type,
                "status": status
            }

            report_data = db.get_incident_investigation_report(
                start_date=start_date,
                end_date=end_date,
                zone=zone,
                event_type=event_type,
                status=status
            )
            pdf_bytes = generate_investigation_pdf(report_data, filters=filters, generated_by=user_name)
            filename = f"Incident_Investigation_{timestamp_str}.pdf"

        elif report_type == "executive_analytics":
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            report_data = db.get_executive_analytics_report(start_date=start_date, end_date=end_date)
            pdf_bytes = generate_executive_pdf(report_data, generated_by=user_name)
            filename = f"Executive_Analytics_{timestamp_str}.pdf"

        else:
            return jsonify({"error": "Bad Request", "message": f"Unsupported report_type: {report_type}"}), 400

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        print(f"Export PDF Report API Error: {e}")
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500



# =========================
# USER MANAGEMENT (ADMIN ONLY)
# =========================

@app.route("/api/users", methods=["GET"])
@token_required
@role_required("Admin")
def get_users_api(current_user):
    users = db.get_all_users()
    return jsonify(users), 200


@app.route("/api/users", methods=["POST"])
@token_required
@role_required("Admin")
def create_user_api(current_user):
    try:
        data = request.get_json() or {}
        full_name = data.get("full_name", "").strip()
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        role = data.get("role", "Viewer").strip()

        if not full_name or not username or not email or not password:
            return jsonify({"error": "Bad Request", "message": "All fields are required"}), 400

        if role not in ["Admin", "HSE Officer", "Viewer"]:
            return jsonify({"error": "Bad Request", "message": "Invalid role specified"}), 400

        if db.get_user_by_username(username):
            return jsonify({"error": "Conflict", "message": "Username or Email already exists"}), 409

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        new_id = db.create_user(full_name, username, email, password_hash, role)

        return jsonify({
            "message": "User created successfully",
            "user": {
                "id": new_id,
                "full_name": full_name,
                "username": username,
                "email": email,
                "role": role,
                "is_active": 1
            }
        }), 201
    except Exception as e:
        print(f"Create User Error: {e}")
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@token_required
@role_required("Admin")
def update_user_api(current_user, user_id):
    try:
        data = request.get_json() or {}
        full_name = data.get("full_name", "").strip()
        email = data.get("email", "").strip()
        role = data.get("role", "").strip()

        if not full_name or not email or not role:
            return jsonify({"error": "Bad Request", "message": "Name, email, and role are required"}), 400

        if role not in ["Admin", "HSE Officer", "Viewer"]:
            return jsonify({"error": "Bad Request", "message": "Invalid role specified"}), 400

        success = db.update_user(user_id, full_name, email, role)
        if not success:
            return jsonify({"error": "Not Found", "message": "User not found"}), 404

        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/users/<int:user_id>/status", methods=["PUT"])
@token_required
@role_required("Admin")
def toggle_user_status_api(current_user, user_id):
    try:
        if user_id == current_user["id"]:
            return jsonify({"error": "Forbidden", "message": "You cannot deactivate your own admin account"}), 403

        data = request.get_json() or {}
        is_active = data.get("is_active", True)
        db.set_user_active_status(user_id, is_active)
        return jsonify({"message": f"User status set to {'active' if is_active else 'inactive'}"}), 200
    except Exception as e:
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/users/<int:user_id>/reset-password", methods=["PUT"])
@token_required
@role_required("Admin")
def reset_user_password_api(current_user, user_id):
    try:
        data = request.get_json() or {}
        new_password = data.get("new_password", "").strip()

        if not new_password or len(new_password) < 6:
            return jsonify({"error": "Bad Request", "message": "Password must be at least 6 characters long"}), 400

        password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.update_user_password(user_id, password_hash)
        return jsonify({"message": "User password reset successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@token_required
@role_required("Admin")
def delete_user_api(current_user, user_id):
    try:
        if user_id == current_user["id"]:
            return jsonify({"error": "Forbidden", "message": "You cannot delete your own admin account"}), 403

        success = db.delete_user(user_id)
        if not success:
            return jsonify({"error": "Not Found", "message": "User not found"}), 404

        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


@app.route("/api/events/<int:event_id>", methods=["DELETE"])
@token_required
@role_required("Admin")
def delete_event_api(current_user, event_id):
    try:
        success = db.delete_event(event_id)
        if not success:
            return jsonify({"error": "Not Found", "message": "Event not found"}), 404
        return jsonify({"message": "Event deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500


# =========================
# PROTECTED DOMAIN APIS
# =========================

@app.route("/camera/status")
@token_required
def camera_status(current_user):
    return jsonify({
        "connected": camera_connected,
        "model": MODEL_PATH,
        "confidence": CONFIDENCE
    })

@app.route("/detection/stats")
@token_required
def detection_stats_api(current_user):
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
@token_required
@role_required("Admin", "HSE Officer")
def events_api(current_user):
    rows = db.get_recent_events(50)
    events_list = []
    current_time = time.time()

    for row in rows:
        event_id = row[0]
        timestamp = row[1]
        track_id = row[2]
        zone = row[3] or "Unknown"
        event_type = row[4]
        confidence = row[5] if row[5] is not None else 1.0
        snapshot_path = row[6] or ""
        video_path = row[7] or ""
        st_str = row[8] or timestamp
        end_str = row[9]
        row_duration = row[10] if row[10] is not None else 0
        resolved_flag = row[11] if row[11] is not None else 0

        is_completed = (resolved_flag == 1)

        if is_completed:
            status = "Completed"
            display_end_time = end_str if end_str else st_str
            dur = row_duration if row_duration > 0 else 1
        else:
            status = "Active"
            display_end_time = "Ongoing"
            if track_id in active_incidents and "start_time" in active_incidents[track_id]:
                dur = max(1, int(current_time - active_incidents[track_id]["start_time"]))
            else:
                try:
                    dt = datetime.strptime(st_str, "%Y-%m-%d %H:%M:%S")
                    dur = max(1, int(current_time - dt.timestamp()))
                except Exception:
                    dur = max(1, row_duration)

        events_list.append({
            "id": event_id,
            "timestamp": timestamp,
            "track_id": track_id,
            "zone": zone,
            "event_type": event_type,
            "confidence": confidence,
            "snapshot_path": snapshot_path,
            "video_path": video_path,
            "start_time": st_str,
            "end_time": display_end_time,
            "duration": dur,
            "resolved": 1 if is_completed else 0,
            "status": status
        })

    return jsonify(events_list)


@app.route("/zones")
@token_required
@role_required("Admin", "HSE Officer")
def zones_api(current_user):
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
@app.route("/static/snapshots/<filename>")
def snapshots(filename):
    snapshots_dir = os.path.join(os.path.dirname(__file__), "static", "snapshots")
    return send_from_directory(
        snapshots_dir,
        filename
    )

@app.route("/videos/<filename>")
@app.route("/evidence/videos/<filename>")
@app.route("/static/evidence/videos/<filename>")
def serve_evidence_video(filename):
    video_dir = EVIDENCE_VIDEO_DIR
    if not os.path.exists(os.path.join(video_dir, filename)):
        alt_dir = os.path.join(os.path.dirname(__file__), "static", "videos")
        if os.path.exists(os.path.join(alt_dir, filename)):
            video_dir = alt_dir
    return send_from_directory(
        video_dir,
        filename
    )

# =========================
# VIDEO FEED
# =========================

@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/analytics")
@token_required
def analytics(current_user):
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(
        db.get_analytics(start_date=start_date, end_date=end_date)
    )

@app.route("/api/events/paged")
@token_required
@role_required("Admin", "HSE Officer")
def events_paged_api(current_user):
    try:
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        search = request.args.get("search", "")
        zone = request.args.get("zone", "")
        event_type = request.args.get("event_type", "")
        status = request.args.get("status", "")
        date = request.args.get("date", "")
        sort_field = request.args.get("sort_field", "id")
        sort_order = request.args.get("sort_order", "desc")

        res = db.get_paged_events(
            page=page,
            limit=limit,
            search=search,
            zone=zone,
            event_type=event_type,
            status=status,
            date=date,
            sort_field=sort_field,
            sort_order=sort_order
        )

        current_time = time.time()
        formatted_events = []
        for row in res["events"]:
            event_id = row[0]
            timestamp = row[1]
            track_id = row[2]
            z = row[3] or "Unknown"
            evt_type = row[4]
            conf = row[5] if row[5] is not None else 1.0
            snap_path = row[6] or ""
            vid_path = row[7] or ""
            st_str = row[8] or timestamp
            end_str = row[9]
            row_dur = row[10] if row[10] is not None else 0
            res_flag = row[11] if row[11] is not None else 0

            is_completed = (res_flag == 1)

            if is_completed:
                evt_status = "Completed"
                display_end_time = end_str if end_str else st_str
                dur = row_dur if row_dur > 0 else 1
            else:
                evt_status = "Active"
                display_end_time = "Ongoing"
                if track_id in active_incidents and "start_time" in active_incidents[track_id]:
                    dur = max(1, int(current_time - active_incidents[track_id]["start_time"]))
                else:
                    try:
                        dt = datetime.strptime(st_str, "%Y-%m-%d %H:%M:%S")
                        dur = max(1, int(current_time - dt.timestamp()))
                    except Exception:
                        dur = max(1, row_dur)

            formatted_events.append({
                "id": event_id,
                "timestamp": timestamp,
                "track_id": track_id,
                "zone": z,
                "event_type": evt_type,
                "confidence": conf,
                "snapshot_path": snap_path,
                "video_path": vid_path,
                "start_time": st_str,
                "end_time": display_end_time,
                "duration": dur,
                "resolved": 1 if is_completed else 0,
                "status": evt_status
            })

        res["events"] = formatted_events
        return jsonify(res)
    except Exception as e:
        print(f"Paged Events API Error: {e}")
        return jsonify({"events": [], "total": 0, "page": 1, "limit": 10, "total_pages": 1}), 500

@app.route("/api/hourly_violations")
@token_required
def hourly_violations_api(current_user):
    try:
        target_date = request.args.get("date")
        return jsonify(db.get_hourly_violations(target_date=target_date))
    except Exception as e:
        print(f"Hourly Violations API Error: {e}")
        return jsonify([]), 500

@app.route("/api/zone_distribution")
@token_required
def zone_distribution_api(current_user):
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        return jsonify(db.get_zone_worker_distribution(start_date=start_date, end_date=end_date))
    except Exception as e:
        print(f"Zone Distribution API Error: {e}")
        return jsonify([]), 500

@app.route("/api/alerts/active")
@token_required
@role_required("Admin", "HSE Officer")
def active_alerts_api(current_user):
    try:
        return jsonify(db.get_active_alerts())
    except Exception as e:
        print(f"Active Alerts API Error: {e}")
        return jsonify([]), 500


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

    # Start Evidence Video Retention Cleanup Daemon (30 days retention, 24-hour cycle)
    start_video_cleanup_daemon(interval_seconds=86400, retention_days=30)

    # Start Flask
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        threaded=True
    )
