#!/usr/bin/env node

/**
 * Generate sound effect voice clips for games using ElevenLabs TTS.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate-sfx.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'bIHbv24MWmeRgasZH58o'; // "Will" voice
const DELAY_MS = 6500;

const SFX_DIR = path.join(__dirname, '..', 'audio', 'sfx');

// Voice clips to generate
const CLIPS = [
  { file: 'yay.mp3', text: 'Yay!', desc: 'Excited celebration' },
  { file: 'oops.mp3', text: 'Oops!', desc: 'Playful mistake' },
  { file: 'hooray.mp3', text: 'Hooray!', desc: 'Victory cheer' },
  { file: 'oh_no.mp3', text: 'Oh no!', desc: 'Mild disappointment' },
];

function generateSpeech(text, outputPath) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.6,  // More expressive for exclamations
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
  if (!API_KEY) {
    console.error('Error: ELEVENLABS_API_KEY environment variable required.');
    process.exit(1);
  }

  fs.mkdirSync(SFX_DIR, { recursive: true });

  console.log(`Generating ${CLIPS.length} voice SFX clips...`);
  console.log(`Output: ${SFX_DIR}\n`);

  for (let i = 0; i < CLIPS.length; i++) {
    const clip = CLIPS[i];
    const outPath = path.join(SFX_DIR, clip.file);

    console.log(`[${i + 1}/${CLIPS.length}] "${clip.text}" (${clip.desc})`);

    try {
      await generateSpeech(clip.text, outPath);
      console.log(`  Saved: ${clip.file}`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }

    if (i < CLIPS.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\nDone! Voice clips generated.');
  console.log('\nNote: For mechanical sounds (hammer_tap, chime, crumble),');
  console.log('download free SFX from https://mixkit.co/free-sound-effects/');
}

main().catch(console.error);
