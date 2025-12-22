import mongoose, {Schema} from "mongoose";

const videoSchema = Schema({
    videoFile: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    }
}, {timestamps: true})

videoSchema.pulgin(mongooseAggregatePaginate)

export const Video = Schema.model("Video", videoSchema)