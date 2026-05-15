from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models, schemas, auth
from database import engine, get_db

# Create database tables
# (In production, use Alembic for migrations instead)
# models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="InsuReady AI Backend")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "InsuReady API is running"}

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, full_name=user.full_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(login_data: schemas.AuthLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# Placeholder endpoints for Phase 3
@app.post("/api/upload")
def upload_medical_record():
    return {"message": "Bio_ClinicalBERT extraction endpoint (Phase 3)"}

@app.post("/api/inference")
def run_ai_inference():
    return {"message": "XGBoost + pgvector inference endpoint (Phase 3)"}
