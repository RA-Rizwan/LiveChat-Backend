import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const MessageSchema = new Schema(
    {
        senderId: { type: Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        status: { type: String, enum: ["sent", "delivered", "seen"], default: "sent" },
        createdAt: { type: Date, default: Date.now },
        seenAt: Date,
    },
    { _id: true }
);

const ChatSchema = new Schema(
    {
        participants: [{ type: Types.ObjectId, ref: "User", required: true }],

        messages: [MessageSchema],

        lastMessageText: String,
        lastMessageAt: Date,
        lastMessageSenderId: { type: Types.ObjectId, ref: "User" },

        unreadCounts: { type: Map, of: Number, default: {} }, 
        lastReadAt: { type: Map, of: Date, default: {} },     
    },
    { timestamps: true }
);

export const Chat = mongoose.model("Chat", ChatSchema);
