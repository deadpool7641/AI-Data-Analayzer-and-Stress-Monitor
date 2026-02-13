import time
import pandas as pd
import numpy as np
from flask_socketio import emit
import os
from tensorflow.keras.models import load_model
from tensorflow.keras.optimizers import Adam
import warnings
from datetime import datetime
import random

warnings.filterwarnings('ignore')

# Global variables
_emotion_model = None
_app = None

def set_app(app):
    """Set the Flask app reference for background tasks."""
    global _app
    _app = app

def load_emotion_model():
    """Load the emotion detection model."""
    global _emotion_model
    
    if _emotion_model is not None:
        return
    
    try:
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        model_path = os.path.join(project_root, 'datasets', 'facial', 'fer2013_mini_XCEPTION.119-0.65.hdf5')
        
        if not os.path.exists(model_path):
            print(f"[WARNING] Emotion model not found at {model_path}")
            return
        
        print(f"Loading emotion model from {model_path}...")
        try:
            _emotion_model = load_model(
                model_path,
                custom_objects={'Adam': Adam}
            )
        except ValueError as ve:
            print(f"  Attempting to load with compile=False due to: {ve}")
            _emotion_model = load_model(model_path, compile=False)
            _emotion_model.compile(
                optimizer=Adam(learning_rate=0.0001),
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
        
        print(f"[OK] Successfully loaded emotion model (Xception-based FER2013)")
    except Exception as e:
        print(f"[ERROR] Loading emotion model: {e}")
        _emotion_model = None

def calculate_stress_level(symbol: str, price_data: dict) -> float:
    """Calculate stress level based on market data.
    
    Stress = 0.0 (calm) to 1.0 (highly stressed)
    Based on:
    - Price volatility (high change = high stress)
    - Volume (unusual volume = stress)
    - 24h change for crypto
    """
    stress = 0.5  # Base level
    
    try:
        if 'price' in price_data and 'change' in price_data:
            # Stock volatility: 1% change = +0.1 stress
            change_pct = abs(price_data.get('changePercent', 0))
            stress += (change_pct / 100) * 0.3
        
        elif 'price' in price_data and 'change24h' in price_data:
            # Crypto volatility: 1% 24h change = +0.1 stress
            change_pct = abs(price_data.get('change24h', 0))
            stress += (change_pct / 100) * 0.3
        
        # Volume surge
        if 'volume' in price_data and price_data['volume'] > 50000000:
            stress += 0.15
        
        # Bound stress between 0 and 1
        stress = max(0.0, min(1.0, stress))
        
        # Add small random variation (realistic market behavior)
        stress += random.uniform(-0.05, 0.05)
        stress = max(0.0, min(1.0, stress))
        
        return round(stress, 2)
    
    except Exception as e:
        print(f"[ERROR] Calculating stress: {e}")
        return 0.5

def emit_market_updates():
    """Emit real market data updates for supported symbols via Socket.IO.
    
    Performance:
    - Samples symbols (not all per tick)
    - Uses fast cached API responses (5-min TTL)
    - Configurable emission rate
    """
    
    print("\n" + "="*70)
    print("Starting market data emitter with real API data...")
    print("="*70)
    
    if _app is None:
        print("[ERROR] Flask app not set. Cannot emit data.")
        return
    
    # Import here to avoid circular imports
    from .services.market_ai_service import MarketAIService
    from flask_pymongo import PyMongo
    
    load_emotion_model()
    
    # Get configuration
    emit_interval = float(os.getenv('EMITTER_SLEEP_MS', '100')) / 1000
    symbols_per_tick = int(os.getenv('SYMBOLS_PER_TICK', '2'))
    
    # Get all symbols
    mongo = PyMongo(_app)
    market_service = MarketAIService(mongo)
    all_symbols = market_service.get_supported_symbols('all')
    
    print(f"[OK] Loaded {len(all_symbols)} symbols")
    print(f"[OK] Will emit {symbols_per_tick} symbols per tick, every {emit_interval*1000:.0f}ms")
    
    emission_count = 0
    tick = 0
    
    try:
        while True:
            tick += 1
            
            # Select random symbols for this tick
            symbols_to_emit = random.sample(all_symbols, min(symbols_per_tick, len(all_symbols)))
            
            with _app.app_context():
                for symbol_obj in symbols_to_emit:
                    symbol = symbol_obj['symbol']
                    symbol_type = symbol_obj['type']
                    
                    try:
                        # Get current price
                        if symbol_type == 'stock':
                            price_data = market_service.get_stock_price(symbol)
                        else:
                            price_data = market_service.get_crypto_price(symbol)
                        
                        emission_count += 1
                        
                        # Calculate stress
                        stress = calculate_stress_level(symbol, price_data)
                        
                        # Emit market update
                        print(f"[{tick}] Emitting {symbol}: ${price_data.get('price', 'N/A')} (stress: {stress})")
                        
                        emit('market_update', {
                            'symbol': symbol,
                            'type': symbol_type,
                            'data': price_data
                        }, namespace='/', broadcast=True)
                        
                        # Emit stress update
                        emit('stress_update', {
                            'symbol': symbol,
                            'level': stress,
                            'time': datetime.utcnow().isoformat()
                        }, namespace='/', broadcast=True)
                        
                    except Exception as e:
                        print(f"[ERROR] Processing {symbol}: {e}")
            
            time.sleep(emit_interval)
    
    except KeyboardInterrupt:
        print(f"\n[OK] Market emitter stopped. Emitted {emission_count} updates.")
    except Exception as e:
        print(f"[ERROR] In market emitter: {e}")
