import os
import sys
import time

PROJECT_ROOT = "/home/osamamansoor/factory-ppe-monitor"
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from database.database import db

def test_runtime_smoothing_and_finalization():
    print("==================================================")
    print("SIMULATION TEST: RUNTIME NOISY FRAME INCIDENT FINALIZATION")
    print("==================================================")

    person_states = {}
    active_incidents = {}

    track_id = 777
    HELMET_CONFIRM_SECONDS = 1.0
    NO_HELMET_CONFIRM_SECONDS = 2.0

    # 1. Start Violation Phase (No Helmet for 2.5 seconds)
    start_time = time.time()
    current_time = start_time

    print("\n--- Phase 1: No Helmet Detection (2.5 seconds) ---")
    for step in range(25):
        current_time += 0.1
        helmet_found = False

        if track_id not in person_states:
            person_states[track_id] = {
                "status": "UNKNOWN",
                "helmet_detected_since": None,
                "helmet_missing_since": None,
                "violation_duration": 0,
                "last_seen": current_time,
                "violation_sent": False,
                "snapshot_saved": False
            }

        state = person_states[track_id]
        state["last_seen"] = current_time

        if not helmet_found:
            if state["helmet_missing_since"] is None:
                state["helmet_missing_since"] = current_time

            missing_duration = current_time - state["helmet_missing_since"]
            state["violation_duration"] = int(missing_duration)

            if missing_duration >= NO_HELMET_CONFIRM_SECONDS:
                if track_id not in active_incidents:
                    event_id = db.insert_event(
                        track_id=track_id,
                        event_type="Helmet Missing",
                        zone="Zone A",
                        snapshot_path="test_777.jpg",
                        start_time=current_time,
                        end_time=None,
                        duration=0
                    )
                    active_incidents[track_id] = {
                        "event_id": event_id,
                        "start_time": current_time,
                        "snapshot_path": "test_777.jpg",
                        "zone": "Zone A",
                        "event_type": "Helmet Missing"
                    }
                    print(f"NO HELMET CONFIRMATION REACHED: Incident {event_id} created for track {track_id}")
                state["status"] = "NO HELMET"

    assert track_id in active_incidents, "Incident should be active after 2.5s of No Helmet"
    incident_id = active_incidents[track_id]["event_id"]
    print(f"Active incident created in DB with ID: {incident_id}")

    # 2. Helmet Put Back On Phase with 1-frame Noise Flickering
    print("\n--- Phase 2: Helmet Returned with 1-frame Noise Flickering ---")
    helmet_return_start = current_time
    
    # 15 frames of detection with occasional False flicker
    pattern = [True, True, False, True, True, True, False, True, True, True, True, True, True, True, True]

    incident_resolved = False
    for step, h_found in enumerate(pattern):
        current_time += 0.1
        helmet_found = h_found

        state = person_states[track_id]
        state["last_seen"] = current_time

        if helmet_found:
            if state["helmet_detected_since"] is None:
                state["helmet_detected_since"] = current_time

            helmet_duration = current_time - state["helmet_detected_since"]

            if helmet_duration >= HELMET_CONFIRM_SECONDS:
                print(f"HELMET CONFIRMATION REACHED at step {step} (duration: {helmet_duration:.2f}s)")
                state["status"] = "HELMET"
                state["helmet_missing_since"] = None

                if track_id in active_incidents:
                    incident = active_incidents[track_id]
                    event_id = incident["event_id"]
                    dur = int(current_time - incident["start_time"])

                    print(f"UPDATING EVENT in DB: event_id={event_id}, duration={dur}s")
                    db.update_event(
                        event_id=event_id,
                        end_time=current_time,
                        duration=dur,
                        resolved=1
                    )
                    del active_incidents[track_id]
                    incident_resolved = True
                    break
        else:
            if state["helmet_missing_since"] is None:
                state["helmet_missing_since"] = current_time

    assert incident_resolved, "Incident should resolve even with 1-frame detection noise"
    assert track_id not in active_incidents, "active_incidents should be cleaned up"

    # Verify DB row
    conn = db.connect()
    cursor = conn.cursor()
    cursor.execute("SELECT id, end_time, duration, resolved FROM events WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    conn.close()

    print(f"DB Record Verification: ID={row[0]}, end_time={row[1]}, duration={row[2]}s, resolved={row[3]}")
    assert row[1] is not None, "end_time must be set"
    assert row[2] > 0, "duration must be > 0"
    assert row[3] == 1, "resolved must be 1"

    # Clean up test row
    conn = db.connect()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = ?", (incident_id,))
    conn.commit()
    conn.close()

    print("\n==================================================")
    print("SUCCESS: NOISY FRAME SIMULATION PASSED CLEANLY!")
    print("==================================================")

if __name__ == "__main__":
    test_runtime_smoothing_and_finalization()
