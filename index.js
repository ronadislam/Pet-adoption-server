const express = require("express");
const cors = require ("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;


// Middleware

app.use(cors());
app.use(express.json());
// module.exports = app;


// Root route
app.get("/", (req, res) => {
  res.send("Pet Adoption Server is running");
});


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

  
    // DONATION ROUTES (Public)
 

app.post('/admin-request', async (req, res) => {
  const { email, adminKey } = req.body;

  if (!email || !adminKey) {
    return res.status(400).json({ message: 'Email and admin key are required.' });
  }

  // সিক্রেট কি মিলাও
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Invalid admin key.' });
  }

  try {
    // ইউজার খুঁজে বের করো
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(200).json({ message: 'You are already an admin.' });
    }

    // ইউজারের role আপডেট করো
    await usersCollection.updateOne(
      { email },
      { $set: { role: 'admin' } }
    );

    return res.status(200).json({ message: 'Admin access granted successfully.' });
  } catch (error) {
    console.error('Admin request error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});


// Promote user to admin without secret key
app.patch('/users/admin/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const query = { _id: new ObjectId(id) };
    const user = await usersCollection.findOne(query);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(200).json({ message: 'Already an admin.' });
    }

    await usersCollection.updateOne(query, { $set: { role: 'admin' } });

    return res.status(200).json({ message: 'User promoted to admin successfully.' });
  } catch (error) {
    console.error('Error promoting user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Ban a user (role হবে "banned")
app.patch('/users/ban/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const query = { _id: new ObjectId(id) };
    const user = await usersCollection.findOne(query);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'banned') {
      return res.status(200).json({ message: 'User already banned.' });
    }

    await usersCollection.updateOne(query, { $set: { role: 'banned' } });

    return res.status(200).json({ message: 'User has been banned successfully.' });
  } catch (error) {
    console.error('Error banning user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});





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

    app.get("/donations/:id", async (req, res) => {
      try {
        const donation = await donationsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!donation) return res.status(404).json({ error: "Donation not found" });
        res.json(donation);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch donation" });
      }
    });

    app.get("/my-donations", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: "Email query is required" });

        const donations = await donationsCollection.find({ userEmail: email }).toArray();
        res.json(donations);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch my donations" });
      }
    });

    app.post("/donate", async (req, res) => {
      try {
        const { campaignId, amount, donorEmail, paymentMethodId } = req.body;
        // TODO: save donation details to DB
        res.status(200).json({ success: true, message: "Donation recorded successfully" });
      } catch (err) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
      }
    });

   
    // ADOPTION ROUTES
  
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
        res.status(500).json({ error: "Failed to save adoption request" });
      }
    });

    app.get("/adoptions/requests", async (req, res) => {
      try {
        const ownerEmail = req.query.email;
        if (!ownerEmail) return res.status(400).json({ error: "Email is required" });

        const pets = await petsCollection.find({ addedBy: ownerEmail }).toArray();
        const petIds = pets.map((pet) => pet._id.toString());

        const requests = await adoptionsCollection
          .find({ petId: { $in: petIds } })
          .toArray();

        const requestsWithPet = requests.map((reqItem) => {
          const pet = pets.find((p) => p._id.toString() === reqItem.petId);
          return { ...reqItem, petName: pet?.name || "Unknown" };
        });

        res.json(requestsWithPet);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch adoption requests" });
      }
    });

    app.patch("/adoptions/:id", async (req, res) => {
      try {
        const { status } = req.body;
        if (!["accepted", "rejected"].includes(status)) {
          return res.status(400).json({ error: "Invalid status" });
        }

        const result = await adoptionsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { status } }
        );

        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to update adoption request" });
      }
    });

   
    // PET ROUTES

    app.post("/pets", async (req, res) => {
      try {
        const pet = req.body;
        pet.adopted = false;
        pet.createdAt = new Date();

        const result = await petsCollection.insertOne(pet);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to add pet" });
      }
    });

    app.get("/pets", async (req, res) => {
      try {
        const pets = await petsCollection.find().toArray();
        res.json(pets);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch pets" });
      }
    });

    app.get("/mypets", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: "Email query is required" });

        const pets = await petsCollection.find({ addedBy: email }).toArray();
        res.json(pets);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch my pets" });
      }
    });

    app.delete("/mypets/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: "Email is required" });

        const pet = await petsCollection.findOne({ _id: new ObjectId(id) });
        if (!pet) return res.status(404).json({ error: "Pet not found" });
        if (pet.addedBy !== email)
          return res.status(403).json({ error: "You can delete only your own pet" });

        const result = await petsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete pet" });
      }
    });

    app.patch("/mypets/:id", async (req, res) => {
      try {
        const email = req.query.email;
        const data = req.body;

        const pet = await petsCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!pet) return res.status(404).json({ error: "Pet not found" });
        if (pet.addedBy !== email) return res.status(403).json({ error: "Forbidden" });

        const result = await petsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: data }
        );

        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to update pet" });
      }
    });

    app.get("/pets/:id", async (req, res) => {
      try {
        const pet = await petsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!pet) return res.status(404).json({ error: "Pet not found" });
        res.json(pet);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch pet" });
      }
    });

  
    // USER ROUTES
  
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) return res.send({ message: "User already exists" });

      user.role = "user";
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/role/:email", async (req, res) => {
      try {
        const user = await usersCollection.findOne({ email: req.params.email });
        res.json({ role: user?.role || "user" });
      } catch {
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch {
        res.status(500).send({ message: "Failed to fetch users" });
      }
    });

    app.get("/users/admin/:email", async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send({ admin: user?.role === "admin" });
    });


    // ADMIN ROUTES
   
    const requireAdmin = async (req, res, next) => {
      const email = req.query.email;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== "admin") return res.status(403).send({ message: "Forbidden" });
      next();
    };

    app.get("/all-users", requireAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users/admin/:id", requireAdmin, async (req, res) => {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { role: "admin" } }
      );
      res.send(result);
    });

    app.get("/all-pets", requireAdmin, async (req, res) => {
      const result = await petsCollection.find().toArray();
      res.send(result);
    });

    app.delete("/pets/:id", requireAdmin, async (req, res) => {
      const result = await petsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    });

    app.patch("/pets/:id", requireAdmin, async (req, res) => {
      const data = req.body;
      const result = await petsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: data }
      );
      res.send(result);
    });

    app.patch("/pets/adopt/:id", requireAdmin, async (req, res) => {
      const result = await petsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { adopted: true } }
      );
      res.send(result);
    });

    app.get("/all-campaigns", requireAdmin, async (req, res) => {
      const result = await donationsCollection.find().toArray();
      res.send(result);
    });

    app.patch("/campaigns/pause/:id", requireAdmin, async (req, res) => {
      const { paused } = req.body;
      const result = await donationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { paused } }
      );
      res.send(result);
    });

    app.delete("/campaigns/:id", requireAdmin, async (req, res) => {
      const result = await donationsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });
  } finally {
    // Keep client open
  }
}

run().catch(console.dir);



// Start server

// module.exports = app;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
