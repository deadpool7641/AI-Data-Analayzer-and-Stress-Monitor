from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from dotenv import load_dotenv
import os
from datetime import datetime
from bson import ObjectId
from bson.json_util import dumps
from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt

# Import extensions (socketio, mongo, bcrypt are initialized here)
from .extensions import socketio, mongo, bcrypt, jwt

load_dotenv()


def create_app():
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret')
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")

    # Initialize extensions with the app
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "http://localhost:5173",
                ]
            }
        },
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    jwt.init_app(app)
    mongo.init_app(app)
    bcrypt.init_app(app)
    socketio.init_app(
        app,
        cors_allowed_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ],
        async_mode="threading",
        ping_timeout=60,
        ping_interval=25,
        transports=["websocket", "polling"],
    )

    # --- JWT Error Handlers ---
    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        return jsonify({"error": "Missing Authorization Header"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token"}), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    # --- Authentication Routes (Updated for MongoDB) ---
    @app.route("/api/auth/register", methods=["POST"])
    def register():
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        if mongo.db.users.find_one({"email": email}):
            return jsonify({"error": "Email already exists"}), 400

        # USE FLASK-BCRYPT to hash the password
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        # Create a clean user document to insert
        user_to_insert = {
            "email": email,
            "passwordHash": hashed_password,
            "createdAt": datetime.utcnow(),
            "watchlist": [],  # Initialize watchlist
        }

        try:
            result = mongo.db.users.insert_one(user_to_insert)
            user_id = result.inserted_id
            return jsonify({"id": str(user_id), "message": "User created successfully"}), 201
        except Exception as e:
            # This will log the actual database error to your backend terminal
            print(f"Database insertion failed: {e}")
            return jsonify({"error": "An internal error occurred during registration."}), 500

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = mongo.db.users.find_one({"email": email})

        # USE FLASK-BCRYPT to check the password
        if user and bcrypt.check_password_hash(user["passwordHash"], password):
            # SIMPLE STRING ID AS JWT IDENTITY
            user_id_str = str(user["_id"])
            access_token = create_access_token(identity=user_id_str)
            print(f"[LOGIN] Created token for user {user['email']}: {access_token[:50]}...")
            print(f"[LOGIN] Token identity (id only): {user_id_str}")

            # Prepare user object for the response (don't send the hash)
            user_response = {k: v for k, v in user.items() if k != "passwordHash"}
            user_response["_id"] = str(user_response["_id"])

            return jsonify(access_token=access_token, user=user_response), 200

        return jsonify({"error": "Invalid credentials"}), 401

    # --- Protected Route Example ---
    @app.route("/api/auth/me", methods=["GET"])
    @jwt_required()
    def me():
        print(f"[DEBUG] /me endpoint called")
        print(f"[DEBUG] Request headers: {dict(request.headers)}")
        print(f"[DEBUG] Authorization header: {request.headers.get('Authorization', 'MISSING')}")

        try:
            # identity is now a plain string user id
            identity = get_jwt_identity()
            print(f"[DEBUG] JWT identity: {identity}")
            user = mongo.db.users.find_one({"_id": ObjectId(identity)})
            if user:
                user["_id"] = str(user["_id"])
                user.pop("passwordHash", None)
                print(f"[DEBUG] User found: {user.get('email')}")
                return jsonify(user), 200
            return jsonify({"error": "User not found"}), 404
        except Exception as e:
            print(f"[ERROR] Exception in /me: {str(e)}")
            return jsonify({"error": "Invalid token or user"}), 422

    # --- Watchlist API Routes ---
    @app.route("/api/watchlist", methods=["GET"])
    @jwt_required()
    def get_watchlist():
        identity = get_jwt_identity()  # string id
        user = mongo.db.users.find_one({"_id": ObjectId(identity)})
        return jsonify(user.get("watchlist", []))

    @app.route("/api/watchlist", methods=["POST"])
    @jwt_required()
    def add_to_watchlist():
        identity = get_jwt_identity()  # string id
        symbol = request.json.get("symbol", "").upper()
        if not symbol:
            return jsonify({"error": "Symbol is required"}), 400

        mongo.db.users.update_one(
            {"_id": ObjectId(identity)},
            {"$addToSet": {"watchlist": symbol}},  # $addToSet prevents duplicates
        )
        return jsonify({"message": f"{symbol} added to watchlist"}), 200

    # --- Market Data API Endpoints (NEW) ---
    from .services.market_ai_service import MarketAIService

    market_service = MarketAIService(mongo)

    @app.route("/api/market/symbols", methods=["GET"])
    def get_market_symbols():
        """Get list of supported stocks and cryptos."""
        type_filter = request.args.get("type", "all")  # all, stock, crypto
        symbols = market_service.get_supported_symbols(type_filter)
        return jsonify(symbols), 200

    @app.route("/api/market/price/<symbol>", methods=["GET"])
    def get_price(symbol):
        """Get current price for a stock or crypto."""
        symbol = symbol.upper()

        # Determine type from supported lists
        if symbol in MarketAIService.SUPPORTED_STOCKS:
            data = market_service.get_stock_price(symbol)
        elif symbol in MarketAIService.SUPPORTED_CRYPTOS:
            data = market_service.get_crypto_price(symbol)
        else:
            return jsonify({"error": f"Symbol {symbol} not supported"}), 404

        return jsonify(data), 200

    @app.route("/api/market/historical/<symbol>", methods=["GET"])
    def get_historical(symbol):
        """Get historical OHLCV data."""
        symbol = symbol.upper()
        days = request.args.get("days", 30, type=int)

        # Determine type
        if symbol in MarketAIService.SUPPORTED_STOCKS:
            type_ = "stock"
        elif symbol in MarketAIService.SUPPORTED_CRYPTOS:
            type_ = "crypto"
        else:
            return jsonify({"error": f"Symbol {symbol} not supported"}), 404

        data = market_service.get_historical_data(symbol, days, type_)
        return jsonify({"symbol": symbol, "data": data}), 200

    @app.route("/api/market/watch", methods=["POST"])
    @jwt_required()
    def watch_symbol():
        """Add a symbol to user's watchlist."""
        identity = get_jwt_identity()  # string id
        data = request.get_json()
        symbol = data.get("symbol", "").upper()

        if not symbol:
            return jsonify({"error": "Symbol required"}), 400

        # Validate symbol
        all_symbols = [s["symbol"] for s in market_service.get_supported_symbols()]
        if symbol not in all_symbols:
            return jsonify({"error": f"Symbol {symbol} not supported"}), 400

        mongo.db.users.update_one(
            {"_id": ObjectId(identity)},
            {"$addToSet": {"watchlist": symbol}},
        )
        return jsonify({"message": f"{symbol} added to watchlist"}), 200

    # --- User Profile API (NEW, used by React /api/users/me) ---
    @app.route("/api/users/me", methods=["GET"])
    @jwt_required()
    def get_profile():
        """Return current user's profile (without passwordHash)."""
        try:
            identity = get_jwt_identity()  # string id
            user_id = identity
            if not user_id:
                return jsonify({"error": "No user ID in JWT"}), 400

            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User not found"}), 404

            user["_id"] = str(user["_id"])
            user.pop("passwordHash", None)
            return jsonify(user), 200
        except Exception as e:
            print(f"[ERROR] /api/users/me GET: {str(e)}")
            return jsonify({"error": "Failed to load profile"}), 500

    @app.route("/api/users/me", methods=["PUT"])
    @jwt_required()
    def update_profile():
        """Update current user's profile details."""
        try:
            identity = get_jwt_identity()  # string id
            user_id = identity
            if not user_id:
                return jsonify({"error": "No user ID in JWT"}), 400

            data = request.get_json() or {}

            # Allow only safe profile fields
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

            mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": updates},
            )

            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User not found after update"}), 404

            user["_id"] = str(user["_id"])
            user.pop("passwordHash", None)
            return jsonify(user), 200
        except Exception as e:
            print(f"[ERROR] /api/users/me PUT: {str(e)}")
            return jsonify({"error": "Failed to update profile"}), 500

    # --- Real-time Integration ---
    from . import websockets
    return app
