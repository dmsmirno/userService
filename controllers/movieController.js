const express = require('express');
const authService = require('../services/authService');
const tmdbService = require('../services/tmdbService');

const controller = express.Router();
const redisClient  = require('../utils/redis.js');

// Fetch movies associated with the authenticated user
controller.get('/popular', async (req, res) => {
    try {
        const movies = await tmdbService.getPopularMovies();
        res.json(movies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

controller.get('/favorites', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const sessionId = authHeader && authHeader.split(' ')[1];
      const movies = await tmdbService.getFavorites(sessionId);
      res.json(movies);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});
  
controller.get('/watchlist', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const sessionId = authHeader && authHeader.split(' ')[1];
      const movies = await tmdbService.getWatchlist(sessionId);
      res.json(movies);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});


controller.get('/custom-lists', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader && authHeader.split(' ')[1];
    const lists = await tmdbService.getCustomLists(sessionId);
    res.json(lists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

controller.get('/custom-list-content', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader && authHeader.split(' ')[1];
    const customSelection = req.query.customSelection;
    const movies = await tmdbService.getCustomListContent(sessionId, customSelection);
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

controller.post('/create-party', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader && authHeader.split(' ')[1];
    const movies = req.body.movies;
    const partyId = await tmdbService.createParty(sessionId, movies);
    res.json({ partyId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

controller.post('/join-party', async (req, res) => {
  try {
    const partyExists = await redisClient.exists(req.body.inviteCode);
    res.json({ partyExists });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = controller;