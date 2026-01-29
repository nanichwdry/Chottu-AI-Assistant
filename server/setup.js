import pg from 'pg';

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'postgres'
});

await client.connect();

try {
  await client.query('CREATE DATABASE chottu');
  console.log('✓ Database created');
} catch (e) {
  console.log('Database already exists');
}

await client.end();

const dbClient = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'chottu'
});

await dbClient.connect();

await dbClient.query(`
  CREATE TABLE IF NOT EXISTS memories (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  );
`);
console.log('✓ Memories table created');

await dbClient.query(`
  CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);
console.log('✓ Conversations table created');

await dbClient.query('CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key)');
await dbClient.query('CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC)');
console.log('✓ Indexes created');

await dbClient.end();
console.log('\n✓ Setup complete!');
