module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpire: process.env.JWT_EXPIRE || '24h',
    jwtCookieExpire: process.env.JWT_COOKIE_EXPIRE || 24, // hours
    
    // Cookie options
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};
