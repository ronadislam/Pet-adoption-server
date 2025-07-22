const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient,  ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gbi6src.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// MongoDB Collections
let petsCollection;
let adoptionsCollection;
let donationsCollection; // ✅ Add this line
let campaignsCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db("petAdoption");

    // Assign collections
    petsCollection = db.collection("pets");
    adoptionsCollection = db.collection("adoptions");
    donationsCollection = db.collection("donations"); // ✅ Add this line
    campaignsCollection = db.collection("campaigns");

    console.log("✅ Connected to MongoDB!");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
run();

app.post('/users', async (req, res) => {
  const user = req.body;
  const existing = await usersCollection.findOne({ email: user.email });
  if (!existing) {
    user.role = "user"; // default
    const result = await usersCollection.insertOne(user);
    return res.send(result);
  }
  res.send({ message: "User already exists" });
});


// ✅ GET pets route
app.get("/pets", async (req, res) => {
  try {
    const pets = await petsCollection
      .find({ adopted: false })
      .sort({ date: -1 })
      .toArray();

    res.send(pets);
  } catch (error) {
    console.error("Error fetching pets:", error);
    res.status(500).send({ message: "Failed to fetch pets", error });
  }
});

// ✅ GET single pet by ID
const { ObjectId } = require('mongodb');

app.get("/pets/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const pet = await petsCollection.findOne({ _id: new ObjectId(id) });

    if (!pet) return res.status(404).send({ message: "Pet not found" });

    res.send(pet);
  } catch (error) {
    console.error("Error fetching pet:", error);
    res.status(500).send({ message: "Failed to fetch pet", error });
  }
});



// ✅ POST adoption request
app.get("/adoptions", async (req, res) => {
  try {
    const adoptions = await adoptionsCollection.find().toArray();
    res.send(adoptions);
  } catch (error) {
    console.error("Error fetching adoptions:", error);
    res.status(500).send({ message: "Failed to fetch adoptions", error });
  }
});
 

app.post("/adoptions", async (req, res) => {
  try {
    const adoption = req.body;

    // Validate required fields
    if (!adoption.petId || !adoption.userEmail || !adoption.phone || !adoption.address) {
      return res.status(400).send({ message: "Missing required adoption fields" });
    }

    const result = await adoptionsCollection.insertOne(adoption);
    res.status(201).send({ message: "Adoption request submitted", result });
  } catch (error) {
    console.error("Error saving adoption request:", error);
    res.status(500).send({ message: "Failed to save adoption request", error });
  }
});

app.get("/donations", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const donations = await donationsCollection
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.send(donations);
  } catch (error) {
    res.status(500).send({ message: "Error fetching donations", error });
  }
});


app.get("/donations/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const donation = await donationsCollection.findOne({ _id: new ObjectId(id) });

    if (!donation) {
      return res.status(404).send({ message: "Donation campaign not found" });
    }

    res.send(donation);
  } catch (error) {
    console.error("Error fetching donation details:", error);
    res.status(500).send({ message: "Error fetching donation details", error });
  }
});


app.post("/donate", async (req, res) => {
  const { amount, donorEmail, paymentMethodId, campaignId } = req.body;

  try {
    // 1. Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      receipt_email: donorEmail,
    });

    // 2. Save donation in MongoDB (example logic)
    const donationData = {
      campaignId,
      donorEmail,
      amount,
      createdAt: new Date(),
    };

    await donationsCollection.insertOne(donationData);

    // 3. Update donation amount in campaign
    await campaignsCollection.updateOne(
      { _id: new ObjectId(campaignId) },
      { $inc: { donatedAmount: amount } }
    );

    res.send({ success: true, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).send({ success: false, error: err.message });
  }
});



// ✅ Protected Routes (optional auth)
const protectedRoutes = require('./routes/protected.routes');
app.use('/protected', protectedRoutes);

// ✅ Root
app.get('/', (req, res) => {
  res.send('Pet Adoption Platform Server Running...');
});

// ✅ JWT Token Route
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.send({ token });
});

// ✅ Protected Test Route
app.get("/protected", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: "Forbidden" });

    res.send({ message: "Access Granted!", user: decoded });
  });
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
