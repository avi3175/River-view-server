const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 5000;

// Use cors and json as middleware
app.use(cors());
app.use(express.json());

// Ensure the uploads directory exists or create it
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the 'uploads' directory with proper route prefix
app.use('/uploads', express.static(uploadsDir));

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

// JWT secret key from .env file
const JWT_SECRET = process.env.JWT_SECRET;

// Joi Schemas for Validation
const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(20).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const roomSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  pricePerDay: Joi.number().min(1).required(),
  description: Joi.string().min(10).max(500).required(),
});

// Connect to MongoDB
let usersCollection;
let roomsCollection;
//------------------
let bookedRoomsCollection;
let reviewsCollection;




async function connectDB() {
  try {
    // await client.connect();
    const database = client.db("RiverDB");
    usersCollection = database.collection("users");
    roomsCollection = database.collection("rooms");
    menuCollection = database.collection("River");
    // usersCollection = database.collection("users");
    //--------------------------------------------------------
    bookedRoomsCollection = database.collection("booked-room");
    reviewsCollection = database.collection("reviews");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
connectDB();

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  const { error } = signupSchema.validate({ name, email, password });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { name, email, password: hashedPassword, isAdmin: false };
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

  const { error } = loginSchema.validate({ email, password });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Room Creation Endpoint (Admin Only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.post('/api/admin/rooms', upload.single('roomImage'), async (req, res) => {
  const { name, pricePerDay, description } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: "Unauthorized" });

  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  }

  const { error } = roomSchema.validate({ name, pricePerDay, description });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ message: "Forbidden: Admin access only" });

    const newRoom = { name, pricePerDay, description, imageUrl };
    await roomsCollection.insertOne(newRoom);

    res.status(201).json({ message: "Room added successfully!" });
  } catch (err) {
    console.error("Error during room creation:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Fetch All Rooms Endpoint

// Root route handling
app.get("/", (req, res) => {
  res.send("Welcome to the River API!");  // Response when accessing the root URL
});


app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await roomsCollection.find().toArray();
    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ message: "Error fetching rooms" });
  }
});

//FETCH ALL THE USERS
app.get('/api/users', async (req, res) => {
  try {
    const rooms = await usersCollection.find().toArray();
    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ message: "Error fetching rooms" });
  }
});

//GET ALL THE MENU
app.get('/api/river', async (req, res) => {
  try {
    const rooms = await menuCollection.find().toArray();
    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ message: "Error fetching rooms" });
  }
});

//-----------------------------------------------------------------------------


// Endpoint to handle room booking (only for authenticated users)
app.post('/api/book-room', async (req, res) => {
  const { roomId } = req.body;  // Expect roomId from the frontend
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(403).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the room exists
    const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
    if (!room) return res.status(404).json({ message: "Room not found" });

    // Check if the user has already booked this room
    const existingBooking = await bookedRoomsCollection.findOne({
      userId: new ObjectId(userId),
      roomId: new ObjectId(roomId),  // Checking for existing booking of the same room by the user
    });

    if (existingBooking) {
      return res.status(400).json({ message: "You have already booked this room!" });
    }

    // If not booked, proceed with booking
    const bookedRoom = {
      roomId: room._id,
      roomName: room.name,
      bookedBy: user.name,
      userId: user._id,
      bookedAt: new Date(),
    };

    await bookedRoomsCollection.insertOne(bookedRoom);

    res.status(200).json({ message: "Room booked successfully!" });
  } catch (err) {
    console.error("Error during room booking:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});





// Endpoint to fetch logged-in user's booked rooms
app.get('/api/my-booked-rooms', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];  // Get the JWT token from the authorization header
  
  if (!token) return res.status(403).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Fetch the bookings for this user
    const bookings = await bookedRoomsCollection.find({ userId: new ObjectId(userId) }).toArray();

    if (bookings.length === 0) {
      return res.status(404).json({ message: "You have no booked rooms" });
    }

    // For each booking, fetch the room details
    const bookedRooms = await Promise.all(bookings.map(async (booking) => {
      const room = await roomsCollection.findOne({ _id: new ObjectId(booking.roomId) });
      return {
        roomName: room.name,
        roomDescription: room.description,
        roomPricePerDay: room.pricePerDay,
        bookedAt: booking.bookedAt,
      };
    }));

    res.status(200).json(bookedRooms);
  } catch (err) {
    console.error("Error fetching booked rooms:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});




//THE FINAL PART
app.post('/api/review', async (req, res) => {
  const { reviewText } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(403).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Check if the user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Create a new review
    const newReview = {
      reviewText,
      userId: new ObjectId(userId),
      userName: user.name,
      postedAt: new Date(),
    };

    await reviewsCollection.insertOne(newReview);
    res.status(201).json({ message: "Review posted successfully!" });
  } catch (err) {
    console.error("Error posting review:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});




// Fetch all reviews (for logged-in users and others)
app.get('/api/review', async (req, res) => {
  try {
    // Fetch all reviews from the 'reviews' collection
    const reviews = await reviewsCollection.find().toArray();

    // If no reviews exist
    if (reviews.length === 0) {
      return res.status(404).json({ message: "No reviews available" });
    }

    // Send the reviews as a response
    res.status(200).json(reviews);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});
















// Start the Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
