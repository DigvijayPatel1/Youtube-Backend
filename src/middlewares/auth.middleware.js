import { ApiError } from "../utils/apiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

const verifyJWT = async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header["Authorization"].replace("Bearer ", "") // get the accessToken from server

        if (!token) throw new ApiError("Unauthorized request", 401) 
        
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) // get the user data if token is valid

        if (!decodedToken) throw new ApiError("invalid Token", 401)
        
        const user = await User.findById(decodedToken._id).select("-password -refreshToken") // find the user from db and remove the password and refreshToken

        if (!user){
            throw new ApiError("Invalid Access Token", 401)
        }

        req.user = user

        next()
        
    } catch (error) {
        throw new ApiError(error?.message || "Invalid access token", 401)
    }
}

export { verifyJWT }