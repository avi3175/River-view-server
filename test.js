const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcrypt'); // For hashing passwords
const Joi = require('joi'); // For validating data
const { MongoClient, ServerApiVersion } = require('mongodb');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 5000;

// Use cors and json as middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = "mongodb+srv://River:redleaf1@cluster0.f2tn7zt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Joi Schema for Validation
const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(20).required(),
});

// Connect to MongoDB
let usersCollection;

async function connectDB() {
  try {
    await client.connect();
    const database = client.db("RiverDB");
    usersCollection = database.collection("users");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
connectDB();

// Session Management (Use Express Session)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',  // Replace with a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' },  // Ensure cookies are sent over HTTPS in production
  })
);

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Validate input
  const { error } = signupSchema.validate({ name, email, password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const newUser = {
      name,
      email,
      password: hashedPassword, // Store the hashed password
    };
    await usersCollection.insertOne(newUser);

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  const { error } = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(20).required(),
  }).validate({ email, password });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    // Check if the user exists
    const existingUser = await usersCollection.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Compare the provided password with the stored hash
    const match = await bcrypt.compare(password, existingUser.password);
    if (!match) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Set session data (i.e., user is logged in)
    req.session.user = {
      id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
    };

    // Respond with success
    res.status(200).json({ message: "Login successful!" });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');  // Clear session cookie
    res.status(200).json({ message: 'Logged out successfully' });
  });
});
















// Route to fetch data from MongoDB (example: River)
app.get('/api/river', async (req, res) => {
  try {
    const database = client.db("RiverDB");
    const collection = database.collection("River");

    // Fetch all items from the River collection
    const items = await collection.find().toArray();

    // Send the items as the response
    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching data", error);
    res.status(500).json({ message: "Error fetching data from the database" });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
