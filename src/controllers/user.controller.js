import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const {username, password, email, fullname} = req.body // getting the user details

    if (
        [username, password, email, fullname].some((feild) => feild?.trim() === "") // validating the user
    ){
        throw new ApiError("All feilds are required", 404)
    }

    const existedUser = await User.findOne({ // check is there any user already exist
        $or : [{email}, {username}]
    })

    if (existedUser){
        throw new ApiError("user already exist", 409)
    }

    // get the local path
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarPath){
        throw new ApiError("Avatar file is required", 400)
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath) 

    let coverImage
    if (coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    }

    // create the user 
    const user = await User.create({
        username: username.toLowerCase(),
        avatar: avatar.url,
        email,
        password,
        fullname,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await user.findById(user._id).select("-password -refreshToken") // remove password and refreshToken

    if (!createdUser){
        throw new ApiError("something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

export {registerUser}