# app/routes/alerts.py

from flask import Blueprint, jsonify, current_app
from app.middleware.auth import jwt_required_role

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("/recent", methods=["GET"])
@jwt_required_role("hr", "admin")
def recent_alerts():
    """
    GET /api/alerts/recent
    Returns last 50 alerts for HR/admin.
    """
    try:
        alerts = list(
            current_app.mongo.db.alerts
            .find()
            .sort("timestamp", -1)
            .limit(50)
        )
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        return jsonify(alerts), 200
    except Exception as e:
        current_app.logger.exception("Failed to fetch recent alerts")
        return jsonify({"error": "Failed to fetch alerts"}), 500
