// require('dotenv').config({path: './env'})
import dotenv from "dotenv";
// import mongoose from "mongoose";
// import {DB_NAME} from "./constants"
import connectDB from "./DB/index.js";
import {app} from './app.js'


dotenv.config({
    path: './env'
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at port : ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log("MongoDB connection Failed !!!", error);
    
})


// Way one to connect the Database within the index file

/*
import express from "express"
const app = express()

;( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("Error:", error);
            throw error
            
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
            

        })
    } catch (error) {
        console.error("Error :", error)
        throw error
    }
})()

*/