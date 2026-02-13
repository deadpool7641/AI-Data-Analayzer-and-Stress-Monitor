# app/routes/user.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from werkzeug.utils import secure_filename
import os

from app.middleware.auth import auth_required  # if still used elsewhere

user_bp = Blueprint("user", __name__)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_IMAGE_SIZE = 2 * 1024 * 1024  # 2MB

def _get_current_user_id():
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        return identity.get("id")
    return identity


def _allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_IMAGE_EXTENSIONS


@user_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """
    GET /api/users/me
    Returns the current user's profile (without passwordHash).
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "No user ID in JWT"}), 400

    try:
        user = current_app.mongo.db.users.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        current_app.logger.exception("Error fetching current user")
        return jsonify({"error": str(e)}), 500

    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])
    user.pop("passwordHash", None)
    return jsonify(user), 200


@user_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    """
    PUT /api/users/me
    JSON body only. Updates basic profile fields (not avatar).
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "No user ID in JWT"}), 400

    data = request.get_json(silent=True) or {}

    allowed_fields = {
        "name",
        "username",
        "phone",
        "age",
        "gender",
        "location",
        "occupation",
        "bio",
        "profilePic",
        "preferredTheme",
    }

    updates = {k: v for k, v in data.items() if k in allowed_fields}

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    try:
        result = current_app.mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
        )
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        user = current_app.mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found after update"}), 404

        user["_id"] = str(user["_id"])
        user.pop("passwordHash", None)
        return jsonify(user), 200
    except Exception as e:
        current_app.logger.exception("Error updating user profile")
        return jsonify({"error": "Update failed"}), 500


@user_bp.route("/me/avatar", methods=["PUT"])
@jwt_required()
def update_me_avatar():
    """
    PUT /api/users/me/avatar
    Accepts multipart/form-data with:
      - avatar: image file
      - name, phone, bio, etc. as optional text fields
    This matches React Profile.jsx using FormData + avatar.
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "No user ID in JWT"}), 400

    if "avatar" not in request.files:
        return jsonify({"error": "No avatar file in request"}), 400

    file = request.files["avatar"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not _allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    # size check (if stream length available)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_IMAGE_SIZE:
        return jsonify({"error": "File too large (max 2MB)"}), 400

    # Save file
    upload_root = current_app.config.get("UPLOAD_FOLDER", "uploads")
    avatar_dir = os.path.join(upload_root, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    # safe filename
    base = secure_filename(file.filename) or "avatar"
    ext = base.rsplit(".", 1)[1].lower() if "." in base else "jpg"
    filename = f"{user_id}_{os.urandom(4).hex()}.{ext}"
    filepath = os.path.join(avatar_dir, filename)

    try:
        file.save(filepath)
    except Exception as e:
        current_app.logger.exception("Error saving avatar")
        return jsonify({"error": "Failed to save avatar"}), 500

    # build URL used by React
    public_url_prefix = current_app.config.get("AVATAR_URL_PREFIX", "/uploads/avatars")
    avatar_url = f"{public_url_prefix}/{filename}"

    # also allow some text fields if provided (FormData)
    allowed_fields = {
        "name",
        "phone",
        "bio",
        "age",
        "gender",
        "location",
        "occupation",
        "preferredTheme",
    }

    updates = {k: v for k, v in request.form.items() if k in allowed_fields}
    updates["profilePic"] = avatar_url

    try:
        result = current_app.mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
        )
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        user = current_app.mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found after update"}), 404

        user["_id"] = str(user["_id"])
        user.pop("passwordHash", None)
        return jsonify(user), 200
    except Exception as e:
        current_app.logger.exception("Error updating avatar/profile")
        return jsonify({"error": "Update failed"}), 500


@user_bp.route("/profile", methods=["PATCH"])
@auth_required
def update_profile_legacy():
    """
    Legacy endpoint: PATCH /api/users/profile
    Updates basic profile fields (name, preferredTheme).
    """
    identity = get_jwt_identity()
    user_id = identity.get("id") if isinstance(identity, dict) else identity
    if not user_id:
        return jsonify({"error": "No user ID in JWT"}), 400

    data = request.get_json(silent=True) or {}
    updates = {
        "name": data.get("name"),
        "preferredTheme": data.get("preferredTheme", "dark"),
    }
    updates = {k: v for k, v in updates.items() if v is not None}

    if not updates:
        return jsonify({"error": "No fields to update"}), 400

    try:
        result = current_app.mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
        )
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e:
        current_app.logger.exception("Legacy profile update error")
        return jsonify({"error": "Update failed"}), 500
