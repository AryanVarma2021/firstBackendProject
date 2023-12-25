import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {uploadonCloudinary} from "../utils/cloudnary.js"
import jwt from "jsonwebtoken"




const generateAccessandRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        console.log((user));
        const refreshToken = await user.generateRefreshToken();

        const accessToken = await user.generateAccessToken();
        console.log((refreshToken, accessToken));

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
    console.log(req.body);
    // if(!username && !email){
    //     throw new ApiError(400, "Username or Email is required");
    // }
    if(!username) {
        throw new ApiError(400, "Username or Email is required");
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
    console.log(isPasswordValid);
    if(!isPasswordValid) {
        throw new ApiError(401, "Incorrect password")
    }

    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id)
    console.log(accessToken, refreshToken);


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

export {registerUser, loginUser, logoutUser, refreshAccessTokan} 