import sqlite3

def check_db():
    conn = sqlite3.connect('meetlyze.db')
    c = conn.cursor()
    c.execute('SELECT count(*) FROM meetings WHERE title = "Weekly Team Sync - Project Alpha"')
    count = c.fetchone()[0]
    conn.close()
    if count == 0:
        print("VERIFIED: Meeting was deleted.")
    else:
        print(f"FAILED: Meeting still exists. Count: {count}")

if __name__ == "__main__":
    check_db()
