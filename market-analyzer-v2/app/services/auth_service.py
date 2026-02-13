import bcrypt
import os

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode())

def register_user(mongo, data):
    email = data.get('email')
    if mongo.db.users.find_one({"email": email}):
        raise ValueError("Email already exists")
    data['passwordHash'] = hash_password(data['password'])
    data.pop('password', None)
    result = mongo.db.users.insert_one(data)
    return str(result.inserted_id)

def get_user_by_email(mongo, email: str):
    return mongo.db.users.find_one({"email": email})
