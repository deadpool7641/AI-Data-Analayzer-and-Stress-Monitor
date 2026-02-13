import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-prod'
    MONGO_URI = os.environ.get('MONGO_URI')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET') or 'dev-jwt-secret-key-change-in-prod'
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    ALPHA_VANTAGE_KEY = os.environ.get('ALPHA_VANTAGE_KEY', 'demo')
    COINMARKETCAP_KEY = os.environ.get('COINMARKETCAP_KEY', 'demo')
