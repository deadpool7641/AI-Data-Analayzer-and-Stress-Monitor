from flask_limiter import Limiter

def login_limiter():
    return Limiter.limit("5 per minute")
