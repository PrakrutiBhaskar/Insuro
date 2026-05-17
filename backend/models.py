from sqlalchemy import Column, Integer, String, Float, Boolean, Text
from sqlalchemy.types import TypeDecorator
import json
import os

from database import Base

# --- Custom Vector Type for SQLite/Postgres compatibility ---
class CrossPlatformVector(TypeDecorator):
    """
    Handles Vector storage for both PostgreSQL (pgvector) and SQLite (JSON string).
    """
    impl = Text
    cache_ok = True

    def __init__(self, dimensions):
        self.dimensions = dimensions
        super().__init__()

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            try:
                from pgvector.sqlalchemy import Vector
                return dialect.type_descriptor(Vector(self.dimensions))
            except ImportError:
                return dialect.type_descriptor(Text)
        return dialect.type_descriptor(Text)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            return value
        # For SQLite, store as JSON string
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            return value
        # For SQLite, parse from JSON string
        return json.loads(value)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)

class InsurancePlan(Base):
    __tablename__ = "insurance_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    insurer = Column(String)
    price = Column(Float)
    sum_insured = Column(Float)
    tier = Column(String) # low, medium, high
    coverage_type = Column(String)
    
    # Store complex nested data as JSON strings for SQLite compatibility
    features = Column(Text) 
    suitable_for = Column(Text)
    
    # 10-dimensional vector matching our preference features (hospitalization, maternity, etc.)
    plan_vector = Column(CrossPlatformVector(10))
