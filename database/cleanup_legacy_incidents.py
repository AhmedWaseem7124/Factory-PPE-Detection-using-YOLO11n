import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "ppe_monitor.db")

def run_migration():
    print("\n=======================================================")
    print("STARTING ONE-TIME LEGACY INCIDENT CLEANUP MIGRATION")
    print("=======================================================\n")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # --- BEFORE STATISTICS ---
    cursor.execute("SELECT COUNT(*) FROM events")
    total_events = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM events
        WHERE resolved = 0
          AND (end_time IS NULL OR end_time = '')
          AND duration = 0
    """)
    legacy_unresolved_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM events WHERE resolved = 1")
    already_completed_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM events
        WHERE resolved = 0
          AND NOT (
            (end_time IS NULL OR end_time = '') AND duration = 0
          )
    """)
    current_active_count = cursor.fetchone()[0]

    print("--- BEFORE MIGRATION STATISTICS ---")
    print(f"Total Events in Database:         {total_events}")
    print(f"Legacy Unresolved Events to Fix: {legacy_unresolved_count}")
    print(f"Already Completed Events:         {already_completed_count}")
    print(f"Current/Active Non-Legacy Events: {current_active_count}\n")

    # --- PERFORM MIGRATION UPDATE ---
    update_sql = """
        UPDATE events
        SET resolved = 1,
            end_time = CASE
                WHEN start_time IS NOT NULL AND start_time != '' THEN start_time
                ELSE timestamp
            END,
            duration = 1
        WHERE resolved = 0
          AND (end_time IS NULL OR end_time = '')
          AND duration = 0
    """

    cursor.execute(update_sql)
    rows_updated = cursor.rowcount
    conn.commit()

    # --- AFTER STATISTICS ---
    cursor.execute("SELECT COUNT(*) FROM events WHERE resolved = 0")
    remaining_active_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM events WHERE resolved = 1")
    new_completed_count = cursor.fetchone()[0]

    conn.close()

    print("--- AFTER MIGRATION STATISTICS ---")
    print(f"Rows Updated by Migration:        {rows_updated}")
    print(f"Remaining Active Incidents:       {remaining_active_count}")
    print(f"Total Completed Incidents:        {new_completed_count}")

    print("\n=======================================================")
    print("ONE-TIME LEGACY INCIDENT CLEANUP COMPLETED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_migration()
