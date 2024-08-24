require('dotenv').config();
const express = require('express');
const Bull = require('bull');
const Redis = require('redis');
const { RateLimiterRedis, RateLimiterRes } = require('rate-limiter-flexible');
const taskProcessor = require('./taskProcessor'); 

const app = express();
app.use(express.json());

const redisClient = Redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});


const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points: 20,  
    duration: 60, 
    blockDuration: 1 
});

const taskQueue = new Bull('task-queue', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});


taskQueue.process(taskProcessor);

app.post('/api/v1/task', async (req, res) => {
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).send('Bad Request: Missing user_id');
    }

    try {
      
        await rateLimiter.consume(user_id);

        await taskQueue.add({ user_id });

        res.status(200).send('Task queued');
    } catch (rejRes) {
        if (rejRes instanceof RateLimiterRes) {
      
            res.status(429).send('Too Many Requests');
        } else {
          
            console.error('Internal Server Error:', rejRes);
            res.status(500).send('Internal Server Error');
        }
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
