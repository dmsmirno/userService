require('dotenv').config();
const axios = require('axios');
const redisClient = require('../utils/redis.js');
const { v4: uuidv4 } = require('uuid');

const generateUniqueCode = async () => {
    while (true) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const exists = await redisClient.get(code);
      if (!exists) {
        return code;
      }
    }
};


const movieService = {
    async getPopularMovies() {
        const apiKey = process.env.TMDB_API_KEY; // Use the API key from the environment variables
        const response = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}`);
        return response.data.results;
    },

    async getFavorites(sessionId) {
        const apiKey = process.env.TMDB_API_KEY;
        const response = await axios.get(`https://api.themoviedb.org/3/account/{account_id}/favorite/movies?api_key=${apiKey}&session_id=${sessionId}`);
        return response.data.results;
    },
    
    async getWatchlist(sessionId) {
        const apiKey = process.env.TMDB_API_KEY;
        const response = await axios.get(`https://api.themoviedb.org/3/account/{account_id}/watchlist/movies?api_key=${apiKey}&session_id=${sessionId}`);
        return response.data.results;
    },

    async getCustomLists(sessionId) {
        const apiKey = process.env.TMDB_API_KEY;
        const response = await axios.get(`https://api.themoviedb.org/3/account/{account_id}/lists?api_key=${apiKey}&session_id=${sessionId}`);
        return response.data.results;
    },

    async getCustomListContent(sessionId, listId) {
        const apiKey = process.env.TMDB_API_KEY;
        const response = await axios.get(`https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}&session_id=${sessionId}`);
        return response.data.items;
    },

    async createParty(sessionId, movies) {
        // Generate a unique partyId
        const partyId = await generateUniqueCode();
    
        // Create a party object
        const party = {
          movies,
          owner: sessionId, // The user who created the party is the owner
          users: [], // Initialize the users array to empty
          votes: movies.reduce((votes, movie) => ({ ...votes, [movie.id]: 0 }), {}), // Initialize votes for each movie to 0
          status: 'notStarted',
        };
      
        // Save the party object in Redis
        await redisClient.hSet(partyId, {
            'movies': JSON.stringify(party.movies),
            'owner': party.owner,
            'users': JSON.stringify(party.users),
            'votes': JSON.stringify(party.votes),
            'status': party.status
        });
        await redisClient.expire(partyId, 600);
      
        return partyId;
    }

    

}

module.exports = movieService;