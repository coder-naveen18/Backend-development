import { asyncHandler } from "../utils/asyncHandler.js"
import {apiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiResponse.js"
import { response } from "express";


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
    if(!username || !email){
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

export {
    registerUser,
    loginUser,
    logoutUser
}