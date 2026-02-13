import pytest
from app import create_app

def test_stress_analyze(client):
    # Register test user first
    client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'name': 'Test User'
    })
    
    # Login to get token
    login_response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    token = login_response.json['access_token']
    
    # Test stress analysis
    response = client.post('/api/stress/analyze', 
                          json={'image': 'data:image/jpeg;base64,/9j/'},
                          headers={'Authorization': f'Bearer {token}'})
    
    assert response.status_code == 200
    assert 'stressScore' in response.json
