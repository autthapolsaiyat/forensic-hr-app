const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const jwtExpire = process.env.JWT_EXPIRE || '24h';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

const generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  jwtSecret,
  jwtExpire,
  cookieOptions,
  JWT_SECRET: jwtSecret
};
