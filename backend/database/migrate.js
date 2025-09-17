#!/usr/bin/env node

/**
 * Database migration and seeding script for Smart Toll System
 * Run with: node database/migrate.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Smart Toll Database Migration...\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'init.sql');
    const sqlScript = fs.readFileSync(sqlFile, 'utf8');

    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await client.query(statement);
        successCount++;
        
        // Log progress for major operations
        if (statement.toLowerCase().includes('create table')) {
          const tableName = statement.match(/create table (\w+)/i)?.[1];
          console.log(`✅ Created table: ${tableName}`);
        } else if (statement.toLowerCase().includes('insert into')) {
          const tableName = statement.match(/insert into (\w+)/i)?.[1];
          console.log(`📝 Inserted data into: ${tableName}`);
        } else if (statement.toLowerCase().includes('create index')) {
          const indexName = statement.match(/create index (\w+)/i)?.[1];
          console.log(`🔍 Created index: ${indexName}`);
        }
      } catch (error) {
        errorCount++;
        
        // Skip some expected errors during development
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist')) {
          console.log(`⚠️  Skipped: ${error.message.split('\n')[0]}`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    // Verify the setup
    console.log('\n🔍 Verifying database setup...');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Database Tables:');
    tables.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    // Get counts
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM toll_gates) as toll_gates,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM transactions) as transactions,
        (SELECT COUNT(*) FROM recharges) as recharges,
        (SELECT SUM(balance) FROM wallets) as total_balance
    `);

    const stats = counts.rows[0];
    
    console.log('\n📈 Database Statistics:');
    console.log(`   • Users: ${stats.users}`);
    console.log(`   • Toll Gates: ${stats.toll_gates}`);
    console.log(`   • Vehicles: ${stats.vehicles}`);
    console.log(`   • Transactions: ${stats.transactions}`);
    console.log(`   • Recharges: ${stats.recharges}`);
    console.log(`   • Total Wallet Balance: ₹${stats.total_balance}`);

    console.log('\n✅ Database migration completed successfully!');
    console.log(`   • ${successCount} statements executed`);
    console.log(`   • ${errorCount} errors/warnings`);
    
    console.log('\n🔐 Sample Login Credentials:');
    console.log('   Admin: admin@smarttoll.com / Admin123!');
    console.log('   User:  john.doe@example.com / Test123!');
    
    console.log('\n🌐 You can now start the server with: npm run dev');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Check if database connection is available
async function checkConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. PostgreSQL is running');
    console.error('2. DATABASE_URL is correctly set in .env file');
    console.error('3. Database exists and is accessible');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🏗️  Smart Toll Database Migration Tool\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please create a .env file with DATABASE_URL=your_postgres_connection_string');
    process.exit(1);
  }

  const connected = await checkConnection();
  if (!connected) {
    process.exit(1);
  }

  await runMigration();
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration, checkConnection };