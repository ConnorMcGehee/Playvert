import express from "express";
import * as controller from "../controllers/recaptcha.ts";

export const router = express.Router();
export const path = "/api/recaptcha";

router.post("/assessment", controller.assessment);