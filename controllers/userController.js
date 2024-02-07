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

controller.post('/session', async (req, res) => {
    const { token } = req.body;
    try {
        const response = await authService.createSession(token);
        res.status(200).json({ sessionId: response });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

controller.post('/loginOAuth', async (req, res) =>{
    try {
        const url= await authService.createRequestToken();
        res.status(200).json({ url: url });
    } catch (err) {
        res.status(500).json({ message: 'Login failed' });
    }
});


controller.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const sessionId = authHeader && authHeader.split(' ')[1];
        const success = await authService.logout(sessionId.replace(/"/g, ''));
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
  
    const session = await redisClient.get(sessionId.replace(/"/g, ''));
    if (session && session === 'valid') {
        res.json({ isValid: true });
    } else {
        res.json({ isValid: false });
    }
});

module.exports = controller;