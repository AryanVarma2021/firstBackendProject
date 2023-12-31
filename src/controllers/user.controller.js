import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {uploadonCloudinary} from "../utils/cloudnary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"




const generateAccessandRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        //console.log((user));
        const refreshToken = await user.generateRefreshToken();

        const accessToken = await user.generateAccessToken();
        //console.log((refreshToken, accessToken));

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false})
        return {accessToken, refreshToken};
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh token")
        
    }

}
const registerUser = asyncHandler(async (req,res) =>{
    // take data from user from request
    // validations - not empty
    // check if user already resgister : username and email
    // check for images which is required , upload it to cloudinary
    // check for avatar uploaded on cloudinary
    // create user object- create entry in db
    // remove password and refresh token from response
    // check for user creation , return response || handle error

    const {username, fullname, email, password } = req.body
    //console.log(req.body);
    

    if(
        [fullname, email, username, password].some((feild)=> feild?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }


    //check for user alreday exist
    const existedUser = await User.findOne({
        $or : [{ username }, { email }]
    })
    if(existedUser) {
        throw new ApiError(409, "User already exists")
    }

    //avatar 
    //console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }
    //uploading images to cloudinary.
    const avatar = await uploadonCloudinary(avatarLocalPath);
    const coverImage = await uploadonCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }


    //upload to db
    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
        
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registration")
    }

    console.log(createdUser);

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Resgistered successfully")
    )





   
})


const loginUser = asyncHandler(async(req,res)=>{
    // req body -> data
    // username or email 
    // find the user 
    // password check 
    // access and refresh token 
    // send cookie 


    const {username, password, email} = req.body
    //console.log(req.body);
    // if(!username && !email){
    //     throw new ApiError(400, "Username or Email is required");
    // }
    if(!username) {
        throw new ApiError(400, "Username  is required");
    }
    if(!email) {
        throw new ApiError(400), "Email is required";
    }
    if(!password) {
        throw new ApiError(400 , "Password is required");
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })

   
    if(!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    //console.log(isPasswordValid);
    if(!isPasswordValid) {
        throw new ApiError(401, "Incorrect password")
    }

    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id)
    //console.log(accessToken, refreshToken);


    const loggedInUser = await User.findById(user._id).select( "-password -refreshToken");
    
    const options = {
        httpOnly : true,
        secure : true
    }

    //console.log(loggedInUser);
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, 
                { 
                    user : loggedInUser, accessToken, refreshToken
                },"User Logged in Successfully"
            )
        )


})

const logoutUser = asyncHandler(async(req,res)=>{
    const userId = req.user._id;
    const user = await User.findByIdAndUpdate(
        userId, 
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
        
        )


        const options = {
            httpOnly : true,
            secure : true
        }

        return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(
            new ApiResponse(200, {}, "User Logged out")
        )

    
})


const refreshAccessTokan = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if(!user) {
            throw new ApiError(401, "invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used");
        }
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken, newrefreshToken} = await  generateAccessandRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken,options)
        .json(
            new ApiResponse(200, {accessToken, refreshToken : newrefreshToken}, "Access Token refresh Successfully ")
        )
    } catch (error) {
        return new ApiError(401, error?.message || "Invalid access token");
        
    }



    

})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body;

    const userid = req.user?._id;
    const user = await User.findById(userid)

    const passwordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!passwordCorrect) {
        return new ApiError(400, "Invalid password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password updated successfully")
    )
});

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
        .status(200)
        .json(200, req.user, "Current User Fetched") 
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname, email} = req.body;
    if(!fullname || !email) {

        return new ApiError(400, "All feilds are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullname ,
                email
            }
        },
        {
            new : true
        }
        
        ).select("-password")


        return res
        .status(200)
        .json(
            new ApiResponse(200,user, "Account details updated successfully" )
        )
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        return new ApiError(400, "Avatar not found")
    }
    const avatar = await uploadonCloudinary(avatarLocalPath)

    if(!avatar.url) {
        return new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {
            new : true,
        }
    ).select("-password")

    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar successfully updated")
    )



})
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        return new ApiError(400, "cover Image not found")
    }
    const coverImage = await uploadonCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        return new ApiError(400, "Error while uploading cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {
            new : true,
        }
    ).select("-password")

    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "cover Image successfully updated")
    )



})

const getUserChannelProfile = asyncHandler(async(req,res) =>{
    const{username} = req.params
    if(!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullname : 1,
                username : 1,
                subscribersCount : 1,
                channelSubscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1
            }
        }
    ])

    console.log(channel);

    if(!channel?.length) {
        return new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )

})

const getUserWatchHistory = asyncHandler(async(req, res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },

        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",

                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",

                            pipeline : [
                                {
                                    $project : {
                                        fullname : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                    
                ]
            }

        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetch successfully" )
    )

})






export {registerUser, loginUser,getUserWatchHistory,  logoutUser, refreshAccessTokan, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, } 