# Factory PPE Monitoring System — Complete Development Procedure

This document records the complete workflow followed so far for the Factory PPE Monitoring System, from the development environment and CCTV stream testing through dataset collection, manual annotation, YOLO dataset preparation, initial model training, model testing, false-positive analysis, hard-negative collection, and second-model training.

> **Security note:** Never commit real CCTV credentials, RTSP URLs containing passwords, email passwords, API keys, database credentials, or other secrets to GitHub.

---

## 1. Project Objective

The goal of this project is to build an AI-powered factory PPE monitoring system using existing CCTV cameras.

The primary current objective is to detect:

- `Person`
- `Helmet`

The system is intended to determine whether workers are wearing required safety helmets in designated factory areas.

The longer-term system is intended to support:

- Real-time CCTV monitoring
- Person detection
- Helmet detection
- Person tracking
- PPE compliance checking
- Zone-based monitoring
- Event logging
- Snapshot capture
- Email alerts
- Dashboard visualization

---

# 2. Development Environment

The system is being developed on a virtual machine.

## Hardware

- GPU: No dedicated GPU
- RAM: 11 GB
- CPU: Intel Xeon W3550 @ 3.07 GHz
- CPU cores: 4
- CPU threads: 8

## Software

- Operating System: Ubuntu 24.04 LTS
- Python: 3.12
- Ultralytics YOLO
- OpenCV
- FFmpeg / FFplay
- Label Studio

The environment is currently configured for CPU-based training and inference.

---

# 3. Project Location

The project is located at:

```text
/home/osamamansoor/factory-ppe-monitor
```

The project can be accessed using:

```bash
cd ~/factory-ppe-monitor
```

The Python virtual environment is activated with:

```bash
source venv/bin/activate
```

When successfully activated, the terminal prompt shows:

```text
(venv)
```

---

# 4. Virtual Environment

The project uses a Python virtual environment to isolate project dependencies.

Activate it:

```bash
cd ~/factory-ppe-monitor
source venv/bin/activate
```

Check Python:

```bash
python --version
```

Check pip:

```bash
pip --version
```

If required dependencies are listed in `requirements.txt`, install them using:

```bash
pip install -r requirements.txt
```

---

# 5. GPU and CUDA Check

The system does not have a dedicated GPU.

CUDA availability was checked and confirmed as unavailable.

Therefore, YOLO training and inference are configured to use the CPU.

The CPU-only environment is an important constraint because:

- Training takes longer.
- Real-time inference is more difficult.
- High-resolution CCTV streams require more processing.
- A smaller YOLO model is preferable.
- The CCTV sub-stream may be useful when CPU performance is insufficient.

---

# 6. CCTV Camera

The system uses a Dahua CCTV camera connected to the factory's NVR/CCTV infrastructure.

The camera was accessed through its web interface.

The camera provides RTSP streams that can be processed by the AI system.

The camera IP used during development was:

```text
10.2.1.150
```

> Do not publish the actual camera IP, username, password, or complete authenticated RTSP URL in a public repository unless the environment is intentionally secured for public access.

---

# 7. RTSP Stream

The camera's RTSP stream was tested using FFplay.

A typical RTSP URL has the following structure:

```text
rtsp://username:password@camera-ip:554/cam/realmonitor?channel=1&subtype=0
```

Because the password contained a special `@` character, it was URL-encoded.

For example:

```text
@
```

becomes:

```text
%40
```

The RTSP URL should be kept in an environment variable or private configuration file.

Example:

```bash
export RTSP_URL="rtsp://username:password@camera-ip:554/cam/realmonitor?channel=1&subtype=0"
```

---

# 8. Testing the Main CCTV Stream

The main stream was tested using FFplay.

Example:

```bash
ffplay -rtsp_transport tcp "$RTSP_URL"
```

The main stream was approximately:

```text
Resolution: 2560x1440
Codec: H.265 / HEVC
FPS: approximately 17
```

The main stream provides better image quality, which is useful for detecting distant workers, but it requires significantly more processing power.

---

# 9. Testing the CCTV Sub-Stream

The sub-stream was also tested.

A typical sub-stream URL changes:

```text
subtype=0
```

to:

```text
subtype=1
```

Example:

```bash
ffplay -rtsp_transport tcp \
"rtsp://username:password@camera-ip:554/cam/realmonitor?channel=1&subtype=1"
```

The sub-stream was approximately:

```text
Resolution: 704x576
Codec: H.265 / HEVC
FPS: approximately 17
```

The sub-stream is easier for CPU processing but has lower image quality and may make distant-worker detection more difficult.

---

# 10. Camera Connection Testing

A camera test script was used to check whether the RTSP stream could be opened.

Example:

```bash
python test_camera.py
```

At one point, the script produced:

```text
[CAMERA] Connected
[ERROR] Failed to read frame
[CAMERA] Released
```

This showed that the RTSP connection could be established, but frame reading was not working correctly at that point.

The stream was subsequently tested using FFplay to verify that the RTSP stream itself was accessible.

---

# 11. Factory Monitoring Zones

The factory CCTV view was divided into different operational zones.

The zones are:

```text
Red    = Walking zone
Yellow = Far zone
Green  = Welding zone
Blue   = Medium-distance zone
Black  = Pipe zone
White  = Upper area
```

The following zones are ignored:

```text
Black
White
```

Helmet use is required in:

```text
Red
Yellow
Green
Blue
```

The green and blue zones are located inside the larger red walking zone.

The PPE requirement is therefore:

| Zone | Description | Helmet Required |
|---|---|---|
| Red | Walking / general movement | Yes |
| Yellow | Far worker area | Yes |
| Green | Welding area | Yes |
| Blue | Medium-distance worker area | Yes |
| Black | Pipe area | No — ignored |
| White | Upper area | No — ignored |

The final compliance logic should only evaluate helmet compliance in the red, yellow, green, and blue zones.

---

# 12. Dataset Collection

A custom dataset was collected from the factory CCTV camera.

The main collection script used was:

```text
collect_frames.py
```

The dataset was intended to contain **full CCTV frames**.

The purpose of using full frames was to preserve the original factory scene and allow the model to learn:

- Worker appearance
- Worker scale at different distances
- Factory background
- Different camera perspectives
- Multiple workers in the same frame
- Relevant objects and background context

The dataset was not intended to consist only of cropped person images.

---

# 13. Full-Frame Dataset

During collection, approximately:

```text
1564 full frames
```

were collected.

The target was approximately:

```text
2000 full frames
```

The full-frame dataset was then used for manual annotation.

---

# 14. Dataset Collection Requirements

The dataset should represent the actual CCTV environment as closely as possible.

Important examples include:

- Nearby workers
- Medium-distance workers
- Distant workers
- Multiple workers
- Workers with helmets
- Workers without helmets
- Different factory backgrounds
- Different worker positions
- Different lighting conditions

A key issue was observed where the automatic collection process did not detect some distant workers.

Therefore:

> If a worker is visibly present in the frame but the automatic collection/detection process does not detect the worker, the worker should still be manually annotated if the image is included in the training dataset.

This is important because the training dataset should contain the objects the final model is expected to detect, not only objects detected by an earlier model.

---

# 15. Dataset Collection Recovery

Because collecting thousands of frames can take a long time, the collection process should ideally support recovery after interruptions.

The desired behavior is:

```text
Start collection
      ↓
Check existing image count
      ↓
Continue from next available number
      ↓
Capture new frames
      ↓
Connection interrupted?
      ↓
Reconnect
      ↓
Continue collection
      ↓
Stop at target count
```

For example:

```text
Existing images = 1564
Target = 2000
Remaining = 436
```

The collector should not overwrite existing images.

A robust collector should:

1. Check the existing image count.
2. Determine the next available filename.
3. Reconnect to the RTSP stream if the connection is lost.
4. Continue capturing from the next filename.
5. Stop automatically when the target number is reached.

---

# 16. Checking Image Count

To count images in a folder:

```bash
find dataset/full_frames -type f | wc -l
```

For a different folder:

```bash
find dataset/hard_negatives -type f | wc -l
```

To count only JPG files:

```bash
find dataset/full_frames -type f -name "*.jpg" | wc -l
```

---

# 17. Manual Annotation

The collected full frames were manually annotated using Label Studio.

The purpose of annotation was to create YOLO-compatible bounding-box labels.

The required classes were:

```text
Helmet
Person
```

Each visible person should be annotated with a `Person` bounding box.

Each visible helmet should be annotated with a `Helmet` bounding box.

---

# 18. Annotation Rules

The following rules were followed during annotation.

## Person

Annotate:

- Every visible worker.
- Workers at different distances.
- Workers that are small but still visibly identifiable.
- Multiple workers in the same frame.

Do not annotate:

- Pipes as people.
- Steel barriers as people.
- Machinery as people.
- Factory structures as people.
- Shadows as people.

## Helmet

Annotate:

- Visible safety helmets.

Do not annotate:

- Pipes as helmets.
- Barriers as helmets.
- Machinery as helmets.
- Background objects as helmets.

For a worker without a helmet:

```text
Person → Annotate
Helmet → Do not annotate
```

For a worker with a helmet:

```text
Person → Annotate
Helmet → Annotate
```

---

# 19. Label Studio Setup

The dataset was imported into Label Studio for manual annotation.

The local files were located on the VM.

The Label Studio local file serving feature needs to be enabled when using local image files.

A typical setup is:

```bash
export LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true
export LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/home/osamamansoor
label-studio
```

The exact configuration may vary depending on the Label Studio installation.

The important point is that the file path provided to Label Studio must be a valid filesystem path.

Correct example:

```text
/home/osamamansoor/factory-ppe-monitor/dataset/full_frames
```

Incorrect example:

```text
osamamansoor@osamamansoor-Virtual-Machine:~/factory-ppe-monitor/dataset/full_frames
```

The second example contains the terminal prompt and is not a valid filesystem path.

---

# 20. Label Studio Import

The image directory was configured as local source storage.

The source was configured for image files.

After configuring the local source, the dataset was synchronized using the Label Studio interface.

The images then appeared as annotation tasks.

---

# 21. Annotation Progress

The annotation process was manual.

The annotation work can be completed over multiple sessions.

For example:

```text
Day 1:
100 images completed

Day 2:
Continue from remaining tasks
```

Label Studio stores completed annotation progress.

Therefore, it is possible to stop after completing a number of images and continue later from the remaining tasks.

---

# 22. Saving Annotations

After annotating an image, the annotation was submitted.

The Label Studio interface can be used to submit completed tasks.

A keyboard shortcut such as:

```text
Ctrl + Enter
```

may also be used depending on the Label Studio interface configuration.

Once submitted, the task is marked as completed.

---

# 23. Dataset Export

After annotation was completed, the dataset was exported.

The exported dataset contained:

```text
images/
labels/
classes.txt
notes.json
```

The most important files for YOLO training were:

```text
images/
labels/
classes.txt
```

The `notes.json` file was not required for YOLO training.

---

# 24. Class Mapping

The `classes.txt` file contained:

```text
Helmet
Person
```

Therefore, the class mapping is:

```text
0 = Helmet
1 = Person
```

This order is critical.

YOLO label files use numeric class IDs.

Example:

```text
0 x_center y_center width height
```

means:

```text
Helmet
```

Example:

```text
1 x_center y_center width height
```

means:

```text
Person
```

Do not change the class order without updating the annotations.

---

# 25. YOLO Dataset Structure

The dataset was organized into train, validation, and test sets.

The structure is:

```text
dataset/
├── train/
│   ├── images/
│   └── labels/
│
├── val/
│   ├── images/
│   └── labels/
│
├── test/
│   ├── images/
│   └── labels/
│
├── images/
├── labels/
├── classes.txt
└── notes.json
```

---

# 26. Dataset Split

The dataset was split approximately as follows:

```text
Train      = 80%
Validation = 10%
Test       = 10%
```

The purpose of each split is:

```text
Train
→ Used to train the model.

Validation
→ Used during training to evaluate generalization.

Test
→ Used for final evaluation.
```

---

# 27. Dataset Configuration

A YOLO dataset configuration file was created:

```text
dataset/data.yaml
```

The configuration follows this structure:

```yaml
path: /home/osamamansoor/factory-ppe-monitor/dataset

train: train/images
val: val/images
test: test/images

names:
  0: Helmet
  1: Person
```

This tells YOLO:

```text
Training images     → dataset/train/images
Validation images   → dataset/val/images
Testing images      → dataset/test/images

Class 0             → Helmet
Class 1             → Person
```

---

# 28. Dataset Validation

Before training, the dataset was validated.

The validation process checked:

- Missing labels
- Invalid labels
- Invalid class IDs
- Invalid YOLO annotation formats
- Invalid bounding-box coordinates
- Image-label pairing

The dataset validation completed with:

```text
Errors: 0
```

This indicated that the dataset structure was suitable for training.

---

# 29. Initial YOLO Model

The first model used was:

```text
YOLO11n
```

The model was selected because the system is running without a dedicated GPU.

The `n` model is the smaller YOLO model variant and is more practical for CPU-based environments than larger models.

---

# 30. Initial Training

The initial model was trained using:

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
    name=helmet_person_v1
```

The training configuration was:

| Parameter | Value |
|---|---|
| Model | YOLO11n |
| Epochs | 50 |
| Image size | 640 |
| Batch size | 4 |
| Device | CPU |
| Workers | 2 |

The first training run was called:

```text
helmet_person_v1
```

---

# 31. Initial Model Output

The best model weights were generated as a `best.pt` file.

Depending on the exact Ultralytics project directory configuration, the model may be located under:

```text
runs/detect/helmet_person_v1/weights/best.pt
```

or a nested run directory if a custom project/name configuration was used.

Always verify the actual location using:

```bash
find runs -name "best.pt"
```

---

# 32. Understanding YOLO Training Metrics

Several training metrics were reviewed.

## Box Loss

Box loss measures how accurately the model predicts the location and dimensions of bounding boxes.

Generally:

```text
Lower = Better localization
```

A high box loss indicates that predicted bounding boxes are not closely matching the ground-truth boxes.

---

## Classification Loss

Classification loss measures errors in class prediction.

The classes in this project are:

```text
Helmet
Person
```

Generally:

```text
Lower = Better classification
```

---

## DFL Loss

DFL stands for Distribution Focal Loss.

It contributes to bounding-box localization precision.

Generally:

```text
Lower = Better localization
```

---

## Instances

Instances represent the number of annotated objects present in the processed batch.

This can vary depending on how many:

- People
- Helmets

are present in the images.

There is no fixed ideal instance count.

---

## mAP50

mAP50 means Mean Average Precision at an IoU threshold of 0.50.

Generally:

```text
Higher = Better detection performance
```

However, mAP50 should not be the only metric used to judge this project.

Real-world testing on the actual factory CCTV footage is extremely important because the camera environment has:

- Distant workers
- Small objects
- Factory structures
- Steel barriers
- Pipes
- Lighting variations
- Background clutter

A model can have a reasonable validation score and still perform poorly on the real CCTV camera.

---

# 33. Initial Model Testing

The trained model was tested against CCTV footage.

A typical command is:

```bash
yolo detect predict \
    model=path/to/best.pt \
    source="RTSP_URL" \
    conf=0.25 \
    imgsz=640 \
    save=True
```

The actual RTSP URL should be kept private.

---

# 34. OpenCV GUI Problem

The VM does not have OpenCV GUI support configured.

When the collection or inference script attempted to run:

```python
cv2.imshow(...)
```

OpenCV produced an error similar to:

```text
OpenCV error:
The function is not implemented.
Rebuild the library with Windows, GTK+ 2.x or Cocoa support.
```

The same problem occurred with:

```python
cv2.destroyAllWindows()
```

This means the OpenCV installation is effectively running in a headless environment.

---

# 35. Headless Operation

For scripts running inside the VM, graphical display functions should be disabled.

The following functions may cause problems:

```python
cv2.imshow(...)
cv2.waitKey(...)
cv2.destroyAllWindows()
```

For headless operation, detection results should instead be:

- Saved as images.
- Saved as annotated videos.
- Sent to a web dashboard.
- Viewed remotely after processing.

The collector can still capture frames without displaying them.

---

# 36. Testing Using Recorded Video

A useful way to test the model without requiring a GUI is to record a short CCTV clip.

Example:

```bash
ffmpeg -rtsp_transport tcp \
-i "$RTSP_URL" \
-t 30 \
-c copy \
test_cctv.mp4
```

This records approximately 30 seconds.

The resulting video can be processed by YOLO:

```bash
yolo detect predict \
    model=path/to/best.pt \
    source=test_cctv.mp4 \
    conf=0.25 \
    imgsz=640 \
    save=True
```

The annotated output can then be opened on a computer with a normal graphical environment.

This allows manual inspection of:

- Person detection
- Helmet detection
- False positives
- False negatives
- Distant workers
- Multiple workers

---

# 37. Initial Model Results

The initial model showed problems during real CCTV testing.

Observed issues included:

- The model was not reliably detecting actual humans.
- A steel barrier was repeatedly detected as a person.
- The same false-positive region was also sometimes detected as a helmet.
- Some distant workers were missed.

The problem was not caused by intentionally labeling the steel barrier or pipe as a person.

The images had been manually annotated and the background objects were not labeled as people.

The model was therefore producing false positives based on visual similarity and learned patterns.

---

# 38. Why the Steel Barrier Was Detected as a Person

Object detection models learn visual patterns from training data.

The model does not have human-level semantic understanding of:

```text
"This is definitely a human."
```

Instead, it learns visual features associated with the `Person` class.

A steel barrier may contain shapes or patterns that resemble features learned from the training data.

This can result in:

```text
Steel barrier → Person false positive
```

This is called a false positive.

---

# 39. Why a Helmet Was Detected on the Barrier

The model has two independent classes:

```text
0 = Helmet
1 = Person
```

The model does not inherently understand the relationship:

```text
A helmet should be attached to a person's head.
```

Therefore, it can produce:

```text
Person
Helmet
```

in the same incorrect region.

This is one reason the eventual production architecture may use separate stages:

```text
CCTV
  ↓
Person Detection
  ↓
Person Tracking
  ↓
Crop Person / Head Region
  ↓
Helmet Detection
  ↓
Associate Helmet With Person
  ↓
PPE Compliance
```

The current project is still using the two-class YOLO model as the current development approach.

---

# 40. Hard-Negative Training

To reduce the false-positive detections, hard-negative training data was introduced.

A hard negative is an image containing an object that the model should **not** detect as one of the target classes.

Examples:

```text
Steel barrier → No detection
Pipe          → No detection
Machine       → No detection
Factory wall  → No detection
Empty area    → No detection
```

The goal is to teach the model:

```text
Steel barrier → Not Person
Steel barrier → Not Helmet

Pipe → Not Person
Pipe → Not Helmet

Machine → Not Person
Machine → Not Helmet

Real worker → Person
Real helmet → Helmet
```

---

# 41. Hard-Negative Folder

A folder was created:

```bash
mkdir -p dataset/hard_negatives
```

The hard-negative images were captured into:

```text
dataset/hard_negatives/
```

These were full-frame images.

The hard-negative dataset specifically included the problematic factory scene and steel barrier.

---

# 42. Number of Hard Negatives

A total of:

```text
88 hard-negative images
```

were collected.

The images were intended to represent the problematic background objects without target objects.

---

# 43. Hard-Negative Annotation

The hard-negative images contained no target objects.

Therefore, their YOLO label files were intentionally empty.

Example:

```text
hardneg_0001.jpg
hardneg_0001.txt
```

The file:

```text
hardneg_0001.txt
```

is empty.

This means:

```text
No Person
No Helmet
```

This is intentional and correct for a negative image.

---

# 44. Adding Hard Negatives to Training

The hard-negative images were added to the training image directory.

Example:

```bash
cp dataset/hard_negatives/*.jpg dataset/train/images/
```

Empty label files were created for the corresponding images.

Example:

```bash
for img in dataset/hard_negatives/*.jpg; do
    filename=$(basename "$img" .jpg)
    touch "dataset/train/labels/${filename}.txt"
done
```

The images and labels must have matching filenames.

Example:

```text
dataset/train/images/hardneg_0001.jpg
dataset/train/labels/hardneg_0001.txt
```

The label file remains empty.

---

# 45. Verify Hard-Negative Count

To check the number of hard-negative images:

```bash
find dataset/hard_negatives -type f | wc -l
```

The collected count was:

```text
88
```

---

# 46. Verify Dataset Counts

The training dataset can be checked with:

```bash
echo "Train images: $(find dataset/train/images -type f | wc -l)"
echo "Train labels: $(find dataset/train/labels -type f | wc -l)"
echo "Validation images: $(find dataset/val/images -type f | wc -l)"
echo "Test images: $(find dataset/test/images -type f | wc -l)"
```

The training image and label counts should be checked carefully.

For hard-negative images, each image should have a corresponding empty label file.

---

# 47. Second Model

The second model is being trained after adding the 88 hard-negative images.

The second model is referred to as:

```text
helmet_person_v2
```

The purpose of v2 is to determine whether hard-negative training reduces the false-positive detections.

The second model should be compared directly against v1.

---

# 48. Second Model Training Command

The training command is:

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

The expected model directory is:

```text
runs/detect/helmet_person_v2/
```

The best weights should be:

```text
runs/detect/helmet_person_v2/weights/best.pt
```

Verify using:

```bash
find runs -name "best.pt"
```

---

# 49. Comparing v1 and v2

The main comparison should be:

```text
Model v1
Original training dataset

Model v2
Original training dataset
+
88 hard-negative images
```

The key goal is:

```text
v1:
Steel barrier → Person + Helmet ❌

v2:
Steel barrier → No detection ✅
```

However, false-positive reduction must not come at the expense of real-worker detection.

Therefore, v2 must also be tested for:

```text
Actual worker → Person detected
Actual helmet → Helmet detected
Multiple workers → Correctly detected
Distant workers → Detected when visible
Medium-distance workers → Detected
Nearby workers → Detected
Steel barrier → Not detected
Pipe → Not detected
```

---

# 50. Model Testing Checklist

After v2 training, test the model using real factory footage.

## Person Detection

Check:

- Are nearby workers detected?
- Are medium-distance workers detected?
- Are distant workers detected?
- Are multiple workers detected simultaneously?
- Are partially visible workers detected when they are sufficiently visible?

## Helmet Detection

Check:

- Are helmets detected correctly?
- Are helmets correctly positioned around workers' heads?
- Are helmets missed?
- Are background objects incorrectly detected as helmets?

## False Positives

Check whether the model detects:

- Steel barriers
- Pipes
- Machinery
- Structural supports
- Shadows
- Reflections

as:

```text
Person
Helmet
```

---

# 51. Zone Testing

The final system should be tested in each relevant zone.

### Red Zone

```text
Walking zone
Helmet required
```

### Yellow Zone

```text
Far worker zone
Helmet required
```

### Blue Zone

```text
Medium-distance zone
Helmet required
```

### Green Zone

```text
Welding zone
Helmet required
```

### Black Zone

```text
Pipe zone
Ignore
```

### White Zone

```text
Upper area
Ignore
```

---

# 52. Important Evaluation Principle

Do not judge the model only by training metrics.

The most important evaluation is how the model behaves on the actual CCTV camera.

The real environment contains:

- Small distant workers
- Multiple workers
- Factory clutter
- Steel barriers
- Pipes
- Machinery
- Shadows
- Lighting variation
- Camera compression
- Different worker poses

Therefore, the model should always be tested using representative factory footage.

---

# 53. Current Development Status

The project has progressed through the following stages:

```text
1. Development VM configured
        ↓
2. Python virtual environment configured
        ↓
3. CPU-only environment confirmed
        ↓
4. Dahua CCTV camera identified
        ↓
5. RTSP stream tested
        ↓
6. Main and sub-stream evaluated
        ↓
7. Factory monitoring zones defined
        ↓
8. Full-frame dataset collection started
        ↓
9. Approximately 1564 full frames collected
        ↓
10. Dataset manually annotated
        ↓
11. Dataset exported from Label Studio
        ↓
12. Classes defined:
        Helmet
        Person
        ↓
13. Dataset split into train/val/test
        ↓
14. Dataset validated
        ↓
15. YOLO11n v1 trained
        ↓
16. v1 tested on CCTV footage
        ↓
17. False positives identified
        ↓
18. Steel barrier false positive investigated
        ↓
19. 88 hard-negative images collected
        ↓
20. Hard negatives added to training set
        ↓
21. YOLO11n v2 training started
```

---

# 54. Immediate Next Step

After v2 training finishes:

1. Locate `best.pt`.
2. Test v2 on the same CCTV scene used to test v1.
3. Check the steel barrier.
4. Check whether the false helmet detection disappeared.
5. Check actual worker detection.
6. Check distant-worker detection.
7. Check multiple-worker detection.
8. Compare v1 and v2.
9. Adjust confidence threshold only after evaluating the model.
10. Decide whether additional data collection is required.

---

# 55. If v2 Still Detects the Barrier

If v2 still detects the steel barrier, the next steps should be:

1. Collect additional hard-negative examples.
2. Include different views and lighting conditions.
3. Increase diversity rather than collecting many identical frames.
4. Check whether the steel barrier appears in training images with nearby workers.
5. Check whether the model is overfitting to the factory camera angle.
6. Review model confidence scores.
7. Evaluate whether the person dataset contains enough negative background examples.
8. Consider increasing training data.
9. Consider using a separate person detector and helmet detector.

Do not immediately assume that lowering or increasing the confidence threshold will solve the underlying issue.

---

# 56. Recommended Future Architecture

The current two-class model is useful for development, but the final PPE compliance system may be more robust using a multi-stage approach.

Recommended architecture:

```text
Factory CCTV
      │
      │ RTSP
      ▼
Camera Stream
      │
      ▼
Person Detector
      │
      ▼
Person Tracking
      │
      ▼
Individual Person Crops
      │
      ▼
Head / Upper-Body Region
      │
      ▼
Helmet Detector
      │
      ▼
Person ↔ Helmet Association
      │
      ▼
Zone Identification
      │
      ▼
PPE Compliance Decision
      │
      ├───────────────┐
      ▼               ▼
Compliant        Non-Compliant
                      │
                      ▼
                  Snapshot
                      │
                      ▼
                  Event Log
                      │
                      ▼
                  Email Alert
                      │
                      ▼
                   Dashboard
```

This approach can help prevent background objects from being interpreted as helmet/person pairs because helmet detection is performed on person-related regions.

---

# 57. Final PPE Logic

The intended final logic is:

```text
IF person is inside Red:
    Helmet required

IF person is inside Yellow:
    Helmet required

IF person is inside Green:
    Helmet required

IF person is inside Blue:
    Helmet required

IF person is inside Black:
    Ignore

IF person is inside White:
    Ignore
```

The system should ultimately determine:

```text
Worker detected
      ↓
Determine worker zone
      ↓
Is zone monitored?
      │
      ├── No → Ignore
      │
      └── Yes
            ↓
       Helmet detected?
            │
            ├── Yes → Compliant
            │
            └── No → Non-Compliant
                         ↓
                    Save event
                         ↓
                    Save snapshot
                         ↓
                    Send alert
```

---

# 58. Security and GitHub

Before uploading the project to GitHub, check carefully for secrets.

Never upload:

```text
CCTV passwords
RTSP URLs with credentials
Email passwords
API keys
Database passwords
Private keys
.env files
```

A `.gitignore` file should include items such as:

```text
.env
venv/
__pycache__/
logs/
snapshots/
*.pt
```

If model weights are large, consider Git LFS instead of normal Git storage.

Before pushing the repository, inspect the files:

```bash
git status
```

Review changes:

```bash
git diff
```

Check for sensitive information before committing.

---

# 59. Suggested Git Workflow

From the project root:

```bash
cd ~/factory-ppe-monitor
```

Check Git status:

```bash
git status
```

Add files:

```bash
git add .
```

Commit:

```bash
git commit -m "Update factory PPE monitoring system"
```

Push:

```bash
git push
```

Before pushing, make sure:

- No passwords are included.
- No private RTSP URLs are included.
- No API keys are included.
- No `.env` file is included.
- Large model files are handled appropriately.

---

# 60. Complete Workflow Summary

The complete workflow followed so far is:

```text
Factory CCTV Camera
        ↓
RTSP Stream
        ↓
FFplay Stream Verification
        ↓
CPU-Only VM
        ↓
Full-Frame Dataset Collection
        ↓
Manual Annotation in Label Studio
        ↓
Classes:
  0 = Helmet
  1 = Person
        ↓
Dataset Export
        ↓
Train / Validation / Test Split
        ↓
Dataset Validation
        ↓
YOLO11n v1 Training
        ↓
Real CCTV Testing
        ↓
False Positives Identified
        ↓
Steel Barrier Detected as Person
        ↓
Steel Barrier Also Detected as Helmet
        ↓
Hard-Negative Strategy
        ↓
88 Hard-Negative Images Collected
        ↓
Hard Negatives Added to Training Set
        ↓
YOLO11n v2 Training
        ↓
Next:
Compare v1 vs v2
        ↓
Evaluate Person Detection
        ↓
Evaluate Helmet Detection
        ↓
Evaluate Distant Workers
        ↓
Evaluate False Positives
        ↓
Improve Dataset / Model
        ↓
Implement Tracking
        ↓
Implement Zone-Based PPE Logic
        ↓
Implement Alerts and Dashboard
        ↓
Deploy for Factory Monitoring
```

---

# 61. Current Project Goal

The immediate goal is to produce a reliable custom YOLO model that can:

1. Detect actual factory workers.
2. Detect safety helmets.
3. Detect multiple workers.
4. Detect workers at different distances.
5. Avoid detecting steel barriers as people.
6. Avoid detecting pipes as people.
7. Avoid detecting background objects as helmets.
8. Support zone-based helmet compliance monitoring.

The final system should integrate this detection capability with tracking, PPE compliance logic, event logging, snapshots, alerts, and a monitoring dashboard.
