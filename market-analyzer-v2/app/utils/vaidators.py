from pydantic import ValidationError
from app.models.schemas import UserCreate

def validate_user(data):
    try:
        UserCreate(**data)
        return True
    except ValidationError:
        return False
