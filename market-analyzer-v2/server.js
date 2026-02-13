// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const twilio = require('twilio');

// MongoDB & models
const mongoose = require('mongoose');

// import your routers
const authRouter = require('./routes/auth');   // /api/auth
const userRouter = require('./routes/users');  // /api/users
const profileRouter = require('./routes/profile'); // NEW: /api/profile

const app = express();

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/neurometric';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// --- GLOBAL MIDDLEWARE ---
app.use(express.json());

// serve uploaded avatars as static files
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads')) // e.g. /uploads/avatars/filename.jpg
); // React can access via http://localhost:5000/uploads/avatars/xxx.jpg[web:61][web:64]

// CORS for REST API
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.options(
  '*',
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// --- REST ROUTES ---
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/profile', profileRouter); // <-- used by Profile.jsx

// simple health check
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// --- TWILIO SETUP ---
const TWILIO_SID = process.env.TWILIO_SID || 'AC_PLACEHOLDER';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'AUTH_PLACEHOLDER';
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || '+15005550006';

let client;
try {
  client = twilio(TWILIO_SID, TWILIO_TOKEN);
} catch (e) {
  console.warn('⚠️ Twilio not configured. SMS features will be disabled.');
}

// --- SOCKET EVENTS ---
io.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.on('report_high_stress', async (data) => {
    console.log(
      `🚨 ALERT: ${data.userName} reported High Stress (${(data.level * 100).toFixed(
        0
      )}%)`
    );

    io.emit('admin_receive_stress_alert', data);

    const targetPhone = data.hrPhone || process.env.HR_PHONE_NUMBER;

    if (client && targetPhone) {
      try {
        const message = await client.messages.create({
          body: `🚨 NEUROMETRIC ALERT: ${data.userName} has detected High Stress levels (${(
            data.level * 100
          ).toFixed(0)}%). Check dashboard immediately.`,
          from: TWILIO_PHONE,
          to: targetPhone,
        });
        console.log(`✅ SMS sent to HR: ${message.sid}`);

        socket.emit('sms_sent_success', { success: true });
      } catch (error) {
        console.error('❌ Failed to send SMS:', error.message);
      }
    } else {
      console.log(
        'ℹ️ Skipped SMS: No Twilio client or Target Phone Number provided.'
      );
    }
  });

  socket.on('disconnect', () => {
    console.log('🔥: A user disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING on http://localhost:${PORT}`);
});
