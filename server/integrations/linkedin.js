let accessToken = null;

export function setLinkedInToken(token) {
  accessToken = token;
}

export async function getNotifications() {
  if (!accessToken) return { error: 'LinkedIn not connected' };
  
  const res = await fetch('https://api.linkedin.com/v2/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  return await res.json();
}

export function getAuthUrl() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = 'http://localhost:3001/auth/linkedin/callback';
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=r_liteprofile%20r_emailaddress`;
}

export async function getTokens(code) {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: 'http://localhost:3001/auth/linkedin/callback'
    })
  });
  
  return await res.json();
}
