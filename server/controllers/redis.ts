import { redisConnect } from "../../server.js"
import { Request, Response } from "express";

export const attemptRedisReconnect = async (req: Request, res: Response) => {
    if (req.body.password !== process.env.RECONNECT_REDIS_PASSWORD) {
        return res.status(401).send("Invalid password.");
    }

    try {
        await redisConnect();
        console.log('Connected to Redis successfully.');
        return res.send("Redis connected successfully!");
    } catch (error) {
        console.error(`Redis connection error: "${error}"`);
        return res.status(500).send((error as Error).message);
    }
}
