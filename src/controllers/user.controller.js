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
  if (!incomingRefreshToken) {
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
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh TOken is Expired or usedd")
    }

    const options = {
      httpOnly: true,
      secure: true
    }
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refrsh Token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    .then(async (isMatch) => {
      if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
      }
      user.password = newPassword;
      await user.save({ validateBeforeSave: false }); // Save the user document without validating the password again
      return res.status(200).json(
        new ApiResponse(
          200,
          {},
          "Password changed successfully"
        )
      );
    })
    .catch((error) => {
      throw new ApiError(500, error.message || "Failed to change password");
    });
})
const getCurrentUser = asyncHandler(async (req, res) => {

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        req.user,
        "Current user fetched successfully"
      )

    );
})
const updateAccountDetails = asyncHandler(async (req, res) => {

  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const user = User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email
      }
    },
    {
      new: true,
    }
  ).select("-password ");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Account details updated successfully"
      )
    );
}
)

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  const avatar = await uploadCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Failed to upload avatar image");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url }
    },
    {
      new: true
    }
  ).select("-password ")

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Avatar updated successfully"
      )
    );
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }
  const coverimage = await uploadCloudinary(coverImageLocalPath);
  if (!coverimage.url) {
    throw new ApiError(400, "Failed to upload cover image");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverimage: coverimage.url }
    },

    {
      new: true
    }
  ).select("-password ")

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Cover image updated successfully"
      )
    );
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userName } = req.params;
  if (!userName?.trim()) {
    throw new ApiError(400, "Username is required");
  }
  const channel = User.aggregate([
    {
      $match: { userName: userName.toLowerCase() }
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookups: {
        from: "subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }

    },
     {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubcribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }

      }
    }, 
    {
      $project: {
        fullName: 1,
        userName: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        channelSubscribedToCount: 1,
        isSubcribed: 1,
        email: 1,
      }
    }


  ])
  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }
  return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      channel[0],
      "Channel profile fetched successfully"
    )
  );
})
export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile };