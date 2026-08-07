import sqlite3
import os
from datetime import datetime


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

        video_path TEXT,

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

    # ======================================================
    # USERS TABLE
    # ======================================================

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT
    )
    """)

    # Seed default admin ONLY IF no admin user exists
    cursor.execute("SELECT 1 FROM users WHERE username = 'admin' OR LOWER(role) = 'admin' LIMIT 1")
    existing_admin = cursor.fetchone()
    if not existing_admin:
        import bcrypt
        admin_pass = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            """
            INSERT INTO users (full_name, username, email, password_hash, role, is_active, last_login, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("System Admin", "admin", "admin@factory.com", admin_pass, "Admin", 1, None, now_str)
        )
        print("Default admin user created: admin / admin123")

    conn.commit()
    conn.close()

    print("Database initialized successfully.")


if __name__ == "__main__":
    initialize_database()

