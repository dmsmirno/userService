
// Import required modules
const express = require('express');
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const redisClient = require('./utils/redis.js');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

// Create an instance of Express app
const app = express();
app.use(express.json());
const cors = require('cors')
const userRoutes = require('./routes/userRoutes');

app.use(cors());


let redisStore = new RedisStore({
  client: redisClient.connect(),
});

app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if your app is on https
}));

app.use('/', userRoutes);

// Start the server
const port = 3001;
app.listen(port, () => {
  console.log(`User Service is running on port ${port}`);
});

// Create a WebSocket server
const wss = new WebSocket.Server({ port: process.env.PORT || 8081 });

wss.on('connection', (ws) => {
  ws.id = uuidv4(); // Assign a unique ID to the WebSocket connection
  ws.on('message', async (message) => { // Mark this function as async
    const { type, partyId, movieId, sessionId } = JSON.parse(message);
    switch (type) {
      case 'JOIN_PARTY': {
        const partyExists = await redisClient.exists(partyId);
        if (!partyExists) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Party does not exist' }));
          return;
        }
        // Add the user to the party in Redis
        const party = {
          movies: JSON.parse(await redisClient.hGet(partyId, 'movies')),
          owner: await redisClient.hGet(partyId, 'owner'),
          users: JSON.parse(await redisClient.hGet(partyId, 'users')),
          votes: JSON.parse(await redisClient.hGet(partyId, 'votes')),
          status: await redisClient.hGet(partyId, 'status'),
        };

        party.users.push(ws.id); 
        await redisClient.hSet(partyId, 'users', JSON.stringify(party.users));

        // Add the partyId to the client's parties
        ws.parties = ws.parties || [];
        ws.parties.push(partyId);

        // Get the remaining time to live for the party
        const ttl = await redisClient.ttl(partyId);

        // Send the TTL to the currently joining client
        ws.send(JSON.stringify({ type: 'PARTY_TTL', ttl: ttl }));

        // Fetch the updated list of users and send it to all clients
        const updatedUsers = party.users;
        const partyData = {
          movies: party.movies,
          votes: party.votes,
          status: party.status,
        };

        ws.send(JSON.stringify({ type: 'PARTY_JOINED', party: partyData, users: updatedUsers }));

        party.users.forEach(userId => {
          const client = [...wss.clients].find(client => client.id === userId);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'UPDATE_USERS', users: updatedUsers.length, party: partyData }));
          }
        });
        
        break;
        
      }
      case 'CAST_VOTE': {
        // Update the vote count in Redis
        const partyExists = await redisClient.exists(partyId);
        if (!partyExists) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Party does not exist' }));
          return;
        }

        const party = {
          votes: JSON.parse(await redisClient.hGet(partyId, 'votes')),
          users: JSON.parse(await redisClient.hGet(partyId, 'users')),
        };

        party.votes[movieId] = (party.votes[movieId] || 0) + 1;

        // Update only the 'votes' field in Redis
        await redisClient.hSet(partyId, 'votes', JSON.stringify(party.votes));

        // Send the updated vote counts to all clients
        party.users.forEach(userId => {
          const client = [...wss.clients].find(client => client.id === userId);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'UPDATE_VOTES', votes: party.votes }));
          }
        });
       
        break;
      }

      case 'START_PARTY': {
        const partyExists = await redisClient.exists(partyId);
        if (!partyExists) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Party does not exist' }));
          return;
        }
        // Mark the party as started in Redis
        const party = {
          status: await redisClient.hGet(partyId, 'status'),
          users: JSON.parse(await redisClient.hGet(partyId, 'users')),
        };

        party.status = 'started';

        // Update only the 'status' field in Redis
        await redisClient.hSet(partyId, 'status', party.status);

        // Send the updated party status to all clients
        party.users.forEach(userId => {
          const client = [...wss.clients].find(client => client.id === userId);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'START_PARTY', partyId }));
          }
        });
        
        break;
      }
      case 'PREPARE_PARTY': {
        const partyExists = await redisClient.exists(partyId);
        if (!partyExists) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Party does not exist' }));
          return;
        }
        const party = {
          status: await redisClient.hGet(partyId, 'status'),
          users: JSON.parse(await redisClient.hGet(partyId, 'users')),
        };
        if(party.status === 'notStarted') {
          // Fetch ttl
          const ttl = await redisClient.ttl(partyId);
          party.status = 'prepared';

          // Update only the 'status' field in Redis
          await redisClient.hSet(partyId, 'status', party.status);
          // send ttl message once the key is expired
          setTimeout(async () => {
            const partyExists = await redisClient.exists(partyId);
            if (partyExists) {
              const party = {
                users: JSON.parse(await redisClient.hGet(partyId, 'users')),
              };
          
              party.users.forEach(userId => {
                const client = [...wss.clients].find(client => client.id === userId);
                if (client && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: 'PARTY_EXPIRED', partyId }));
                }
              });
            }
          }, (ttl-1) * 1000); // ttl is in seconds, but setTimeout expects milliseconds 
        }
        break;
      }
      case 'PASS_OWNER': {
        const partyExists = await redisClient.exists(partyId);
        if (!partyExists) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Party does not exist' }));
          return;
        }
        
        setTimeout(async () => {
          const party = {
            users: JSON.parse(await redisClient.hGet(partyId, 'users')),
          };
          if(!party.users || party.users.length === 0) {
            return;
          }

          const client = [...wss.clients].find(client => client.id === party.users[0]); 
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'MAKE_OWNER', partyId }));
          }
        }, 3000);
        
      }
      default:
        // Handle unknown type
        break;
    }
  });

  ws.on('close', async () => {
    // Remove the partyId from the client's parties
    if (ws.parties) {
      ws.parties.forEach(async (partyId) => {
        const partyExists = await redisClient.exists(partyId);
        
        if(partyExists) {
          const party = {
            users: JSON.parse(await redisClient.hGet(partyId, 'users')),
            movies: JSON.parse(await redisClient.hGet(partyId, 'movies')),
            votes: JSON.parse(await redisClient.hGet(partyId, 'votes')),
          };

          // Remove the user from the party in Redis
          party.users = party.users.filter(userId => userId !== ws.id);
          await redisClient.hSet(partyId, 'users', JSON.stringify(party.users));
               
          // Send the updated list of users to all clients
          if (party.users.length === 0) {
            await redisClient.del(partyId);
          } else {
            const partyData = {
              movies: party.movies,
              votes: party.votes,
            };
            party.users.forEach(userId => {
              const client = [...wss.clients].find(client => client.id === userId);
              if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'UPDATE_USERS', users: party.users.length, party: partyData }));
              }
            });
          }
        }
      });
    }
  });
});



