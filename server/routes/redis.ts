import express from "express";
import * as controller from "../controllers/redis";

export const router = express.Router();
export const path = "/redis";

router.post("/reconnect", controller.attemptRedisReconnect);