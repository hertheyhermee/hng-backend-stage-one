import mongoose from "mongoose";
import { v7 as uuidv7 } from "uuid";

const profileSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv7(), // UUID v7
    },

    name: {
      type: String,
      required: true,
      unique: true, // ensures idempotency
      trim: true,
      lowercase: true, // normalize input
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female"], // Genderize returns these
    },

    gender_probability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    sample_size: {
      type: Number,
      required: true,
      min: 0,
    },

    age: {
      type: Number,
      required: true,
      min: 0,
    },

    age_group: {
      type: String,
      required: true,
      enum: ["child", "teenager", "adult", "senior"],
    },

    country_id: {
      type: String,
      required: true,
    },

    country_probability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    created_at: {
      type: Date,
      required: true,
      default: () => new Date(), // UTC ISO handled automatically
    },
  },
  {
    versionKey: false, // removes __v
  }
);

profileSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret._id;
    return ret;
  },
});

const Profile = mongoose.model("Profile", profileSchema);
export default Profile;