const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const controller = require('../controllers/userController');
const movieController = require('../controllers/movieController');

// REST /users/...
router.use('/users', controller);

// REST /movies/...
router.use('/movies', movieController);


module.exports = router;

