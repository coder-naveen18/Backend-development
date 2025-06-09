const asyncHandler = (requestHandler)=>{
     (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next)).catch((Error)=> next(Error))
    }
    
}

export {asyncHandler}




// const asyncHandler = (fn)=> async (req, res, next)=>{
//     try {
//         await fu(req,res,next)
        
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }