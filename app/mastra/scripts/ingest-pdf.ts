import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';

const execFileAsync = promisify(execFile);

// Types
interface PageAnalysis {
  pageNumber: number;
  imagePath: string;
  fileName: string;
  analysis: {
    description: string;
    extractedText: string;
    keyInformation: string[];
    category: string;
    summary: string;
  };
  metadata: {
    fileSize: number;
    processedAt: string;
  };
}

interface VectorStoreDocument {
  pdfFileName: string;
  totalPages: number;
  processedAt: string;
  pages: PageAnalysis[];
}

interface ConversionOptions {
  outputDir?: string;
  format?: 'png' | 'jpeg';
  dpi?: number;
}

// PDF to Images conversion using pdftoppm
async function pdfToImages(
  pdfPath: string,
  options: ConversionOptions = {}
): Promise<string[]> {
  const {
    outputDir = './output',
    format = 'png',
    dpi = 300
  } = options;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const absolutePdfPath = path.resolve(pdfPath);
  const baseName = path.basename(pdfPath, path.extname(pdfPath));
  const outputPrefix = path.join(outputDir, baseName);

  console.log(`📄 Processing PDF: ${pdfPath}`);
  console.log(`   Output directory: ${outputDir}`);
  console.log(`   Format: ${format}, DPI: ${dpi}`);

  try {
    // Build pdftoppm command arguments
    const args = [
      '-' + format,
      '-r', dpi.toString(),
      absolutePdfPath,
      outputPrefix
    ];

    // Execute pdftoppm command
    await execFileAsync('pdftoppm', args);

    // Find all generated images
    const files = fs.readdirSync(outputDir);
    const outputPaths = files
      .filter(file => file.startsWith(baseName) && file.endsWith(`.${format}`))
      .map(file => path.join(outputDir, file))
      .sort();

    console.log(`   ✅ Converted ${outputPaths.length} page(s) to images`);

    return outputPaths;

  } catch (error) {
    throw new Error(`Failed to convert PDF: ${error}`);
  }
}

// Vision Analyzer class
class VisionAnalyzer {
  private openaiClient: OpenAI;

  constructor(apiKey: string) {
    this.openaiClient = new OpenAI({ apiKey });
  }

  async analyzeImage(imagePath: string, pageNumber: number): Promise<PageAnalysis> {
    console.log(`   🔍 Analyzing page ${pageNumber}...`);

    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analizza questa pagina ${pageNumber} di un calendario per la raccolta differenziata dei rifiuti.

Se la pagina contiene un CALENDARIO con date e tipologie di rifiuti:
- Estrai TUTTE le date visibili nel formato ESATTO: YYYY-MM-DD Zona A: Tipo rifiuto, Tipo rifiuto
- Esempio corretto: "2025-01-03 Zona A: Umido organico, Carta e cartone"
- Esempio corretto: "2025-01-15 Zona B: Plastica e metalli, Umido organico"
- IMPORTANTE: Usa ESATTAMENTE questo formato, rispettando maiuscole/minuscole
- IMPORTANTE: Metti ogni data su una riga separata
- Se ci sono più zone per la stessa data, crea righe separate

Se la pagina contiene INFORMAZIONI GENERALI (copertina, istruzioni, contatti, centri raccolta):
- Fornisci una breve descrizione (1 riga) del contenuto della pagina

Rispondi in JSON con questi campi:
{
  "description": "Breve descrizione della pagina (1 riga)",
  "extractedText": "Testo estratto nel formato corretto, una riga per entry",
  "category": "calendar" o "info"
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ]
      });

      const content = response.choices[0].message.content || '{}';

      // Try to parse JSON response
      let analysis;
      try {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
        const jsonContent = jsonMatch ? jsonMatch[1] : content;
        analysis = JSON.parse(jsonContent);
      } catch (parseError) {
        analysis = {
          description: content,
          extractedText: '',
          category: 'unknown'
        };
      }

      const stats = fs.statSync(imagePath);

      return {
        pageNumber,
        imagePath,
        fileName: path.basename(imagePath),
        analysis: {
          description: analysis.description || '',
          extractedText: analysis.extractedText || '',
          keyInformation: [],
          category: analysis.category || 'unknown',
          summary: ''
        },
        metadata: {
          fileSize: stats.size,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`   ❌ Error analyzing page ${pageNumber}:`, error);
      throw error;
    }
  }

  async analyzeAllImages(
    imagePaths: string[],
    pdfFileName: string
  ): Promise<VectorStoreDocument> {
    console.log(`\n🤖 Starting vision analysis of ${imagePaths.length} images...\n`);

    const pages: PageAnalysis[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const pageNumber = i + 1;

      try {
        const analysis = await this.analyzeImage(imagePath, pageNumber);
        pages.push(analysis);
        console.log(`   ✅ Page ${pageNumber} analyzed`);
      } catch (error) {
        console.error(`   ❌ Failed to analyze page ${pageNumber}`);
        pages.push({
          pageNumber,
          imagePath,
          fileName: path.basename(imagePath),
          analysis: {
            description: 'Analysis failed',
            extractedText: '',
            keyInformation: [],
            category: 'error',
            summary: 'Failed to analyze this page'
          },
          metadata: {
            fileSize: fs.statSync(imagePath).size,
            processedAt: new Date().toISOString()
          }
        });
      }

      // Delay to avoid rate limiting
      if (i < imagePaths.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      pdfFileName,
      totalPages: imagePaths.length,
      processedAt: new Date().toISOString(),
      pages
    };
  }
}

// Extract calendar entries from document
async function extractCalendarEntries(
  document: VectorStoreDocument,
  indexName: string
): Promise<number> {
  console.log(`\n📊 Extracting calendar entries from ${document.pages.length} pages...`);

  // Create text chunks from each page analysis
  const chunks: string[] = [];
  const metadata: any[] = [];

  // Extract comune name from index name (e.g., "borgoricco_2025" -> "Borgoricco")
  const comune = indexName.split('_')[0]
    .replace(/^\w/, c => c.toUpperCase());

  for (const page of document.pages) {
    const extractedText = page.analysis.extractedText || '';

    // Parse calendar entries from extracted text
    // Expected format: "2025-01-03 Zona A: Umido organico, Carta e cartone"
    const lines = extractedText.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Match pattern: DATE Zona X: WASTE_TYPES
      const match = trimmedLine.match(/^(\d{4}-\d{2}-\d{2})\s+Zona\s+([AB]):\s+(.+)$/);

      if (match) {
        const [, date, zona, wasteTypes] = match;

        // Create structured chunk: DATE | ZONA | WASTE_TYPES | COMUNE
        const structuredChunk = `${date} | Zona ${zona} | ${wasteTypes} | ${comune}`;

        chunks.push(structuredChunk);
        metadata.push({
          text: structuredChunk,
          date: date,
          zona: `Zona ${zona}`,
          wasteTypes: wasteTypes,
          comune: comune,
          pdfFileName: document.pdfFileName,
          pageNumber: page.pageNumber,
          processedAt: page.metadata.processedAt,
          source: 'pdf-calendar-analysis'
        });
      }
    }
  }

  console.log(`   ✅ Extracted ${chunks.length} calendar entries`);
  return chunks.length;
}

// Main function
async function main() {
  // Default input and output directories
  const inputDir = './app/mastra/knowledge/calendars/input';
  const outputDir = './app/mastra/knowledge/calendars/output';
  const dpi = 300;

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Error: Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  // Find all PDF files in the input directory
  const files = fs.readdirSync(inputDir);
  const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    console.error(`❌ Error: No PDF files found in ${inputDir}`);
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('🚀 Starting PDF ingestion pipeline...\n');
  console.log(`📂 Input directory: ${inputDir}`);
  console.log(`📄 Found ${pdfFiles.length} PDF file(s) to process\n`);

  const analyzer = new VisionAnalyzer(apiKey);
  let totalPagesProcessed = 0;
  let totalVectorsIngested = 0;

  // Process each PDF file
  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfFile = pdfFiles[i];
    const pdfPath = path.join(inputDir, pdfFile);

    // Generate index name from filename (remove extension and sanitize)
    const indexName = path.basename(pdfFile, '.pdf')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    console.log('='.repeat(60));
    console.log(`Processing file ${i + 1}/${pdfFiles.length}: ${pdfFile}`);
    console.log(`Index name: ${indexName}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Convert PDF to images
      const imagePaths = await pdfToImages(pdfPath, {
        outputDir,
        dpi,
        format: 'png'
      });

      // Step 2: Analyze images with Vision
      const pdfFileName = path.basename(pdfPath);
      const document = await analyzer.analyzeAllImages(imagePaths, pdfFileName);

      // Step 3: Save analysis to TXT in calendars/output folder
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const txtOutputPath = path.join(outputDir, `${path.basename(pdfPath, '.pdf')}_data.txt`);

      // Format as data.txt style
      let txtContent = '# INFORMAZIONI CALENDARIO\n';

      // First, add all info pages (descriptions)
      for (const page of document.pages) {
        if (page.analysis.category === 'info' && page.analysis.description) {
          txtContent += `# ${page.analysis.description}\n`;
        }
      }

      // Add a blank line between info and calendar entries
      txtContent += '\n';

      // Then, add all calendar entries
      for (const page of document.pages) {
        if (page.analysis.category === 'calendar' && page.analysis.extractedText) {
          // Add each line from extractedText
          const lines = page.analysis.extractedText.split('\n').filter(l => l.trim());
          for (const line of lines) {
            txtContent += `${line}\n`;
          }
        }
      }

      fs.writeFileSync(txtOutputPath, txtContent);
      console.log(`\n📄 Analysis saved to: ${txtOutputPath}`);

      // Step 4: Extract calendar entries
      const entriesExtracted = await extractCalendarEntries(document, indexName);

      totalPagesProcessed += imagePaths.length;
      totalVectorsIngested += entriesExtracted;

      // Step 5: Clean up images
      console.log(`\n🧹 Cleaning up images...`);
      for (const imagePath of imagePaths) {
        try {
          fs.unlinkSync(imagePath);
        } catch (error) {
          console.error(`   ⚠️  Failed to delete ${imagePath}`);
        }
      }
      console.log(`   ✅ Deleted ${imagePaths.length} image(s)`);

      // Summary for this file
      console.log('\n✅ File completed successfully!');
      console.log(`   - Pages converted: ${imagePaths.length}`);
      console.log(`   - Pages analyzed: ${document.pages.length}`);
      console.log(`   - Calendar entries extracted: ${entriesExtracted}`);

    } catch (error) {
      console.error(`\n❌ Error processing ${pdfFile}:`, error);
      console.log('Continuing with next file...\n');
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ PDF processing completed!');
  console.log(`📊 Total Summary:`);
  console.log(`   - Files processed: ${pdfFiles.length}`);
  console.log(`   - Total pages: ${totalPagesProcessed}`);
  console.log(`   - Total calendar entries: ${totalVectorsIngested}`);
  console.log(`   - TXT files saved to: ${outputDir}`);
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);
