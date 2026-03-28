require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Vault = require('./models/Vault');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "https://your-app-name.vercel.app" // <--- PASTE YOUR ACTUAL VERCEL URL HERE
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- AUTH MIDDLEWARE ---
// This checks the "Authorization" header for the JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) return res.status(401).json({ error: "Access Denied: Log in first." });

  jwt.verify(token, process.env.SECRET_KEY, (err, decodedUser) => {
    if (err) return res.status(403).json({ error: "Invalid or Expired Token" });
    req.user = decodedUser; // Adds user info (like id) to the request object
    next();
  });
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Username already exists" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Wrong password" });

    // Sign the token with the user's ID
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });
    res.json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
});

// --- VAULT ROUTES (PROTECTED) ---

// 1. Get ONLY the logged-in user's passwords
app.get('/api/vault', authenticateToken, async (req, res) => {
  try {
    const entries = await Vault.find({ userId: req.user.id });
    // We send the encrypted "garbage" exactly as it is in the DB
    res.json(entries); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add a new password linked to the user
app.post('/api/vault', authenticateToken, async (req, res) => {
  try {
    const { title, url, email, password, category } = req.body;
    const newEntry = new Vault({ 
      userId: req.user.id, 
      title, 
      url, 
      email, 
      password, // This is already encrypted by the browser!
      category 
    });
    await newEntry.save();
    res.status(201).json({ message: "Saved!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Delete an entry
app.delete('/api/vault/:id', authenticateToken, async (req, res) => {
  try {
    // Ensure the user owns the entry before deleting
    const entry = await Vault.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/test', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));