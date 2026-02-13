from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, jwt_required

def jwt_required_role(*roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            identity = get_jwt_identity()
            if identity['role'] not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def auth_required(f):
    return jwt_required()(f)
