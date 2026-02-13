import random

class AIStubService:
    def predict_market_trend(self, symbol):
        return random.choice(["bullish", "bearish", "neutral"])
    
    def predict_stress_level(self, emotion):
        stress_map = {"happy": 20, "neutral": 40, "sad": 60, "angry": 85}
        return stress_map.get(emotion, 50)
