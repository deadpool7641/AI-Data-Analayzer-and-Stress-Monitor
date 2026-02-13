from datetime import datetime, timedelta

class AlertService:
    def __init__(self, mongo):
        self.mongo = mongo
    
    def create_alert(self, user_id, stress_score):
        if stress_score > 70:
            self.mongo.db.alerts.insert_one({
                "userId": user_id,
                "stressScore": stress_score,
                "timestamp": datetime.utcnow(),
                "resolved": False
            })
