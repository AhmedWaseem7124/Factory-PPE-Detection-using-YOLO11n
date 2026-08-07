import cv2
import os
import time
import threading
from collections import deque
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EVIDENCE_VIDEO_DIR = os.path.join(PROJECT_ROOT, "evidence", "videos")
EVIDENCE_SNAPSHOT_DIR = os.path.join(PROJECT_ROOT, "evidence", "snapshots")

os.makedirs(EVIDENCE_VIDEO_DIR, exist_ok=True)
os.makedirs(EVIDENCE_SNAPSHOT_DIR, exist_ok=True)


class RollingFrameBuffer:
    """
    In-memory rolling circular frame buffer.
    Maintains rendered frames for a rolling duration (default 3 seconds).
    Never writes to disk during normal operation.
    """
    def __init__(self, duration_seconds=3.0, default_fps=15.0):
        self.duration_seconds = duration_seconds
        self.fps = max(5.0, min(float(default_fps), 60.0))
        self.maxlen = int(self.duration_seconds * self.fps)
        self.buffer = deque(maxlen=self.maxlen)
        self.lock = threading.Lock()

    def update_fps(self, measured_fps):
        if measured_fps and measured_fps > 0:
            new_fps = max(5.0, min(float(measured_fps), 60.0))
            if abs(new_fps - self.fps) > 2.0:
                with self.lock:
                    self.fps = new_fps
                    self.maxlen = int(self.duration_seconds * self.fps)
                    new_deque = deque(self.buffer, maxlen=self.maxlen)
                    self.buffer = new_deque

    def append(self, frame):
        if frame is None:
            return
        # Store a shallow copy / frame reference or copy if needed
        # OpenCV frames are ndarrays; frame.copy() ensures buffer frame is preserved
        with self.lock:
            self.buffer.append(frame.copy())

    def get_snapshot(self):
        with self.lock:
            return list(self.buffer)


def record_evidence_clip_async(event_id, track_id, pre_frames, frame_provider_func, db_instance, fps=15.0, post_duration_seconds=3.0):
    """
    Spawns a background thread to generate an MP4 clip:
    - 3s pre-incident (from pre_frames snapshot)
    - 3s post-incident (collected live over next 3 seconds)
    - Updates SQLite DB with video_path upon completion
    """
    def worker():
        try:
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            video_filename = f"incident_{timestamp_str}_track{track_id}.mp4"
            output_filepath = os.path.join(EVIDENCE_VIDEO_DIR, video_filename)

            if not pre_frames:
                print(f"[EVIDENCE RECORDER] Warning: No pre-incident frames for track #{track_id}")
                return

            sample_frame = pre_frames[0]
            height, width = sample_frame.shape[:2]

            eff_fps = max(5.0, min(float(fps), 60.0))
            
            # Try mp4v or avc1 fourcc codec
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_filepath, fourcc, eff_fps, (width, height))

            if not writer.isOpened():
                # Fallback to XVID / mp4
                fourcc = cv2.VideoWriter_fourcc(*'XVID')
                writer = cv2.VideoWriter(output_filepath, fourcc, eff_fps, (width, height))

            if not writer.isOpened():
                print(f"[EVIDENCE RECORDER ERROR] Failed to open VideoWriter for {output_filepath}")
                return

            print(f"[EVIDENCE RECORDER] VIDEO START: {video_filename}")

            # Write 3s PRE-INCIDENT frames
            for f in pre_frames:
                if f is not None and f.shape[:2] == (height, width):
                    writer.write(f)

            # Record 3s POST-INCIDENT frames live
            start_post = time.time()
            frame_interval = 1.0 / eff_fps

            while time.time() - start_post < post_duration_seconds:
                current_frame = frame_provider_func()
                if current_frame is not None and current_frame.shape[:2] == (height, width):
                    writer.write(current_frame)
                time.sleep(frame_interval)

            writer.release()
            print(f"[EVIDENCE RECORDER] VIDEO SAVED: {video_filename}")

            # CONVERT TO WEB-COMPATIBLE H.264 (libx264, yuv420p, +faststart) FOR BROWSER PLAYBACK
            try:
                import subprocess
                h264_filepath = output_filepath + ".web.mp4"
                cmd = [
                    "ffmpeg", "-y", "-i", output_filepath,
                    "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-preset", "ultrafast",
                    "-movflags", "+faststart",
                    h264_filepath
                ]
                res = subprocess.run(cmd, capture_output=True, text=True)
                if res.returncode == 0 and os.path.exists(h264_filepath) and os.path.getsize(h264_filepath) > 0:
                    os.replace(h264_filepath, output_filepath)
                    print(f"[EVIDENCE RECORDER] FFMPEG SUCCESS: Converted {video_filename} to H.264 web format.")
                else:
                    print(f"[EVIDENCE RECORDER WARNING] FFmpeg conversion failed (rc={res.returncode}), preserving raw file: {res.stderr}")
                    if os.path.exists(h264_filepath):
                        os.remove(h264_filepath)
            except Exception as fe:
                print(f"[EVIDENCE RECORDER WARNING] Could not run FFmpeg H.264 conversion: {fe}")

            # Update DB with video_path
            if db_instance and event_id:
                db_instance.update_event_video_path(event_id, video_filename)
                print(f"[EVIDENCE RECORDER] VIDEO UPDATED: Event #{event_id} -> {video_filename}")

        except Exception as e:
            print(f"[EVIDENCE RECORDER EXCEPTION] Failed to record video for event #{event_id}: {e}")

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    return thread
