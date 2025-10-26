const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase
const { admin } = require('./firebase-config');
console.log('Firebase initialized successfully');

// Routes
app.use('/api/auth', require('./routes-firebase/auth'));
app.use('/api/documents', require('./routes-firebase/documents'));
app.use('/api/google', require('./routes-firebase/google'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
