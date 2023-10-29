import { redisConnect } from "../../server.js"
import { Request, Response } from "express";

export const attemptRedisReconnect = async (req: Request, res: Response) => {
    if (req.body.password !== process.env.RECONNECT_REDIS_PASSWORD) {
        return res.status(401).send("Invalid password.");
    }

    await redisConnect()
        .then(() => {
            console.log('Connected to Redis successfully.');
            return res.send("Redis connected succesfully!");
        })
        .catch((error) => {
            console.error(`Redis connection error: "${error}"`);
            return res.status(500).send(error);
        });

    return res.status(500).send("Could not reconnect to redis.");
}
