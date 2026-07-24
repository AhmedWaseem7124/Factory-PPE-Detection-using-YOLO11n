from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import threading
import time
import os
from dotenv import load_dotenv

load_dotenv()

RTSP_URL = os.getenv("RTSP_URL")
app = Flask(__name__)
CORS(app)

# =========================
# CONFIGURATION
# =========================


MODEL_PATH = "../runs/detect/runs/helmet_person_v2/weights/best.pt"

model = YOLO(MODEL_PATH)


CONFIDENCE = 0.50

# Lower = faster CPU inference
IMAGE_SIZE = 416


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

print("[MODEL] Loading YOLO model...")

model = YOLO(MODEL_PATH)

print("[MODEL] Model loaded successfully")


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

HELMET_CONFIRM_FRAMES = 3
NO_HELMET_CONFIRM_FRAMES = 5

# =========================
# YOLO INFERENCE THREAD
# =========================

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

            results = model.track(
                source=frame,
                imgsz=IMAGE_SIZE,
                conf=CONFIDENCE,
                tracker="bytetrack.yaml",
                persist=True,
                verbose=False
            )

            result = results[0]


# =========================
# DETECTION LISTS
# =========================

            persons = []
            helmets = []

            if result.boxes is not None:

                for box in result.boxes:

                    class_id = int(box.cls[0])

                    class_name = model.names[class_id].lower()

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

                    if class_name == "person":

                        persons.append(detection)

                    elif class_name == "helmet":

                        helmets.append(detection)


# =========================
# PERSON-HELMET ASSOCIATION
# WITH TEMPORAL SMOOTHING
# =========================

            compliant_people = 0
            violations = 0

# Track each person's PPE state
            for person in persons:

                px1, py1, px2, py2 = person["box"]

                track_id = person["track_id"]

                person_width = px2 - px1
                person_height = py2 - py1

    # =========================
    # DEFINE HEAD REGION
    # =========================

    # Top 40% of person's bounding box
    # Slightly larger than previous 35%
    # to reduce association flickering.

                head_y2 = int(
                    py1 + (person_height * 0.40)
                )

    # =========================
    # CHECK FOR HELMET
    # =========================

                helmet_found = False

                for helmet in helmets:

                    hx1, hy1, hx2, hy2 = helmet["box"]

                    helmet_center_x = (
                         hx1 + hx2
                    ) // 2

                    helmet_center_y = (
                         hy1 + hy2
                    ) // 2

        # Check if helmet center is inside
        # person's head region.

                    if (

                        px1 <= helmet_center_x <= px2

                        and

                        py1 <= helmet_center_y <= head_y2

                    ):

                        helmet_found = True

                        break


    # =========================
    # INITIALIZE PERSON STATE
    # =========================

                if track_id not in person_states:

                    person_states[track_id] = {

                        "helmet_detected_frames": 0,

                        "helmet_missing_frames": 0,

                        "status": "UNKNOWN"

                    }


                state = person_states[track_id]


    # =========================
    # TEMPORAL SMOOTHING
    # =========================

                if helmet_found:

        # Helmet detected in current frame

                    state["helmet_detected_frames"] += 1

                    state["helmet_missing_frames"] = 0


        # Confirm helmet after
        # consecutive detections

                    if (

                        state["helmet_detected_frames"]

                        >= HELMET_CONFIRM_FRAMES

                    ):

                        state["status"] = "HELMET"


                else:

        # Helmet NOT detected
        # in current frame

                    state["helmet_missing_frames"] += 1

                    state["helmet_detected_frames"] = 0


        # Confirm NO HELMET only after
        # several consecutive missed frames

                    if (

                        state["helmet_missing_frames"]

                        >= NO_HELMET_CONFIRM_FRAMES

                    ):

                        state["status"] = "NO HELMET"


    # =========================
    # GET STABLE PPE STATUS
    # =========================

                ppe_status = state["status"]


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

    with stats_lock:

        return jsonify(
            detection_stats
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
