const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'mcdc_jwt_secret_key_2024';

// Verify JWT token
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401);
  }
  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    if (!user || !user.is_active) return error(res, 'Unauthorized', 401);
    req.user = user;
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }
}

// Role-based authorization
// roles: ['SuperAdmin', 'Admin', 'Operator']
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.user_type)) {
      return error(res, 'Forbidden – insufficient permissions', 403);
    }
    next();
  };
}

module.exports = { authenticate, authorize };
