import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:3001/auth/gmail/callback'
);

let gmail = null;

export async function initGmail(tokens) {
  oauth2Client.setCredentials(tokens);
  gmail = google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function getEmails(query = '', maxResults = 10) {
  if (!gmail) return { error: 'Gmail not connected' };
  
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults
  });
  
  const messages = await Promise.all(
    (res.data.messages || []).map(async (msg) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const headers = detail.data.payload.headers;
      return {
        from: headers.find(h => h.name === 'From')?.value,
        subject: headers.find(h => h.name === 'Subject')?.value,
        snippet: detail.data.snippet
      };
    })
  );
  
  return messages;
}

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  });
}

export async function getTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
