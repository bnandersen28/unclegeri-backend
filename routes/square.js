const { ApiError, Client, Environment } = require('square');

const { isProduction, SQUARE_ACCESS_TOKEN } = require('./config');

console.log('Initializing Square Client...');
console.log('SQUARE_ACCESS_TOKEN exists:', !!process.env.SQUARE_ACCESS_TOKEN);
console.log('First 5 characters of token:', process.env.SQUARE_ACCESS_TOKEN?.substring(0, 5));
console.log('Using environment:', process.env.NODE_ENV);
console.log('Production variable:', isProduction);

const client = new Client({
  environment: Environment.Sandbox,
  accessToken: SQUARE_ACCESS_TOKEN,
});

module.exports = { ApiError, client };
