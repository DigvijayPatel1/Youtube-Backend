import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongoose from "mongoose"
import { Video } from "../models/video.model.js"

const getAllVideos = asyncHandler( async (req, res) => {
    const {page=1, limit=10, query, sortBy, sortType, userId } = req.query

    const pageNumber = Math.max(parseInt(page), 1)
    const pageLimit = Math.max(parseInt(limit), 1)
    const skip = (pageNumber - 1) * pageLimit

    const matchStage = {}

    // search by title or description
    if (query){
        matchStage.$or = [
            {
                title:{
                    $regex: query, 
                    $option: "i"
                },
                description: {
                    $regex: query,
                    $option: "i"
                }
            }
        ]
    }

    // sort by object id
    if (userId){
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const sortStage = {
        [sortBy]: sortType === "asc" ? 1 : -1 // if sortBy = "user" then it will become user = 1 or -1
    }

    const video = await Video.aggregate([
        {
            $match: matchStage
        },
        {
            $sort: sortBy
        },
        {
            $facet: {
                metadata: [{ $count: "totalVideos" }],
                data: [
                    { $skip: skip },
                    { $limit: limitNumber },

                    // populate owner
                    {
                        $lookup: {
                            from: "users",
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
                        $unwind: "$owner"
                    }
                ]
            }
        }
    ])

    const totalVideos = video[0]?.metadata[0]?.totalVideos || 0
    const totalPages = Math.ceil(totalVideos / pageLimit)

    res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                video: video[0].data,
                pagination: {
                    totalVideos,
                    totalPages,
                    currentPage: pageNumber,
                    limit: limitNumber
                }
            },
            "video fetched successfully"
        )
    )
})

export {
    getAllVideos,
    
}