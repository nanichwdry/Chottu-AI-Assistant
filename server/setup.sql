-- Create database
CREATE DATABASE chottu;

-- Connect to database
\c chottu;

-- Create memories table
CREATE TABLE memories (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_memories_key ON memories(key);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
