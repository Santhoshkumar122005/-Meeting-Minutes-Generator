import sqlite3
import uuid
from datetime import datetime
import json

def seed_db():
    conn = sqlite3.connect('meetlyze.db')
    c = conn.cursor()
    
    # Create valid dummy data
    meeting_id = str(uuid.uuid4())
    title = "Weekly Team Sync - Project Alpha"
    date = datetime.now().isoformat()
    detected_language = "English"
    transcript = "This is a dummy transcript for testing purposes. We discussed the roadmap."
    summary = """
# Weekly Team Sync - Project Alpha

## Executive Summary
The team met to discuss the Q1 roadmap for Project Alpha. Key focus areas include performance optimization and new UI features.

## Key Topics / Highlights
* Performance Optimization
* UI Rebranding
* Backend Scalability

## Detailed Notes
The team agreed that the current response times are too slow. John proposed caching strategies. 
Sarah demonstrated the new dark mode UI which received positive feedback.

## Decisions Made
* Implement Redis caching by next Sprint.
* Approve the new Dark Mode design.

## Action Items
* John: Setup Redis instance (Friday)
* Sarah: Finalize color palette (Wednesday)
    """
    metadata = json.dumps({"source": "manual_seed", "duration": "30:00"})
    
    c.execute('''
        INSERT INTO meetings (id, title, date, detected_language, transcript, summary_markdown, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (meeting_id, title, date, detected_language, transcript, summary, metadata))
    
    conn.commit()
    conn.close()
    print(f"Seeded meeting {meeting_id}")

if __name__ == "__main__":
    seed_db()
