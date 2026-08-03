import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "ppe_monitor.db"
)


class Database:

    def __init__(self):
        self.db_path = DB_PATH

    def connect(self):
        return sqlite3.connect(self.db_path)

    # =====================================================
    # EVENTS
    # =====================================================

    def get_dashboard_stats(self):

        conn = self.get_connection()
        cursor = conn.cursor()

    # Current live workers
        cursor.execute("""
            SELECT COUNT(*)
            FROM detections
        """)
        persons = cursor.fetchone()[0]

    # Workers wearing helmets
        cursor.execute("""
            SELECT COUNT(*)
            FROM detections
            WHERE helmet = 1
        """)
        helmets = cursor.fetchone()[0]

    # Workers without helmets
        cursor.execute("""
            SELECT COUNT(*)
            FROM detections
            WHERE helmet = 0
        """)
        violations = cursor.fetchone()[0]

        if persons == 0:
            compliance = 100
        else:
            compliance = round(
                helmets / persons * 100,
                1
            )

        conn.close()

        return {
            "persons": persons,
            "helmets": helmets,
            "violations": violations,
            "compliance_rate": compliance
        }

    def add_event(
        self,
        track_id,
        zone,
        event_type,
        confidence,
        snapshot_path=None,
        start_time=None,
        end_time=None,
        duration=0
    ): 

        conn = self.connect()
        cursor = conn.cursor()

        from datetime import datetime

        cursor.execute(
            """
            INSERT INTO events
            (
                timestamp,
                track_id,
                zone,
                event_type,
                confidence,
                snapshot_path,
                start_time,
                end_time,
                duration
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                track_id,
                zone,
                event_type,
                confidence,
                snapshot_path,

                datetime.fromtimestamp(start_time).strftime("%Y-%m-%d %H:%M:%S")
                if start_time else None,

                datetime.fromtimestamp(end_time).strftime("%Y-%m-%d %H:%M:%S")
                if end_time else None,

                duration,
            ),
        )

        event_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return event_id

    def insert_event(
        self,
        track_id,
        event_type,
        zone,
        snapshot_path="",
        start_time=None,
        end_time=None,
        duration=0
    ):
        return self.add_event(
            track_id=track_id,
            zone=zone,
            event_type=event_type,
            confidence=1.0,
            snapshot_path=snapshot_path,
            start_time=start_time,
            end_time=end_time,
            duration=duration,
        )

    # =====================================================
    # LIVE DETECTIONS
    # =====================================================

    def update_detection(
        self,
        track_id,
        helmet,
        zone
    ):

        conn = self.connect()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT OR REPLACE INTO detections
            (
                track_id,
                helmet,
                zone,
                last_seen
            )
            VALUES
            (?, ?, ?, ?)
            """,
            (
                track_id,
                helmet,
                zone,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )

        conn.commit()
        conn.close()

    # =====================================================
    # DASHBOARD STATS
    # =====================================================

    def get_dashboard_stats(self):

        conn = self.connect()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM detections"
        )
        persons = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM detections WHERE helmet=1"
        )
        helmets = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM detections
            WHERE helmet=0
            """
        )
        violations = cursor.fetchone()[0]

        compliance = (
            helmets / persons * 100
            if persons > 0
            else 0
        )

        conn.close()

        return {
            "persons": persons,
            "helmets": helmets,
            "violations": violations,
            "compliance_rate": round(compliance, 1),
        }

    # =====================================================
    # RECENT EVENTS
    # =====================================================

    def get_recent_events(
        self,
        limit=20
    ):

        conn = self.connect()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                timestamp,
                zone,
                event_type,
                snapshot_path
            FROM events
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )

        rows = cursor.fetchall()

        conn.close()

        return rows

    def get_analytics(self):

        conn = self.connect()
        cursor = conn.cursor()

    # ----------------------------
    # Dashboard KPIs
    # ----------------------------

        cursor.execute("SELECT COUNT(*) FROM detections")
        workers = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*)
            FROM events
            WHERE event_type='Helmet Missing'
        """)
        violations = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*)
            FROM detections
            WHERE helmet=1
        """)
        helmets = cursor.fetchone()[0]

        compliance = (
            helmets / workers * 100
            if workers > 0 else 0
        )

        safety_score = round(compliance)

        # ----------------------------
    # Zone Distribution
    # ----------------------------

        cursor.execute("""
            SELECT
                zone,
                COUNT(*)
            FROM events
            GROUP BY zone
        """)

        zone_counts = []

        for zone, count in cursor.fetchall():
 
            zone_counts.append({
                "zone": zone or "Unknown",
                "violations": count
            })

    # ----------------------------
    # Event Distribution
    # ----------------------------

        cursor.execute("""
            SELECT
                event_type,
                COUNT(*)
            FROM events
            GROUP BY event_type
        """)

        event_counts = []

        for event_type, count in cursor.fetchall():

            event_counts.append({
                "name": event_type,
                "value": count
            })

    # ----------------------------
    # Daily Trend
    # ----------------------------

        cursor.execute("""
            SELECT
                DATE(timestamp),
                COUNT(*)
            FROM events
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp)
        """)

        trend = []

        for day, count in cursor.fetchall():

            trend.append({
                "day": day,
                "value": count
            })

        conn.close()

        return {
            "workers": workers,
            "violations": violations,
            "compliance_rate": round(compliance, 1),
            "safety_score": safety_score,
            "zone_data": zone_counts,
            "event_data": event_counts,
            "trend_data": trend,
        }

db = Database()
