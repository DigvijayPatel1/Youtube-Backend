import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({   // use to solve prblem of cross origin
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(cookieParser()) // parse the raw string
app.use(express.json({limit: "16kb"})) // limit the data that is sent in the form of json
app.use(express.urlencoded({extended: true, limit: "16kb"})) // encode the data sent through url

// import router
import userRouter from "./routes/user.route.js";

// route declaration 
app.use("/api/v1/users", userRouter)


export { app }