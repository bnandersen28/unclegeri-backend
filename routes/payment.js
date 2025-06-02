const express = require('express');
const {SquareClient, SquareEnvironment } = require('square');
console.log(SquareEnvironment);
const { v4: uuidv4 } = require('uuid');


const router = express.Router();


const client = new SquareClient({
    token: process.env.ACCESS_TOKEN.trim() ,// Ensure you have set this in your .env file
});







//Payment route
router.post('/', async (req, res) => {
    console.log('Payment request received in payment.js:', req.body);
    console.log('Request header',req.headers);
    //const { nonce } = req.body; // Get the payment nonce from the request body
    //console.log('Received nonce:', nonce);
    testnonce = 'cnon:card-nonce-ok'; // For testing purposes, replace with actual nonce in production
    //Attempt to charge the card
    try{
        console.log('access:',process.env.ACCESS_TOKEN);
        console.log('Nonce:', testnonce);
        const response = await client.payments.create({
            sourceId: testnonce,
            idempotencyKey: 'unique-key-' + Date.now(), // Ensure this is unique for each request
            amountMoney: {
                amount: BigInt(1000), // Amount in cents (e.g., $10.00)
                currency: 'USD' // Currency code
            },
            
        });
        res.status(200).json({ message: 'Payment Successful', payment: response.result });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ message: 'Payment Failed', error: error.message });
        }
    }
);
module.exports = router;
