import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_NAME = "meetlyze.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY,
            title TEXT,
            date TEXT,
            detected_language TEXT,
            transcript TEXT,
            summary_markdown TEXT,
            metadata TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_meeting(meeting_id, title, detected_language, transcript, summary_markdown, metadata_dict):
    conn = get_db_connection()
    c = conn.cursor()
    date_str = datetime.now().isoformat()
    # Ensure title is not empty
    if not title:
        title = "Untitled Meeting"
        
    c.execute('''
        INSERT OR REPLACE INTO meetings (id, title, date, detected_language, transcript, summary_markdown, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (meeting_id, title, date_str, detected_language, transcript, summary_markdown, json.dumps(metadata_dict)))
    conn.commit()
    conn.close()

def get_all_meetings():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT id, title, date, detected_language FROM meetings ORDER BY date DESC')
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_meeting(meeting_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM meetings WHERE id = ?', (meeting_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def delete_meeting(meeting_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('DELETE FROM meetings WHERE id = ?', (meeting_id,))
    conn.commit()
    conn.close()

def search_meetings(query):
    conn = get_db_connection()
    c = conn.cursor()
    # Simple like search
    search_term = f"%{query}%"
    c.execute('''
        SELECT id, title, date, detected_language 
        FROM meetings 
        WHERE title LIKE ? OR transcript LIKE ? OR summary_markdown LIKE ?
        ORDER BY date DESC
    ''', (search_term, search_term, search_term))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_analytics_data():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT detected_language, summary_markdown, transcript FROM meetings')
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
