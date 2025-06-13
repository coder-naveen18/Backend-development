import { apiError } from "../utils/apierror";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model";




export const verifyJWT = asyncHandler(async(req,_,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) {
            throw new apiError(401, "unauthorized request")
        }
    
        const decodedTokenInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedTokenInfo?._id).select("-password -refreshToken")
    
        if(!user){
            // TODO: Discuss about frontend
    
            throw new apiError(401 ,"Invalid Access Token");
            
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new apiError(401, error?.message || " Invalid Access token");
        
    }
    
})