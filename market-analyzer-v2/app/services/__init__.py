from .market_service import MarketService
from .stress_service import StressService

def init_services(app):
    app.market_service = MarketService(app.mongo)
    app.stress_service = StressService(app.mongo)
