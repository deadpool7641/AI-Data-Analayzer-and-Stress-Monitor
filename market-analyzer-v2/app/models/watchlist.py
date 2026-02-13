from pydantic import BaseModel
from typing import List

class Watchlist(BaseModel):
    userId: str
    symbols: List[str] = []
