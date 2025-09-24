import mongoose from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 50,
      trim: true,
    },
    lastName: {
      type: String,
      minLength: 3,
      maxLength: 50,
      trim: true,
    },
    emailId: {
      type: String,
      required: true,
      lowercase: true,
      unique: [true, { message: "duplicate email" }],
      trim: true,
      // validate: [v =>
      //     /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v),
      //     "email is not valid"]
      validate: [
        (v) => {
          if (!validator.isEmail(v)) {
            throw new Error("invalid Email ID");
          }
        },
      ],
    },
    password: {
      type: String,
      required: true,
      // validate: {
      //     validator: function (v) {
      //         return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/.test(v);
      //     },
      //     message: `Password must be 8 characters and include lowercase, uppercase, digit, and special character.`,
      // },
      validate: [
        (v) => {
          if (!validator.isStrongPassword(v)) {
            throw new Error("Enter Strong Password");
          }
        },
      ],
      trim: true,
    },
    age: {
      type: String,
      min: 18,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
      validate: {
        validator: (value) =>
          value == null || ["male", "female", "other"].includes(value),
        message: "gender data is not valid",
      },
    },
    photoUrl: {
      type: String,
      default:
        "https://w7.pngwing.com/pngs/529/832/png-transparent-computer-icons-avatar-user-profile-avatar.png",
    },
    about: {
      type: String,
      default: "This is random about of user!!",
      minLength: 10,
    },
    skills: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 4,
        message: "you are adding more then 4 skills",
      },
    },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.getJWT = async function () {
  const user = this;
  const token = await jwt.sign({ id: user._id }, "1234", { expiresIn: "1d" });
  return token;
};

userSchema.methods.validateUserPass = async function (userPass) {
  const user = this;
  const passwordHash = user.password;
  const validPassword = await bcrypt.compare(userPass, passwordHash);
  return validPassword;
};
export const User = mongoose.model("User", userSchema);
