import { Router } from "express";
import { registerUser, logoutUser, refreshAccessToken, changeCurrentPassword, updateAccountDetails, updateCoverImage, updateUserAvatar, getUserChannelProfile, getWatchHistory, getCurrentUser} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },{
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(registerUser) //login user
router.route("/refresh-token").post(refreshAccessToken) //refresh token

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)  
router.route("/change-password").post(verifyJWT, changeCurrentPassword) //change password
router.route("/c/:username").get(verifyJWT, getUserChannelProfile) //get user by username
router.route("/update-account").patch(verifyJWT, updateAccountDetails) //update account details
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar) //update avatar
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage) //update cover image
router.route("/watch-history").get(verifyJWT, getWatchHistory) //get watch history
router.route("/current-user").get(verifyJWT, getCurrentUser) //get current user



export default router