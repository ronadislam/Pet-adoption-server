const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

// Get campaigns by creator email
router.get("/", async (req, res) => {
  const email = req.query.email;
  try {
    const donations = await req.db
      .collection("donations")
      .find({ "creator.email": email })
      .toArray();
    res.send({donations});
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch campaigns." });
  }
});

// Create a new donation campaign
router.post("/", async (req, res) => {
  const newCampaign = req.body;
  try {
    const result = await req.db.collection("donations").insertOne(newCampaign);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to create campaign." });
  }
});


// Update campaign (edit)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const result = await req.db
      .collection("donations")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to update campaign." });
  }
});

// Pause/unpause campaign
router.patch("/pause/:id", async (req, res) => {
  const { id } = req.params;
  const { paused } = req.body;
  try {
    const result = await req.db
      .collection("donations")
      .updateOne({ _id: new ObjectId(id) }, { $set: { paused } });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to pause/unpause." });
  }
});

// Get donators for a campaign
router.get("/donators/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const donations = await req.db
      .collection("donations")
      .findOne({ _id: new ObjectId(id) });
    res.send(donations?.donators || []);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch donators." });
  }
});

module.exports = router;
