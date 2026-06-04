import { chromium, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

const MOVIE_JSON_PATH = path.join(__dirname, "movie.json");
const CSV_PATH = path.join(__dirname, "TMDB_movie_dataset_v11.csv");
const CHATGPT_URL = "https://chatgpt.com";
const SUB_BATCH_SIZE = 25; // movies per ChatGPT tab
const PARALLEL_TABS = 4; // number of concurrent ChatGPT tabs

// Read existing movies
function readExistingMovies(): any[] {
    try {
        const data = fs.readFileSync(MOVIE_JSON_PATH, "utf-8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Save movies to file
function saveMovies(movies: any[]) {
    fs.writeFileSync(MOVIE_JSON_PATH, JSON.stringify(movies, null, 2), "utf-8");
    console.log(`Saved ${movies.length} movies to movie.json`);
}

// Wait for ChatGPT to finish responding
async function waitForResponse(page: Page, timeoutMs = 120000) {
    await page.waitForTimeout(5000); // initial wait for generation to start
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        // Check if "Continue generating" button appears (response was truncated)
        const continueBtn = page.locator('button:has-text("Continue generating")');
        if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log("Clicking 'Continue generating'...");
            await continueBtn.click();
            await page.waitForTimeout(5000);
            continue;
        }

        // Check if stop button is gone (response finished)
        const stopVisible = await page.locator('button[data-testid="stop-button"]')
            .isVisible({ timeout: 1000 }).catch(() => false);
        if (!stopVisible) {
            console.log("Response complete (stop button gone)");
            break;
        }

        await page.waitForTimeout(2000);
    }

    await page.waitForTimeout(3000); // extra buffer
}

// Extract JSON from the last ChatGPT response
async function extractJsonFromResponse(page: Page): Promise<any[] | null> {
    // Method 1: Try to get text from code blocks (most reliable — ChatGPT wraps JSON in <pre><code>)
    const codeBlockText = await page.evaluate(() => {
        const messages = document.querySelectorAll(
            '[data-message-author-role="assistant"]'
        );
        if (messages.length === 0) return null;
        const lastMessage = messages[messages.length - 1];
        // Try all code/pre elements
        const codeEls = lastMessage?.querySelectorAll("pre code, code, pre");
        if (!codeEls || codeEls.length === 0) return null;
        // Get the longest code block (likely the JSON)
        let longest = "";
        codeEls.forEach((el) => {
            const text = el.textContent || "";
            if (text.length > longest.length) longest = text;
        });
        return longest || null;
    });

    if (codeBlockText) {
        console.log(`Found code block text (${codeBlockText.length} chars)`);
        const match = codeBlockText.match(/\[[\s\S]*\]/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e) {
                console.log("Failed to parse code block JSON:", (e as Error).message);
            }
        }
    }

    // Method 2: Try the full response text
    const responseText = await page.evaluate(() => {
        const messages = document.querySelectorAll(
            '[data-message-author-role="assistant"]'
        );
        if (messages.length === 0) return null;
        const lastMessage = messages[messages.length - 1];
        return (lastMessage as HTMLElement)?.innerText || lastMessage?.textContent || null;
    });

    if (!responseText) {
        console.log("No response text found at all");
        return null;
    }

    console.log(`Full response text (${responseText.length} chars), first 500: ${responseText.substring(0, 500)}`);

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.log("Failed to parse JSON from full text:", (e as Error).message);
            // Try to save the raw text for debugging
            fs.writeFileSync(
                path.join(__dirname, "debug-response.txt"),
                responseText,
                "utf-8"
            );
            console.log("Saved raw response to debug-response.txt for inspection");
        }
    }

    // Method 3: Try the copy button to get clean text
    try {
        const copyBtn = page.locator('[data-testid="copy-turn-action-button"]').last();
        if (await copyBtn.isVisible({ timeout: 3000 })) {
            await copyBtn.click();
            await page.waitForTimeout(500);
            const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
            console.log(`Clipboard text (${clipboardText.length} chars)`);
            const clipMatch = clipboardText.match(/\[[\s\S]*\]/);
            if (clipMatch) {
                return JSON.parse(clipMatch[0]);
            }
        }
    } catch {
        console.log("Copy button method failed");
    }

    return null;
}

// Send a prompt to ChatGPT
async function sendPrompt(page: Page, prompt: string) {
    // Find the textarea / contenteditable prompt box
    const promptBox = page.locator("#prompt-textarea");
    await promptBox.waitFor({ state: "visible", timeout: 30000 });
    await promptBox.click();

    // Type the prompt in chunks to avoid issues with large text
    await promptBox.fill(prompt);
    await page.waitForTimeout(500);

    // Click send button
    const sendButton = page.locator('button[data-testid="send-button"]');
    await sendButton.click();
}

// Read movie names from CSV file
function readMovieNamesFromCSV(): string[] {
    const data = fs.readFileSync(CSV_PATH, "utf-8");
    return data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

// Process a single sub-batch in its own tab
async function processSubBatch(
    browser: any,
    chunk: string[],
    chunkStart: number,
    label: string
): Promise<any[]> {
    console.log(`  [${label}] Starting movies ${chunkStart}-${chunkStart + chunk.length - 1}`);

    const tab = await browser.newPage();
    await tab.goto(CHATGPT_URL, { waitUntil: "networkidle", timeout: 60000 });
    await tab.waitForTimeout(3000);

    try {
        await tab.waitForSelector("#prompt-textarea", { timeout: 30000 });
    } catch {
        console.log(`  [${label}] Waiting for prompt box...`);
        await tab.waitForSelector("#prompt-textarea", { timeout: 60000 });
    }

    const sampleEntry = {
        movie: "Example Movie",
        tags: "tag1, tag2, tag3, tag4, tag5, ...",
    };

    const prompt = `Generate a JSON array for these ${chunk.length} movies with this exact schema for each:
${JSON.stringify(sampleEntry, null, 2)}

Where:
- "movie" is the movie name
- "tags" is a comma-separated string of around 50 descriptive tags including genre, themes, characters, directors, actors, mood, style

Movies to process:
${chunk.join(", ")}

Output ONLY the raw JSON array. No explanation, no markdown, no code fences. Just the JSON.`;

    await sendPrompt(tab, prompt);
    await waitForResponse(tab, 300000);

    const movieData = await extractJsonFromResponse(tab);
    await tab.close();

    if (movieData && Array.isArray(movieData)) {
        console.log(`  [${label}] Got ${movieData.length} movies`);
        return movieData;
    } else {
        console.error(`  [${label}] Failed to parse sub-batch`);
        return [];
    }
}

// Mutex for safe file writes from parallel tasks
let saveLock = Promise.resolve();
function saveMoviesSafe(newEntries: any[]) {
    saveLock = saveLock.then(() => {
        const existing = readExistingMovies();
        saveMovies([...existing, ...newEntries]);
    });
    return saveLock;
}

// Generate movie JSON data from ChatGPT — processes in parallel sub-batches
async function generateMovieData(
    browser: any,
    movieNames: string[],
    startRank: number
): Promise<any[]> {
    // Build all chunks
    const chunks: { chunk: string[]; chunkStart: number; label: string }[] = [];
    for (let i = 0; i < movieNames.length; i += SUB_BATCH_SIZE) {
        const chunk = movieNames.slice(i, i + SUB_BATCH_SIZE);
        const chunkStart = startRank + i;
        const label = `Batch-${Math.floor(i / SUB_BATCH_SIZE) + 1}`;
        chunks.push({ chunk, chunkStart, label });
    }

    console.log(`Total sub-batches: ${chunks.length}, running ${PARALLEL_TABS} in parallel`);

    const allResults: any[] = [];

    // Process in waves of PARALLEL_TABS
    for (let w = 0; w < chunks.length; w += PARALLEL_TABS) {
        const wave = chunks.slice(w, w + PARALLEL_TABS);
        console.log(`\n--- Wave ${Math.floor(w / PARALLEL_TABS) + 1}: sub-batches ${w + 1}-${w + wave.length} ---`);

        const results = await Promise.all(
            wave.map((c) => processSubBatch(browser, c.chunk, c.chunkStart, c.label))
        );

        for (const batch of results) {
            if (batch.length > 0) {
                allResults.push(...batch);
                await saveMoviesSafe(batch);
            }
        }
    }

    if (allResults.length === 0) {
        throw new Error("Failed to parse any movie data from ChatGPT");
    }
    return allResults;
}

async function main() {
    const existingMovies = readExistingMovies();
    console.log(`Starting with ${existingMovies.length} existing movies`);

    // Read all movie names from CSV and filter out already processed ones
    const allCsvMovies = readMovieNamesFromCSV();
    const existingNames = new Set(existingMovies.map((m: any) => m.movie.toLowerCase()));
    const pendingMovies = allCsvMovies.filter((name) => !existingNames.has(name.toLowerCase()));
    console.log(`CSV has ${allCsvMovies.length} movies, ${pendingMovies.length} remaining to process`);

    if (pendingMovies.length === 0) {
        console.log("All movies already processed!");
        return;
    }

    // Launch browser
    const profileDir = path.join(__dirname, ".chrome-profile");
    const browser = await chromium.launchPersistentContext(profileDir, {
        headless: false,
        channel: "chrome",
        viewport: { width: 1280, height: 900 },
        args: ["--disable-blink-features=AutomationControlled"],
    });

    let allMovies = [...existingMovies];
    const startRank = allMovies.length + 1;

    try {
        const newMovies = await generateMovieData(browser, pendingMovies, startRank);
        console.log(`Generated data for ${newMovies.length} movies`);
        allMovies = [...allMovies, ...newMovies];
        saveMovies(allMovies);
        console.log(`Total movies now: ${allMovies.length}`);
    } catch (e) {
        console.error("Failed to generate movie data:", e);
    }

    console.log("\n✅ Done! Closing browser...");
    await browser.close();
}

main().catch(console.error);