from sqlalchemy import Column, Integer, String, Float, Boolean
from pgvector.sqlalchemy import Vector
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)

class InsurancePlan(Base):
    __tablename__ = "insurance_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    insurer = Column(String)
    price = Column(Float)
    tags = Column(String) # Stored as comma-separated string for simplicity
    
    # 18-dimensional vector matching our risk + preference features
    plan_vector = Column(Vector(18))
