from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class StressLog(BaseModel):
    userId: str
    timestamp: datetime
    stressScore: float
    emotion: str
    sessionId: Optional[str] = None

class StressAlert(BaseModel):
    userId: str
    stressScore: float
    timestamp: datetime
    resolved: bool = False
    severity: str = "high"
