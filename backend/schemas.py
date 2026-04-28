from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    role: Optional[str] = "user"

class UserCreate(UserBase):
    password: str
    push_token: Optional[str] = None

class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    category: str
    location: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    device_id: Optional[str] = None
    device_model: Optional[str] = None
    os: Optional[str] = None
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    date_time: datetime
    owner_id: int
    risk_score: float
    is_suspicious: bool
    user_feedback: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
