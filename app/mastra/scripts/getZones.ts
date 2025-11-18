import { writeFileSync } from "fs";
import { join } from "path";
import puppeteer, { Browser, Page } from "puppeteer";

interface Municipality {
  value: string;
  sanitUrl: string;
  name: string;
}

interface AddressOption {
  code: string;
  name: string;
}

interface MunicipalityResult {
  municipality: string;
  municipality_value: string;
  municipality_url: string;
  address_options: AddressOption[];
  error?: string;
}

interface ScrapingOutput {
  scraping_date: string;
  total_municipalities: number;
  results: MunicipalityResult[];
}

// Function to extract municipality details from HTML page
function extractMunicipalityDetails(html: string): Municipality[] {
  const municipalities: Municipality[] = [];
  // Updated regex to handle double quotes
  const regex =
    /<option value="([^"]+)" data-saniturl="([^"]+)">([^<]+)<\/option>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const [, value, sanitUrl, name] = match;
    if (value !== "-1" && name !== "ALTRI COMUNI") {
      municipalities.push({ value, sanitUrl, name });
    }
  }

  return municipalities;
}

// Function to extract address options from page using Puppeteer
async function extractAddressOptions(page: Page): Promise<AddressOption[]> {
  try {
    // Check if the address selector exists (without strict timeout)
    const selectorExists = await page.$("#address-selector");

    if (!selectorExists) {
      return [];
    }

    // Extract all option values and text from the selector
    const options = await page.evaluate(() => {
      const select = document.querySelector(
        "#address-selector"
      ) as HTMLSelectElement;
      if (!select) return [];

      const optionElements = Array.from(select.querySelectorAll("option"));
      return optionElements
        .map((option) => ({
          code: option.value,
          name: option.textContent?.trim() || "",
        }))
        .filter((opt) => opt.code && opt.code.trim() !== "");
    });

    return options;
  } catch (error) {
    // If selector not found or error, return empty array
    return [];
  }
}

// Function to wait
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to generate RAG-optimized text from scraping results
// Format: Each line = Address | Municipality | Address Code | Municipality Code
function generateRagText(results: MunicipalityResult[]): string {
  const lines: string[] = [];

  // Header with format explanation
  lines.push("# ETRA - Database Indirizzi e Codici per Raccolta Rifiuti");
  lines.push("# Formato: INDIRIZZO | COMUNE | CODICE_INDIRIZZO | CODICE_COMUNE");
  lines.push("");

  for (const result of results) {
    // Skip municipalities with errors or no addresses
    if (result.error || result.address_options.length === 0) {
      continue;
    }

    // One line per address with all essential info
    for (const address of result.address_options) {
      lines.push(
        `${address.name} | ${result.municipality} | ${address.code} | ${result.municipality_value}`
      );
    }
  }

  return lines.join("\n");
}

async function main() {
  console.log("🚀 Starting ETRA scraping with Puppeteer...\n");

  // Launch browser
  console.log("🌐 Launching browser...");
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. Download a page to get the list of municipalities
    console.log("📥 Downloading page for municipality list...");
    const baseUrl =
      "https://www.etraspa.it/piombino-dese/casa/ambiente/modalit%C3%A0-di-conferimento";

    const page: Page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    const baseHtml = await page.content();

    // 2. Extract all municipalities
    const municipalities = extractMunicipalityDetails(baseHtml);
    console.log(`✅ Found ${municipalities.length} municipalities\n`);

    if (municipalities.length === 0) {
      throw new Error("No municipalities found in base page.");
    }

    const results: MunicipalityResult[] = [];

    // 3. For each municipality, select and extract address options
    for (let i = 0; i < municipalities.length; i++) {
      const municipality = municipalities[i];
      console.log(
        `[${i + 1}/${municipalities.length}] 🏘️  ${municipality.name}`
      );

      try {
        // If not the first iteration, go back to the base page
        if (i > 0) {
          console.log(`  ⬅️  Going back to base page...`);
          await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
          await page.waitForSelector("body", { timeout: 10000 });
        }

        // Step 1: Select the municipality from the comuni-option-list dropdown
        console.log(`  🔽 Selecting municipality in dropdown...`);
        const comuniSelectExists = await page.$(
          ".comuni-option-list.form-control"
        );
        if (comuniSelectExists) {
          await page.select(
            ".comuni-option-list.form-control",
            municipality.value
          );
          await sleep(500);
        }

        // Step 2: Click on the casa-ambiente link
        console.log(`  🏠 Clicking on casa-ambiente link...`);
        const casaAmbienteLink = await page.$(
          "li.casa-ambiente.casa-ambiente a"
        );
        if (casaAmbienteLink) {
          await casaAmbienteLink.click();
          await page.waitForNavigation({ waitUntil: "domcontentloaded" });
        }

        // Step 3: Click on "Modalità di conferimento - Trova la tua zona" link
        console.log(
          `  🔍 Clicking on 'Modalità di conferimento - Trova la tua zona'...`
        );
        const modalitaLinkFound = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll("a"));
          const targetLink = links.find((link) =>
            link.textContent?.includes(
              "Modalità di conferimento - Trova la tua zona"
            )
          );
          if (targetLink) {
            (targetLink as HTMLElement).click();
            return true;
          }
          return false;
        });

        if (modalitaLinkFound) {
          await page.waitForNavigation({ waitUntil: "domcontentloaded" });
          await sleep(1000);
        }
        // Extract address options from #address-selector
        const addressOptions = await extractAddressOptions(page);
        console.log(`  ✅ Found ${addressOptions.length} address options`);

        results.push({
          municipality: municipality.name,
          municipality_value: municipality.value,
          municipality_url: municipality.sanitUrl,
          address_options: addressOptions,
        });

        // Pause to avoid overloading the server (500ms)
        await sleep(500);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`  ❌ Error: ${errorMessage}`);
        results.push({
          municipality: municipality.name,
          municipality_value: municipality.value,
          municipality_url: municipality.sanitUrl,
          address_options: [],
          error: errorMessage,
        });
      }
    }

    // 4. Save results to knowledge directory
    console.log("💾 Saving results...");

    const output: ScrapingOutput = {
      scraping_date: new Date().toISOString(),
      total_municipalities: municipalities.length,
      results: results,
    };

    const knowledgeDir = join(process.cwd(), "knowledge");

    writeFileSync(
      join(knowledgeDir, "etra_results.json"),
      JSON.stringify(output, null, 2),
      "utf-8"
    );

    // 5. Generate RAG-optimized text file
    console.log("📝 Generating RAG-optimized text file...");
    const ragText = generateRagText(results);
    writeFileSync(join(knowledgeDir, "etra_zones.txt"), ragText, "utf-8");

    console.log("\n✨ Completed!");
    console.log(`📊 Total municipalities processed: ${municipalities.length}`);
    console.log(
      `📊 Total address options found: ${results.reduce((sum, r) => sum + r.address_options.length, 0)}`
    );
    console.log(`\n📁 Files saved in knowledge/:`);
    console.log(`   - etra_results.json`);
    console.log(`   - etra_zones.txt`);
  } finally {
    // Close browser
    console.log("\n🔒 Closing browser...");
    await browser.close();
  }
}

main().catch(console.error);
