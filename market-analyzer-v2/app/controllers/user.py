from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import current_app

user_bp = Blueprint('user', __name__)

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    identity = get_jwt_identity()
    user = current_app.mongo.db.users.find_one({"_id": identity['id']})
    if user:
        user['_id'] = str(user['_id'])
        user.pop('passwordHash', None)
    return jsonify(user)

@user_bp.route('/watchlist', methods=['GET', 'POST'])
@jwt_required()
def watchlist():
    identity = get_jwt_identity()
    if request.method == 'POST':
        symbol = request.json.get('symbol')
        current_app.mongo.db.watchlists.update_one(
            {"userId": identity['id']},
            {"$addToSet": {"symbols": symbol}},
            upsert=True
        )
    wl = current_app.mongo.db.watchlists.find_one({"userId": identity['id']})
    return jsonify(wl or {"symbols": []})
