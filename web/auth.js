/**
 * Authentication Middleware
 * תומך ב-API Key וגם Basic Auth
 */

const crypto = require('crypto');

// API Keys (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
const VALID_API_KEYS = new Set([
  'sk-shalev-' + crypto.createHash('sha256').update('shalev-main-key-2026').digest('hex').substring(0, 32),
  'sk-avner-' + crypto.createHash('sha256').update('avner-bot-key-2026').digest('hex').substring(0, 32)
]);

// Basic Auth Users
const VALID_USERS = {
  'shalev': crypto.createHash('sha256').update('shalev-password-2026').digest('hex'),
  'avner': crypto.createHash('sha256').update('avner-bot-password-2026').digest('hex')
};

/**
 * API Key Authentication
 */
function validateApiKey(apiKey) {
  if (!apiKey) return false;
  return VALID_API_KEYS.has(apiKey);
}

/**
 * Basic Auth Authentication
 */
function validateBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    if (!username || !password) return false;

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    return VALID_USERS[username] === hashedPassword;
  } catch (error) {
    return false;
  }
}

/**
 * Main Authentication Middleware
 * בודק API Key או Basic Auth
 */
function authMiddleware(req, res, next) {
  // Skip auth for OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Check API Key in header
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (apiKey && validateApiKey(apiKey)) {
    req.authMethod = 'api-key';
    return next();
  }

  // Check Basic Auth
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Basic ') && validateBasicAuth(authHeader)) {
    req.authMethod = 'basic-auth';
    return next();
  }

  // No valid authentication
  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Valid API key or Basic Auth credentials required',
    hint: 'Use X-API-Key header or Authorization: Basic header'
  });
}

/**
 * Generate API Keys (for initial setup)
 */
function generateApiKeys() {
  const shalevKey = 'sk-shalev-' + crypto.createHash('sha256').update('shalev-main-key-2026').digest('hex').substring(0, 32);
  const avnerKey = 'sk-avner-' + crypto.createHash('sha256').update('avner-bot-key-2026').digest('hex').substring(0, 32);

  return {
    shalev: shalevKey,
    avner: avnerKey
  };
}

/**
 * Display credentials (for initial setup only)
 */
function showCredentials() {
  console.log('\n🔐 Authentication Credentials:\n');
  
  console.log('📋 API Keys:');
  const keys = generateApiKeys();
  console.log(`   Shalev: ${keys.shalev}`);
  console.log(`   Avner:  ${keys.avner}`);
  
  console.log('\n🔑 Basic Auth:');
  console.log('   Username: shalev');
  console.log('   Password: shalev-password-2026');
  console.log('   Username: avner');
  console.log('   Password: avner-bot-password-2026');
  
  console.log('\n📝 Usage Examples:');
  console.log('   API Key:    curl -H "X-API-Key: YOUR_KEY" https://...');
  console.log('   Basic Auth: curl -u shalev:shalev-password-2026 https://...');
  console.log('');
}

module.exports = {
  authMiddleware,
  generateApiKeys,
  showCredentials
};

// CLI: node auth.js to display credentials
if (require.main === module) {
  showCredentials();
}
