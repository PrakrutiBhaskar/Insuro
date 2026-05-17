import json
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed_database():
    print("Seeding database...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Load plans from ML catalogue
    catalogue_path = "../INSURO_ML/api/plans_catalogue.json"
    if not os.path.exists(catalogue_path):
        print(f"Catalogue not found at {catalogue_path}")
        return
        
    with open(catalogue_path, "r") as f:
        plans_data = json.load(f)
        
    for p in plans_data:
        plan = models.InsurancePlan(
            plan_id=p["plan_id"],
            name=p["name"],
            insurer=p["insurer"],
            price=float(p["monthly_premium_inr"]),
            sum_insured=float(p["sum_insured_inr"]),
            tier=p["tier"],
            coverage_type=p["coverage_type"],
            features=json.dumps(p["features"]),
            suitable_for=json.dumps(p["suitable_for"]),
            plan_vector=p["tag_vector"]
        )
        db.add(plan)
    
    # Add a default admin user
    from auth import get_password_hash
    admin = models.User(
        email="admin@insuro.com",
        hashed_password=get_password_hash("admin123"),
        full_name="System Admin"
    )
    db.add(admin)
    
    db.commit()
    print(f"Successfully seeded {len(plans_data)} plans and 1 admin user.")
    db.close()

if __name__ == "__main__":
    seed_database()
