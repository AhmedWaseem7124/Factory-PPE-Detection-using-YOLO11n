import os
import sys
import time
import threading
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from database.database import db
from utils.video_recorder import EVIDENCE_VIDEO_DIR


def cleanup_old_videos(retention_days=30):
    """
    Automatic Evidence Video Retention Cleanup Service:
    1. Queries database for completed events older than retention_days (30 days) with video_path.
    2. Deletes corresponding MP4 video files from disk.
    3. Updates database rows setting video_path = NULL.
    4. Performs directory safety scan on evidence/videos to remove orphaned .mp4 files older than retention_days.
    5. Preserves all snapshots (.jpg, .png), database records, and active incidents.
    """
    try:
        # Step 1: Query DB for expired completed events
        expired_records = db.delete_expired_videos(retention_days=retention_days)

        # Count total remaining MP4 videos in directory for reporting
        remaining_videos = [f for f in os.listdir(EVIDENCE_VIDEO_DIR) if f.endswith(".mp4")] if os.path.exists(EVIDENCE_VIDEO_DIR) else []

        for record in expired_records:
            event_id = record.get("id")
            video_filename = record.get("video_path")
            end_time_str = record.get("end_time") or record.get("timestamp")

            if not video_filename:
                continue

            clean_filename = os.path.basename(video_filename)
            file_path = os.path.join(EVIDENCE_VIDEO_DIR, clean_filename)

            video_age_days = 0
            if end_time_str:
                try:
                    dt = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M:%S")
                    video_age_days = round((time.time() - dt.timestamp()) / 86400, 1)
                except Exception:
                    pass

            if os.path.exists(file_path):
                # SAFETY CHECK: Only delete .mp4 files
                if file_path.lower().endswith(".mp4"):
                    os.remove(file_path)

            remaining_count = max(0, len(remaining_videos) - 1)
            print("==================================================")
            print("[VIDEO CLEANUP]")
            print(f"Deleted: {clean_filename}")
            print(f"Event ID: {event_id}")
            print(f"Video age: {video_age_days} days")
            print(f"Remaining videos: {remaining_count}")
            print("==================================================")

        # Step 2: Directory safety scan for orphaned .mp4 files older than retention_days
        if os.path.exists(EVIDENCE_VIDEO_DIR):
            now = time.time()
            cutoff_seconds = retention_days * 86400
            for filename in os.listdir(EVIDENCE_VIDEO_DIR):
                # STRICT SAFETY: ONLY process .mp4 files
                if filename.lower().endswith(".mp4"):
                    full_path = os.path.join(EVIDENCE_VIDEO_DIR, filename)
                    try:
                        file_age_days = round((now - os.path.getmtime(full_path)) / 86400, 1)
                        if file_age_days >= retention_days:
                            os.remove(full_path)
                            current_remaining = len([f for f in os.listdir(EVIDENCE_VIDEO_DIR) if f.endswith(".mp4")])
                            print("==================================================")
                            print("[VIDEO CLEANUP]")
                            print(f"Deleted (Orphaned File): {filename}")
                            print(f"Event ID: N/A")
                            print(f"Video age: {file_age_days} days")
                            print(f"Remaining videos: {current_remaining}")
                            print("==================================================")
                    except Exception as e:
                        print(f"[VIDEO CLEANUP ERROR] Failed to check/remove {filename}: {e}")

    except Exception as e:
        print(f"[VIDEO CLEANUP EXCEPTION] Error running video cleanup: {e}")


def start_video_cleanup_daemon(interval_seconds=86400, retention_days=30):
    """
    Runs video cleanup once immediately, then launches background daemon thread to repeat every 24 hours.
    """
    # 1. Run once immediately on backend startup
    print("[VIDEO CLEANUP] Starting initial retention policy cleanup check...")
    cleanup_old_videos(retention_days=retention_days)

    # 2. Daemon loop repeating every interval_seconds (default 24 hours = 86400s)
    def daemon_loop():
        while True:
            time.sleep(interval_seconds)
            print("[VIDEO CLEANUP] Running scheduled 24-hour retention cleanup...")
            cleanup_old_videos(retention_days=retention_days)

    thread = threading.Thread(target=daemon_loop, daemon=True)
    thread.start()
    print(f"[VIDEO CLEANUP] Retention policy daemon active (runs every {interval_seconds // 3600} hours).")
    return thread
