import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "ppe_monitor.db"
)


class Database:

    def __init__(self):
        self.db_path = DB_PATH
        self.init_user_table()
        self.check_and_migrate_db()

    def connect(self):
        return sqlite3.connect(self.db_path)

    def check_and_migrate_db(self):
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(events)")
            columns = [col[1] for col in cursor.fetchall()]
            if columns and "video_path" not in columns:
                cursor.execute("ALTER TABLE events ADD COLUMN video_path TEXT")
                conn.commit()

            # One-Time SQLite Migration: Normalize production zones and set remaining legacy zones to 'Unknown'
            cursor.execute("""
                UPDATE events
                SET zone = 'Red'
                WHERE LOWER(zone) IN ('red', 'red zone')
            """)
            cursor.execute("""
                UPDATE events
                SET zone = 'Blue'
                WHERE LOWER(zone) IN ('blue', 'blue zone')
            """)
            cursor.execute("""
                UPDATE events
                SET zone = 'Green'
                WHERE LOWER(zone) IN ('green', 'green zone')
            """)
            cursor.execute("""
                UPDATE events
                SET zone = 'Unknown'
                WHERE zone NOT IN ('Red', 'Blue', 'Green', 'Unknown')
            """)
            conn.commit()
            conn.close()

            # One-Time Legacy Active Incidents Cleanup
            self.resolve_legacy_active_incidents()
        except Exception as e:
            print(f"[DB MIGRATION WARNING] {e}")

    def resolve_legacy_active_incidents(self):
        """
        One-Time cleanup for legacy active incidents created during early testing.
        Criteria:
        resolved = 0 AND (duration = 0 OR timestamp < TODAY)
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()

            today_str = datetime.now().strftime("%Y-%m-%d 00:00:00")

            cursor.execute("""
                SELECT id, timestamp, start_time, end_time, duration
                FROM events
                WHERE resolved = 0
            """)
            active_rows = cursor.fetchall()

            updated_count = 0
            skipped_count = 0

            for event_id, timestamp, start_time, end_time, duration in active_rows:
                is_legacy = (timestamp < today_str) or (duration == 0 and (end_time is None or end_time == '' or end_time == 'Ongoing'))
                if is_legacy:
                    final_end_time = end_time if (end_time and end_time != 'Ongoing') else (start_time if (start_time and start_time != '') else timestamp)
                    final_duration = max(1, duration)
                    cursor.execute(
                        """
                        UPDATE events
                        SET resolved = 1,
                            end_time = ?,
                            duration = ?
                        WHERE id = ?
                        """,
                        (final_end_time, final_duration, event_id)
                    )
                    updated_count += cursor.rowcount
                else:
                    skipped_count += 1

            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM events WHERE resolved = 0")
            remaining_active = cursor.fetchone()[0]

            conn.close()

            if updated_count > 0 or skipped_count > 0:
                print("==================================================")
                print("[TASK 1 — LEGACY ACTIVE INCIDENTS CLEANUP]")
                print(f"Rows updated: {updated_count}")
                print(f"Rows skipped: {skipped_count}")
                print(f"Remaining active incidents: {remaining_active}")
                print("==================================================")
            return updated_count, skipped_count, remaining_active
        except Exception as e:
            print(f"[LEGACY CLEANUP ERROR] {e}")
            return 0, 0, 0


    # =====================================================
    # EVENTS
    # =====================================================

    def add_event(
        self,
        track_id,
        zone,
        event_type,
        confidence,
        snapshot_path=None,
        video_path=None,
        start_time=None,
        end_time=None,
        duration=0
    ):

        conn = self.connect()
        cursor = conn.cursor()

        def format_time(t):
            if t is None:
                return None
            if isinstance(t, (int, float)):
                return datetime.fromtimestamp(t).strftime("%Y-%m-%d %H:%M:%S")
            return str(t)

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
                video_path,
                start_time,
                end_time,
                duration
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                track_id,
                zone,
                event_type,
                confidence,
                snapshot_path,
                video_path,
                format_time(start_time),
                format_time(end_time),
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
        video_path=None,
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
            video_path=video_path,
            start_time=start_time,
            end_time=end_time,
            duration=duration,
        )

    def update_event(
        self,
        event_id,
        end_time,
        duration,
        resolved=1,
        video_path=None
    ):
        conn = self.connect()
        cursor = conn.cursor()

        def format_time(t):
            if t is None:
                return None
            if isinstance(t, (int, float)):
                return datetime.fromtimestamp(t).strftime("%Y-%m-%d %H:%M:%S")
            return str(t)

        end_time_str = format_time(end_time)

        if video_path is not None:
            cursor.execute(
                """
                UPDATE events
                SET
                    end_time = ?,
                    duration = ?,
                    resolved = ?,
                    video_path = ?
                WHERE id = ?
                """,
                (
                    end_time_str,
                    duration,
                    resolved,
                    video_path,
                    event_id,
                ),
            )
        else:
            cursor.execute(
                """
                UPDATE events
                SET
                    end_time = ?,
                    duration = ?,
                    resolved = ?
                WHERE id = ?
                """,
                (
                    end_time_str,
                    duration,
                    resolved,
                    event_id,
                ),
            )

        conn.commit()
        conn.close()

    def update_event_video_path(self, event_id, video_path):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE events
            SET video_path = ?
            WHERE id = ?
            """,
            (video_path, event_id)
        )
        conn.commit()
        conn.close()

    def delete_expired_videos(self, retention_days=30):
        """
        Queries completed events (resolved = 1) older than retention_days (30 days) with a video_path.
        Sets video_path = NULL in the DB and returns deleted record metadata.
        """
        conn = self.connect()
        cursor = conn.cursor()

        cutoff_date = (datetime.now() - timedelta(days=retention_days)).strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute(
            """
            SELECT id, video_path, timestamp, end_time
            FROM events
            WHERE resolved = 1
              AND video_path IS NOT NULL
              AND video_path != ''
              AND (
                  (end_time IS NOT NULL AND end_time != '' AND end_time <= ?)
                  OR ((end_time IS NULL OR end_time = '') AND timestamp <= ?)
              )
            """,
            (cutoff_date, cutoff_date)
        )
        rows = cursor.fetchall()
        deleted_records = []

        for event_id, video_path, timestamp, end_time in rows:
            cursor.execute(
                """
                UPDATE events
                SET video_path = NULL
                WHERE id = ?
                """,
                (event_id,)
            )
            deleted_records.append({
                "id": event_id,
                "video_path": video_path,
                "timestamp": timestamp,
                "end_time": end_time
            })

        conn.commit()
        conn.close()
        return deleted_records

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

        cursor.execute("SELECT COUNT(*) FROM detections")
        persons = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM detections WHERE helmet=1")
        helmets = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM events WHERE resolved=0")
        active_violations = cursor.fetchone()[0]

        compliance = (
            helmets / persons * 100
            if persons > 0
            else 0
        )

        cursor.execute("""
            SELECT COUNT(*)
            FROM events
            WHERE DATE(timestamp) = DATE('now', 'localtime')
               OR DATE(timestamp) = DATE('now')
        """)
        todays_incidents = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COALESCE(AVG(duration), 0)
            FROM events
            WHERE resolved = 1 AND duration > 0
              AND (DATE(timestamp) = DATE('now', 'localtime') OR DATE(timestamp) = DATE('now'))
        """)
        todays_avg_duration = round(cursor.fetchone()[0], 1)

        conn.close()

        return {
            "persons": persons,
            "helmets": helmets,
            "violations": active_violations,
            "active_violations": active_violations,
            "compliance_rate": round(compliance, 1),
            "todays_incidents": todays_incidents,
            "todays_avg_duration": todays_avg_duration,
        }

    # =====================================================
    # RECENT EVENTS
    # =====================================================

    def get_recent_events(
        self,
        limit=50
    ):

        conn = self.connect()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                id,
                timestamp,
                track_id,
                zone,
                event_type,
                confidence,
                snapshot_path,
                video_path,
                start_time,
                end_time,
                duration,
                resolved
            FROM events
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )

        rows = cursor.fetchall()

        conn.close()

        return rows

    def get_analytics(self, start_date=None, end_date=None):
        conn = self.connect()
        cursor = conn.cursor()

        date_where = ""
        params = []
        if start_date and end_date:
            date_where = " WHERE DATE(timestamp) >= ? AND DATE(timestamp) <= ?"
            params = [start_date, end_date]
        elif start_date:
            date_where = " WHERE DATE(timestamp) >= ?"
            params = [start_date]

        # ----------------------------
        # Dashboard & Historical KPIs
        # ----------------------------
        cursor.execute("SELECT COUNT(*) FROM detections")
        workers = cursor.fetchone()[0]

        cursor.execute(f"SELECT COUNT(*) FROM events{date_where}", params)
        total_incidents = cursor.fetchone()[0]

        completed_where = date_where + (" AND " if date_where else " WHERE ") + "resolved = 1"
        cursor.execute(f"SELECT COUNT(*) FROM events{completed_where}", params)
        completed_incidents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM events WHERE resolved = 0")
        active_violations = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM detections WHERE helmet=1")
        helmets = cursor.fetchone()[0]

        compliance = (
            helmets / workers * 100
            if workers > 0 else 0
        )
        safety_score = round(compliance)

        # Today's incidents
        cursor.execute("""
            SELECT COUNT(*)
            FROM events
            WHERE DATE(timestamp) = DATE('now', 'localtime')
               OR DATE(timestamp) = DATE('now')
        """)
        todays_incidents = cursor.fetchone()[0]

        # Average duration in seconds (completed incidents only in range)
        dur_where = date_where + (" AND " if date_where else " WHERE ") + "resolved = 1 AND duration > 0"
        cursor.execute(f"SELECT COALESCE(AVG(duration), 0) FROM events{dur_where}", params)
        avg_duration = round(cursor.fetchone()[0], 1)

        # Longest duration in seconds (completed incidents only in range)
        cursor.execute(f"SELECT COALESCE(MAX(duration), 0) FROM events{dur_where}", params)
        longest_duration = cursor.fetchone()[0]

        # Highest Risk Zone
        hrz_where = date_where + (" AND " if date_where else " WHERE ") + "zone IS NOT NULL AND zone != ''"
        cursor.execute(f"""
            SELECT zone, COUNT(*) as cnt
            FROM events
            {hrz_where}
            GROUP BY zone
            ORDER BY cnt DESC
            LIMIT 1
        """, params)
        hrz_row = cursor.fetchone()
        highest_risk_zone = hrz_row[0] if hrz_row else "None"

        # Latest incident time
        cursor.execute("SELECT timestamp FROM events ORDER BY id DESC LIMIT 1")
        lit_row = cursor.fetchone()
        latest_incident_time = lit_row[0] if lit_row else "N/A"

        # ----------------------------
        # Zone Distribution
        # ----------------------------
        cursor.execute(f"""
            SELECT zone, COUNT(*)
            FROM events
            {date_where}
            GROUP BY zone
        """, params)
        zone_counts = [{"zone": z or "Unknown", "violations": cnt} for z, cnt in cursor.fetchall()]

        # ----------------------------
        # Event Distribution
        # ----------------------------
        cursor.execute(f"""
            SELECT event_type, COUNT(*)
            FROM events
            {date_where}
            GROUP BY event_type
        """, params)
        event_counts = [{"name": et, "value": cnt} for et, cnt in cursor.fetchall()]

        # ----------------------------
        # Daily Trend (Calculated directly from SQLite)
        # ----------------------------
        cursor.execute(f"""
            SELECT DATE(timestamp), COUNT(*)
            FROM events
            {date_where}
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp)
        """, params)
        trend = [{"day": day, "value": cnt} for day, cnt in cursor.fetchall()]

        conn.close()

        return {
            "workers": workers,
            "violations": active_violations,
            "active_violations": active_violations,
            "total_incidents": total_incidents,
            "completed_incidents": completed_incidents,
            "compliance_rate": round(compliance, 1),
            "safety_score": safety_score,
            "todays_incidents": todays_incidents,
            "avg_duration": avg_duration,
            "longest_duration": longest_duration,
            "highest_risk_zone": highest_risk_zone,
            "latest_incident_time": latest_incident_time,
            "zone_data": zone_counts,
            "event_data": event_counts,
            "trend_data": trend,
        }

    # =====================================================
    # SERVER-SIDE PAGINATED EVENTS
    # =====================================================

    def get_paged_events(
        self,
        page=1,
        limit=10,
        search="",
        zone="",
        event_type="",
        status="",
        date="",
        sort_field="id",
        sort_order="desc"
    ):
        conn = self.connect()
        cursor = conn.cursor()

        where_clauses = []
        params = []

        if search:
            search_str = f"%{search.strip().lower()}%"
            where_clauses.append("(LOWER(zone) LIKE ? OR LOWER(event_type) LIKE ? OR CAST(track_id AS TEXT) LIKE ? OR LOWER(timestamp) LIKE ?)")
            params.extend([search_str, search_str, search_str.replace("#", ""), search_str])

        if zone:
            where_clauses.append("zone = ?")
            params.append(zone)

        if event_type:
            where_clauses.append("event_type = ?")
            params.append(event_type)

        if status:
            if status == "Completed":
                where_clauses.append("resolved = 1")
            elif status == "Active":
                where_clauses.append("resolved = 0")

        if date:
            where_clauses.append("(DATE(start_time) = ? OR DATE(timestamp) = ?)")
            params.extend([date, date])

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        # Total matching records count
        count_sql = f"SELECT COUNT(*) FROM events{where_sql}"
        cursor.execute(count_sql, params)
        total_count = cursor.fetchone()[0]

        # Valid sort fields to prevent SQL injection
        allowed_sort_fields = {
            "timestamp": "timestamp",
            "start_time": "start_time",
            "duration": "duration",
            "track_id": "track_id",
            "id": "id"
        }
        actual_sort_field = allowed_sort_fields.get(sort_field, "id")
        actual_sort_order = "ASC" if str(sort_order).lower() == "asc" else "DESC"

        offset = max(0, (page - 1) * limit)
        query_sql = f"""
            SELECT id, timestamp, track_id, zone, event_type, confidence, snapshot_path, video_path, start_time, end_time, duration, resolved
            FROM events
            {where_sql}
            ORDER BY {actual_sort_field} {actual_sort_order}
            LIMIT ? OFFSET ?
        """
        queryParams = params + [limit, offset]
        cursor.execute(query_sql, queryParams)
        rows = cursor.fetchall()
        conn.close()

        total_pages = max(1, (total_count + limit - 1) // limit)

        return {
            "events": rows,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }

    # =====================================================
    # HOURLY VIOLATIONS BY DATE
    # =====================================================

    def get_hourly_violations(self, target_date=None):
        conn = self.connect()
        cursor = conn.cursor()

        if target_date:
            sql = """
                SELECT strftime('%H', timestamp) as hr, COUNT(*)
                FROM events
                WHERE DATE(timestamp) = ? OR DATE(start_time) = ?
                GROUP BY hr
            """
            params = [target_date, target_date]
        else:
            sql = """
                SELECT strftime('%H', timestamp) as hr, COUNT(*)
                FROM events
                WHERE DATE(timestamp) = DATE('now', 'localtime')
                   OR DATE(timestamp) = DATE('now')
                GROUP BY hr
            """
            params = []

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()

        hourly_map = {hr: cnt for hr, cnt in rows}
        result = []
        total_for_day = sum(hourly_map.values())
        avg_hourly = round(total_for_day / 24, 1)

        for h in range(24):
            h_str = f"{h:02d}"
            result.append({
                "hour": f"{h_str}:00",
                "count": hourly_map.get(h_str, 0),
                "avg": avg_hourly
            })

        return result

    def get_hourly_violations_today(self):
        return self.get_hourly_violations(None)

    # =====================================================
    # ZONE WORKER DISTRIBUTION VS VIOLATIONS
    # =====================================================

    def normalize_zone_name(self, raw_zone):
        if not raw_zone:
            return "Unknown"
        z = str(raw_zone).strip().lower()
        if z in ["red", "red zone"]:
            return "Red"
        if z in ["blue", "blue zone"]:
            return "Blue"
        if z in ["green", "green zone"]:
            return "Green"
        return "Unknown"

    def get_zone_worker_distribution(self, start_date=None, end_date=None):
        conn = self.connect()
        cursor = conn.cursor()

        # Detections count per raw zone
        cursor.execute("""
            SELECT zone, COUNT(*)
            FROM detections
            WHERE zone IS NOT NULL AND zone != ''
            GROUP BY zone
        """)
        raw_worker_counts = cursor.fetchall()

        # Violations count per raw zone within date range
        if start_date and end_date:
            v_sql = """
                SELECT zone, COUNT(*)
                FROM events
                WHERE zone IS NOT NULL AND zone != ''
                  AND DATE(timestamp) >= ? AND DATE(timestamp) <= ?
                GROUP BY zone
            """
            v_params = [start_date, end_date]
        elif start_date:
            v_sql = """
                SELECT zone, COUNT(*)
                FROM events
                WHERE zone IS NOT NULL AND zone != ''
                  AND DATE(timestamp) >= ?
                GROUP BY zone
            """
            v_params = [start_date]
        else:
            v_sql = """
                SELECT zone, COUNT(*)
                FROM events
                WHERE zone IS NOT NULL AND zone != ''
                GROUP BY zone
            """
            v_params = []

        cursor.execute(v_sql, v_params)
        raw_violation_counts = cursor.fetchall()
        conn.close()

        # Production Zones strictly: Red, Blue, Green, Unknown
        prod_zones = ["Red", "Blue", "Green", "Unknown"]
        worker_map = {z: 0 for z in prod_zones}
        violation_map = {z: 0 for z in prod_zones}

        for r_zone, count in raw_worker_counts:
            norm = self.normalize_zone_name(r_zone)
            worker_map[norm] += count

        for r_zone, count in raw_violation_counts:
            norm = self.normalize_zone_name(r_zone)
            violation_map[norm] += count

        distribution = []
        for zone in prod_zones:
            workers = worker_map[zone]
            violations = violation_map[zone]
            pct = round((violations / workers * 100), 1) if workers > 0 else 0.0
            distribution.append({
                "zone": zone,
                "total_workers": workers,
                "violations": violations,
                "violation_pct": pct
            })

        return distribution

    # =====================================================
    # ACTIVE ALERTS ONLY
    # =====================================================

    def get_active_alerts(self):
        conn = self.connect()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, timestamp, track_id, zone, event_type, confidence, snapshot_path, video_path, start_time, end_time, duration, resolved
            FROM events
            WHERE resolved = 0
            ORDER BY id DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        active_events = []
        for row in rows:
            active_events.append({
                "id": row[0],
                "timestamp": row[1],
                "track_id": row[2],
                "zone": row[3],
                "event_type": row[4],
                "confidence": row[5],
                "snapshot_path": row[6],
                "video_path": row[7] or "",
                "start_time": row[8],
                "end_time": "Ongoing",
                "duration": row[10],
                "resolved": row[11],
                "status": "Active"
            })
        return active_events

    # =====================================================
    # USERS MANAGEMENT & AUTHENTICATION
    # =====================================================

    def init_user_table(self):
        conn = self.connect()
        cursor = conn.cursor()
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
            print("[SYSTEM] Default admin user created: admin / admin123")
        conn.commit()
        conn.close()

    def get_user_by_username(self, username):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, full_name, username, email, password_hash, role, is_active, last_login, created_at
            FROM users
            WHERE username = ? OR email = ?
            """,
            (username, username)
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "id": row[0],
                "full_name": row[1],
                "username": row[2],
                "email": row[3],
                "password_hash": row[4],
                "role": row[5],
                "is_active": row[6],
                "last_login": row[7],
                "created_at": row[8]
            }
        return None

    def get_user_by_id(self, user_id):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, full_name, username, email, password_hash, role, is_active, last_login, created_at
            FROM users
            WHERE id = ?
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "id": row[0],
                "full_name": row[1],
                "username": row[2],
                "email": row[3],
                "password_hash": row[4],
                "role": row[5],
                "is_active": row[6],
                "last_login": row[7],
                "created_at": row[8]
            }
        return None

    def get_all_users(self):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, full_name, username, email, role, is_active, last_login, created_at
            FROM users
            ORDER BY id ASC
            """
        )
        rows = cursor.fetchall()
        conn.close()
        users = []
        for row in rows:
            users.append({
                "id": row[0],
                "full_name": row[1],
                "username": row[2],
                "email": row[3],
                "role": row[4],
                "is_active": row[5],
                "last_login": row[6],
                "created_at": row[7]
            })
        return users

    def create_user(self, full_name, username, email, password_hash, role):
        conn = self.connect()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            """
            INSERT INTO users (full_name, username, email, password_hash, role, is_active, last_login, created_at)
            VALUES (?, ?, ?, ?, ?, 1, NULL, ?)

            """,
            (full_name, username, email, password_hash, role, now_str)
        )
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return new_id

    def update_user(self, user_id, full_name, email, role):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET full_name = ?, email = ?, role = ?
            WHERE id = ?
            """,
            (full_name, email, role, user_id)
        )
        conn.commit()
        conn.close()
        return cursor.rowcount > 0

    def update_user_password(self, user_id, password_hash):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET password_hash = ?
            WHERE id = ?
            """,
            (password_hash, user_id)
        )
        conn.commit()
        conn.close()
        return cursor.rowcount > 0

    def set_user_active_status(self, user_id, is_active):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET is_active = ?
            WHERE id = ?
            """,
            (1 if is_active else 0, user_id)
        )
        conn.commit()
        conn.close()
        return cursor.rowcount > 0

    def update_last_login(self, user_id):
        conn = self.connect()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            """
            UPDATE users
            SET last_login = ?
            WHERE id = ?
            """,
            (now_str, user_id)
        )
        conn.commit()
        conn.close()
        return now_str

    def delete_user(self, user_id):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            DELETE FROM users
            WHERE id = ?
            """,
            (user_id,)
        )
        conn.commit()
        conn.close()
        return cursor.rowcount > 0

    def delete_event(self, event_id):
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            DELETE FROM events
            WHERE id = ?
            """,
            (event_id,)
        )
        conn.commit()
        conn.close()
        return cursor.rowcount > 0

    # =====================================================
    # REPORTS MODULE DATABASE QUERIES (ZERO MOCK DATA)
    # =====================================================

    def get_daily_hse_summary_report(self, target_date=None):
        conn = self.connect()
        cursor = conn.cursor()

        if not target_date:
            target_date = datetime.now().strftime("%Y-%m-%d")

        # Today's Total Incidents
        cursor.execute("SELECT COUNT(*) FROM events WHERE DATE(timestamp) = ?", (target_date,))
        todays_incidents = cursor.fetchone()[0]

        # Today's Active Incidents
        cursor.execute("SELECT COUNT(*) FROM events WHERE DATE(timestamp) = ? AND resolved = 0", (target_date,))
        active_incidents = cursor.fetchone()[0]

        # Today's Completed Incidents
        cursor.execute("SELECT COUNT(*) FROM events WHERE DATE(timestamp) = ? AND resolved = 1", (target_date,))
        completed_incidents = cursor.fetchone()[0]

        # Monitored Workers
        cursor.execute("SELECT COUNT(*) FROM detections")
        total_workers = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM detections WHERE helmet=1")
        helmets = cursor.fetchone()[0]
        compliance_rate = round((helmets / total_workers * 100), 1) if total_workers > 0 else 100.0

        # Avg & Max Duration for target_date
        cursor.execute("SELECT COALESCE(AVG(duration), 0), COALESCE(MAX(duration), 0) FROM events WHERE DATE(timestamp) = ? AND resolved = 1 AND duration > 0", (target_date,))
        dur_row = cursor.fetchone()
        avg_duration = round(dur_row[0], 1)
        longest_duration = int(dur_row[1])

        # Highest Risk Zone for target_date
        cursor.execute("""
            SELECT zone, COUNT(*) as cnt
            FROM events
            WHERE DATE(timestamp) = ? AND zone IS NOT NULL AND zone != ''
            GROUP BY zone
            ORDER BY cnt DESC
            LIMIT 1
        """, (target_date,))
        hrz_row = cursor.fetchone()
        highest_risk_zone = hrz_row[0] if hrz_row else "None"

        # Hourly Violations for target_date
        cursor.execute("""
            SELECT strftime('%H', timestamp) as hr, COUNT(*)
            FROM events
            WHERE DATE(timestamp) = ?
            GROUP BY hr
        """, (target_date,))
        hourly_map = {row[0]: row[1] for row in cursor.fetchall()}
        hourly_violations = []
        for h in range(24):
            h_str = f"{h:02d}"
            hourly_violations.append({
                "hour": f"{h_str}:00",
                "count": hourly_map.get(h_str, 0)
            })

        # Zone Distribution for target_date
        cursor.execute("""
            SELECT zone, COUNT(*)
            FROM events
            WHERE DATE(timestamp) = ? AND zone IS NOT NULL AND zone != ''
            GROUP BY zone
        """, (target_date,))
        zone_distribution = [{"zone": row[0], "count": row[1]} for row in cursor.fetchall()]

        # Top Incidents for target_date
        cursor.execute("""
            SELECT id, timestamp, track_id, zone, event_type, confidence, snapshot_path, video_path, start_time, end_time, duration, resolved
            FROM events
            WHERE DATE(timestamp) = ?
            ORDER BY id DESC
            LIMIT 15
        """, (target_date,))
        top_incidents = []
        for row in cursor.fetchall():
            top_incidents.append({
                "id": row[0],
                "timestamp": row[1],
                "track_id": row[2],
                "zone": row[3] or "Unknown",
                "event_type": row[4],
                "confidence": row[5] if row[5] is not None else 1.0,
                "snapshot_path": row[6] or "",
                "video_path": row[7] or "",
                "start_time": row[8] or row[1],
                "end_time": row[9] or ("Ongoing" if row[11] == 0 else row[1]),
                "duration": row[10] or 0,
                "resolved": row[11] or 0,
                "status": "Completed" if row[11] == 1 else "Active"
            })

        conn.close()

        # Dynamic Executive Summary
        exec_summary = (
            f"Daily Operational Safety Summary for {target_date}: A total of {todays_incidents} PPE safety incidents were recorded. "
            f"Currently, {active_incidents} incidents remain active and {completed_incidents} incidents have been resolved. "
            f"The overall helmet compliance rate stands at {compliance_rate}% across {total_workers} tracked workers. "
            f"The primary risk zone identified for the day is '{highest_risk_zone}' with an average incident duration of {avg_duration} seconds."
        )

        return {
            "date": target_date,
            "todays_incidents": todays_incidents,
            "active_incidents": active_incidents,
            "completed_incidents": completed_incidents,
            "total_workers": total_workers,
            "compliance_rate": compliance_rate,
            "avg_duration": avg_duration,
            "longest_duration": longest_duration,
            "highest_risk_zone": highest_risk_zone,
            "hourly_violations": hourly_violations,
            "zone_distribution": zone_distribution,
            "top_incidents": top_incidents,
            "executive_summary": exec_summary
        }

    def get_incident_investigation_report(self, start_date=None, end_date=None, zone=None, event_type=None, status=None):
        conn = self.connect()
        cursor = conn.cursor()

        where_clauses = []
        params = []

        if start_date and end_date:
            where_clauses.append("DATE(timestamp) >= ? AND DATE(timestamp) <= ?")
            params.extend([start_date, end_date])
        elif start_date:
            where_clauses.append("DATE(timestamp) >= ?")
            params.append(start_date)

        if zone and zone != "All":
            where_clauses.append("zone = ?")
            params.append(zone)

        if event_type and event_type != "All":
            where_clauses.append("event_type = ?")
            params.append(event_type)

        if status and status != "All":
            if status == "Active":
                where_clauses.append("resolved = 0")
            elif status == "Completed":
                where_clauses.append("resolved = 1")

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        # Query Incidents
        sql = f"""
            SELECT id, timestamp, track_id, zone, event_type, confidence, snapshot_path, video_path, start_time, end_time, duration, resolved
            FROM events
            {where_sql}
            ORDER BY id DESC
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        incidents = []
        active_count = 0
        completed_count = 0
        total_duration = 0
        dur_count = 0
        unique_tracks = set()

        for row in rows:
            is_res = (row[11] == 1)
            if is_res:
                completed_count += 1
            else:
                active_count += 1

            if row[10] and row[10] > 0:
                total_duration += row[10]
                dur_count += 1

            if row[2]:
                unique_tracks.add(row[2])

            incidents.append({
                "id": row[0],
                "timestamp": row[1],
                "track_id": row[2],
                "zone": row[3] or "Unknown",
                "event_type": row[4],
                "confidence": row[5] if row[5] is not None else 1.0,
                "snapshot_path": row[6] or "",
                "video_path": row[7] or "",
                "start_time": row[8] or row[1],
                "end_time": row[9] or ("Ongoing" if not is_res else row[1]),
                "duration": row[10] or 0,
                "resolved": 1 if is_res else 0,
                "status": "Completed" if is_res else "Active"
            })

        avg_dur = round(total_duration / dur_count, 1) if dur_count > 0 else 0

        # Zone Breakdown
        z_sql = f"""
            SELECT zone, COUNT(*)
            FROM events
            {where_sql}
            GROUP BY zone
        """
        cursor.execute(z_sql, params)
        zone_breakdown = [{"zone": r[0] or "Unknown", "count": r[1]} for r in cursor.fetchall()]

        # Violation Type Breakdown
        t_sql = f"""
            SELECT event_type, COUNT(*)
            FROM events
            {where_sql}
            GROUP BY event_type
        """
        cursor.execute(t_sql, params)
        type_breakdown = [{"type": r[0] or "General Violation", "count": r[1]} for r in cursor.fetchall()]

        conn.close()

        return {
            "total_incidents": len(incidents),
            "active_incidents": active_count,
            "completed_incidents": completed_count,
            "avg_duration": avg_dur,
            "unique_tracked_persons": len(unique_tracks),
            "incidents": incidents,
            "zone_breakdown": zone_breakdown,
            "type_breakdown": type_breakdown
        }

    def get_executive_analytics_report(self, start_date=None, end_date=None):
        conn = self.connect()
        cursor = conn.cursor()

        where_sql = ""
        params = []

        if start_date and end_date:
            where_sql = " WHERE DATE(timestamp) >= ? AND DATE(timestamp) <= ?"
            params = [start_date, end_date]
        elif start_date:
            where_sql = " WHERE DATE(timestamp) >= ?"
            params = [start_date]

        # KPIs
        cursor.execute(f"SELECT COUNT(*) FROM events{where_sql}", params)
        total_incidents = cursor.fetchone()[0]

        cursor.execute(f"SELECT COUNT(*) FROM events{where_sql} {'AND' if where_sql else 'WHERE'} resolved = 0", params)
        active_incidents = cursor.fetchone()[0]

        cursor.execute(f"SELECT COUNT(*) FROM events{where_sql} {'AND' if where_sql else 'WHERE'} resolved = 1", params)
        completed_incidents = cursor.fetchone()[0]

        cursor.execute(f"SELECT COALESCE(AVG(duration), 0), COALESCE(MAX(duration), 0) FROM events{where_sql} {'AND' if where_sql else 'WHERE'} resolved = 1 AND duration > 0", params)
        dur_row = cursor.fetchone()
        avg_duration = round(dur_row[0], 1)
        longest_duration = int(dur_row[1])

        cursor.execute("SELECT COUNT(*) FROM detections")
        total_workers = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM detections WHERE helmet=1")
        helmets = cursor.fetchone()[0]
        compliance_rate = round((helmets / total_workers * 100), 1) if total_workers > 0 else 100.0

        # Highest & Lowest Risk Zone
        cursor.execute(f"""
            SELECT zone, COUNT(*) as cnt
            FROM events
            {where_sql}
            GROUP BY zone
            ORDER BY cnt DESC
            LIMIT 1
        """, params)
        hrz_row = cursor.fetchone()
        highest_risk_zone = hrz_row[0] if hrz_row else "None"

        cursor.execute(f"""
            SELECT zone, COUNT(*) as cnt
            FROM events
            {where_sql}
            GROUP BY zone
            ORDER BY cnt ASC
            LIMIT 1
        """, params)
        lrz_row = cursor.fetchone()
        lowest_risk_zone = lrz_row[0] if lrz_row else "Green"

        # Largest Incident Day
        cursor.execute(f"""
            SELECT DATE(timestamp) as dt, COUNT(*) as cnt
            FROM events
            {where_sql}
            GROUP BY dt
            ORDER BY cnt DESC
            LIMIT 1
        """, params)
        lid_row = cursor.fetchone()
        largest_incident_day = f"{lid_row[0]} ({lid_row[1]} events)" if lid_row else "N/A"

        # Daily Incident Trend
        cursor.execute(f"""
            SELECT DATE(timestamp) as dt, COUNT(*)
            FROM events
            {where_sql}
            GROUP BY dt
            ORDER BY dt ASC
        """, params)
        daily_trend = [{"date": r[0], "count": r[1]} for r in cursor.fetchall()]

        # Hourly Violation Distribution
        cursor.execute(f"""
            SELECT strftime('%H', timestamp) as hr, COUNT(*)
            FROM events
            {where_sql}
            GROUP BY hr
            ORDER BY hr ASC
        """, params)
        hourly_map = {r[0]: r[1] for r in cursor.fetchall()}
        hourly_trend = []
        for h in range(24):
            h_str = f"{h:02d}"
            hourly_trend.append({"hour": f"{h_str}:00", "count": hourly_map.get(h_str, 0)})

        # Zone Risk Matrix
        cursor.execute(f"""
            SELECT zone, COUNT(*)
            FROM events
            {where_sql}
            GROUP BY zone
        """, params)
        zone_counts = {r[0]: r[1] for r in cursor.fetchall()}

        cursor.execute("""
            SELECT zone, COUNT(*)
            FROM detections
            WHERE zone IS NOT NULL AND zone != ''
            GROUP BY zone
        """)
        worker_counts = {r[0]: r[1] for r in cursor.fetchall()}

        zones_set = set(zone_counts.keys()).union(set(worker_counts.keys()))
        if not zones_set:
            zones_set = {"Red Zone", "Blue Zone", "Green Zone", "Yellow Zone"}

        zone_matrix = []
        for z in zones_set:
            w = worker_counts.get(z, 0)
            v = zone_counts.get(z, 0)
            pct = round((v / w * 100), 1) if w > 0 else 0.0
            status = "High Risk" if v >= 3 else ("Warning" if v > 0 else "Low Risk")
            zone_matrix.append({
                "zone": z or "Unknown Zone",
                "total_workers": w,
                "violations": v,
                "violation_pct": pct,
                "risk_status": status
            })
        zone_matrix.sort(key=lambda x: x["violations"], reverse=True)

        # Violation Type Breakdown
        cursor.execute(f"""
            SELECT event_type, COUNT(*)
            FROM events
            {where_sql}
            GROUP BY event_type
        """, params)
        type_rows = cursor.fetchall()
        type_dist = []
        for r in type_rows:
            pct = round((r[1] / total_incidents * 100), 1) if total_incidents > 0 else 0.0
            type_dist.append({"type": r[0] or "Violation", "count": r[1], "percentage": pct})

        # Monthly Totals
        cursor.execute("""
            SELECT strftime('%Y-%m', timestamp) as mn, COUNT(*)
            FROM events
            GROUP BY mn
            ORDER BY mn DESC
            LIMIT 12
        """)
        monthly_totals = [{"month": r[0], "count": r[1]} for r in cursor.fetchall()]

        conn.close()

        # Dynamic Multi-Paragraph Executive Summary
        period_str = f"from {start_date} to {end_date}" if start_date and end_date else "across recorded operations"
        exec_summary = (
            f"Executive HSE Performance Analysis ({period_str}): "
            f"A total of {total_incidents} safety violations were recorded in the system. "
            f"The facility achieved an overall helmet PPE compliance rate of {compliance_rate}%. "
            f"Operational data highlights '{highest_risk_zone}' as the area requiring primary HSE intervention, accounting for the highest violation density. "
            f"Average incident resolution duration was logged at {avg_duration} seconds, with a maximum single incident duration of {longest_duration} seconds."
        )

        # Incident Log
        inv_rep = self.get_incident_investigation_report(start_date=start_date, end_date=end_date)
        incidents_log = inv_rep.get("incidents", [])

        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_incidents": total_incidents,
            "active_incidents": active_incidents,
            "completed_incidents": completed_incidents,
            "avg_duration": avg_duration,
            "longest_duration": longest_duration,
            "compliance_rate": compliance_rate,
            "total_workers": total_workers,
            "highest_risk_zone": highest_risk_zone,
            "lowest_risk_zone": lowest_risk_zone,
            "largest_incident_day": largest_incident_day,
            "daily_trend": daily_trend,
            "hourly_trend": hourly_trend,
            "zone_matrix": zone_matrix,
            "violation_types": type_dist,
            "monthly_totals": monthly_totals,
            "incidents_log": incidents_log,
            "executive_summary": exec_summary
        }



db = Database()

