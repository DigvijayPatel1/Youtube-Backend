import { registerUser, LoginUser, logoutUser, refreshAccessToken } from "../controllers/user.controller.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

// route to register using middleware which upload file data
router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser)

router.route("/login").post(LoginUser) // login route

//secured routes
router.route("/logout").post(verifyJWT, logoutUser) // logout route
router.route("/refresh-token").post(refreshAccessToken) // refreshAccessToken route

export default router