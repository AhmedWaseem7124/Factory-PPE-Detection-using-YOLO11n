import sqlite3
import os

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "ppe_monitor.db"
)


def initialize_database():

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ======================================================
    # EVENTS TABLE
    # ======================================================

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        timestamp TEXT NOT NULL,
 
        track_id INTEGER,

        zone TEXT,
 
        event_type TEXT,

        confidence REAL,

        snapshot_path TEXT,

        start_time TEXT,

        end_time TEXT,

        duration INTEGER DEFAULT 0,

        resolved INTEGER DEFAULT 0

    )
    """)

    # ======================================================
    # LIVE DETECTIONS
    # ======================================================

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detections (

        track_id INTEGER PRIMARY KEY,

        helmet INTEGER,

        zone TEXT,

        last_seen TEXT

    )
    """)

    # ======================================================
    # SNAPSHOTS
    # ======================================================

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS snapshots (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        event_id INTEGER,

        image_path TEXT,

        timestamp TEXT,

        FOREIGN KEY(event_id)
        REFERENCES events(id)

    )
    """)

    # ======================================================
    # DAILY STATISTICS
    # ======================================================

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_statistics (

        date TEXT PRIMARY KEY,

        total_people INTEGER,

        helmet_count INTEGER,

        violation_count INTEGER,

        compliance_rate REAL

    )
    """)

    # ======================================================
    # SYSTEM LOGS
    # ======================================================

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_logs (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        timestamp TEXT,

        level TEXT,

        message TEXT

    )
    """)

    conn.commit()
    conn.close()

    print("Database initialized successfully.")


if __name__ == "__main__":
    initialize_database()
