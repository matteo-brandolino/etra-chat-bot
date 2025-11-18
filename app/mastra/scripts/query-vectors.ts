import 'dotenv/config';
import { PgVector } from '@mastra/pg';

async function queryIndex(pgVector: PgVector, indexName: string) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Index: ${indexName}`);
    console.log('='.repeat(60));

    // Get index info
    const indexInfo = await pgVector.describeIndex({
      indexName: indexName,
    });
    console.log('Info:', indexInfo);

    // Query some sample vectors
    console.log(`\n🔍 Sample Vectors (first 3):`);
    const sampleResults = await pgVector.query({
      indexName: indexName,
      queryVector: new Array(1536).fill(0), // Dummy query to get all results
      topK: 3,
      includeVector: false, // Don't include the full vector to keep output clean
    });

    sampleResults.forEach((result, i) => {
      console.log(`\n${i + 1}. ID: ${result.id}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Text: ${result.metadata?.text?.substring(0, 80)}...`);
      console.log(`   Source: ${result.metadata?.source}`);
    });
  } catch (error: any) {
    console.log(`❌ Error querying ${indexName}:`, error.message);
  }
}

async function queryVectors() {
  console.log('🔍 Connecting to PostgreSQL...\n');

  const pgVector = new PgVector({
    connectionString: process.env.POSTGRES_CONNECTION_STRING!,
  });

  // Query both indexes
  await queryIndex(pgVector, 'waste_collection_info');
  await queryIndex(pgVector, 'waste_collection_zones');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Query completed successfully!');
  console.log('='.repeat(60));
}

queryVectors().catch(console.error);
