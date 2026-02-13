# app/routes/auth.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from bson import ObjectId

from app.services.auth_service import (
    register_user,
    get_user_by_email,
    verify_password,
    hash_password,  # if used inside register_user
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    Body: { "name": "...", "email": "...", "password": "..." }
    """
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    try:
        user_id = register_user(current_app.mongo, data)
        return jsonify({"id": str(user_id), "message": "User created"}), 201
    except ValueError as e:
        return jsonify({ "error": str(e) }), 400
    except Exception:
        current_app.logger.exception("Registration error")
        return jsonify({ "error": "Registration failed" }), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: { "email": "...", "password": "..." }
    Returns: { "access_token": "...", "user": { ... } }
    """
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        user = get_user_by_email(current_app.mongo, email)
    except Exception as e:
        current_app.logger.exception("Database error on login")
        return jsonify({"error": "Login failed"}), 500

    if not user or not verify_password(password, user.get("passwordHash", "")):
        return jsonify({"error": "Invalid credentials"}), 401

    identity_payload = {
        "id": str(user.get("_id") or user.get("id")),
        "role": user.get("role", "user"),
        "email": user.get("email"),
    }

    access_token = create_access_token(identity=identity_payload)

    safe_user = dict(user)
    if safe_user.get("_id"):
        safe_user["_id"] = str(safe_user["_id"])
    safe_user.pop("passwordHash", None)

    return jsonify({ "access_token": access_token, "user": safe_user }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """
    GET /api/auth/me
    Returns the current user object (without passwordHash).
    """
    try:
        identity = get_jwt_identity()
        current_app.logger.debug(f"[DEBUG] JWT Identity: {identity}")

        if not identity:
            return jsonify({ "error": "Missing JWT identity" }), 400

        user_id = identity.get("id") if isinstance(identity, dict) else identity
        if not user_id:
            return jsonify({ "error": "No user ID in JWT" }), 400

        user = current_app.mongo.db.users.find_one({ "_id": ObjectId(user_id) })
        if not user:
            return jsonify({ "error": "User not found" }), 404

        user["_id"] = str(user["_id"])
        user.pop("passwordHash", None)

        return jsonify(user), 200

    except Exception as e:
        current_app.logger.exception("/me endpoint error")
        return jsonify({ "error": "Failed to fetch current user" }), 500
