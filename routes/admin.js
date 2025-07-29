import express from "express";
import User from "../models/User.js"; // ধরে নিচ্ছি ইউজার মডেল আছে
const router = express.Router();

router.post("/make-admin", async (req, res) => {
  const { userId, adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ message: "Unauthorized: Invalid admin key" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "admin"; // বা যেভাবে রোল স্টোর করো
    await user.save();

    res.json({ message: "User has been made admin successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
