import express from "express";
import mongoose from "mongoose";
import { Chat } from "../models/chat.js";
import { authuser } from "../middlewear/auth.js";

export const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId", authuser, async (req, res) => {
    const { targetUserId } = req.params;
    const userId = req.user._id;
    try {
        let chat = await Chat.findOne({
            participants: { $all: [userId, targetUserId] },
        }).populate({
            path: "messages.senderId",
            select: "firstName lastName",
        });

        if (!chat) {
            chat = new Chat({
                participants: [userId, targetUserId],
                messages: [],
            });
            await chat.save();
        }
        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: "Failed to load chat" });
    }
});


chatRouter.get("/chat/threads-summary", authuser, async (req, res) => {
    try {
        const meObj = new mongoose.Types.ObjectId(String(req.user._id));
        const meStr = String(meObj);

        const rows = await Chat.aggregate([
            {
                $addFields: {
                    participantsStr: {
                        $map: {
                            input: "$participants",
                            as: "p",
                            in: { $toString: "$$p" },
                        },
                    },
                },
            },
            { $match: { participantsStr: meStr } },

            { $unwind: "$messages" },

            {
                $addFields: {
                    senderIdStr: { $toString: "$messages.senderId" },
                },
            },

            {
                $addFields: {
                    other: {
                        $arrayElemAt: [
                            { $setDifference: ["$participantsStr", [meStr]] },
                            0,
                        ],
                    },
                },
            },

            { $sort: { "messages.createdAt": 1 } },

            {
                $group: {
                    _id: "$other",
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$messages.status", "seen"] },  
                                        { $ne: ["$senderIdStr", meStr] },       
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    lastMessageText: { $last: "$messages.text" },
                    lastMessageAt: { $last: "$messages.createdAt" },
                    lastMessageSenderId: { $last: "$senderIdStr" },
                },
            },
        ]);

        const threads = {};
        for (const r of rows) {
            threads[String(r._id)] = {
                unreadCount: r.unreadCount || 0,
                lastMessageText: r.lastMessageText || "",
                lastMessageAt: r.lastMessageAt || null,
                lastMessageSenderId: r.lastMessageSenderId || null,
            };
        }

        res.json({ threads });
    } catch (e) {
        console.error("threads-summary error:", e.message);
        res.status(500).json({ threads: {} });
    }
});
