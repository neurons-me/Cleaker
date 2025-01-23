import express from 'express';
import cookieParser from 'cookie-parser';
import Cleaker from 'Cleaker'; // Adjust the path as necessary

const app = express();
app.use(cookieParser());

// Use Cleaker.me as middleware
app.use(
  Cleaker.me({
    ledger: 'http://localhost:3000/ledger', // Mock ledger URL for testing
    jwtCookieName: 'jwt', // Name of the JWT cookie
    requireAuth: false, // Set to true if authentication is required
  })
);

// Define a route to test the middleware
app.get('/test', (req, res) => {
  res.json({
    message: 'Middleware executed successfully',
    space: req.space,
    user: req.user || 'Guest',
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});