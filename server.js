const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // For handling file uploads
const cors = require('cors'); // Optional: For cross-origin requests if needed
const app = express();
const PORT = 3000;

// Middleware Configuration
app.use(express.json());
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use('/uploads', express.static('uploads')); // Access to uploaded MP3 files

// Configure Multer for saving MP3 files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Unique filename
    }
});
const upload = multer({ storage: storage });

// Helper functions to read and write to the JSON file
const DATA_FILE = path.join(__dirname, 'data', 'users.json');

function readUsers() {
    // Ensure the file exists before reading
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

function writeUsers(users) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// --- Routes (API) ---

// 1. Register
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    const users = readUsers();

    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const newUser = {
        id: Date.now(),
        username,
        email,
        password,
        playlists: [] // Empty playlists array
    };

    users.push(newUser);
    writeUsers(users);
    res.json({ success: true, message: 'Registered successfully' });
});

// 2. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // Return the user (excluding the password for security)
        const { password, ...userWithoutPass } = user;
        res.json({ success: true, user: userWithoutPass });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// 3. Update user data (save playlists)
app.put('/api/user/:username', (req, res) => {
    const username = req.params.username;
    const updatedData = req.body; // The new playlists
    let users = readUsers();
    
    const index = users.findIndex(u => u.username === username);
    if (index !== -1) {
        // Update only the user's playlists
        users[index].playlists = updatedData.playlists;
        writeUsers(users);
        res.json({ success: true });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// 4. Get current user data (for page load)
app.get('/api/user/:username', (req, res) => {
    const users = readUsers();
    const user = users.find(u => u.username === req.params.username);
    if(user) {
        const { password, ...userWithoutPass } = user;
        res.json(userWithoutPass);
    } else {
        res.status(404).json({message: 'User not found'});
    }
});

// 5. Upload MP3 file
app.post('/api/upload', upload.single('mp3file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Return the file path so the client can save it to a playlist
    res.json({ filePath: `/uploads/${req.file.filename}`, originalName: req.file.originalname });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});