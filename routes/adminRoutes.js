import express from 'express';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import User from '../models/User.js';

const router = express.Router();

// GET - সব users দেখানো
router.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // password বাদ
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch users' });
  }
});

// PATCH - Make Admin
router.patch('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await User.findByIdAndUpdate(
      id,
      { role: 'admin' },
      { new: true }
    );
    res.send(updated);
  } catch (error) {
    res.status(500).send({ message: 'Failed to update role' });
  }
});

// PATCH - Ban User (optional)
router.patch('/users/ban/:id', verifyJWT, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await User.findByIdAndUpdate(
      id,
      { banned: true },
      { new: true }
    );
    res.send(updated);
  } catch (error) {
    res.status(500).send({ message: 'Failed to ban user' });
  }
});

export default router;
