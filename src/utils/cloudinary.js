import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

// configuring cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

// uploading the data in cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })

        fs.unlinkSync(localFilePath)

        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log("file uplaod on cloudinary fail", error)
        return null
    }
}

export {uploadOnCloudinary}