import express from "express";
import { authuser } from "../middlewear/auth.js";
import { validateProfileEdit, validateUpdatePass } from "../utils/validator.js";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";

export const profileRouter = express.Router();

//--------------------getting profile data---------------------------
profileRouter.get("/profile/view", authuser, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (error) {
    res.send("Error :" + error.message);
  }
});
//-------------------------Edit profile ----------------------
profileRouter.patch("/profile/edit", authuser, async (req, res) => {
  try {
    if (!validateProfileEdit(req)) {
      return res.status(304).send("Edit not Allowed with these feilds");
    }
    const LoggedinUser = req.user;
    Object.keys(req.body).forEach(
      (keys) => (LoggedinUser[keys] = req.body[keys])
    );

    await LoggedinUser.save();
    res.json({
      message: "profile edit Successfully",
      data: LoggedinUser,
    });
  } catch (error) {
    res.status(401).send("Error : " + error.message);
  }
});
//-----------------------------update password------------------
profileRouter.patch("/profile/password", authuser, async (req, res) => {
  try {
    validateUpdatePass(req);
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check current password
    const ok = await user.validateUserPass(currentPassword);
    if (!ok) {
      throw new Error("Current password is incorrect");
    }

    // Prevent reusing the same password
    const same = await user.validateUserPass(newPassword);
    if (same) {
      throw new Error("New password must be different");
    }

    // Hash & save
    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});
