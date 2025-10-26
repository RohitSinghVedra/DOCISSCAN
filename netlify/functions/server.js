const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

// Import Firebase config
const { admin } = require('../../server/firebase-config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('../../server/routes-firebase/auth'));
app.use('/api/documents', require('../../server/routes-firebase/documents'));
app.use('/api/google', require('../../server/routes-firebase/google'));

module.exports.handler = serverless(app);
