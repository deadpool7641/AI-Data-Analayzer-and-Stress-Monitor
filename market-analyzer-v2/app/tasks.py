import time
import pandas as pd
import numpy as np
from flask_socketio import emit
import os
from tensorflow.keras.models import load_model
from tensorflow.keras.optimizers import Adam
import warnings

warnings.filterwarnings('ignore')

# --- Configuration for data/model paths ---
DATA_FILE_REL_PATH = os.path.join('datasets', 'financial', 'stock_market_dataset.csv')
MODEL_FILE_REL_PATH = os.path.join('datasets', 'facial', 'fer2013_mini_XCEPTION.119-0.65.hdf5')

# Global variables to store loaded data and model
_market_data_df = None
_emotion_model = None
_app = None  # Store Flask app reference

def set_app(app):
    """Set the Flask app reference for use in background tasks."""
    global _app
    _app = app

def load_data_and_model():
    """Loads the CSV data and the trained emotion model into global variables."""
    global _market_data_df, _emotion_model
    
    if _market_data_df is not None and _emotion_model is not None:
        print("Data and model already loaded.")
        return

    try:
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        
        data_abs_path = os.path.join(project_root, DATA_FILE_REL_PATH)
        model_abs_path = os.path.join(project_root, MODEL_FILE_REL_PATH)

        print(f"\nLoading CSV from: {data_abs_path}")
        print(f"Loading model from: {model_abs_path}")

        if not os.path.exists(data_abs_path):
            raise FileNotFoundError(f"CSV file not found at: {data_abs_path}")
        if not os.path.exists(model_abs_path):
            raise FileNotFoundError(f"Model file not found at: {model_abs_path}")

        _market_data_df = pd.read_csv(data_abs_path)
        
        print(f"[OK] Successfully loaded CSV data with {len(_market_data_df)} rows")
        print(f"[OK] CSV Columns: {list(_market_data_df.columns)}")

        if 'Date' in _market_data_df.columns:
            _market_data_df['timestamp'] = pd.to_datetime(_market_data_df['Date'])
        elif 'date' in _market_data_df.columns:
            _market_data_df['timestamp'] = pd.to_datetime(_market_data_df['date'])
        elif 'timestamp' not in _market_data_df.columns:
            _market_data_df['timestamp'] = pd.date_range(start='2023-01-01', periods=len(_market_data_df), freq='1H')
        else:
            _market_data_df['timestamp'] = pd.to_datetime(_market_data_df['timestamp'])

        print(f"[OK] Timestamps configured")

        print(f"Loading Keras model...")
        try:
            _emotion_model = load_model(
                model_abs_path,
                custom_objects={'Adam': Adam}
            )
        except ValueError as ve:
            print(f"  Attempting to load with compile=False due to: {ve}")
            _emotion_model = load_model(model_abs_path, compile=False)
            _emotion_model.compile(optimizer=Adam(learning_rate=0.0001), loss='categorical_crossentropy', metrics=['accuracy'])
        
        print(f"[OK] Successfully loaded emotion model (Xception-based FER2013)")

    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        _market_data_df = pd.DataFrame()
        _emotion_model = None
    except Exception as e:
        print(f"[ERROR] during data/model loading: {type(e).__name__}: {e}")
        _market_data_df = pd.DataFrame()
        _emotion_model = None


def calculate_stress_from_market(row):
    """Calculate stress level based on stock market data."""
    try:
        stress_level = 0.5
        
        if 'Close' in row and 'Open' in row:
            price_change = abs(float(row['Close']) - float(row['Open'])) / float(row['Open'])
            stress_level += price_change * 0.3
        
        if 'High' in row and 'Low' in row and 'Close' in row:
            volatility = (float(row['High']) - float(row['Low'])) / float(row['Close'])
            stress_level += volatility * 0.2
        
        if 'Volume' in row:
            volume = float(row['Volume'])
            if volume > 1000000:
                stress_level += 0.2
        
        stress_level = max(0.0, min(1.0, stress_level))
        return stress_level
    except:
        return 0.5

def market_data_emitter():
    """Emits market data and stress levels with Flask app context.
    
    Performance optimizations:
    - Samples data every N rows to avoid overwhelming clients
    - Uses 100ms sleep instead of 1s for 10x faster updates
    - Configurable via EMITTER_SAMPLE_RATE and EMITTER_SLEEP_MS env variables
    """
    print("\n" + "="*70)
    print("Starting market data emitter background task...")
    print("="*70)
    
    load_data_and_model()

    if _market_data_df.empty or _emotion_model is None:
        print("[ERROR] Cannot start emitter: Market data CSV is empty or emotion model not loaded.")
        return

    if _app is None:
        print("[ERROR] Flask app not set. Cannot emit data.")
        return

    # Performance tuning: Sample every Nth row (default every 5th row = 5x faster)
    sample_rate = int(os.getenv('EMITTER_SAMPLE_RATE', '5'))
    sleep_interval = float(os.getenv('EMITTER_SLEEP_MS', '100')) / 1000  # Convert ms to seconds
    
    total_rows = len(_market_data_df)
    sampled_rows = (total_rows + sample_rate - 1) // sample_rate
    
    print(f"[OK] Data loaded. Emitting {sampled_rows} data points (sampling every {sample_rate}th row)")
    print(f"[OK] Sleep interval: {sleep_interval*1000:.0f}ms\n")

    emitted_count = 0
    for index, row in _market_data_df.iterrows():
        # Skip rows based on sample rate (emit every Nth row)
        if index % sample_rate != 0:
            continue
        # Use app context for emit
        with _app.app_context():
            try:
                # --- 1. Emit Market Data Update ---
                market_update_data = {
                    "stocks": {},
                    "crypto": {}
                }
                
                if 'Close' in row:
                    market_update_data["stocks"]["Close"] = float(row['Close'])
                if 'Open' in row:
                    market_update_data["stocks"]["Open"] = float(row['Open'])
                if 'High' in row:
                    market_update_data["stocks"]["High"] = float(row['High'])
                if 'Low' in row:
                    market_update_data["stocks"]["Low"] = float(row['Low'])
                if 'Stock' in row:
                    market_update_data["stocks"]["Symbol"] = str(row['Stock'])
                
                if not market_update_data["stocks"]:
                    market_update_data["stocks"]["Price"] = float(row.iloc[0]) if len(row) > 0 else 100.0
                
                emitted_count += 1
                print(f"[{emitted_count}/{sampled_rows}] Emitting market_update (row {index})")
                emit('market_update', {'data': market_update_data}, namespace='/', broadcast=True)

                # --- 2. Calculate and Emit Stress Level Update ---
                try:
                    predicted_stress = calculate_stress_from_market(row)
                    
                    stress_update_data = {
                        "time": row.get('Date', 'N/A'),
                        "level": float(predicted_stress)
                    }
                    
                    print(f"           Emitting stress_update (level: {predicted_stress:.2f})")
                    emit('stress_update', stress_update_data, namespace='/', broadcast=True)
                    
                except Exception as e:
                    print(f"[ERROR] calculating stress for row {index}: {e}")
                    emit('stress_update', {
                        "time": row.get('Date', 'N/A'),
                        "level": 0.5
                    }, namespace='/', broadcast=True)

                time.sleep(sleep_interval)

            except Exception as e:
                print(f"[ERROR] processing row {index}: {e}")

    print("\n" + "="*70)
    print(f"Market data emitter task completed! Emitted {emitted_count} data points.")
    print("="*70 + "\n")
