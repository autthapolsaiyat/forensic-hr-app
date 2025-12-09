const { query } = require('../db/connection');

const logActivity = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const action = req.method + ' ' + req.path;
    const details = JSON.stringify({
      body: req.body,
      params: req.params,
      query: req.query
    });
    
    // Log to database (optional)
    // await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [userId, action, details]);
    
    console.log(`[${new Date().toISOString()}] ${action} - User: ${userId}`);
    next();
  } catch (error) {
    console.error('Logger error:', error);
    next();
  }
};

module.exports = { logActivity };
