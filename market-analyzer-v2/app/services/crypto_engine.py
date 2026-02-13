import numpy as np
import pandas as pd
import yfinance as yf
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import matplotlib.pyplot as plt
import datetime
import os

class CryptoModelTrainer:
    def __init__(self, symbol='BTC-USD', look_back=60):
        self.symbol = symbol
        self.look_back = look_back
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model = None
        
    def fetch_data(self, days=730):
        """
        Fetches historical data using yfinance.
        Default is 730 days (2 years).
        """
        print(f"Downloading data for {self.symbol}...")
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=days)
        
        data = yf.download(self.symbol, start=start_date, end=end_date)
        
        if data.empty:
            raise ValueError("No data fetched. Check your internet connection or symbol.")
            
        # We focus on the 'Close' price for this simple model
        data = data[['Close']]
        return data

    def prepare_data(self, data):
        """
        Prepares data for LSTM: Scaling and creating sequences.
        """
        dataset = data.values
        
        # 80% Training, 20% Testing
        training_data_len = int(np.ceil(len(dataset) * .8))
        
        # Scale the data
        scaled_data = self.scaler.fit_transform(dataset)
        
        # Create Training Data
        train_data = scaled_data[0:int(training_data_len), :]
        x_train, y_train = [], []

        for i in range(self.look_back, len(train_data)):
            x_train.append(train_data[i-self.look_back:i, 0])
            y_train.append(train_data[i, 0])
            
        x_train, y_train = np.array(x_train), np.array(y_train)
        
        # Reshape for LSTM (samples, time steps, features)
        x_train = np.reshape(x_train, (x_train.shape[0], x_train.shape[1], 1))
        
        return x_train, y_train, training_data_len, scaled_data, dataset

    def build_model(self, input_shape):
        """
        Builds the LSTM Neural Network architecture.
        """
        model = Sequential()
        
        # Layer 1
        model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
        model.add(Dropout(0.2))
        
        # Layer 2
        model.add(LSTM(units=50, return_sequences=False))
        model.add(Dropout(0.2))
        
        # Output Layer
        model.add(Dense(units=25))
        model.add(Dense(units=1)) # Prediction of the next closing price
        
        model.compile(optimizer='adam', loss='mean_squared_error')
        self.model = model
        return model

    def train(self, x_train, y_train, epochs=25, batch_size=32):
        """
        Trains the model.
        """
        print("Starting training...")
        self.model.fit(x_train, y_train, batch_size=batch_size, epochs=epochs)
        print("Training complete.")

    def evaluate_and_plot(self, training_data_len, scaled_data, dataset):
        """
        Predicts on test data and plots the results.
        """
        # Create the testing data
        test_data = scaled_data[training_data_len - self.look_back:, :]
        x_test = []
        y_test = dataset[training_data_len:, :]
        
        for i in range(self.look_back, len(test_data)):
            x_test.append(test_data[i-self.look_back:i, 0])
            
        x_test = np.array(x_test)
        x_test = np.reshape(x_test, (x_test.shape[0], x_test.shape[1], 1))
        
        # Get predicted prices
        predictions = self.model.predict(x_test)
        predictions = self.scaler.inverse_transform(predictions)
        
        # Get Root Mean Squared Error (RMSE)
        rmse = np.sqrt(np.mean(((predictions - y_test) ** 2)))
        print(f"Root Mean Squared Error (RMSE): {rmse}")
        
        # Plotting
        train = pd.DataFrame(dataset[:training_data_len], columns=['Close'])
        valid = pd.DataFrame(dataset[training_data_len:], columns=['Close'])
        valid['Predictions'] = predictions
        
        plt.figure(figsize=(16,8))
        plt.title(f'{self.symbol} Price Prediction Model')
        plt.xlabel('Date (Days Index)', fontsize=18)
        plt.ylabel('Close Price USD ($)', fontsize=18)
        plt.plot(train['Close'])
        plt.plot(valid[['Close', 'Predictions']])
        plt.legend(['Train', 'Val', 'Predictions'], loc='lower right')
        plt.show()
        
        return valid

    def save_model(self, filename='crypto_model.keras'):
        self.model.save(filename)
        print(f"Model saved as {filename}")

# --- Main Execution Block ---
if __name__ == "__main__":
    # 1. Initialize
    # You can change 'BTC-USD' to 'ETH-USD', 'SOL-USD', etc.
    trainer = CryptoModelTrainer(symbol='BTC-USD', look_back=60)
    
    # 2. Get Data
    df = trainer.fetch_data()
    
    # 3. Process Data
    x_train, y_train, train_len, scaled_data, dataset = trainer.prepare_data(df)
    
    # 4. Build Model
    trainer.build_model((x_train.shape[1], 1))
    
    # 5. Train
    trainer.train(x_train, y_train, epochs=10, batch_size=32)
    
    # 6. Evaluate
    results = trainer.evaluate_and_plot(train_len, scaled_data, dataset)
    
    # 7. Save
    trainer.save_model()
    
    # 8. Predict Tomorrow's Price (Bonus)
    last_60_days = scaled_data[-60:]
    X_input = []
    X_input.append(last_60_days)
    X_input = np.array(X_input)
    X_input = np.reshape(X_input, (X_input.shape[0], X_input.shape[1], 1))
    pred_price = trainer.model.predict(X_input)
    pred_price = trainer.scaler.inverse_transform(pred_price)
    print(f"\nPredicted Price for next market close: ${pred_price[0][0]:.2f}")