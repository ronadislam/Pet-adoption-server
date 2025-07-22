const express = require("express");
const router = express.Router();

const client = require("../index");
const db = client.db("petAdoption");
const petsCollection = db.collection("pets");

// GET /api/pets
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const search = req.query.search || "";
    const category = req.query.category || "";

    const filter = {
      adopted: false,
      name: { $regex: search, $options: "i" }, // case-insensitive name search
    };

    if (category) {
      filter.category = category;
    }

    const skip = (page - 1) * limit;

    const pets = await petsCollection
      .find(filter)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .toArray();

    res.send(pets);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch pets", error: err });
  }
});

module.exports = router;
