import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { getAllVideos } from "../controllers/video.controller.js"

const router = Router()
router.use(verifyJWT) // apply verifyJWT to all middleware in this route

router.route("/").get(getAllVideos)