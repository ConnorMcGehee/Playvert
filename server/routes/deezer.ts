import express from "express";
import * as controller from "../controllers/deezer.js";

export const router = express.Router();
export const path = "/api/deezer";

router.get("/playlists/:id", controller.getPlaylist);
router.get("/tracks/:id", controller.getTrackInfo);
router.get("/search", controller.search);
router.get("/redirect/:url", controller.getRedirectLink)