import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getUserWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessTokan,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { verifyjwt } from "../middlewares/auth.middeware.js";

const router = Router();

router.route("/register").post(
  //middleware for storing avatar and coverimage
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyjwt, logoutUser);
router.route("/refresh-token").post(refreshAccessTokan);
router.route("/change-password").post(verifyjwt, changeCurrentPassword);
router.route("/update-account").patch(verifyjwt, updateAccountDetails);
router.route("/current-user").get(verifyjwt, getCurrentUser);
router
  .route("/update-avatar")
  .patch(verifyjwt, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-coverImage")
  .patch(verifyjwt, upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:username").get(verifyjwt, getUserChannelProfile);
router.route("/history").get(verifyjwt, getUserWatchHistory);



export default router;
