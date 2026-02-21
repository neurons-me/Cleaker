import jwt from 'jsonwebtoken';
import axios from 'axios';

/**
 * .me: Handles identity logging and context establishment for space, user, and event requests.
 * Logs the identity in the ledger on the provided port.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.ledger - The ledger API endpoint (v.path URL)
 * @param {string} [options.jwtCookieName='jwt'] - The name of the JWT cookie to use for user identity
 * @param {boolean} [options.requireAuth=false] - Set to true if user authentication is required
 * @returns {Function} Express middleware for handling space, request, and user identity.
 */
function me({ ledger, jwtCookieName = 'jwt', requireAuth = false } = {}) {
  return async (req, res, next) => {
    const hostname = req.hostname || req.headers['host'];
    const origin = req.headers['origin'] || null;
    const baseDomain = process.env.ROOT_DOMAIN || 'cleaker.me';

    // 1. Identify the Space (Domain)
    const space = hostname.endsWith(baseDomain) ? hostname : baseDomain;
    const namespace = hostname.replace(`.${baseDomain}`, '');
    req.space = { domain: baseDomain, namespace };

    // Logging the space and namespace details
    console.log(`Namespace: ${req.space.namespace}`);
    console.log(`Domain: ${req.space.domain}`);
    console.log(`Route: ${req.originalUrl}`);

    // Determine the request context
    req.requestContext = origin === req.space.domain ? 'space-originated' : 'user-originated';

    // Initialize identity logging entry
    const ledgerEntry = {
      space: req.space,
      requestContext: req.requestContext,
      timestamp: new Date(),
      activeUser: null, // Populated if JWT session is valid
    };

    // Log the request context
    console.log(`Request Context: ${req.requestContext}`);

    // 2. Extract and Validate User Identity via JWT
    const token = req.cookies?.[jwtCookieName] || null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ledgerEntry.activeUser = {
          userId: decoded.userId,
          email: decoded.email, // Assuming email or username is included in the token
        };
        req.user = ledgerEntry.activeUser;

        // Logging user identity details
        console.log(`Active User ID: ${req.user.userId}`);
        console.log(`Active User Email: ${req.user.email}`);
      } catch (error) {
        console.error('JWT verification error:', error);
        if (requireAuth) {
          return res.status(401).send('Unauthorized');
        }
      }
    } else if (requireAuth) {
      return res.status(401).send('Unauthorized');
    }

    // 3. Log Identity and Context to the Ledger (if ledger is provided)
    if (ledger) {
      try {
        await axios.post(ledger, ledgerEntry);
        console.log(`Logged identity in ledger for space: ${space} and user: ${req.user?.userId || 'unknown'}`);
      } catch (error) {
        console.error('Error logging to ledger:', error.message);
      }
    } else {
      console.log('Ledger logging skipped: No ledger URL provided.');
    }

    next();
  };
}

export default me;