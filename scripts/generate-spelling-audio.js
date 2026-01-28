#!/usr/bin/env node

/**
 * ElevenLabs Spelling Audio Generation Script
 *
 * Generates audio clips for spelling words and individual letters (A-Z).
 *   - Words:   audio/words/{word}.mp3       (e.g. "wash.mp3")
 *   - Letters: audio/letters/{letter}.mp3   (e.g. "a.mp3")
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate-spelling-audio.js
 *
 * Options:
 *   --voice-id    ElevenLabs voice ID (default: Will - relaxed optimist)
 *   --resume      Skip existing files and resume from where it left off
 *   --dry-run     Print what would be generated without making API calls
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = 'bIHbv24MWmeRgasZH58o'; // "Will"
const VOICE_ID = process.argv.find(a => a.startsWith('--voice-id='))?.split('=')[1] || DEFAULT_VOICE_ID;
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');

// Rate limiting: ElevenLabs free tier allows ~10 req/min
const DELAY_MS = 6500;

// Current default spelling words
const WORDS = [
  'wash', 'wasp', 'watch', 'want', 'water',
  'swamp', 'swan', 'car', 'star', 'park',
  'garden', 'farmer', 'marble', "i'm", 'where',
];

// Letters A-Z
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORDS_DIR = path.join(PROJECT_ROOT, 'audio', 'words');
const LETTERS_DIR = path.join(PROJECT_ROOT, 'audio', 'letters');

function ensureDirs() {
  fs.mkdirSync(WORDS_DIR, { recursive: true });
  fs.mkdirSync(LETTERS_DIR, { recursive: true });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

/**
 * Sanitize a word for use as a filename.
 * Removes apostrophes, replaces spaces with underscores, lowercases.
 */
function sanitizeFilename(word) {
  return word.toLowerCase().replace(/'/g, '').replace(/\s+/g, '_');
}

/**
 * Generate speech via ElevenLabs API and save as MP3.
 */
function generateSpeech(text, outputPath) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
        'Content-Length': Buffer.byteLength(postData),
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 429) {
        console.log('  Rate limited, waiting 30s...');
        setTimeout(() => {
          generateSpeech(text, outputPath).then(resolve).catch(reject);
        }, 30000);
        return;
      }

      if (res.statusCode !== 200) {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          reject(new Error(`API error ${res.statusCode}: ${body}`));
        });
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', reject);
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!API_KEY && !DRY_RUN) {
    console.error('Error: ELEVENLABS_API_KEY environment variable is required.');
    console.error('Usage: ELEVENLABS_API_KEY=your_key node scripts/generate-spelling-audio.js');
    process.exit(1);
  }

  ensureDirs();

  // Build job list
  const jobs = [];

  // Words
  for (const word of WORDS) {
    const filename = sanitizeFilename(word);
    jobs.push({
      text: word,
      path: path.join(WORDS_DIR, `${filename}.mp3`),
      label: `Word: "${word}"`,
    });
  }

  // Letters A-Z — use "The letter A" phrasing for clear pronunciation
  for (const letter of LETTERS) {
    jobs.push({
      text: letter.toUpperCase(),
      path: path.join(LETTERS_DIR, `${letter}.mp3`),
      label: `Letter: "${letter.toUpperCase()}"`,
    });
  }

  const totalClips = jobs.length;
  let generated = 0;
  let skipped = 0;

  console.log(`Generating ${totalClips} audio clips (${WORDS.length} words + ${LETTERS.length} letters)`);
  console.log(`Voice ID: ${VOICE_ID}`);
  console.log(`Output: ${WORDS_DIR} and ${LETTERS_DIR}`);
  if (DRY_RUN) console.log('DRY RUN - no API calls will be made\n');
  if (RESUME) console.log('RESUME mode - skipping existing files\n');

  for (const job of jobs) {
    if (RESUME && fileExists(job.path)) {
      skipped++;
      continue;
    }

    console.log(`[${generated + skipped + 1}/${totalClips}] ${job.label}`);
    if (!DRY_RUN) {
      try {
        await generateSpeech(job.text, job.path);
        console.log(`  Saved: ${job.path}`);
      } catch (err) {
        console.error(`  ERROR: ${err.message}`);
      }
      await sleep(DELAY_MS);
    }
    generated++;
  }

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}, Total: ${totalClips}`);
}

main().catch(console.error);
