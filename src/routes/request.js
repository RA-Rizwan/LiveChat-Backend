import express from "express";
import { authuser } from "../middlewear/auth.js";
export const requestRouter = express.Router();
import { ConnectionReq } from "../models/connectionReq.js";
import { User } from "../models/user.js";

//---------------------Sending Req(ignore/intrested)---------------------------------
requestRouter.post(
  "/request/send/:status/:toUserId",
  authuser,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;
      const allowedStatus = ["interested", "ignored"];
      if (!allowedStatus.includes(status)) {
        throw new Error("invalid status");
      }
      // Checking is to user exsist in db
      const isToUserExist = await User.findById({ _id: toUserId })
      if (!isToUserExist) {
    throw new Error("user not exsist in db");
    
  }
      //checking existing connections
      const exsistingConnectionReq = await ConnectionReq.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });
      if (exsistingConnectionReq) {
        throw new Error("Connection Already exist");
      }

      //storing data to db
      const connectionReq = new ConnectionReq({
        fromUserId,
        toUserId,
        status,
      });
      const data = await connectionReq.save();
      res.json({
        message: "request sent to user",
        data: data,
      });
    } catch (error) {
      res.send("Error :" + error.message);
    }
  }
);

//---------------------responding request---------------------------------

requestRouter.post("/req/review/:status/:requestId", authuser, async (req, res) => {
  try {
    const LoggedinUser = req.user;
    const{status,requestId}= req.params
    const allowedStatus = ["accepted", "rejected"];
    if (!allowedStatus.includes(status)) {
      throw new Error("status not allowed"); }

    const connectionRequest = await ConnectionReq.findOne({
      _id:requestId,
      toUserId: LoggedinUser._id,
      status: "interested"
    })
    
    if (!connectionRequest) {
      throw new Error("Request not found");
    }
    connectionRequest.status = status;
    await connectionRequest.save();

    res.json({message:"request status is " + status})
  } catch (error) {
    res.status(400).send(error.message)
  }
})