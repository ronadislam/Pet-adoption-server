// middlewares/verifyAdmin.js
export const verifyAdmin = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).send({ message: 'Forbidden: Admin only' });
    }
    next();
  } catch (error) {
    res.status(500).send({ message: 'Internal Server Error' });
  }
};
