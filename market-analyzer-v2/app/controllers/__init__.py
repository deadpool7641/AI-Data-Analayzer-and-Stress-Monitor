from flask import Flask
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from .services import init_services

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    
    CORS(app)
    app.mongo = PyMongo(app)
    JWTManager(app)
    
    init_services(app)
    
    from .routes.auth import auth_bp
    from .routes.market import market_bp
    from .routes.stress import stress_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(market_bp, url_prefix='/api')
    app.register_blueprint(stress_bp, url_prefix='/api')
    
    return app
