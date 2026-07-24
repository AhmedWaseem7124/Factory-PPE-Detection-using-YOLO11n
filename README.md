# Factory PPE Detection System

An AI-powered real-time Factory Personal Protective Equipment (PPE) Monitoring System using CCTV/RTSP video streams, YOLO object detection, ByteTrack object tracking, Flask, and React.

The system is designed to monitor factory workers in real time and identify whether personnel are wearing required safety helmets.

---

## Project Overview

This project uses an industrial CCTV camera connected through an RTSP stream to perform real-time PPE monitoring.

The current system detects:

- Person
- Safety Helmet

The detection pipeline processes the live camera feed, tracks individual people across frames, associates helmets with detected people, and determines their PPE compliance status.

The system also includes temporal smoothing to reduce false "No Helmet" detections caused by temporary missed helmet detections.

---

## Key Features

- Real-time CCTV/RTSP video monitoring
- YOLO-based person and helmet detection
- Custom-trained PPE detection model
- YOLO v2 model trained with hard-negative samples
- ByteTrack multi-object tracking
- Persistent person tracking IDs
- Person–helmet association
- Temporal PPE status smoothing
- Real-time compliance statistics
- Flask backend
- React + Vite frontend
- Live monitoring dashboard
- CORS-enabled frontend/backend communication
- CPU-optimized inference configuration

---

## System Architecture

```text
Factory CCTV Camera
        |
        | RTSP Stream
        v
+----------------------+
| Camera Capture       |
| Thread               |
+----------------------+
        |
        v
Latest Frame Buffer
        |
        v
+----------------------+
| YOLO v2 Detection    |
| Person + Helmet      |
+----------------------+
        |
        v
+----------------------+
| ByteTrack Tracking   |
| Track IDs            |
+----------------------+
        |
        v
Person–Helmet
Association
        |
        v
Temporal PPE Smoothing
        |
        v
Stable PPE Status
        |
        +-------------------+
        |                   |
        v                   v
    Compliant           No Helmet
        |                   |
        v                   v
  Dashboard Stats     Active Violation
                       Tracking
        |
        v
React Dashboard
````

---

## Technology Stack

### Backend

* Python
* Flask
* Flask-CORS
* OpenCV
* Ultralytics YOLO
* ByteTrack
* SQLite (planned for violation management)
* python-dotenv

### Frontend

* React
* Vite
* JavaScript
* HTML
* CSS

### AI / Computer Vision

* YOLO
* Custom PPE dataset
* Person detection
* Helmet detection
* ByteTrack object tracking
* Temporal smoothing

### Camera

* CCTV/IP Camera
* RTSP video stream
* OpenCV + FFmpeg

---

# AI Model

## Model Version

The system currently uses:

```text
YOLO v2
```

Model path:

```text
runs/detect/runs/helmet_person_v2/weights/best.pt
```

The model was trained specifically for the factory PPE monitoring environment.

---

## Model Classes

The current model detects:

```text
person
helmet
```

The model is used to determine whether detected personnel are wearing safety helmets.

---

# Dataset

The dataset was manually annotated.

Each image was reviewed and annotated manually.

No steel pipes or factory barriers were intentionally annotated as persons.

The dataset was collected from the factory CCTV environment to improve performance under real-world camera conditions.

---

## Hard Negative Training

During testing, the model initially produced a false positive where a steel barrier was detected as a person.

To address this issue, additional hard-negative samples were collected.

A total of:

```text
88 hard-negative images
```

were added to the training process.

These hard negatives contained examples of objects that should NOT be classified as people.

The purpose was to teach the model to distinguish between:

```text
Real Person
        vs.
Steel Barrier / Background Structure
```

---

## Result of Hard Negative Training

The updated YOLO v2 model was tested against the same factory environment.

The previous behavior:

```text
Steel Barrier
      ↓
Detected as Person
      ↓
False Positive
```

After hard-negative training:

```text
Steel Barrier
      ↓
Not detected as Person
      ↓
False Positive Reduced
```

The YOLO v2 model is now being used as the active model in the backend.

---

# Training

The model was trained for:

```text
50 epochs
```

Training was temporarily interrupted around epoch 48 due to a system update.

Training was successfully resumed using the saved checkpoint:

```text
last.pt
```

The training was then completed successfully.

The final model is:

```text
best.pt
```

---

# YOLO v1 vs YOLO v2

## YOLO v1

The first trained model was used for initial live testing.

Issues identified during testing included:

* False person detections
* Steel barrier detected as a person
* Temporary helmet detection instability

---

## YOLO v2

YOLO v2 was trained with additional hard-negative samples.

Improvements:

* Reduced steel barrier false positives
* Improved performance in the factory environment
* Better suitability for real-world deployment

YOLO v2 is now the active model.

---

# Real-Time Detection Pipeline

The backend receives frames from the CCTV camera through RTSP.

The camera capture thread continuously reads frames.

The latest frame is stored instead of building a large frame queue.

This approach prevents the system from processing old frames and helps reduce latency.

The frame is resized to:

```text
704 x 576
```

YOLO inference is performed using:

```text
Image Size: 416
Confidence Threshold: 0.50
```

---

# Object Tracking

The system uses:

```text
ByteTrack
```

for multi-object tracking.

Each detected person receives a tracking ID.

Example:

```text
Person #1
Person #2
Person #3
```

The tracking ID is used to maintain the identity of a person across consecutive frames.

These tracking IDs are temporary session-level identifiers.

They are NOT treated as permanent employee IDs.

For example:

```text
Camera Session
    |
    +-- Person #1
    +-- Person #2
    +-- Person #3
```

If the camera restarts, the same physical person may receive a different tracking ID.

Permanent employee identification is not currently implemented.

---

# Person–Helmet Association

The system determines whether a detected helmet belongs to a detected person.

The current association logic checks whether the helmet is located in the upper/head region of the person's bounding box.

The head region is approximately the upper:

```text
40%
```

of the person's bounding box.

This was increased from the previous 35% region to reduce association instability when people move.

The system checks whether the center point of the helmet detection falls within the person's head region.

---

# Temporal PPE Smoothing

A major issue identified during live testing was temporary helmet detection instability.

For example:

```text
Frame 1 → Helmet
Frame 2 → Helmet
Frame 3 → No Helmet
Frame 4 → Helmet
Frame 5 → No Helmet
Frame 6 → Helmet
```

This does not necessarily mean that the worker removed their helmet.

The helmet may temporarily disappear from the detector because of:

* Person movement
* Camera angle
* Occlusion
* Motion blur
* Detection confidence
* Bounding-box changes

To prevent false PPE violations, temporal smoothing was implemented.

---

## Helmet Confirmation

A helmet must be detected for:

```text
3 consecutive frames
```

before the person's PPE status becomes:

```text
HELMET
```

Configuration:

```python
HELMET_CONFIRM_FRAMES = 3
```

---

## No Helmet Confirmation

A helmet must be missing for:

```text
5 consecutive frames
```

before the system changes the person's PPE status to:

```text
NO HELMET
```

Configuration:

```python
NO_HELMET_CONFIRM_FRAMES = 5
```

---

## Example

The system receives:

```text
Helmet
Helmet
No Helmet
No Helmet
Helmet
Helmet
Helmet
```

The temporary missed detections do not immediately cause a violation.

The system maintains the previous stable state.

A "No Helmet" status is only confirmed after the configured number of consecutive missed detections.

---

# PPE Status States

Each tracked person can have one of the following states:

```text
UNKNOWN
HELMET
NO HELMET
```

### UNKNOWN

The system is still waiting for enough frames to confirm the PPE status.

### HELMET

The helmet has been consistently detected.

### NO HELMET

The helmet has not been detected for the required number of consecutive frames.

---

# Backend

The backend is implemented using Flask.

The backend handles:

* RTSP camera connection
* Camera frame capture
* YOLO inference
* ByteTrack tracking
* Person detection
* Helmet detection
* Person–helmet association
* Temporal PPE smoothing
* Detection statistics
* Live processed video
* API endpoints for the frontend

---

## Backend Configuration

The current YOLO model path:

```python
MODEL_PATH = "../runs/detect/runs/helmet_person_v2/weights/best.pt"
```

Current detection confidence:

```python
CONFIDENCE = 0.50
```

Current inference image size:

```python
IMAGE_SIZE = 416
```

The RTSP URL is stored in the `.env` file.

Example:

```env
RTSP_URL=rtsp://username:password@camera-ip/stream
```

Do not commit the `.env` file to GitHub.

---

# Frontend

The frontend is built using:

```text
React + Vite
```

The frontend provides the monitoring dashboard.

The dashboard communicates with the Flask backend through HTTP API endpoints.

The frontend displays real-time information such as:

* Live camera feed
* Person count
* Helmet count
* Compliant people
* PPE violations
* Compliance rate

---

# Running the Backend

Open Terminal 1.

```bash
cd ~/factory-ppe-monitor/backend
source ../venv/bin/activate
python app.py
```

The backend runs on:

```text
http://10.2.0.177:5000
```

The backend listens on:

```text
0.0.0.0:5000
```

---

# Running the Frontend

Open Terminal 2.

```bash
cd ~/factory-ppe-monitor/frontend
npm run dev -- --host 0.0.0.0
```

The frontend runs on:

```text
http://10.2.0.177:5173
```

Open the dashboard in a browser using the frontend address.

---

# Project Structure

```text
factory-ppe-monitor/
│
├── backend/
│   ├── app.py
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── models/
│   └── ...
│
├── dataset/
│   ├── images/
│   └── labels/
│
├── runs/
│   └── detect/
│       └── runs/
│           ├── helmet_person_v1/
│           │   └── weights/
│           │       ├── best.pt
│           │       └── last.pt
│           │
│           └── helmet_person_v2/
│               └── weights/
│                   ├── best.pt
│                   └── last.pt
│
├── venv/
│
├── .env
├── .gitignore
└── README.md
```

---

# Current System Status

## Completed

* [x] CCTV RTSP stream integration
* [x] Camera frame capture
* [x] Real-time YOLO detection
* [x] Custom person detection
* [x] Custom helmet detection
* [x] Manual image annotation
* [x] Dataset preparation
* [x] YOLO v1 training
* [x] Hard-negative collection
* [x] 88 hard-negative images added
* [x] YOLO v2 training
* [x] YOLO v2 training completed
* [x] Steel barrier false-positive issue addressed
* [x] YOLO v2 deployed in backend
* [x] ByteTrack integration
* [x] Person tracking IDs
* [x] Person–helmet association
* [x] Temporal helmet smoothing
* [x] Stable PPE status detection
* [x] Flask backend
* [x] React + Vite frontend
* [x] Live monitoring dashboard
* [x] Real-time detection statistics

---

# Current Development Phase

The current system has completed the core real-time detection and PPE status pipeline.

The next development phase is:

```text
Violation Management
```

The planned workflow is:

```text
Person detected
        ↓
Helmet status evaluated
        ↓
NO HELMET confirmed
        ↓
Create violation event
        ↓
Prevent duplicate events
        ↓
Capture violation snapshot
        ↓
Save violation to database
        ↓
Display violation history
        ↓
Track violation lifecycle
```

---

# Planned Features

## Violation Management

* [ ] Active violation management
* [ ] Prevent duplicate violation events
* [ ] Violation timestamps
* [ ] Violation snapshots
* [ ] SQLite violation database
* [ ] Violation history
* [ ] Violation event lifecycle

## Dashboard Improvements

* [ ] Violation history table
* [ ] Snapshot viewer
* [ ] Event timeline
* [ ] PPE compliance charts
* [ ] Daily violation statistics
* [ ] Camera status indicator

## Future Improvements

* [ ] Employee identification
* [ ] Face recognition
* [ ] Employee ID integration
* [ ] Multiple CCTV camera support
* [ ] Zone-based PPE requirements
* [ ] Email notifications
* [ ] Real-time alerts
* [ ] Production deployment with Gunicorn
* [ ] Docker deployment
* [ ] Authentication and user management

---

# Important Design Decisions

## Tracking IDs vs Employee IDs

ByteTrack IDs are temporary tracking identifiers.

They are used for:

```text
Frame-to-frame tracking
PPE state management
Temporary violation state
```

They are not permanent employee identifiers.

A future employee identification system may introduce:

```text
Employee ID
```

which can be linked to violation records.

---

## Temporal Smoothing

The system does not immediately classify a person as "No Helmet" when a single frame fails to detect a helmet.

Instead, multiple consecutive frames are used to confirm the PPE state.

This reduces false violation detection caused by temporary detection failures.

---

## Latest Frame Processing

The camera capture thread continuously replaces the previous frame with the latest available frame.

The system does not maintain a large frame queue.

This design prevents the inference pipeline from processing increasingly old frames and helps minimize latency.

---

# Security

Do not commit sensitive information to GitHub.

The following files should remain private:

```text
.env
```

The `.env` file may contain:

* RTSP credentials
* Camera IP addresses
* Passwords
* Other environment-specific configuration

Use `.gitignore` to prevent accidental commits.

---

# Development Environment

Current development environment includes:

```text
OS: Ubuntu
Python: 3.12
Node.js: 18+
Ultralytics YOLO
Flask
React
Vite
OpenCV
ByteTrack
```

The system is currently optimized for CPU-based inference and uses a reduced inference resolution to improve processing speed.

---

# License

This project is currently under development.

Add the appropriate license before public production or commercial distribution.

```
```
