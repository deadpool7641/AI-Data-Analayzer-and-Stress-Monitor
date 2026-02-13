import requests
import os
from datetime import datetime, timedelta
from typing import Dict, List

class MarketService:
    def __init__(self, mongo):
        self.mongo = mongo
        self.alpha_key = os.getenv('ALPHA_VANTAGE_KEY', 'demo')
        self.cmc_key = os.getenv('COINMARKETCAP_KEY', 'demo')
    
    def get_symbols(self, type_filter: str = "all") -> List[Dict]:
        # Demo symbols - replace with real API calls
        stocks = [{"symbol": "AAPL", "name": "Apple Inc"}, {"symbol": "GOOGL", "name": "Alphabet"}]
        cryptos = [{"symbol": "BTC", "name": "Bitcoin"}, {"symbol": "ETH", "name": "Ethereum"}]
        
        if type_filter == "stock":
            return stocks
        elif type_filter == "crypto":
            return cryptos
        return stocks + cryptos
    
    def get_ohlcv(self, symbol: str, interval: str = "1d", days: int = 30) -> Dict:
        # Check cache first (1 hour TTL)
        cache = self.mongo.db.marketCache.find_one({
            "symbol": symbol,
            "fetchedAt": {"$gt": datetime.utcnow() - timedelta(hours=1)}
        })
        if cache:
            return cache['payload']
        
        # Mock data for demo
        mock_data = {
            "timestamp": [datetime.utcnow().isoformat()],
            "open": [150.0],
            "high": [155.0],
            "low": [148.0],
            "close": [152.5],
            "volume": [1000000]
        }
        
        # Cache result
        self.mongo.db.marketCache.insert_one({
            "symbol": symbol,
            "interval": interval,
            "payload": mock_data,
            "fetchedAt": datetime.utcnow()
        })
        return mock_data
