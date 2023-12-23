import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import {registerUser} from "../controllers/user.controller.js"

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




export default router;