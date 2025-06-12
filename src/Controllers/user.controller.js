import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiResponse.js"

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

export {registerUser}