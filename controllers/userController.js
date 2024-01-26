const express = require('express');
const authService = require('../services/authService');
const tmdbService = require('../services/tmdbService');

const controller = express.Router();
const redisClient  = require('../utils/redis.js');


// Fetch movies associated with the authenticated user
controller.get('/movies/popular', async (req, res) => {
    try {
        const movies = await tmdbService.getPopularMovies();
        res.json(movies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

controller.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const token = await authService.getSession(username, password);
        req.session.userId = token;
        res.status(200).json({ sessionId: token });
    } catch (err) {
        res.status(500).json({ message: 'Login failed' });
    }
});


controller.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const sessionId = authHeader && authHeader.split(' ')[1];
        const success = await authService.logout(sessionId);
        if (success) {
          res.status(200).json({ message: 'Logged out successfully' });
        } else {
          res.status(500).json({ message: 'Logout failed' });
        }
      } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


controller.post('/validate-session', async (req, res) => {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader && authHeader.split(' ')[1];
  
    const session = await redisClient.get(sessionId);
    if (session && session === 'valid') {
        res.json({ isValid: true });
    } else {
        res.json({ isValid: false });
    }
});

module.exports = controller;