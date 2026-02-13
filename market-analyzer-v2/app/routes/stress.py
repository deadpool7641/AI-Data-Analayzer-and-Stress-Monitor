# app/routes/stress.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from app.middleware.auth import auth_required
from app.services.stress_service import StressService

stress_bp = Blueprint("stress", __name__)

def _get_stress_service():
    # lazily create service using the current app's mongo
    return StressService(current_app.mongo)


@stress_bp.route("/analyze", methods=["POST"])
@auth_required
def analyze_stress():
    """
    POST /api/stress/analyze
    Body: { "image": "base64..." }
    """
    data = request.get_json(silent=True) or {}
    image = data.get("image")
    if not image:
        return jsonify({"error": "Missing 'image' in request body"}), 400

    identity = get_jwt_identity()
    if not identity:
        return jsonify({"error": "Missing JWT identity"}), 400

    user_id = identity.get("id") if isinstance(identity, dict) else identity

    try:
        stress_service = _get_stress_service()
        result = stress_service.analyze_frame(image, user_id)
        # assuming result is a pydantic model or similar with .dict()
        return jsonify(result.dict()), 200
    except Exception as e:
        current_app.logger.exception("Stress analysis failed")
        return jsonify({"error": "Stress analysis failed"}), 500
