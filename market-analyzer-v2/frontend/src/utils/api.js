import axios from 'axios';

const api = axios.create({
    // This is the base URL of your Python backend server
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;