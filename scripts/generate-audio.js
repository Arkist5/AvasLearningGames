#!/usr/bin/env node

/**
 * ElevenLabs Audio Generation Script
 *
 * Generates 200 audio clips (100 question + 100 answer) for all addition combos (0+0 through 9+9).
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js
 *
 * Options:
 *   --voice-id    ElevenLabs voice ID (default: Will - relaxed optimist)
 *   --resume      Resume from where it left off (skips existing files)
 *   --dry-run     Print what would be generated without making API calls
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_KEY = process.env.ELEVENLABS_API_KEY;
// "Will" voice ID - update this if the voice ID changes
const DEFAULT_VOICE_ID = 'bIHbv24MWmeRgasZH58o';
const VOICE_ID = process.argv.find(a => a.startsWith('--voice-id='))?.split('=')[1] || DEFAULT_VOICE_ID;
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');

// Rate limiting: ElevenLabs free tier allows ~10 req/min
const DELAY_MS = 6500; // ~9 requests per minute to be safe

// Number-to-word mapping
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen'
];

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const QUESTIONS_DIR = path.join(PROJECT_ROOT, 'audio', 'questions');
const ANSWERS_DIR = path.join(PROJECT_ROOT, 'audio', 'answers');

function ensureDirs() {
  fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  fs.mkdirSync(ANSWERS_DIR, { recursive: true });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
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
        // Rate limited - wait and retry
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
    console.error('Usage: ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js');
    process.exit(1);
  }

  ensureDirs();

  // Generate all combos
  const combos = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      combos.push({ a, b, sum: a + b });
    }
  }

  const totalClips = combos.length * 2; // questions + answers
  let generated = 0;
  let skipped = 0;

  console.log(`Generating ${totalClips} audio clips (${combos.length} questions + ${combos.length} answers)`);
  console.log(`Voice ID: ${VOICE_ID}`);
  console.log(`Output: ${QUESTIONS_DIR} and ${ANSWERS_DIR}`);
  if (DRY_RUN) console.log('DRY RUN - no API calls will be made\n');
  if (RESUME) console.log('RESUME mode - skipping existing files\n');

  for (const combo of combos) {
    const audioKey = `${combo.a}_plus_${combo.b}`;
    const aWord = NUMBER_WORDS[combo.a];
    const bWord = NUMBER_WORDS[combo.b];
    const sumWord = NUMBER_WORDS[combo.sum];

    // Question clip: "five plus five equals..."
    const questionText = `${aWord} plus ${bWord} equals...`;
    const questionPath = path.join(QUESTIONS_DIR, `${audioKey}.mp3`);

    if (RESUME && fileExists(questionPath)) {
      skipped++;
    } else {
      console.log(`[${generated + skipped + 1}/${totalClips}] Question: "${questionText}"`);
      if (!DRY_RUN) {
        try {
          await generateSpeech(questionText, questionPath);
          console.log(`  Saved: ${questionPath}`);
        } catch (err) {
          console.error(`  ERROR: ${err.message}`);
        }
        await sleep(DELAY_MS);
      }
      generated++;
    }

    // Answer clip: "five plus five equals ten"
    const answerText = `${aWord} plus ${bWord} equals ${sumWord}`;
    const answerPath = path.join(ANSWERS_DIR, `${audioKey}.mp3`);

    if (RESUME && fileExists(answerPath)) {
      skipped++;
    } else {
      console.log(`[${generated + skipped + 1}/${totalClips}] Answer: "${answerText}"`);
      if (!DRY_RUN) {
        try {
          await generateSpeech(answerText, answerPath);
          console.log(`  Saved: ${answerPath}`);
        } catch (err) {
          console.error(`  ERROR: ${err.message}`);
        }
        await sleep(DELAY_MS);
      }
      generated++;
    }
  }

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}, Total: ${totalClips}`);
}

main().catch(console.error);
