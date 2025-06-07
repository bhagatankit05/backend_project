import {asyncHandler} from 'utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
  const {fullName,email,userName,password} = req.body; // Destructure any necessary fields from the request body
  if(fullName === "" )
    throw new ApiError(400, "Full name is required");
  if(email === "" )
    throw new ApiError(400, "Email is required");
  if(userName === "" )
    throw new ApiError(400, "Username is required");
  if(password === "" )
    throw new ApiError(400, "Password is required");

  const existedUser = User.findOne(
    {
      $or: [
        { email},
        { userName }
      ]
    }
  )
  if (existedUser) {
    throw new ApiError(400, "User with this email or username already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverimage[0]?.path;

  if(!avatarLocalPath)
    throw new ApiError(400, "Avatar is required");

  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if(!avatar) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  
  const user = await User.create({   // create entry in database
    fullName,
    avatar: avatar.url,
    coverImage: coverImage ? coverImage.url : null,
    email,
    password,
    userName:userName.toLowerCase()
  })
  const createdUser = await User.findById(user._id).select("-password -refreshToken ");
  if(!createdUser) {
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


export {registerUser};