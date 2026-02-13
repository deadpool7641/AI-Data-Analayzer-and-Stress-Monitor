from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from flask import current_app

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/list', methods=['GET'])
@jwt_required()
def get_alerts():
    alerts = list(current_app.mongo.db.alerts.find().limit(20))
    for alert in alerts:
        alert['_id'] = str(alert['_id'])
    return jsonify(alerts)

@alerts_bp.route('/<alert_id>/resolve', methods=['PATCH'])
@jwt_required()
def resolve_alert(alert_id):
    result = current_app.mongo.db.alerts.update_one(
        {"_id": alert_id}, 
        {"$set": {"resolved": True}}
    )
    return jsonify({"updated": result.modified_count > 0})
