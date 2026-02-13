import requests
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import time
import random

class MarketAIService:
    """Market data retrieval service with caching and real API integration."""
    
    SUPPORTED_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD']
    SUPPORTED_CRYPTOS = ['BTC', 'ETH', 'XRP', 'ADA', 'SOL', 'DOGE']
    CACHE_TTL_MINUTES = 5
    
    def __init__(self, mongo):
        self.mongo = mongo
        self.alpha_key = os.getenv('ALPHA_VANTAGE_KEY', 'demo')
        self.cmc_key = os.getenv('COINMARKETCAP_KEY', 'demo')
    
    def predict_price(self, symbol, ohlcv_data):
        # Future: Load ONNX model from datasets/financial/
        return {"prediction": "UP", "confidence": 0.75}
    
    def get_supported_symbols(self, type_filter: str = "all") -> List[Dict]:
        """Get list of supported stock and crypto symbols."""
        stocks = [{'symbol': s, 'name': s, 'type': 'stock'} for s in self.SUPPORTED_STOCKS]
        cryptos = [{'symbol': c, 'name': c, 'type': 'crypto'} for c in self.SUPPORTED_CRYPTOS]
        
        if type_filter == "stock":
            return stocks
        elif type_filter == "crypto":
            return cryptos
        return stocks + cryptos
    
    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Get data from MongoDB cache if not expired."""
        cache_entry = self.mongo.db.marketCache.find_one({"key": key})
        if cache_entry:
            if datetime.utcnow() - cache_entry['timestamp'] < timedelta(minutes=self.CACHE_TTL_MINUTES):
                return cache_entry['data']
            else:
                self.mongo.db.marketCache.delete_one({"key": key})
        return None
    
    def _set_cache(self, key: str, data: Dict) -> None:
        """Store data in MongoDB cache."""
        self.mongo.db.marketCache.update_one(
            {"key": key},
            {"$set": {"key": key, "data": data, "timestamp": datetime.utcnow()}},
            upsert=True
        )
    
    def get_stock_price(self, symbol: str) -> Dict:
        """Get current stock price with caching."""
        cache_key = f"stock_{symbol}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            if self.alpha_key == 'demo':
                data = self._generate_mock_stock_data(symbol)
            else:
                url = "https://www.alphavantage.co/query"
                params = {
                    'function': 'GLOBAL_QUOTE',
                    'symbol': symbol,
                    'apikey': self.alpha_key
                }
                response = requests.get(url, params=params, timeout=10)
                result = response.json()
                
                if 'Global Quote' in result and result['Global Quote'].get('05. price'):
                    data = {
                        'symbol': symbol,
                        'price': float(result['Global Quote']['05. price']),
                        'change': float(result['Global Quote'].get('09. change', 0)),
                        'changePercent': float(result['Global Quote'].get('10. change percent', '0').rstrip('%')),
                        'timestamp': datetime.utcnow().isoformat(),
                        'volume': int(result['Global Quote'].get('06. volume', 0))
                    }
                else:
                    data = self._generate_mock_stock_data(symbol)
            
            self._set_cache(cache_key, data)
            return data
        except Exception as e:
            print(f"Error fetching stock {symbol}: {e}")
            return self._generate_mock_stock_data(symbol)
    
    def get_crypto_price(self, symbol: str) -> Dict:
        """Get current crypto price with caching."""
        cache_key = f"crypto_{symbol}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            if self.cmc_key == 'demo':
                data = self._generate_mock_crypto_data(symbol)
            else:
                url = "https://api.coingecko.com/api/v3/simple/price"
                params = {
                    'ids': symbol.lower(),
                    'vs_currencies': 'usd',
                    'include_market_cap': 'true',
                    'include_24hr_vol': 'true',
                    'include_24hr_change': 'true'
                }
                response = requests.get(url, params=params, timeout=10)
                result = response.json()
                
                if symbol.lower() in result:
                    crypto_data = result[symbol.lower()]
                    data = {
                        'symbol': symbol,
                        'price': crypto_data.get('usd', 0),
                        'change24h': crypto_data.get('usd_24h_change', 0),
                        'marketCap': crypto_data.get('usd_market_cap', 0),
                        'volume24h': crypto_data.get('usd_24h_vol', 0),
                        'timestamp': datetime.utcnow().isoformat()
                    }
                else:
                    data = self._generate_mock_crypto_data(symbol)
            
            self._set_cache(cache_key, data)
            return data
        except Exception as e:
            print(f"Error fetching crypto {symbol}: {e}")
            return self._generate_mock_crypto_data(symbol)
    
    def get_historical_data(self, symbol: str, days: int = 30, type_: str = 'stock') -> List[Dict]:
        """Get historical OHLCV data."""
        cache_key = f"historical_{symbol}_{days}_{type_}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            if type_ == 'stock':
                data = self._get_stock_historical(symbol, days)
            else:
                data = self._get_crypto_historical(symbol, days)
            
            self._set_cache(cache_key, data)
            return data
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return self._generate_mock_historical_data(symbol, days)
    
    def _get_stock_historical(self, symbol: str, days: int) -> List[Dict]:
        """Fetch stock historical data."""
        if self.alpha_key == 'demo':
            return self._generate_mock_historical_data(symbol, days)
        
        try:
            url = "https://www.alphavantage.co/query"
            params = {
                'function': 'TIME_SERIES_DAILY',
                'symbol': symbol,
                'apikey': self.alpha_key,
                'outputsize': 'compact'
            }
            response = requests.get(url, params=params, timeout=10)
            result = response.json()
            
            data = []
            if 'Time Series (Daily)' in result:
                for date_str, ohlc in list(result['Time Series (Daily)'].items())[:days]:
                    data.append({
                        'date': date_str,
                        'open': float(ohlc['1. open']),
                        'high': float(ohlc['2. high']),
                        'low': float(ohlc['3. low']),
                        'close': float(ohlc['4. close']),
                        'volume': int(ohlc['5. volume'])
                    })
            
            return data if data else self._generate_mock_historical_data(symbol, days)
        except Exception as e:
            print(f"Error getting historical stock data: {e}")
            return self._generate_mock_historical_data(symbol, days)
    
    def _get_crypto_historical(self, symbol: str, days: int) -> List[Dict]:
        """Fetch crypto historical data from CoinGecko."""
        try:
            url = f"https://api.coingecko.com/api/v3/coins/{symbol.lower()}/market_chart"
            params = {
                'vs_currency': 'usd',
                'days': str(days),
                'interval': 'daily'
            }
            response = requests.get(url, params=params, timeout=10)
            result = response.json()
            
            data = []
            if 'prices' in result:
                for i, (timestamp, price) in enumerate(result['prices'][:days]):
                    volume = result['volumes'][i][1] if i < len(result.get('volumes', [])) else 0
                    data.append({
                        'date': datetime.fromtimestamp(timestamp/1000).isoformat(),
                        'open': price,
                        'high': price * 1.02,
                        'low': price * 0.98,
                        'close': price,
                        'volume': int(volume)
                    })
            
            return data if data else self._generate_mock_historical_data(symbol, days)
        except Exception as e:
            print(f"Error getting historical crypto data: {e}")
            return self._generate_mock_historical_data(symbol, days)
    
    def _generate_mock_stock_data(self, symbol: str) -> Dict:
        """Generate realistic mock stock data."""
        base_prices = {'AAPL': 195, 'GOOGL': 140, 'MSFT': 420, 'TSLA': 250, 'AMZN': 170, 'META': 500, 'NVDA': 875, 'AMD': 185}
        base = base_prices.get(symbol, 150)
        change = random.uniform(-2, 2)
        return {
            'symbol': symbol,
            'price': round(base + change, 2),
            'change': round(change, 2),
            'changePercent': round((change / base) * 100, 2),
            'timestamp': datetime.utcnow().isoformat(),
            'volume': random.randint(1000000, 100000000)
        }
    
    def _generate_mock_crypto_data(self, symbol: str) -> Dict:
        """Generate realistic mock crypto data."""
        base_prices = {'BTC': 42000, 'ETH': 2200, 'XRP': 0.50, 'ADA': 0.40, 'SOL': 100, 'DOGE': 0.08}
        base = base_prices.get(symbol, 100)
        change = random.uniform(-3, 3)
        return {
            'symbol': symbol,
            'price': round(base + change, 4),
            'change24h': round(change, 2),
            'marketCap': round(base * random.randint(10, 1000) * 1e9, 0),
            'volume24h': random.randint(int(1e9), int(100e9)),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _generate_mock_historical_data(self, symbol: str, days: int) -> List[Dict]:
        """Generate realistic mock historical OHLCV data."""
        from datetime import timedelta as td
        
        data = []
        base_prices = {'AAPL': 195, 'GOOGL': 140, 'MSFT': 420, 'TSLA': 250, 'AMZN': 170, 
                      'META': 500, 'NVDA': 875, 'AMD': 185, 'BTC': 42000, 'ETH': 2200}
        current_price = base_prices.get(symbol, 100)
        
        for i in range(days):
            date = (datetime.utcnow() - td(days=days-i)).date()
            daily_change = random.uniform(-0.05, 0.05)
            close = current_price * (1 + daily_change)
            
            data.append({
                'date': str(date),
                'open': round(current_price, 2),
                'high': round(current_price * (1 + abs(daily_change) + 0.01), 2),
                'low': round(current_price * (1 + daily_change - 0.01), 2),
                'close': round(close, 2),
                'volume': random.randint(1000000, 100000000) if symbol in ['AAPL', 'GOOGL'] else random.randint(int(1e6), int(10e9))
            })
            current_price = close
        
        return data
