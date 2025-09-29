import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { requestRouter } from "./routes/request.js";
import { connectdb } from "./config/database.js";
import { userRouter } from "./routes/user..js";
import cors from "cors"


import { Server } from "socket.io";
import http from "http"

import { Chat } from "./models/chat.js";
import { chatRouter } from "./routes/chat.js";

const app = express();
app.use(express.json());
app.use(cookieParser())
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use("/", authRouter)
app.use("/", profileRouter)
app.use("/", requestRouter)
app.use("/", userRouter)
app.use("/", chatRouter)


const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});






import { User } from "./models/user.js";

const socketsByUser = new Map(); 
const roomFor = (a, b) => [String(a), String(b)].sort().join("_");

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("register", async ({ userId }) => {
    userId = String(userId);
    socket.data.userId = userId;

    if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
    socketsByUser.get(userId).add(socket.id);

    socket.join(`user:${userId}`);

    
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true }, { new: false });
    } catch { }

    io.to(`presence:${userId}`).emit("presence", {
      userId,
      isOnline: true,
      lastSeen: null,
    });

    try {
      const chats = await Chat.find({
        participants: { $all: [userId] },
        "messages.status": "sent",
        "messages.senderId": { $ne: userId },
      }).select("messages participants");

      const deliverMap = new Map(); 

      for (const chat of chats) {
        let changed = false;
        for (const m of chat.messages) {
          if (String(m.senderId) !== userId && m.status === "sent") {
            m.status = "delivered";
            changed = true;
            const sid = String(m.senderId);
            if (!deliverMap.has(sid)) deliverMap.set(sid, []);
            deliverMap.get(sid).push(String(m._id));
          }
        }
        if (changed) await chat.save();
      }

      for (const [senderId, ids] of deliverMap.entries()) {
        io.to(`user:${senderId}`).emit("messagesDelivered", {
          messageIds: ids,
          toUserId: userId,
        });
        io.to(roomFor(senderId, userId)).emit("messagesDelivered", {
          messageIds: ids,
          toUserId: userId,
        });
      }
    } catch (e) {
      console.log("deliver-upgrade error:", e.message);
    }
  });

  socket.on("watchPresence", async ({ userIds }) => {
    if (!Array.isArray(userIds)) return;

    if (socket.data.presenceRooms) {
      socket.data.presenceRooms.forEach((r) => socket.leave(r));
    }

    const rooms = userIds.map((id) => `presence:${String(id)}`);
    rooms.forEach((r) => socket.join(r));
    socket.data.presenceRooms = rooms;

    try {
      const rows = await User.find({ _id: { $in: userIds } }).select(
        "_id isOnline lastSeen"
      );
      socket.emit(
        "presenceSnapshot",
        rows.map((u) => ({
          userId: String(u._id),
          isOnline: !!u.isOnline,
          lastSeen: u.lastSeen || null,
        }))
      );
    } catch {
      socket.emit("presenceSnapshot", []);
    }
  });

  socket.on("joinChat", ({ userId, targetUserId }) => {
    socket.join(roomFor(userId, targetUserId));
  });
  socket.on("leaveChat", ({ userId, targetUserId }) => {
    socket.leave(roomFor(userId, targetUserId));
  });

  
  socket.on(
    "sendMessage",
    async ({ tempId, firstName, lastName, userId, targetUserId, text }) => {
      userId = String(userId);
      targetUserId = String(targetUserId);

      const chatRoom = roomFor(userId, targetUserId);
      const userRoom = `user:${targetUserId}`;
      const recipientHasRoom = !!io.sockets.adapter.rooms.get(`user:${targetUserId}`)?.size;

      let chat = await Chat.findOne({ participants: { $all: [userId, targetUserId] } });
      if (!chat) chat = new Chat({ participants: [userId, targetUserId], messages: [] });

      const msgDoc = {
        senderId: userId,
        text,
        status: recipientHasRoom ? "delivered" : "sent",
        createdAt: new Date(),
      };
      chat.messages.push(msgDoc);
      await chat.save();

      const saved = chat.messages[chat.messages.length - 1];

      const payload = {
        _id: String(saved._id),
        tempId,
        userId,
        targetUserId,
        firstName,
        lastName,
        text,
        createdAt: saved.createdAt.toISOString(),
        status: saved.status,
      };

      io.to(userRoom).except(chatRoom).emit("messageReceived", payload);

      io.to(chatRoom).emit("messageReceived", payload);
      

      socket.emit("messageAck", payload);
    }
  );


  socket.on("markSeen", async ({ userId, targetUserId }) => {
    userId = String(userId);           
    targetUserId = String(targetUserId); 

    const chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    });
    if (!chat) return;

    const now = new Date();
    const changedIds = [];

    for (const m of chat.messages) {
      if (String(m.senderId) === targetUserId && m.status !== "seen") {
        m.status = "seen";
        m.seenAt = now;
        changedIds.push(String(m._id));
      }
    }

    const setUnread = chat.unreadCounts?.set?.bind(chat.unreadCounts);
    if (setUnread) setUnread(userId, 0);
    else chat.unreadCounts[userId] = 0;

    const setReadAt = chat.lastReadAt?.set?.bind(chat.lastReadAt);
    if (setReadAt) setReadAt(userId, now);
    else {
      chat.lastReadAt = chat.lastReadAt || {};
      chat.lastReadAt[userId] = now;
    }

    await chat.save();

    if (changedIds.length) {
      io.to(`user:${targetUserId}`).emit("messagesSeen", {
        messageIds: changedIds,
        byUserId: userId,
        at: now.toISOString(),
      });
    }

    io.to(`user:${userId}`).emit("unreadReset", { withUserId: targetUserId });
    io.to(`user:${targetUserId}`).emit("unreadReset", { withUserId: userId });
  });

  socket.on("disconnect", async () => {
    const userId = socket.data.userId;
    if (userId) {
      const set = socketsByUser.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          socketsByUser.delete(userId);
          const lastSeen = new Date();
          try {
            await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
          } catch { }
          io.to(`presence:${userId}`).emit("presence", {
            userId,
            isOnline: false,
            lastSeen: lastSeen.toISOString(),
          });
        }
      }
    }
    console.log("socket disconnected:", socket.id);
  });
});


connectdb()
  .then(() => {
    console.log("✅db connected succesfully");
    server.listen(7777, () => console.log("Server is running on port 7777"));
  })
  .catch((err) => {
    console.log("⭕db connection failed");
  });
