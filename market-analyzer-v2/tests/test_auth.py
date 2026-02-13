def test_register(client):
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com', 'password': 'password123', 'name': 'Test'
    })
    assert response.status_code == 201
