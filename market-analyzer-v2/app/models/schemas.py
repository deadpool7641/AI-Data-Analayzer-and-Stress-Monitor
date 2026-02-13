from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    role: Literal["user", "hr", "admin"] = "user"

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    preferredTheme: str = "dark"

class StressResult(BaseModel):
    userId: str
    timestamp: datetime
    stressScore: float
    emotion: str

class WatchlistItem(BaseModel):
    symbol: str
    type: Literal["stock", "crypto"]
