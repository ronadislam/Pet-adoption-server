const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gbi6src.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Collections
    const db = client.db("petAdoption");
    const usersCollection = db.collection("users");
    const petsCollection = db.collection("pets");
    const donationsCollection = db.collection("donations");
    const adoptionsCollection = db.collection("adoptions");

    // ===========================
    // DONATION ROUTES (PUBLIC)
    // ===========================

    // Get paginated donations
    app.get("/donations", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        const total = await donationsCollection.countDocuments();
        const donations = await donationsCollection
          .find()
          .skip(skip)
          .limit(limit)
          .toArray();

        res.json({ total, page, limit, donations });
      } catch (error) {
        console.error("Error fetching donations:", error);
        res.status(500).json({ error: "Failed to fetch donations" });
      }
    });

    // Get single donation campaign by ID
    app.get("/donations/:id", async (req, res) => {
      try {
        const donation = await donationsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!donation) return res.status(404).json({ error: "Donation not found" });
        res.json(donation);
      } catch (error) {
        console.error("Error fetching donation:", error);
        res.status(500).json({ error: "Failed to fetch donation" });
      }
    });

    // Get donations by user (My Donations)
    app.get("/my-donations", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: "Email query is required" });

        const donations = await donationsCollection.find({ userEmail: email }).toArray();
        res.json(donations);
      } catch (error) {
        console.error("Error fetching my donations:", error);
        res.status(500).json({ error: "Failed to fetch my donations" });
      }
    });

    // ===========================
    // ADOPTION ROUTES
    // ===========================

    // Save adoption request
    app.post("/adoptions", async (req, res) => {
      try {
        const adoption = req.body;
        if (!adoption.userEmail || !adoption.petId) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await adoptionsCollection.insertOne({
          ...adoption,
          status: "pending",
          requestedAt: new Date(),
        });

        res.json(result);
      } catch (error) {
        console.error("Error saving adoption request:", error);
        res.status(500).json({ error: "Failed to save adoption request" });
      }
    });

    // ===========================
    // PET ROUTES (PUBLIC/USER)
    // ===========================

    // Add a new pet
    app.post("/pets", async (req, res) => {
      try {
        const pet = req.body;
        pet.adopted = false;
        pet.createdAt = new Date();

        const result = await petsCollection.insertOne(pet);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error adding pet:", error);
        res.status(500).json({ error: "Failed to add pet" });
      }
    });

    // Get all pets
    app.get("/pets", async (req, res) => {
      try {
        const pets = await petsCollection.find().toArray();
        res.json(pets);
      } catch (error) {
        console.error("Error fetching pets:", error);
        res.status(500).json({ error: "Failed to fetch pets" });
      }
    });

    // Get pets added by a specific user
    app.get("/mypets", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: "Email query is required" });

        const pets = await petsCollection.find({ email }).toArray();
        res.json(pets);
      } catch (error) {
        console.error("Error fetching my pets:", error);
        res.status(500).json({ error: "Failed to fetch my pets" });
      }
    });

    // Get single pet by ID
    app.get("/pets/:id", async (req, res) => {
      try {
        const pet = await petsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!pet) return res.status(404).json({ error: "Pet not found" });
        res.json(pet);
      } catch (error) {
        console.error("Error fetching pet:", error);
        res.status(500).json({ error: "Failed to fetch pet" });
      }
    });

    // ===========================
    // USER ROUTES
    // ===========================

    // Save user (if not exists)
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) return res.send({ message: "User already exists" });

      user.role = "user"; // default
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Get user role
    app.get("/users/role/:email", async (req, res) => {
      try {
        const user = await usersCollection.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ role: "user" });
        res.json({ role: user.role });
      } catch (err) {
        console.error("Error fetching role:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
    app.get("/users", async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch users" });
  }
});


    // Check if user is admin
    app.get("/users/admin/:email", async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send({ admin: user?.role === "admin" });
    });

    // ===========================
    // ADMIN ROUTES
    // ===========================

    // Utility: ensure admin
    const requireAdmin = async (req, res, next) => {
      const email = req.query.email;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== "admin") return res.status(403).send({ message: "Forbidden" });
      next();
    };

    // Get all users
    app.get("/all-users", requireAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Make user admin
    app.patch("/users/admin/:id", requireAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "admin" } }
      );
      res.send(result);
    });

    // Get all pets
    app.get("/all-pets", requireAdmin, async (req, res) => {
      const result = await petsCollection.find().toArray();
      res.send(result);
    });

    // Delete a pet
    app.delete("/pets/:id", requireAdmin, async (req, res) => {
      const result = await petsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    });

    // Update pet info
    app.patch("/pets/:id", requireAdmin, async (req, res) => {
      const data = req.body;
      const result = await petsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: data }
      );
      res.send(result);
    });

    // Mark as adopted
    app.patch("/pets/adopt/:id", requireAdmin, async (req, res) => {
      const result = await petsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { adopted: true } }
      );
      res.send(result);
    });

    // Get all donation campaigns
    app.get("/all-campaigns", requireAdmin, async (req, res) => {
      const result = await donationsCollection.find().toArray();
      res.send(result);
    });

    // Pause/Unpause campaign
    app.patch("/campaigns/pause/:id", requireAdmin, async (req, res) => {
      const { paused } = req.body;
      const result = await donationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { paused } }
      );
      res.send(result);
    });

    // Delete a campaign
    app.delete("/campaigns/:id", requireAdmin, async (req, res) => {
      const result = await donationsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });



    // Donation API
app.post("/donate", async (req, res) => {
  try {
    const { campaignId, amount, donorEmail, paymentMethodId } = req.body;
    console.log("Donation received:", req.body);

    // এখানে ডাটাবেজে সেভ করতে পারো
    // await donationsCollection.insertOne({ campaignId, amount, donorEmail, paymentMethodId, date: new Date() });

    res.status(200).json({
      success: true,
      message: "Donation recorded successfully",
    });
  } catch (err) {
    console.error("Donation error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

    // ===========================
    // BASE ROUTE
    // ===========================
    app.get("/", (req, res) => {
      res.send("Pet Adoption Server is running");
    });

    // Confirm DB connection
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully!");
  } finally {
    // Keep client open
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
