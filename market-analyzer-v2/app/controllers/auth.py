from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import UserCreate, UserOut, hash_password, verify_password
from app.services.auth_service import register_user, get_user_by_email

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = UserCreate(**request.json)
    try:
        user_id = register_user(data)
        return jsonify({"id": str(user_id)}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    email = request.json.get('email')
    password = request.json.get('password')
    user = get_user_by_email(email)
    if user and verify_password(password, user['passwordHash']):
        access_token = create_access_token(identity={
            'id': str(user['_id']), 
            'role': user['role'],
            'email': user['email']
        })
        return jsonify({"access_token": access_token})
    return jsonify({"error": "Invalid credentials"}), 401
