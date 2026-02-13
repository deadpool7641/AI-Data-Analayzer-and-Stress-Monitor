import base64
import time
import os
import requests
from dotenv import load_dotenv

from .extensions import socketio
from .services.stress_model_service import stress_model_service
from .services.alert_service_ai import get_alert_service

# Load environment variables from a .env file
load_dotenv()
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_KEY', 'demo')

# Global alert service
_alert_service = None

def get_alert_service_instance(mongo=None):
    global _alert_service
    if _alert_service is None and mongo:
        _alert_service = get_alert_service(mongo)
    return _alert_service

@socketio.on('connect')
def handle_connect():
    """Handles a new client connection."""
    print('✓ Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handles a client disconnection."""
    print('✗ Client disconnected')

@socketio.on('video_frame')
def handle_video_frame(data_url, user_id='user_default'):
    """
    Receives a video frame from the client, processes it using the AI model,
    and sends back the predicted stress level. Also triggers alert system.
    """
    try:
        # Decode the base64 image data URL
        header, encoded = data_url.split(",", 1)
        image_data = base64.b64decode(encoded)

        # Get prediction from the AI model service
        stress_level = stress_model_service.predict(image_data)

        # Emit the result back to the client
        socketio.emit('stress_update', {
            'level': stress_level,
            'timestamp': time.time()
        })
        
        # Check stress level and send alerts if needed
        # from flask import current_app
        # alert_service = get_alert_service_instance(current_app.mongo)
        # if alert_service:
        #     alert = alert_service.check_stress_and_alert(user_id, stress_level)
        #     if alert:
        #         socketio.emit('alert_notification', alert)
        
    except Exception as e:
        print(f"[ERROR] Processing frame: {e}")



def market_data_fetcher():
    """
    A background task that fetches real-time market data from Alpha Vantage
    and broadcasts it to all connected clients.
    """
    # Symbols for assets to track
    crypto_symbols = ['BTC', 'ETH']
    stock_symbols = ['AAPL', 'GOOGL']

    while True:
        try:
            if not ALPHA_VANTAGE_API_KEY or ALPHA_VANTAGE_API_KEY == 'YOUR_API_KEY_HERE':
                print("Warning: ALPHA_VANTAGE_API_KEY is not set. Market data fetcher will not run.")
                socketio.sleep(60) # Check again in a minute
                continue

            market_data = {'crypto': {}, 'stocks': {}}
            
            # Fetch Crypto Data
            for symbol in crypto_symbols:
                url = f'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency={symbol}&to_currency=USD&apikey={ALPHA_VANTAGE_API_KEY}'
                r = requests.get(url)
                r.raise_for_status() # Raise an exception for bad status codes
                data = r.json()
                if 'Realtime Currency Exchange Rate' in data:
                    price = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
                    market_data['crypto'][symbol] = float(price)
                else:
                    print(f"Warning: Could not parse {symbol} crypto price. Response: {data}")
                    market_data['crypto'][symbol] = 'N/A'
                socketio.sleep(15) # Stagger API calls to avoid rate limiting

            # Fetch Stock Data
            for symbol in stock_symbols:
                url = f'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={ALPHA_VANTAGE_API_KEY}'
                r = requests.get(url)
                r.raise_for_status()
                data = r.json()
                if 'Global Quote' in data and data['Global Quote'] and '05. price' in data['Global Quote']:
                    price = data['Global Quote']['05. price']
                    market_data['stocks'][symbol] = float(price)
                else:
                    print(f"Warning: Could not parse {symbol} stock price. Response: {data}")
                    market_data['stocks'][symbol] = 'N/A'
                socketio.sleep(15) # Stagger API calls

            socketio.emit('market_update', {'data': market_data})
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching from API: {e}")
            socketio.sleep(30) # Wait longer on network error
        except Exception as e:
            print(f"An unexpected error occurred in market data fetcher: {e}")
            socketio.sleep(30) # Wait longer on other errors