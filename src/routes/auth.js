import express from "express"
import { signupValidate, loginValidate } from "../utils/validator.js";
import bcrypt from "bcrypt";
import { User } from "../models/user.js";
import { authuser } from "../middlewear/auth.js";


export const authRouter = express.Router();

//------------------------Registering User---------------------------------
authRouter.post("/signup", async (req, res) => {
  const { firstName, lastName, emailId, password } = req.body;
  try {
    //validating api req
    signupValidate(req);
    //pass hashing
    const passwordHash = await bcrypt.hash(password, 10);
    //creating new instance
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });
    // saving to db
    await user.save();
    const token = await user.getJWT()
    //Add token to cookies and response back to user
    res.cookie("Token", token, { expires: new Date(Date.now() + 8 * 3600000) })
    res.status(201).json({user});
  } catch (error) {
    res.status(401).send(error.message);
  }
});
//--------------------------Login user---------------------------------
authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    loginValidate(req);
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("invalid credentials");
    }
    const validPassword = await user.validateUserPass(password)
    if (!validPassword) {
      throw new Error("invalid credentials");
    }
    if (validPassword) {

      ///Create JWT token
      const token = await user.getJWT()
      //Add token to cookies and response back to user
      res.cookie("Token", token, { expires: new Date(Date.now() + 8 * 3600000) })
      res.json(user);
    }
  } catch (error) {
    res.status(401).send(error.message);
  }

});
//-----------------------------logout user-----------------------
authRouter.post("/logout",authuser, (req, res) => {
    res.cookie("Token", null, { expires: new Date(Date.now()) })
    res.send("User Logged Out")
})




