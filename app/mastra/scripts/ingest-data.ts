import 'dotenv/config';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import { readFile, access, readdir } from 'fs/promises';
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

async function ingestCalendarsFolder(
  calendarsDir: string,
  pgVector: PgVector
): Promise<number> {
  console.log(`\n📅 Processing calendars from ${calendarsDir}...`);

  // Read all *_data.txt files from calendars directory
  let files: string[] = [];
  try {
    const allFiles = await readdir(calendarsDir);
    files = allFiles.filter(f => f.endsWith('_data.txt'));
  } catch (error) {
    console.log(`⚠️  Calendars directory not found, skipping...`);
    return 0;
  }

  if (files.length === 0) {
    console.log(`⚠️  No calendar files found, skipping...`);
    return 0;
  }

  console.log(`   Found ${files.length} calendar file(s)`);

  let totalEntries = 0;

  for (const file of files) {
    const filePath = join(calendarsDir, file);

    // Extract comune name from filename (e.g., "borgoricco_2025_data.txt" -> "borgoricco_2025")
    const indexName = file.replace('_data.txt', '').toLowerCase();

    console.log(`\n   📄 Processing ${file}...`);
    console.log(`      Index name: ${indexName}`);

    const content = await readFile(filePath, 'utf-8');

    // Parse lines: 1 calendar entry = 1 line = 1 embedding
    // Expected format: "2025-01-03 | Zona A | Umido organico, Carta e cartone | Borgoricco"
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#')); // Skip comments and empty lines

    if (lines.length === 0) {
      console.log(`      ⚠️  No calendar entries found in ${file}`);
      continue;
    }

    console.log(`      Found ${lines.length} calendar entries`);

    // Generate embeddings for each line
    console.log(`      Generating embeddings...`);
    const { embeddings } = await embedMany({
      values: lines,
      model: openai.embedding('text-embedding-3-small'),
    });

    console.log(`      Generated ${embeddings.length} embeddings`);

    // Create index if it doesn't exist
    console.log(`      Creating/checking index '${indexName}'...`);
    try {
      await pgVector.createIndex({
        indexName: indexName,
        dimension: 1536,
      });
      console.log(`      ✅ Index '${indexName}' ready`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`      ✅ Index '${indexName}' already exists`);
      } else {
        throw error;
      }
    }

    // Prepare metadata: parse each line
    const metadata = lines.map((line, i) => {
      const parts = line.split('|').map(p => p.trim());
      return {
        text: line,
        date: parts[0] || '',
        zona: parts[1] || '',
        wasteTypes: parts[2] || '',
        comune: parts[3] || '',
        lineIndex: i,
        source: file,
      };
    });

    // Upsert vectors
    console.log(`      Upserting vectors to database...`);
    await pgVector.upsert({
      indexName: indexName,
      vectors: embeddings,
      metadata,
    });

    console.log(`      ✅ ${file} ingestion completed!`);
    totalEntries += lines.length;
  }

  return totalEntries;
}

async function ingestData() {
  console.log('🚀 Starting data ingestion...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const sourceArg = args[0]; // 'calendars', 'zones', or 'all'

  // 1. Initialize PgVector
  const pgVector = new PgVector({
    connectionString: process.env.POSTGRES_URL!,
  });

  // 2. Ingest files based on argument
  let totalChunks = 0;

  const calendarsDir = join(process.cwd(), 'app', 'mastra', 'knowledge', 'calendars', 'output');
  const zonesPath = join(process.cwd(), 'app', 'mastra', 'knowledge', 'etra_zones.txt');

  // Define index name for zones
  const ZONES_INDEX = 'waste_collection_zones';

  if (!sourceArg || sourceArg === 'all') {
    console.log('📚 Ingesting all sources...');
    totalChunks += await ingestCalendarsFolder(calendarsDir, pgVector);
    totalChunks += await ingestZonesFile(zonesPath, 'etra_zones.txt', ZONES_INDEX, pgVector);
  } else if (sourceArg === 'calendars') {
    console.log('📚 Ingesting only calendars...');
    totalChunks += await ingestCalendarsFolder(calendarsDir, pgVector);
  } else if (sourceArg === 'zones') {
    console.log('📚 Ingesting only etra_zones.txt (line-by-line)...');
    totalChunks += await ingestZonesFile(zonesPath, 'etra_zones.txt', ZONES_INDEX, pgVector);
  } else {
    console.error(`❌ Invalid argument: ${sourceArg}`);
    console.log('Usage: npx tsx app/mastra/scripts/ingest-data.ts [all|calendars|zones]');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Data ingestion completed successfully!');
  console.log(`📊 Total entries processed: ${totalChunks}`);
  console.log('='.repeat(60));
}

// Run the ingestion
ingestData().catch(console.error);
