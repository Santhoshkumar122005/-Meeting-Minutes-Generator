import sqlite3
import uuid
from datetime import datetime
import json
import random

def seed_varied():
    conn = sqlite3.connect('meetlyze.db')
    c = conn.cursor()
    
    languages = ["English", "Spanish", "French", "German", "Hindi"]
    topics_pool = [
        "Budget Review", "Q3 Goals", "Hiring Plan", "Marketing Strategy", 
        "Product Launch", "Client Feedback", "Bug Triage", "Server Migration",
        "Team Building", "Annual Leave Policy"
    ]
    
    for i in range(5):
        meeting_id = str(uuid.uuid4())
        lang = random.choice(languages)
        selected_topics = random.sample(topics_pool, k=3)
        
        title = f"Meeting about {selected_topics[0]} ({lang})"
        date = datetime.now().isoformat()
        
        transcript = f"Discussion in {lang}..."
        
        topics_md = "\n".join([f"* {t}" for t in selected_topics])
        
        summary = f"""
# {title}

## Executive Summary
Meeting in {lang}.

## Key Topics / Highlights
{topics_md}

## Detailed Notes
Notes...

## Decisions Made
* Approved...

## Action Items
* Task 1...
        """
        
        metadata = json.dumps({"source": "seed_varied", "duration": "45:00"})
        
        c.execute('''
            INSERT INTO meetings (id, title, date, detected_language, transcript, summary_markdown, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (meeting_id, title, date, lang, transcript, summary, metadata))
        
    conn.commit()
    conn.close()
    print("Seeded 5 varied meetings.")

if __name__ == "__main__":
    seed_varied()
