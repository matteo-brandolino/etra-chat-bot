import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkDatabase() {
  console.log('🔍 Checking PostgreSQL database...\n');

  const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING!,
  });

  try {
    // Check connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL');

    // Check if pgvector extension is installed
    const extensionCheck = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);

    if (extensionCheck.rows.length > 0) {
      console.log('✅ pgvector extension is installed');
    } else {
      console.log('❌ pgvector extension is NOT installed');
      console.log('   Run: CREATE EXTENSION IF NOT EXISTS vector;');
    }

    // Check for both tables
    const tables = ['waste_collection_info', 'waste_collection_zones'];

    for (const tableName of tables) {
      const tableCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1;
      `, [tableName]);

      if (tableCheck.rows.length > 0) {
        console.log(`✅ ${tableName} table exists`);

        // Get row count
        const countResult = await client.query(`
          SELECT COUNT(*) as count FROM ${tableName};
        `);
        const count = countResult.rows[0].count;
        console.log(`   Total vectors: ${count}`);

        if (count > 0) {
          // Show sample data
          const sampleResult = await client.query(`
            SELECT id, metadata
            FROM ${tableName}
            LIMIT 3;
          `);

          console.log(`   Sample data:`);
          sampleResult.rows.forEach((row, i) => {
            console.log(`      ${i + 1}. ID: ${row.id}`);
            if (row.metadata?.text) {
              console.log(`         Text: ${row.metadata.text.substring(0, 60)}...`);
            }
          });
        }
        console.log('');
      } else {
        console.log(`❌ ${tableName} table does NOT exist`);
        console.log(`   Run: pnpm run ingest\n`);
      }
    }

    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 All tables in database:');
    tablesResult.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    client.release();
    await pool.end();

    console.log('\n✅ Database check completed!');
  } catch (error: any) {
    console.error('\n❌ Error checking database:', error.message);
    await pool.end();
    throw error;
  }
}

checkDatabase().catch(console.error);
