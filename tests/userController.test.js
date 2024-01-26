const request = require('supertest');
const express = require('express');
const userRoutes = require('../routes/userRoutes');

const app = express();
app.use(express.json());
app.use('/', userRoutes);

describe('GET /me', () => {
    it('should fetch user info', async () => {
        const res = await request(app)
            .get('/me')
            .set('Authorization', 'Bearer token'); // replace 'Bearer token' with a valid token

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id');
    });
});

describe('GET /me/movies', () => {
    it('should fetch user movies', async () => {
        const res = await request(app)
            .get('/me/movies')
            .set('Authorization', 'Bearer token'); // replace 'Bearer token' with a valid token

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('movies');
    });
});