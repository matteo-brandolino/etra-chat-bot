import 'dotenv/config';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

async function ingestFile(
  filePath: string,
  source: string,
  indexName: string,
  pgVector: PgVector
): Promise<number> {
  console.log(`\n📄 Processing ${source}...`);

  // Check if file exists
  try {
    await access(filePath);
  } catch (error) {
    console.log(`⚠️  File ${source} not found, skipping...`);
    return 0;
  }

  const content = await readFile(filePath, 'utf-8');

  console.log(`   Creating document from text...`);
  // 1. Initialize document
  const doc = MDocument.fromText(content);

  // 2. Create chunks
  console.log(`   Creating chunks...`);
  const chunks = await doc.chunk({
    strategy: 'recursive',
    maxSize: 512,
    overlap: 50,
  });

  console.log(`   Created ${chunks.length} chunks`);

  // 3. Generate embeddings
  console.log(`   Generating embeddings...`);
  const { embeddings } = await embedMany({
    values: chunks.map((chunk) => chunk.text),
    model: openai.embedding('text-embedding-3-small'),
  });

  console.log(`   Generated ${embeddings.length} embeddings`);

  // 4. Create index if it doesn't exist
  console.log(`   Creating/checking index '${indexName}'...`);
  try {
    await pgVector.createIndex({
      indexName: indexName,
      dimension: 1536, // text-embedding-3-small dimension
    });
    console.log(`   ✅ Index '${indexName}' ready`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log(`   ✅ Index '${indexName}' already exists`);
    } else {
      throw error;
    }
  }

  // Prepare metadata
  const metadata = chunks.map((chunk, i) => ({
    text: chunk.text,
    chunkIndex: i,
    source: source,
  }));

  // Upsert vectors
  console.log(`   Upserting vectors to database...`);
  await pgVector.upsert({
    indexName: indexName,
    vectors: embeddings,
    metadata,
  });

  console.log(`   ✅ ${source} ingestion completed!`);
  return chunks.length;
}

async function ingestZonesFile(
  filePath: string,
  source: string,
  indexName: string,
  pgVector: PgVector
): Promise<number> {
  console.log(`\n📄 Processing ${source} (line-by-line)...`);

  // Check if file exists
  try {
    await access(filePath);
  } catch (error) {
    console.log(`⚠️  File ${source} not found, skipping...`);
    return 0;
  }

  const content = await readFile(filePath, 'utf-8');

  // Parse lines: 1 address = 1 line = 1 embedding
  console.log(`   Parsing addresses line by line...`);
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#')); // Skip comments and empty lines

  console.log(`   Found ${lines.length} addresses`);

  // Generate embeddings for each line
  console.log(`   Generating embeddings...`);
  const { embeddings } = await embedMany({
    values: lines,
    model: openai.embedding('text-embedding-3-small'),
  });

  console.log(`   Generated ${embeddings.length} embeddings`);

  // Create index if it doesn't exist
  console.log(`   Creating/checking index '${indexName}'...`);
  try {
    await pgVector.createIndex({
      indexName: indexName,
      dimension: 1536, // text-embedding-3-small dimension
    });
    console.log(`   ✅ Index '${indexName}' ready`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log(`   ✅ Index '${indexName}' already exists`);
    } else {
      throw error;
    }
  }

  // Prepare metadata: each line is a complete address entry
  const metadata = lines.map((line, i) => {
    const parts = line.split('|').map(p => p.trim());
    return {
      text: line,
      address: parts[0] || '',
      municipality: parts[1] || '',
      addressCode: parts[2] || '',
      municipalityCode: parts[3] || '',
      lineIndex: i,
      source: source,
    };
  });

  // Upsert vectors
  console.log(`   Upserting vectors to database...`);
  await pgVector.upsert({
    indexName: indexName,
    vectors: embeddings,
    metadata,
  });

  console.log(`   ✅ ${source} ingestion completed!`);
  return lines.length;
}

async function ingestData() {
  console.log('🚀 Starting data ingestion...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const sourceArg = args[0]; // 'data', 'zones', or 'all'

  // 1. Initialize PgVector
  const pgVector = new PgVector({
    connectionString: 'postgresql://etra:etra_password@localhost:5432/etra_rag',
  });

  // 2. Ingest files based on argument
  let totalChunks = 0;

  const dataPath = join(process.cwd(), 'app', 'mastra', 'knowledge', 'data.txt');
  const zonesPath = join(process.cwd(), 'app', 'mastra', 'knowledge', 'etra_zones.txt');

  // Define index names for different data sources
  const DATA_INDEX = 'waste_collection_info';
  const ZONES_INDEX = 'waste_collection_zones';

  if (!sourceArg || sourceArg === 'all') {
    console.log('📚 Ingesting all sources...');
    totalChunks += await ingestFile(dataPath, 'data.txt', DATA_INDEX, pgVector);
    totalChunks += await ingestZonesFile(zonesPath, 'etra_zones.txt', ZONES_INDEX, pgVector);
  } else if (sourceArg === 'data') {
    console.log('📚 Ingesting only data.txt...');
    totalChunks += await ingestFile(dataPath, 'data.txt', DATA_INDEX, pgVector);
  } else if (sourceArg === 'zones') {
    console.log('📚 Ingesting only etra_zones.txt (line-by-line)...');
    totalChunks += await ingestZonesFile(zonesPath, 'etra_zones.txt', ZONES_INDEX, pgVector);
  } else {
    console.error(`❌ Invalid argument: ${sourceArg}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Data ingestion completed successfully!');
  console.log(`📊 Total chunks processed: ${totalChunks}`);
  console.log('📊 Indexes created:');
  if (!sourceArg || sourceArg === 'all' || sourceArg === 'data') {
    console.log(`   - ${DATA_INDEX} (general waste collection info)`);
  }
  if (!sourceArg || sourceArg === 'all' || sourceArg === 'zones') {
    console.log(`   - ${ZONES_INDEX} (municipality/address codes)`);
  }
  console.log('='.repeat(60));
}

// Run the ingestion
ingestData().catch(console.error);
