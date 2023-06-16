import express from "express";
import * as controller from "../controllers/playlists.js";

export const router = express.Router();
export const path = "/api/playlists";

router.post("/generate-url", controller.generateUrl);
router.get("/:id", controller.getPlaylist);