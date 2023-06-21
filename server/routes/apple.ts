import express from "express";
import * as controller from "../controllers/apple.js";

export const router = express.Router();
export const path = "/api/apple";

router.get("/login", controller.login);
router.get("/callback", controller.authorize);
router.get("/playlists/:id", controller.getPlaylist);
router.get("/playlists/:id/tracks", controller.getPlaylistTracks);
router.get("/tracks/:id", controller.getTrack);
router.get("/artists/:id", controller.getArtist)
router.get("/search", controller.search);