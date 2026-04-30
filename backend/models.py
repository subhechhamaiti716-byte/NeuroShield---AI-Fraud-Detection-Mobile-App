from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user") # Feature 38: Admin + User system
    push_token = Column(String, nullable=True) # Feature 37: Push Notifications
    
    transactions = relationship("Transaction", back_populates="owner")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    category = Column(String)
    date_time = Column(DateTime, default=datetime.datetime.utcnow)
    location = Column(String)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    device_id = Column(String, nullable=True)
    device_model = Column(String, nullable=True)
    os = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    
    risk_score = Column(Float, default=0.0)
    is_suspicious = Column(Boolean, default=False)
    user_feedback = Column(String, nullable=True) # "safe" or "fraud"
    receipt_url = Column(String, nullable=True) # Feature 41: File Storage
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="transactions")
