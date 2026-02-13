# app/services/stress_service.py

import base64
from datetime import datetime

from app.models.schemas import StressResult
from app.services.stress_model_service import stress_model_service


class StressService:
    def __init__(self, mongo):
        self.mongo = mongo
        # kept for compatibility if you ever map emotions manually
        self.emotions = ["happy", "sad", "angry", "fear", "surprise", "neutral"]

    def analyze_frame(self, base64_image: str, user_id: str) -> StressResult:
        """
        Analyze facial expression in image using the trained FER model
        to determine stress level. Uses the shared stress_model_service
        so it stays in sync with the live Mini-XCEPTION pipeline.
        """
        try:
            # Decode base64 image ("data:image/...;base64,AAAA" or plain base64)
            if "," in base64_image:
                _, encoded = base64_image.split(",", 1)
            else:
                encoded = base64_image

            image_bytes = base64.b64decode(encoded)

            # Predict normalized stress (0–1) using the shared model service
            # stress_model_service.predict(...) must return a float in [0, 1]
            stress_score_normalized = float(stress_model_service.predict(image_bytes))

            # Convert from 0–1 to 0–100 scale
            stress_score = stress_score_normalized * 100.0

            # Simple emotion mapping based on stress level
            if stress_score > 75:
                emotion = "angry"
            elif stress_score > 60:
                emotion = "fear"
            elif stress_score > 45:
                emotion = "sad"
            elif stress_score > 30:
                emotion = "surprise"
            elif stress_score > 15:
                emotion = "neutral"
            else:
                emotion = "happy"

            result = StressResult(
                userId=str(user_id),
                timestamp=datetime.utcnow(),
                stressScore=float(stress_score),
                emotion=emotion,
            )

            # Persist log
            self.mongo.db.stressLogs.insert_one(result.dict())

            # Fire alerts if above threshold
            self.check_alerts(str(user_id), stress_score)

            return result

        except Exception as e:
            print(f"[ERROR] Error analyzing frame: {e}")
            # Fallback: neutral stress when anything fails
            return StressResult(
                userId=str(user_id),
                timestamp=datetime.utcnow(),
                stressScore=50.0,
                emotion="neutral",
            )

    def check_alerts(self, user_id: str, stress_score: float):
        """
        Check if stress level exceeds threshold and create alert document.
        """
        threshold = 70.0
        if stress_score > threshold:
            self.mongo.db.alerts.insert_one(
                {
                    "userId": user_id,
                    "stressScore": float(stress_score),
                    "timestamp": datetime.utcnow(),
                    "severity": "high" if stress_score > 85 else "medium",
                    "resolved": False,
                }
            )
