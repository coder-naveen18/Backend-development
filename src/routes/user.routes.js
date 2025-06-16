import { Router } from "express";
import { loginUser, logoutUser, registerUser ,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvtar, updateUsercoverImage, getUserChannelProfile, getWatchHistory} from "../Controllers/user.controller.js";

import {upload } from "../middlewares/multer.middleware.js"

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avtar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),registerUser
)

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh_token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/update-details").patch(verifyJWT, updateAccountDetails
)

router.route("/avtar").patch(verifyJWT, upload.single("avtar"), updateUserAvtar)

router.route("/coverImage").patch(verifyJWT, upload.single("coverImage"), updateUsercoverImage)


router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistory)



export default router