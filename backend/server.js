const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://hacktu-medipal.vercel.app',
  'https://hacktu-medipal.onrender.com', // Your Render backend domain (if frontend calls it)
  process.env.FRONTEND_URL // Set in Render env vars
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / server-to-server calls
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } 
    console.warn(`Blocked by CORS: ${origin}`);
    return callback(null, false); // explicitly deny CORS
  },
  credentials: true
}));


// Increase body size limit for pose landmarks + keyframe images (base64 encoded)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/prescriptions', require('./routes/prescriptions'));
app.use('/sessions', require('./routes/sessions'));
app.use('/compliance', require('./routes/compliance'));
app.use('/decisions', require('./routes/decisions'));
app.use('/notifications', require('./routes/notifications'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/face', require('./routes/face'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
