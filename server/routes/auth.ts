import express from "express";
import * as controller from "../controllers/auth.js";
import { spotifyRefreshToken } from "../middleware.js";

export const router = express.Router();
export const path = "/auth";

router.get("/", controller.getLoginStatus);
router.get("/logout", controller.logout);
router.post("/create-user", controller.createUser);
router.put("/update-user", controller.updateUser);
router.get("/spotify/connected", spotifyRefreshToken, controller.spotifyConnected);
router.post("/callback", controller.authorize);