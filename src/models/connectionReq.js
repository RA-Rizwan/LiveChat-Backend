import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema(
  {
        fromUserId: {
        
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", //ref to User collection 
      required: true,
    },
    toUserId: {
      ref: "User", //ref to User collection 
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
          values: ["ignored", "interested", "accepted", "rejected"],
        message: `{VALUE} is not valid status`,
      },
    },
  },
  { timestamps: true }
);

//index to make searching fast in db
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

//pre check these validation before save
connectionRequestSchema.pre("save", function (next) {
  const connectionReq = this;
  if (connectionReq.fromUserId.equals(connectionReq.toUserId)) {
    throw new Error("Cannot sent connection req to yourself");
  }
  next();
});

export const ConnectionReq = mongoose.model(
  "ConnectionReqModel",
  connectionRequestSchema
);
