require('dotenv').config();
const { createClient } = require('redis');

const client = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});


/*
const redisClient = new Redis({
  host: '127.0.0.1',
  port: 6379,
});
*/

module.exports = client;