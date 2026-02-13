from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from flask import current_app

def analyze():
    data = request.json
    user_id = get_jwt_identity()['id']
    result = current_app.stress_service.analyze_frame(data['image'], user_id)
    return jsonify(result)
