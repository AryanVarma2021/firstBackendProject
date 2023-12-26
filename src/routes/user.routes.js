import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import {loginUser, logoutUser, refreshAccessTokan, registerUser, updateAccountDetails} from "../controllers/user.controller.js"
import { verifyjwt } from "../middlewares/auth.middeware.js";

const router = Router();


router.route("/register").post(
    //middleware for storing avatar and coverimage
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyjwt,logoutUser)
router.route("/refresh-token").post(refreshAccessTokan)
router.route("/update-username-email").post(verifyjwt, updateAccountDetails)





export default router;