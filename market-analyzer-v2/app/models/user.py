from flask_pymongo import PyMongo
from pydantic import BaseModel, EmailStr
from datetime import datetime
import bcrypt

mongo = PyMongo()

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"  # user|hr|admin

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    preferredTheme: str = "dark"

def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def verify_password(password: str, hashed: bytes) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed)
