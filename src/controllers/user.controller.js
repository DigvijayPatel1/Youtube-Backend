import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const {username, password, email, fullname} = req.body // getting the user details

    if (
        [username, password, email, fullname].some((field) => !field || field.toString().trim() === "") // validating the user
    ){
        throw new ApiError("All fields are required", 400)
    }

    const existedUser = await User.findOne({ // check is there any user already exist
        $or : [{email}, {username}]
    })

    if (existedUser){
        throw new ApiError("user already exist", 409)
    }

    // get the local path
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath){
        throw new ApiError("Avatar file is required", 400)
    }

    // upload on cloudinary
    const avatarPath = await uploadOnCloudinary(avatarLocalPath) 

    const coverImageLocalPath =
        req.files?.coverImage && req.files.coverImage.length > 0
            ? req.files.coverImage[0].path
            : null
    
    if (coverImageLocalPath){
        uploadOnCloudinary(coverImageLocalPath)
    }

    if (!avatarPath || !avatarPath.url){
        throw new ApiError("Failed to upload avatar", 500)
    }

    // create the user 
    const user = await User.create({
        username: username.toLowerCase(),
        avatar: avatarPath.url,
        email,
        password,
        fullname,
        coverImage: coverImageLocalPath?.url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken") // remove password and refreshToken

    if (!createdUser){
        throw new ApiError("something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered Successfully")
    )

})

export {registerUser}