import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {uploadonCloudinary} from "../utils/cloudnary.js"


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

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Resgistered successfully")
    )





   
})

export {registerUser} 