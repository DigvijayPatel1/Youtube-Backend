import { registerUser, 
    LoginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getChannelProfile,
    getWatchHistory,

} from "../controllers/user.controller.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verify } from "jsonwebtoken";
import { get } from "mongoose";

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
router.route("/change-password").post(verifyJWT, changeCurrentPassword) //changing the password route
router.route("/user-profile").get(verifyJWT, getCurrentUser) //getting the current user details
router.route("/update-details").patch(verifyJWT, updateAccountDetails) // updating the account details 
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar) // updating the avatar route
router.route("/update-coverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage) //updating the cover image

router.route("/c/:username").get(verifyJWT, getChannelProfile) //getting the channel profile
router.route("/watch-history").get(verifyJWT, getWatchHistory) //getting watch history route


export default router