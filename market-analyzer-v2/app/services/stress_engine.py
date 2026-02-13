import os
import cv2
import numpy as np
import base64
from tensorflow.keras.models import load_model

class StressModelTrainer:
    def __init__(self, model_path='datasets/facial/fer2013_mini_XCEPTION.119-0.65.hdf5'):
        self.model = None
        self.labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
        
        # Load the model if it exists
        if os.path.exists(model_path):
            try:
                print(f"🧠 Loading Stress Model from {model_path}...")
                self.model = load_model(model_path)
                print("✅ Stress Model Loaded Successfully")
            except Exception as e:
                print(f"❌ Error loading model: {e}")
        else:
            print(f"⚠️ Warning: Model file not found at {model_path}")

    def preprocess_image(self, base64_string):
        """
        Converts base64 string from frontend to a format the AI understands.
        """
        try:
            # 1. Decode the image
            if "base64," in base64_string:
                base64_string = base64_string.split(",")[1]
            img_data = base64.b64decode(base64_string)
            np_arr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE) # Convert to grayscale

            # 2. Resize to what your model expects (usually 48x48 for emotion models)
            img = cv2.resize(img, (48, 48))
            
            # 3. Normalize (0-255 -> 0-1)
            img = img / 255.0
            
            # 4. Reshape for model input (1, 48, 48, 1)
            img = np.reshape(img, (1, 48, 48, 1))
            return img
        except Exception as e:
            print(f"Image processing error: {e}")
            return None

    def predict_stress(self, image_data):
        """
        Returns a stress level (0.0 to 1.0) and a text label.
        """
        if not self.model:
            # Fallback if model isn't loaded: Return random safe data
            return 0.2, "Neutral (Model Missing)"

        processed_img = self.preprocess_image(image_data)
        if processed_img is None:
            return 0.0, "Error"

        # Predict
        preds = self.model.predict(processed_img)
        label_idx = np.argmax(preds)
        label = self.labels[label_idx]

        # Calculate Stress Level based on negative emotions
        # (Angry/Fear/Disgust/Sad = High Stress)
        stress_level = 0.1 # Default low
        if label in ['Angry', 'Fear', 'Disgust']:
            stress_level = float(np.max(preds)) * 0.9 # High stress
        elif label == 'Sad':
            stress_level = 0.6
        elif label == 'Surprise':
            stress_level = 0.4
        else:
            stress_level = 0.1 # Happy/Neutral

        return stress_level, label