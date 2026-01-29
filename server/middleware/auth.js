export function authMiddleware(req, res, next) {
  // Skip auth for pairing endpoints and health check
  if (req.path.startsWith('/pair/') || req.path === '/api/health') {
    return next();
  }
  
  // Skip auth if disabled (dev only)
  if (process.env.AUTH_REQUIRED === 'false') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  const db = req.app.get('db');
  
  // Validate token
  const device = db.prepare(`
    SELECT * FROM devices 
    WHERE token = ? AND revoked = 0
  `).get(token);
  
  if (!device) {
    return res.status(401).json({ error: 'Invalid or revoked token' });
  }
  
  // Add device info to request
  req.device = {
    id: device.id,
    name: device.device_name,
    scopes: device.scopes.split(',')
  };
  
  next();
}