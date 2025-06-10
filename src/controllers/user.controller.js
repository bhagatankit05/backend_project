import { asyncHandler } from 'utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken; // Save the refresh token to the user document
    await user.save({ validateBeforeSave: false }); // Save the user document without validating the password again
    return { accessToken, refreshToken };

  } catch (error) {
    throw new ApiError(501, "Failed to generate tokens");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body; // Destructure any necessary fields from the request body
  if (fullName === "")
    throw new ApiError(400, "Full name is required");
  if (email === "")
    throw new ApiError(400, "Email is required");
  if (userName === "")
    throw new ApiError(400, "Username is required");
  if (password === "")
    throw new ApiError(400, "Password is required");

  const existedUser = await User.findOne(
    {
      $or: [
        { email },
        { userName }
      ]
    }
  )
  if (existedUser) {
    throw new ApiError(400, "User with this email or username already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverimage[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
    coverImageLocalPath = req.files.coverImage[0].path;

  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar image");
  }


  const user = await User.create({   // create entry in database
    fullName,
    avatar: avatar.url,
    coverImage: coverImage ? coverImage.url : null,
    email,
    password,
    userName: userName.toLowerCase()
  })
  const createdUser = await User.findById(user._id).select("-password -refreshToken ");
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }
  return res.status(201).json( // Return a success response
    new ApiResponse({
      statusCode: 200,
      success: true,
      message: "User registered successfully",
      data: createdUser
    })
  );
});

const loginUser = asyncHandler(async (req, res) => {
  // Implement login logic here
  // Validate user credentials, generate tokens, etc.
  //req body -> data
  //username or email
  //find the user
  //password check
  //refresh and access  token
  //send cookies
  const { email, password, username } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User logged in successfully"
      )
    )


})
const logoutUser = await asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined }
    },
    {
      new: true
    }
  )
  const options = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "User logged out successfully"
      )
    )
})
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies
    .refreshToken || req.body.refreshToken
  if (incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
  
  
    )
    const user = await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh TOken is Expired or usedd")
    }
  
    const options = {
      httpOnly :true,
      secure:true
    }
   const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
   return res
   .status(200)
   .cookie("accessToken",accessToken)
   .cookie("refreshToken",newRefreshToken)
   .json(
      new ApiResponse(
        200,
        {accessToken,refreshToken:newRefreshToken},
        "Access Token Refreshed"
      )
   )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refrsh Token")
  }
})
export { registerUser, loginUser, logoutUser,refreshAccessToken };