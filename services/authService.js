require('dotenv').config();

const axios = require('axios');
const apiKey = process.env.TMDB_API_KEY; // Use the API key from the environment variables
const redisClient = require('../utils/redis.js');
const redirectUrl = process.env.REDIRECT_URL;

const authService = {

  async createRequestToken() {
    const response = await axios.get(`https://api.themoviedb.org/3/authentication/token/new?api_key=${apiKey}`);
    const url = `https://www.themoviedb.org/authenticate/${response.data.request_token}?redirect_to=${redirectUrl}`;
    return url;
  },

  async createSession(validatedRequestToken) {
    try {
      const response = await axios.post(`https://api.themoviedb.org/3/authentication/session/new?api_key=${apiKey}`, {
        request_token: validatedRequestToken
      });
      await this.storeSession(response.data.session_id); // Store the session in Redis
      return response.data.session_id;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
   
  },

  async validateSession(sessionId) {
    try {
      const session = await redisClient.get(sessionId);
      if (session && session === 'valid') {
        return true;
      } else {
        console.error("Session not valid", sessionId)
        return false;
      }
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  },

  async storeSession(sessionId) {
    try {
      await redisClient.set(sessionId, 'valid', 'EX', 60 * 60 * 24); // Set session to expire after 24 hours
    } catch (error) {
      console.error('Error storing session:', error);
    }
  },

  async logout(sessionId) {
    try {
      await this.deleteSession(sessionId); // Delete the session from Redis
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  },

  async deleteSession(sessionId) {
    try {
      await redisClient.del(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }
};

module.exports = authService;