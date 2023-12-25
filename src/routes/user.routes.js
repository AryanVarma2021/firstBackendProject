import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import {loginUser, logoutUser, registerUser} from "../controllers/user.controller.js"
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

router.route("/logout").post(verifyjwt,logoutUser)






export default router;