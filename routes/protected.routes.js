const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');

router.get('/user-profile', verifyJWT, (req, res) => {
  res.send({
    message: '✅ You are accessing a protected route!',
    user: req.user,
  });
});

module.exports = router;
