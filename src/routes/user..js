import express from "express";
import { authuser } from "../middlewear/auth.js";
import { ConnectionReq } from "../models/connectionReq.js";
import { User } from "../models/user.js";

export const userRouter = express.Router();

const USER_SAFE_DATA = [
  "firstName",
  "lastName",
  "age",
  "gender",
  "photoUrl",
  "about",
  "skills",
];

//------------------------Getting Pending req---------------------------
userRouter.get("/user/requests/received", authuser, async (req, res) => {
  try {
    const LoggedinUser = req.user;

    const connectionRequests = await ConnectionReq.find({
      toUserId: LoggedinUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_DATA); // getting data from user by the ref

    res.send(connectionRequests);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

//-----------------------Getting conections ----------------------------
userRouter.get("/user/connections", authuser, async (req, res) => {
  try {
    const LoggedinUser = req.user;

    const connectionRequests = await ConnectionReq.find({
      $or: [
        {
          toUserId: LoggedinUser._id,
          status: "accepted",
        },
        {
          fromUserId: LoggedinUser._id,
          status: "accepted",
        },
      ],
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA); // getting data from user by the ref

    const data = connectionRequests.map((row) => {
      if (row.fromUserId._id.equals(LoggedinUser._id)) {
        return row.toUserId;
      }
      return row.fromUserId;
    });
    res.send(data);
  } catch (error) {
    res.status(400).send(error.message);
  }
});
//-------------------------Feed page(others profile)--------------------
userRouter.get("/feed", authuser, async (req, res) => {
  try {
    //pagination.....
    const page = parseInt(req.params.page) || 1;
    let limit = parseInt(req.params.limit) || 10;
    limit > 50 ? (limit = 50) : limit;
    const skip = (page - 1) * limit;
    const LoggedinUser = req.user;

    const connectionRequests = await ConnectionReq.find({
      $or: [{ fromUserId: LoggedinUser._id }, { toUserId: LoggedinUser._id }],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set();
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });
    const users = await User.find({
      $and: [
        {
          _id: { $nin: Array.from(hideUsersFromFeed) },
        },
        {
          _id: { $ne: LoggedinUser._id },
        },
      ],
    })
      .select(USER_SAFE_DATA)
      .skip(skip)
      .limit(limit);

    res.send(users);
  } catch (error) {
    res.status(400).send(error.message);
  }
});
