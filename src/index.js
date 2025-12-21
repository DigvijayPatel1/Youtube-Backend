import connectDB from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js";

dotenv.config({
    path: ("./env")
})

const port = process.env.PORT || 8000

connectDB()
.then(() => {
    app.listen(port,() => {
        console.log(`App is listening at port: ${port}`)
    })
})
.catch((error) => {
    console.log(`Server is not able to connect with DB`, error)
})