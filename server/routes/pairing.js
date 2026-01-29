import crypto from 'crypto';

export function setupPairingRoutes(app, db) {
  // Generate pairing code
  app.post('/pair/start', (req, res) => {
    const pairId = crypto.randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    db.prepare(`
      INSERT INTO pairing_sessions (pair_id, code, expires_at)
      VALUES (?, ?, ?)
    `).run(pairId, code, expiresAt.toISOString());
    
    res.json({
      pair_id: pairId,
      code,
      expires_at: expiresAt.toISOString()
    });
  });

  // Confirm pairing and issue token
  app.post('/pair/confirm', (req, res) => {
    const { pair_id, code, device_name } = req.body;
    
    if (!pair_id || !code || !device_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check pairing session
    const session = db.prepare(`
      SELECT * FROM pairing_sessions 
      WHERE pair_id = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
    `).get(pair_id, code);
    
    if (!session) {
      return res.status(400).json({ error: 'Invalid or expired pairing code' });
    }
    
    // Generate device token
    const deviceToken = crypto.randomBytes(32).toString('hex');
    const scopes = 'desktop_full';
    
    // Save device
    db.prepare(`
      INSERT INTO devices (token, device_name, scopes)
      VALUES (?, ?, ?)
    `).run(deviceToken, device_name, scopes);
    
    // Mark session as used
    db.prepare(`
      UPDATE pairing_sessions SET used = 1 WHERE pair_id = ?
    `).run(pair_id);
    
    res.json({
      device_token: deviceToken,
      scopes: scopes.split(','),
      device_name
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}