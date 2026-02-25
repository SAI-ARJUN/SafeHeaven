import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function initializeDatabase() {
  try {
    // Connect without database selection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
    });

    console.log('📦 Connected to MySQL for initialization...');

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'safeheaven'}`);
    console.log('✅ Database created/verified');

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME || 'safeheaven'}`);

    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }
    
    console.log('✅ Database schema initialized');

    await connection.end();
    console.log('✅ Database initialization complete!\n');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}
