require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./db.js');

const app = express();

app.use(cors({origin: '*',
  methods: ['GET', 'POST'],
  credentials: true}));
const { client: square, ApiError } = require('./routes/square');
const logger = require('./routes/logger');
const {
  validatePaymentPayload,
  validateCreateCardPayload,
} = require('./routes/schema');
const retry = require('async-retry');
const { Console } = require('console');



const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Backend Status</title>
      </head>
      <body>
        <h1>Backend is running</h1>
        <p>Welcome to Uncle Geri's Driving School backend!</p>
      </body>
    </html>
  `);
});


//log incoming requests
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'fj3l2k1m9q8zvbn$#@!x23df98LKJD(*&^%$#',
  resave: false,
  saveUninitialized: false
}));



// Login Route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'unclegeri' && password === 'secret123') {
    req.session.loggedIn = true;
    return res.json({ message: 'Login successful' });
  }
  res.status(401).json({ message: 'Invalid credentials' });
});

// Admin Auth Middleware
function isAuthenticated(req, res, next) {
  if (req.session.loggedIn) return next();
  res.status(401).send('Unauthorized');
}

// Admin Page
app.get('/admin.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/db-health', async (req, res) => {
  try {
    const [result] = await db.execute('SELECT 1');
    console.log('DB health result:', result);
    res.status(200).send('Database connection is healthy');
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).send('Database connection failed');
  }
});


// Register Student
app.post('/register', async (req, res) => {
  console.log('Received registration request:', req.body);
  try {
    const {
      course, studentName, parentName, phone,
      parentPhone, email, parentEmail, address, permitNumber
    } = req.body;

    if (!course || !studentName || !parentName || !phone || !parentPhone || !email || !parentEmail || !address || !permitNumber) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const query = `
      INSERT INTO registrations (
        course, student_name, parent_name, phone_number,
        parent_phone, email, parent_email, address, permit_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      course, studentName, parentName, phone,
      parentPhone, email, parentEmail, address, permitNumber
    ];

    const [result] = await db.execute(query, values);
    res.status(201).json({ message: 'Registration successful', id: result.insertId });

    } catch (err) {
    console.error('SQL error:', err);
    res.status(500).json({ message: 'Error saving registration' });
  }
});

// Fetch All Registrations
app.get('/api/registrations', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM registrations');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Square Payment Route
app.post('/payment', async (req, res) => {
  const payload = req.body;

  if (!validatePaymentPayload(payload)) {
    return res.status(400).json({ error: 'Bad Request' });
  }

  try {
    await retry(async (bail, attempt) => {
      try {
        logger.debug('Creating payment', { attempt });

        const payment = {
          idempotencyKey: payload.idempotencyKey,
          locationId: payload.locationId,
          sourceId: payload.sourceId,
          amountMoney: {
            amount: '100', // In cents
            currency: 'USD',
          },
        };

        if (payload.customerId) payment.customerId = payload.customerId;
        if (payload.verificationToken) payment.verificationToken = payload.verificationToken;

        const { result, statusCode } = await square.paymentsApi.createPayment(payment);
        logger.info('Payment succeeded!', { result, statusCode });

        res.status(statusCode).json({
          success: true,
          payment: {
            id: result.payment.id,
            status: result.payment.status,
            receiptUrl: result.payment.receiptUrl,
            orderId: result.payment.orderId,
          }
        });
      } catch (ex) {
        if (ex instanceof ApiError) {
          logger.error(ex.errors);
          bail(ex);
        } else {
          logger.error(`Error creating payment on attempt ${attempt}: ${ex}`);
          throw ex;
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Payment failed', details: err.message });
  }
});

// Store Card Route
app.post('/card', async (req, res) => {
  const payload = req.body;

  if (!validateCreateCardPayload(payload)) {
    return res.status(400).json({ error: 'Bad Request' });
  }

  try {
    await retry(async (bail, attempt) => {
      try {
        logger.debug('Storing card', { attempt });

        const cardReq = {
          idempotencyKey: payload.idempotencyKey,
          sourceId: payload.sourceId,
          card: {
            customerId: payload.customerId
          },
        };

        if (payload.verificationToken) cardReq.verificationToken = payload.verificationToken;

        const { result, statusCode } = await square.cardsApi.createCard(cardReq);
        logger.info('Store Card succeeded!', { result, statusCode });

        // Convert int fields to string for JSON
        const card = result.card;
        card.expMonth = card.expMonth.toString();
        card.expYear = card.expYear.toString();
        card.version = card.version.toString();

        res.status(statusCode).json({ success: true, card });
      } catch (ex) {
        if (ex instanceof ApiError) {
          logger.error(ex.errors);
          bail(ex);
        } else {
          logger.error(`Error creating card on attempt ${attempt}: ${ex}`);
          throw ex;
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Card storage failed', details: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port http://0.0.0.0:${PORT}`);
});

