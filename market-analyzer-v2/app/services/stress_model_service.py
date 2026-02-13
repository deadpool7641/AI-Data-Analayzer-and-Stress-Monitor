# app/services/stress_model_service.py

import cv2
import numpy as np
import tensorflow as tf
from pathlib import Path


class StressModelService:
    """
    Singleton service to load and use the FER2013 emotion detection model.
    Analyzes facial expressions to determine stress levels (0–1).
    Loads model lazily on first use to avoid startup delays.
    """
    _instance = None

    # Emotion to stress mapping (higher stress for negative emotions)
    EMOTION_TO_STRESS = {
        "angry": 0.85,
        "fear": 0.8,
        "sad": 0.7,
        "surprise": 0.5,
        "neutral": 0.4,
        "happy": 0.2,
    }

    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.face_cascade = None
        # order must match training
        self.emotions = [
            "angry",
            "disgust",
            "fear",
            "happy",
            "neutral",
            "sad",
            "surprise",
        ]
        print("[OK] Stress model service initialized (lazy loading enabled)")
        self._load_face_cascade()

    def _load_model(self):
        """Load the trained FER2013 Mini-XCEPTION model (lazy loading)."""
        if self.model_loaded:
            return

        try:
            model_path = (
                Path(__file__).parent.parent.parent
                / "datasets"
                / "facial"
                / "_mini_XCEPTION.102-0.66.hdf5"
            )
            if model_path.exists():
                print(f"[OK] Loading emotion detection model from {model_path}...")
                # IMPORTANT: compile=False to ignore legacy optimizer (lr) config
                self.model = tf.keras.models.load_model(str(model_path), compile=False)
                self.model_loaded = True
                print("[OK] Emotion detection model loaded successfully")
            else:
                print(f"[ERROR] Model not found at {model_path}")
                self.model = None
                self.model_loaded = True
        except Exception as e:
            print(f"[ERROR] Failed to load emotion model: {e}")
            self.model = None
            self.model_loaded = True

    def _load_face_cascade(self):
        """Load OpenCV face cascade classifier."""
        try:
            cascade_path = (
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            if not self.face_cascade.empty():
                print("[OK] Face cascade loaded successfully")
            else:
                print("[ERROR] Failed to load face cascade")
        except Exception as e:
            print(f"[ERROR] Error loading face cascade: {e}")

    @classmethod
    def get_instance(cls):
        """Gets the single instance of this service."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def predict(self, image_data: bytes) -> float:
        """
        Predicts stress level from raw image bytes using the trained FER2013 model.
        Returns a stress level between 0 (calm) and 1 (high stress).
        """
        # Lazy load model on first use
        if not self.model_loaded:
            self._load_model()

        try:
            if self.model is None:
                print("[WARNING] Model not available, returning neutral stress (0.5)")
                return 0.5

            # Decode image
            np_arr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                print("[WARNING] Failed to decode image")
                return 0.5

            # Convert to grayscale for face detection
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Detect faces
            faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

            if len(faces) == 0:
                print("[WARNING] No face detected in image")
                return 0.3  # neutral-ish when no face

            # Process first detected face
            x, y, w, h = faces[0]
            face_roi = gray[y : y + h, x : x + w]

            # Resize to model input size (64x64 for FER2013)
            face_roi = cv2.resize(face_roi, (64, 64))

            # Normalize pixel values
            face_roi = face_roi.astype("float32") / 255.0

            # Add batch and channel dimensions
            face_roi = np.expand_dims(face_roi, axis=0)
            face_roi = np.expand_dims(face_roi, axis=-1)

            # Predict emotion
            predictions = self.model.predict(face_roi, verbose=0)
            emotion_idx = int(np.argmax(predictions[0]))
            emotion = (
                self.emotions[emotion_idx]
                if 0 <= emotion_idx < len(self.emotions)
                else "neutral"
            )
            confidence = float(predictions[0][emotion_idx])

            # Convert emotion to stress level
            stress_level = self.EMOTION_TO_STRESS.get(emotion, 0.5)

            # Adjust stress by confidence (more confident = stronger signal)
            stress_level = stress_level * confidence

            print(
                f"[OK] Detected emotion: {emotion} ({confidence:.2%}), "
                f"Stress: {stress_level:.2f}"
            )

            # Clamp between 0 and 1
            return float(min(1.0, max(0.0, stress_level)))

        except Exception as e:
            print(f"[ERROR] Error in stress prediction: {e}")
            return 0.5


# Create a single, shared instance of the service that the app can use
stress_model_service = StressModelService.get_instance()
