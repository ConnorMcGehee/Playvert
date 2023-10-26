import session from "express-session";
import { app, isProductionEnv, redisClient } from "../../server.js"
import RedisStore from "connect-redis";
import { Request, Response } from "express";

export const attemptRedisReconnect = async (req: Request, res: Response) => {
    if (req.body.password !== process.env.RECONNECT_REDIS_PASSWORD) {
        return res.status(401).send("Invalid password.");
    }
    redisClient.connect()
        .then(() => {
            // Initialize store.
            const redisStore = new RedisStore({
                client: redisClient,
                prefix: "playlist:"
            });
            // Initialize session storage.
            app.use(
                session({
                    store: redisStore,
                    resave: false, // required: force lightweight session keep alive (touch)
                    saveUninitialized: false, // recommended: only save session when data exists
                    secret: process.env.SESSION_SECRET!,
                    cookie: {
                        httpOnly: true,
                        maxAge: 14 * 24 * 60 * 60 * 1000,
                        sameSite: "none",
                        secure: isProductionEnv
                    }
                })
            );
            console.log('Connected to Redis successfully.');
            return res.send("Redis connected succesfully!");
        })
        .catch((error) => {
            console.error(`Redis connection error: "${error}"`);
            return res.status(500).send(error);
        });
}