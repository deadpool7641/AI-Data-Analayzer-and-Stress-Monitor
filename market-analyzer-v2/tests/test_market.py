import pytest
from app import create_app

def test_market_symbols(client):
    response = client.get('/api/market/symbols')
    assert response.status_code == 200
    assert 'AAPL' in str(response.data)

def test_market_ohlcv(client):
    response = client.get('/api/market/ohlcv?symbol=AAPL')
    assert response.status_code == 200
    assert 'close' in response.json
