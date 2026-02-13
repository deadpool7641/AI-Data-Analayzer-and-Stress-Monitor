from pydantic import BaseModel
from typing import Dict, List

class OHLCV(BaseModel):
    timestamp: List[str]
    open: List[float]
    high: List[float]
    low: List[float]
    close: List[float]
    volume: List[float]
