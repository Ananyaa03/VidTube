import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Apiresponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { mongo } from "mongoose";



const generateAccessAndRefreshToken = async (userId) => {
   try {
     const user = await User.findById(userId)
 
     //small check for user existence 
        if(!user){  
            throw new ApiError(404, "User not found")
        }

        //generate access and refresh token
     const accessToken = user.generateAccessToken();
     const refreshToken = user.generateRefreshToken();
     console.log("Generated Refresh Token:", refreshToken);
     console.log("Generated Access Token:", accessToken);

 
     user.refreshToken = refreshToken
     await user.save({validateBeforeSave: false})
     return {accessToken, refreshToken}
 
   } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
   }

}

const registerUser = asyncHandler( async (req, res) =>{
    const{fullname, email, username, password } = req.body

    //validation
    if([fullname, username, email, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverLocalPath = req.files?.coverImage[0]?.path  


    if(!avatarLocalPath){
        throw new ApiError(409, "Avatar file is missing")
    }

    //const avatar = await uploadOnCloudinary(avatarLocalPath)
    //let coverImage = ""
    //if(coverLocalPath){
    //    coverImage = await uploadOnCloudinary(coverImage)
    //}

    let avatar;
    try{
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Updated avatar", avatar)
    }catch(error){
        console.log("Error uploading avatar", error)
        throw new ApiError(500, "Failed to upload avatar")
    }

    let coverImage;
    try{
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("Updated cover Image", coverImage)
    }catch(error){
        console.log("Error uploading cover Image", error)
        throw new ApiError(500, "Failed to upload cover Image")
    }

    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select("-password -refreshToken")
    
        if(!createdUser){
            throw new ApiError(500,"Something went wrong while registering a user")
        }
    
        return res.status(201).json(new Apiresponse(200,createdUser,"User Registered successfully"))
    } catch (error) {
        console.log("User Creation failed")

        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }

        throw new ApiError(500, "Something went wrong while registering a user and images were deleted")
    }
    
})

const loginUser = asyncHandler( async (req, res) => { 
    //get data from body  
    const {email, username, password} = req.body
    //validation
    if([email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    //check if user exists
    const user = await User.findOne({ $or: [{ email }, { username }] });
    if(!user){
        throw new ApiError(400, "User not found")
    }

    //validate password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    if(!loggedInUser){
        throw new ApiError(500, "Something went wrong while logging in")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res.status(200).cookie("accessToekn", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new Apiresponse(200, {loggedInUser, accessToken, refreshToken}, "User logged in successfully"))
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, 
        {
            $set:{
                refreshToken: undefined
            }
        },
        {new: true}
    )

    const option = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new Apiresponse(200, null, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const newRefreshToken = jwt.sign(
        { _id: User._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
    console.log("Newly Generated Token:", newRefreshToken);


    
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    console.log("Incoming Refresh Token:", incomingRefreshToken);
    console.log("Expected Format: JWT");
    console.log("Token Parts:", incomingRefreshToken?.split('.').length); // JWT should have 3 parts

    console.log("ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET);
    console.log("REFRESH_TOKEN_SECRET:", process.env.REFRESH_TOKEN_SECRET);

   

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is missing")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        console.log("Decoded Token:", decodedToken);

        const user = await User.findById(decodedToken?._id);
        console.log("Stored Refresh Token in DB:", user?.refreshToken);
        console.log("Incoming Token Matches Stored Token?", incomingRefreshToken === user?.refreshToken);

        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }

        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401, "Invalid refresh token")
        }

        const options= {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        }
        
        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        console.log("New Tokens Generated:", accessToken, newRefreshToken)

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new Apiresponse(
            200, 
            {accessToken, refreshToken: newRefreshToken}, "Access token refreshed successfully"));

    } catch (error) {
        console.error("Error while refreshing token:", error);
        throw new ApiError(500, "Something went wrong while refreshing access token")
    }

    
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password = newPassword;

    await user.save({validateBeforeSave: false})
    return res.status(200).json(new Apiresponse(200, null, "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async (req, res) => {
    const {user} = req.body
    if(!user){
        throw new ApiError(400, "User is required")
    }
    const currentUser = await User.findById(user._id).select("-password -refreshToken")
    if(!currentUser){
        throw new ApiError(404, "User not found")
    }
    return res.status(200).json(new Apiresponse(200, currentUser, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    
    const { fullname, email } = req.body;

    if(!fullname || !email){
        throw new ApiError(400, "All fields are required")
    }

    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password -refreshToken")
    
    return res.status(200).json(new Apiresponse(200, updatedUser, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.files?.path

    if(!avatarLocalPath){
        throw new ApiError(409, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(500, "Something went wrong while uploading avatar")
    }
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    
    return res.status(200).json(new Apiresponse(200, updatedUser, "Avatar updated successfully"))
})

const updateCoverImage = asyncHandler( async (req, res) => {
    const coverLocalPath = req.files?.path

    if(!coverLocalPath){
        throw new ApiError(409, "Cover image file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverLocalPath)
    if(!coverImage.url){
        throw new ApiError(500, "Something went wrong while uploading cover image")
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    
    return res.status(200).json(new Apiresponse(200, updatedUser, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is required")
    }
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
                as: "subscribers"
            }
        },
        {
            $project: {
                password: 0,
                refreshToken: 0,
                __v: 0
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriberedTo"
            }
        },
        
        {
            $addFields:{
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscriberedToCount: {
                    $size: "$subscriberedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullname: 1,
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                channelsSubscriberedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])
})

const getWatchHistory = asyncHandler( async (req, res) => {
    console.log("User ID for watch history:", req.user?._id);
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                              }
                            ]
                        },
                        
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

    return res.status(200).json(new Apiresponse(200, user[0]?.watchHistory, "Watch history fetched successfully"))
})




export { registerUser, loginUser, refreshAccessToken, logoutUser, changeCurrentPassword, updateAccountDetails, updateUserAvatar, updateCoverImage , getUserChannelProfile, getWatchHistory , getCurrentUser}
//export default {registerUser, loginUser, refreshAccessToken, logoutUser, changeCurrentPassword, updateAccountDetails, updateUserAvatar, updateCoverImage , getUserChannelProfile}