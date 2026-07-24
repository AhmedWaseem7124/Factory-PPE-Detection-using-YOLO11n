# Factory PPE Monitoring System

An AI-powered real-time Personal Protective Equipment (PPE) monitoring system designed to detect workers and safety helmets from factory CCTV camera feeds.

The system uses computer vision and deep learning to monitor factory environments and identify PPE compliance issues automatically.

## Features

- Real-time CCTV camera integration using RTSP
- Person detection
- Helmet detection
- Multiple worker detection
- Detection of workers at different distances
- CPU-based inference support
- CCTV stream processing
- Dataset collection from RTSP cameras
- Custom YOLO model training
- Hard-negative training to reduce false positives
- Detection snapshots
- Event logging
- Email alerts
- Dashboard integration
- Zone-based PPE monitoring

## System Architecture

```text
Factory CCTV Camera
        │
        │ RTSP Stream
        ▼
┌─────────────────────┐
│   Camera Module     │
│    RTSP Stream      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   YOLO Detector     │
│                     │
│  Person Detection   │
│  Helmet Detection   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   PPE Compliance    │
│      Checker        │
└──────────┬──────────┘
           │
           ├───────────────┐
           ▼               ▼
     Event Database     Snapshots
           │
           ▼
      Email Alerts
           │
           ▼
       Dashboard
```

## Project Structure

```text
factory-ppe-monitor/
│
├── alerts/
│   ├── cooldown.py
│   ├── email.py
│   └── __init__.py
│
├── camera/
│   ├── rtsp.py
│   └── __init__.py
│
├── compliance/
│   ├── helmet_checker.py
│   └── __init__.py
│
├── dashboard/
│   ├── routes.py
│   └── __init__.py
│
├── database/
│   ├── db.py
│   └── __init__.py
│
├── detector/
│   ├── inference.py
│   ├── model.py
│   └── __init__.py
│
├── tracker/
│   ├── tracker.py
│   └── __init__.py
│
├── static/
├── templates/
├── logs/
├── snapshots/
├── weights/
│
├── app.py
├── config.py
├── requirements.txt
└── README.md
```

## PPE Monitoring Zones

The factory camera view is divided into different operational zones.

| Zone | Description | PPE Requirement |
|---|---|---|
| Red | Walking / general movement area | Helmet required |
| Green | Welding zone | Helmet required |
| Blue | Medium-distance worker area | Helmet required |
| Yellow | Far worker area | Helmet required |
| Black | Pipe zone | Ignored |
| White | Upper area | Ignored |

The system ignores the black and white zones.

Helmet detection is required in the red, green, blue, and yellow zones.

## Detection Classes

The current custom YOLO model uses two classes:

```text
0 - Helmet
1 - Person
```

The model is trained to detect both workers and safety helmets.

## Hardware Environment

The system is designed to operate in a CPU-only environment.

Current development environment:

- GPU: Not available
- RAM: 11 GB
- CPU: Intel Xeon W3550 @ 3.07 GHz
- CPU Cores: 4
- Threads: 8
- Operating System: Ubuntu 24.04 LTS
- Python: 3.12
- Ultralytics: YOLO
- Inference Device: CPU

## Camera

The system receives video from a Dahua CCTV camera using an RTSP stream.

The camera provides multiple stream profiles.

### Main Stream

- Resolution: 2560 × 1440
- Codec: H.265 / HEVC
- Approximate FPS: 17

### Sub Stream

- Resolution: 704 × 576
- Codec: H.265 / HEVC
- Approximate FPS: 17

The main stream provides higher image quality but requires significantly more processing power.

The sub stream is more suitable for CPU-based processing environments.

## Dataset Collection

A custom dataset was collected from the factory CCTV camera.

The dataset collection process captures frames from the RTSP stream and stores them for annotation.

The dataset contains full CCTV frames rather than only cropped person images.

The dataset was manually annotated using Label Studio.

### Dataset Classes

```text
Helmet
Person
```

### Dataset Split

The dataset is divided into:

```text
Train      80%
Validation 10%
Test       10%
```

The dataset includes manually annotated images of factory workers and helmets.

Hard-negative images were also added to the training dataset to reduce false detections on objects such as steel barriers and pipes.

## Hard Negatives

During testing, the model produced false positive detections on a steel barrier.

To improve the model, additional hard-negative images were collected.

These images contain objects that should not be detected as:

- Person
- Helmet

Examples include:

- Steel barriers
- Pipes
- Factory structures
- Empty factory areas

The current training dataset includes 88 hard-negative images.

These images use empty YOLO annotation files because they contain no target objects.

## Model Training

The system uses YOLO11n for object detection.

Training is performed on CPU due to the absence of a dedicated GPU.

Example training command:

```bash
yolo detect train \
    model=yolo11n.pt \
    data=dataset/data.yaml \
    epochs=50 \
    imgsz=640 \
    batch=4 \
    device=cpu \
    workers=2 \
    project=runs \
    name=helmet_person_v2
```

### Training Configuration

| Parameter | Value |
|---|---|
| Model | YOLO11n |
| Epochs | 50 |
| Image Size | 640 |
| Batch Size | 4 |
| Device | CPU |
| Workers | 2 |

## Model Output

After training, the best model is saved as:

```text
runs/detect/helmet_person_v2/weights/best.pt
```

The `best.pt` model can be used for inference on images, videos, and RTSP streams.

## RTSP Testing

The trained model can be tested using a CCTV RTSP stream.

Example:

```bash
yolo detect predict \
    model=path/to/best.pt \
    source="RTSP_URL" \
    conf=0.25 \
    imgsz=640 \
    show=True
```

For headless environments, detection results can be saved instead of displayed directly.

## Dataset Validation

Before training, the dataset is validated to check:

- Missing labels
- Invalid class IDs
- Invalid YOLO annotation formats
- Invalid bounding-box coordinates
- Image-label pairing

The validation process ensures that the dataset is ready for YOLO training.

## Current Development Status

### Completed

- RTSP CCTV camera connection
- Main and sub-stream testing
- CPU-only environment configuration
- Project structure
- Dataset collection
- Full-frame dataset generation
- Manual image annotation
- Label Studio integration
- YOLO dataset preparation
- Train/validation/test split
- Dataset validation
- Initial YOLO11n training
- Detection testing
- Identification of steel barrier false positives
- Collection of 88 hard-negative images
- Second model training with hard negatives

### In Progress

- Improving person detection accuracy
- Improving distant-worker detection
- Reducing steel barrier false positives
- Improving helmet detection
- Testing multiple-person detection
- CCTV real-time inference optimization
- PPE compliance logic
- Zone-based monitoring
- Person tracking
- Alert generation
- Dashboard integration

## Future Improvements

- Improve detection of distant workers
- Optimize inference speed for CPU environments
- Implement multi-object tracking
- Associate helmets with individual workers
- Improve PPE compliance verification
- Add zone-based compliance rules
- Add real-time email alerts
- Add event history and analytics
- Add dashboard visualizations
- Optimize RTSP stream latency
- Deploy the system for continuous factory monitoring

## Security

Do not commit sensitive information such as:

- CCTV usernames
- CCTV passwords
- RTSP URLs containing credentials
- Email passwords
- API keys
- Database credentials
- Environment variables

Use environment variables or a `.env` file for sensitive configuration.

Example:

```text
.env
```

Add sensitive files to `.gitignore`:

```text
.env
*.pt
snapshots/
logs/
__pycache__/
venv/
```

## License

This project is currently developed for internal research and industrial PPE monitoring purposes.

Add an appropriate license before making the repository publicly available.
