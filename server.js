//Main server file for the application
const express = require('express');
const path = require('path');
const mysql = require('mysql2')
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./db'); // or wherever your db.js is

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



//Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Setup session middleware
app.use(session({
  secret: 'fj3l2k1m9q8zvbn$#@!x23df98LKJD(*&^%$#', // Use a strong secret in production
  resave: false,
  saveUninitialized: false
}));

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Replace these with your actual credentials
  const validUser = 'unclegeri';
  const validPass = 'secret123';

  if (username === validUser && password === validPass) {
    req.session.loggedIn = true;
    return res.json({ message: 'Login successful' });
  }

  res.status(401).json({ message: 'Invalid credentials' });
});

// Middleware to protect admin route
function isAuthenticated(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  }
  res.status(401).send('Unauthorized');
}

// Example protected route
app.get('/admin.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

//Serve index.html by default 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


//Register student information
// Handle form POST from register.html
app.post('/register', async (req, res) => {
    try {
      const {
        course,
        studentName,
        parentName,
        phone,
        parentPhone,
        email,
        parentEmail,
        address,
        permitNumber, 

      } = req.body;

      console.log('Request body:', req.body);
      
  
      const query =
        `INSERT INTO registrations (
        course, student_name, parent_name, phone_number, parent_phone,
          email, parent_email, address, permit_number
        ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
          course,
          studentName,
          parentName,
          phone,
          parentPhone,
          email,
          parentEmail,
          address,
          permitNumber
        ];

        
            const [result] = await db.execute(query, values);
            console.log('SQL success:', result);
            res.status(201).json({ message: 'Registration successful', id: result.insertId });
        } catch (err) {
            console.error('SQL error:', err);
            res.status(500).json({ message: 'Error saving registration' });
        }
       

    });

    // GET all registrations
app.get('/api/registrations', async (req, res) => {
    try {
      const [rows] = await db.execute('SELECT * FROM registrations');
      res.json(rows);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      res.status(500).json({ error: 'Failed to fetch registrations' });
    }
  });


//Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});