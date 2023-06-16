import express from "express";
import * as controller from "../controllers/spotify.js";
import { spotifyRefreshToken } from "../middleware.js";

export const router = express.Router();
export const path = "/api/spotify";

router.get("/login", controller.login);
router.get("/login/:uuid", controller.login);
router.get("/callback", controller.authorize);
router.get("/playlists", spotifyRefreshToken, controller.getUserPlaylists);
router.get("/login-status", spotifyRefreshToken, controller.getLoginStatus);
router.get("/playlists/:id", spotifyRefreshToken, controller.getPlaylist);
router.get("/playlists/:id/tracks", spotifyRefreshToken, controller.getPlaylistSongs);
router.get("/logout", controller.logout);
router.get("/search", spotifyRefreshToken, controller.search);
router.post("/save-playlist", spotifyRefreshToken, controller.savePlaylist)