import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

// generating the tokens
const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        if (!user) throw new ApiError("user not found", 404)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        if (!accessToken || !refreshToken){
            throw new ApiError("generation of tokens failed", 500)
        }

        // updating and saving the refresh token
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
    } catch (error) {
        throw error
    }

}

// registering the user 
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

// log in the user
const LoginUser = asyncHandler(async (req, res) => {
    // getting the data from user
    const {username, password, email} = req.body

    if (!email && !password){ // checking is data sent
        throw new ApiError("Username or email is required", 400)
    }

    const user = await User.findOne({ // find user from db
        $or: [{email}, {username}]
    })

    if (!user){
        throw new ApiError("Invalid username or email", 401)
    }

    const isPasswordValid = await user.isPasswordCorrect(password) // checking the password is valid or not

    if (!isPasswordValid){
        throw new ApiError("Invalid password", 401)
    }

    const {accessToken, refreshToken} = await generateTokens(user._id) // generating the tokens

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") // getting the updated data from the db

    const options = {
        httpOnly: true,
        secure: true
    }

    // sending the success status with cookies
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, loggedInUser, "user logged in successfully")
        )
})

// logout the user
const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User loggedOut successfully")
        )
})



export {
    registerUser,
    logoutUser,
    LoginUser
}