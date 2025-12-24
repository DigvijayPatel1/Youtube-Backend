import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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

// update the tokens
const refreshAccessToken = asyncHandler( async (req, res) => {
    // get the refresh token from the cookie
    const incomingRefreshToken = req.cookie?.refreshToken || req.body?.refreshAccessToken

    if (!incomingRefreshToken){
        throw new ApiError("Invalid refresh token", 401)
    }

    try {
        // check the new refresh token 
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        if (!decodedToken){
            throw new ApiError("Invalid refresh token", 401)
        }
    
        // get the user from db
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError("User found using refresh Token")
        }

        if (incomingRefreshToken !== user.refreshToken){
            throw new ApiError("Refresh token expired or invalid", 401)
        }
    
        // generate the new access or refresh token
        const {accessToken, refreshToken} = await generateTokens(user._id)
    
        options = {
            httpOnly: true,
            secure: true
        }
    
        return res.status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, {
                newAccessToken: accessToken,
                refreshToken
            }, "Token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(error?.message || "Invalid or expired refresh token", 401)
    }

})

// changing the current password
const changeCurrentPassword = asyncHandler( async (req, res) => {
    // getting the data
    const {oldPassword, newPassword} = req.body

    if (!oldPassword || !newPassword){ // check if data is sent or not
        throw new ApiError("all feild is required", 400)
    }

    const user = await User.findById(req.user._id) // get the user from db

    if (!user){
        throw new ApiError("Invalid password change request", 401)
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword) // check if the sent password is correct or not

    if (!isPasswordValid){
        throw new ApiError("Invalid oldPassword", 401)
    }

    user.password = newPassword // change the password 
    await user.save({ validateBeforeSave: false }) // save the changes

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "password changed successfully")
    )

})

// getting the current user
const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "user get successfully"
        )
    )
})

// updating the account details
const updateAccountDetails = asyncHandler( async (req, res) => {
    // get the user details
    const {fullname, email} = req.body

    if (!fullname || !email){
        throw new ApiError("Full name and email are required", 400)
    }

    const user = await User.findByIdAndUpdate(req?.user._id, // upadate the user with the current feilds
        {
            $set: {
                email,
                fullname
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    if (!user){
        throw new ApiError("User not found", 404)
    }

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )

})

// updating the avatar file
const updateAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path // get the cover image file

    if (!avatarLocalPath){
        throw new ApiError("Avatar file is missing", 400)
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) // uplaod on the cloudinary

    if (!avatar){
        throw new ApiError("unable to uplaod avatar on cloudinary", 500)
    }

    const user = await User.findByIdAndUpdate(req.user._id, // update the user avatar
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    )

    if (!user){
        throw new ApiError("user not found", 404)
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar changed successfully"
        )
    )

})

// update the cover image file 
const updateCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath){
        throw new ApiError("Cover image file is missing", 400)
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url){
        throw new ApiError("unable to uplaod cover image on cloudinary", 500)
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    )

    if (!user){
        throw new ApiError("user not found", 404)
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "cover image changed successfully"
        )
    )

})

// get channel details
const getChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params

    if (!username?.trim()){
        throw new ApiError("Username not found", 400)
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                email: 1,
                avatar: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1
            }
        }
    ])

    if (!channel?.length){
        throw new ApiError("channel does not exist", 400)
    }

    res.status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "owner",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: true
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "history get successfully"))
})


export {
    registerUser,
    logoutUser,
    LoginUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getChannelProfile,
    getWatchHistory
}