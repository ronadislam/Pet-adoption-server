const jwt = require ('jsonwebtoken');

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access (No Token)' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access (Invalid Token)' });
    }

    req.user = decoded; // decoded contains user info like email
    next(); // allow to proceed
  });
};

module.exports = verifyJWT;
