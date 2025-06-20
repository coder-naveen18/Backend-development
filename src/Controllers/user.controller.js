import { asyncHandler } from "../utils/asyncHandler.js"
import {apiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiResponse.js"
import { response } from "express";
import jwt  from "jsonwebtoken"
import mongoose from "mongoose"


const genrateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new apiError(500, "Something went wrong while generating access and refresh token.");
        
    }
}

// Register user
const registerUser = asyncHandler(
    async (req, res)=>{

        
        // step-1  get user details from frontend

        const {fullname, email, username, password} = req.body

        // console.log("email: ", email)
        // console.log("password: ", password)
        // console.log(req.body)


        // step-2 validation - not empty

        // if(fullname === ""){
        //     throw new apiError(400, "FullName is required")
        // }

        if(
            [fullname, email, username, password].some((field)=>field?.trim()==="")
        ){
            throw new apiError(400, "All fields are required")
        }


        // step -3  check if user is already exits : username ,email

        const existedUser = await User.findOne({
            $or: [{username},{email}]
        })

        if(existedUser){
            throw new apiError(409, "User with email already exist ")
        }


        // step -4 check for images, check for avtar

        const avtarLocatPath = req.files?.avtar[0]?.path;

        const coverImageLocalPath = req.files?.coverImage[0]?.path;


        if(!avtarLocatPath){
            throw new apiError(400, "Avtar is required")
        }

        // step - 5 upload them to cloudinary, avtar

        const avtar = await uploadOnCloudinary(avtarLocatPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if(!avtar){
            throw new apiError(400, "Avtar is required")

        }

        // step -6 create user object -create entry in db

        const user = await User.create({
            fullname,
            avtar: avtar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()

        })


        // step -7  remover password and refresh token field from response



        // step -8 check for user creation

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if(!createdUser){
            throw new apiError(500, "something went wrong while registering the user")
        }


        // step -9 return response

        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered Successfully!!")
        )

    }
)

// loggedInUser
const loginUser = asyncHandler (async(req,res)=>{
    // req body --> get data
    const {email, username, password} = req.body
    
    // username or email
    if(!(username || email)){
        throw new apiError(400, "username or email required.")
    }

    // find the user
    const user  = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user) {
        throw new apiError(404, "User does not exist.")
    }
    // password check
    const isPasswordVaild = await user.isPasswordCorrect(password)
    if(!isPasswordVaild){
        throw new apiError(401, "password incorrect.")
    }

    // access and refresh token generation
    const {accessToken, refreshToken} = await genrateAccessAndRefreshToken(user._id)


    // send cookies 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const option = {
        httpOnly: true,
        secure: true
    }
    // return response
    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully."
        )
    )
})

// logout
const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
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

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200,{}, "User logged out successfully"))
})


// Creating endpoint for refresh and access token

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFERESH_TOKEN_SECRET
        )
    
        const user =  await User.findById(decodedToken?._id)
    
        if(!user){
            throw new apiError(401, "invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken ){
            throw new apiError(401, " refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, newRefreshToken} = await genrateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken",newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed successfully."
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || " Invalid refresh token")
    }
}) 


// password change 
const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body

    const user  = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid password")
    }



    // I have changed itt user to User
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200), {}, "Password change successfully")
})

// get current user 
const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user featched successfully."))
})

// Text based updates
const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname, email} = req.body

    if(!fullname || !email){
        throw new apiError(400, "All fields are required")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully."))


})

// files updates 

const updateUserAvtar = asyncHandler(async(req,res)=>{
    const avtarLocalPath = req.file?.path
    if(!avtarLocalPath){
        throw new apiError(400, "Avtar file is missing")
    }

    const avtar = await uploadOnCloudinary(avtarLocalPath)

    if(!avtar.url){
        throw new apiError(400, "Api error while uploading avtar file")
    }

    const user = await User.findByIdAndUpdate(req.use?._id,
        {
            $set: {
                avtar: avtar.url
            }
        },
        {new: true}
    ).select("-password")


    
    return res
    .status(200)
    .json(new ApiResponse(200, user, "avtar image updated successfully"))

})

// cover file updates
const updateUsercoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new apiError(400, "cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new apiError(400, "Api error while uploading avtar file")
    }

    const user = await User.findByIdAndUpdate(req.use?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")


    return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"))

})


// aggregation pipeline
const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new apiError(400, "Username is missing")
    }

    // await User.find({username})

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
                    as: "subscriber"
                }
            },
            {
                $lookup:{
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscribers",
                    as: "subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount:{
                        $size: "$subscribers"
                    },
                    channelsSubscribedToCount: {
                        $size : "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }

            },
            {
                $project: {
                    fullname: 1,
                    username:1,
                    subscribersCount:1,
                    channelsSubscribedToCount:1,
                    isSubscribed:1,
                    avtar:1,
                    coverImage:1,
                    email:1,

                }
            }
        
        
    ])

    if(!channel?.length){
        throw new apiError(404,"channel does not exists.")
    }
    console.log(channel)
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel feached successfully.")
    )


})


// 
const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField: "_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname: 1,
                                        username:1,
                                        avtar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])


    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully."))
})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvtar,
    updateUsercoverImage,
    getUserChannelProfile,
    getWatchHistory
}