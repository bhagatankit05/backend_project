import { Schema } from "mongoose";
import mongoose from "mongoose";


const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId,
    ref: "User"},
channel:{
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  
}, {
  timestamps: {}
  })

  export const Subscription = mongoose.model(
  "Subscription", subscriptionSchema)
