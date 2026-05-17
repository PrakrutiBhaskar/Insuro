import json
import sqlite3
import os
import bcrypt

DB_PATH = "backend/insuro.db"
CATALOGUE_PATH = "INSURO_ML/api/plans_catalogue.json"

def seed():
    print("--- Seeding Insuro Plan Database (SQLite) ---")
    
    if not os.path.exists(os.path.dirname(DB_PATH)):
        os.makedirs(os.path.dirname(DB_PATH))

    with open(CATALOGUE_PATH, "r") as f:
        plans = json.load(f)
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS insurance_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id TEXT UNIQUE,
                name TEXT,
                insurer TEXT,
                tier TEXT,
                price FLOAT,
                sum_insured FLOAT,
                coverage_type TEXT,
                features TEXT,
                suitable_for TEXT,
                plan_vector TEXT
            );
        """)
        
        for p in plans:
            cur.execute("""
                INSERT INTO insurance_plans (plan_id, name, insurer, tier, price, sum_insured, coverage_type, features, suitable_for, plan_vector)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (plan_id) DO UPDATE SET
                    name = excluded.name,
                    price = excluded.price;
            """, (
                p["plan_id"], p["name"], p.get("insurer", p.get("ins")), p["tier"], 
                p.get("monthly_premium_inr", p.get("price")), p.get("sum_insured_inr", p.get("sumInsured")), 
                p.get("coverage_type", p.get("covType")),
                json.dumps(p.get("features", {})), json.dumps(p.get("suitable_for", {})), 
                json.dumps(p.get("tag_vector", [0]*10))
            ))
        
        # Seed Demo User
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                hashed_password TEXT,
                full_name TEXT
            );
        """)
        
        # admin123
        password = b"admin123"
        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw(password, salt).decode('utf-8')
        
        cur.execute("""
            INSERT INTO users (email, hashed_password, full_name)
            VALUES ('admin@insuro.com', ?, 'Priya Sharma (Demo)')
            ON CONFLICT (email) DO UPDATE SET hashed_password = excluded.hashed_password;
        """, (hashed_pw,))

        conn.commit()
        print("Successfully seeded plans and demo user.")
        conn.close()
    except Exception as e:
        print(f"Seeding failed: {e}")

if __name__ == "__main__":
    seed()
