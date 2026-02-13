from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_socketio import SocketIO
from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt

jwt = JWTManager()
limiter = Limiter(key_func=lambda: "demo")
# Initialize extensions without an app object.
# They will be connected to the app in the factory.
socketio = SocketIO()
mongo = PyMongo()
bcrypt = Bcrypt()
