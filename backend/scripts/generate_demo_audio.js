const fs = require('fs');
const path = require('path');

function generateDemoWav(outputPath) {
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const durationSec = 30;
  const numSamples = sampleRate * durationSec;
  const bpm = 128;
  const beatDuration = 60 / bpm; // ~0.46875s

  const buffer = Buffer.alloc(44 + numSamples * numChannels * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * numChannels * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Chunk size
  buffer.writeUInt16LE(1, 20);  // Audio format 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // Byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // Block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * numChannels * 2, 40);

  let offset = 44;

  // Scale frequencies for catchy synth melody
  const notes = [
    220.00, // A3
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    659.25  // E5
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const beatTime = t % beatDuration;
    const beatIndex = Math.floor(t / beatDuration);
    const measureTime = t % (beatDuration * 4);
    const measureIndex = Math.floor(t / (beatDuration * 4));

    // 1. Kick Drum (Every beat: 0, 1, 2, 3)
    let kick = 0;
    if (beatTime < 0.22) {
      const kickFreq = 160 * Math.exp(-beatTime * 28) + 45;
      const kickEnv = Math.exp(-beatTime * 18);
      kick = Math.sin(2 * Math.PI * kickFreq * beatTime) * kickEnv * 0.75;
    }

    // 2. Snare / Clap (Beats 2 and 4, i.e. beat 1 and 3 in 0-indexed)
    let snare = 0;
    const isSnareBeat = (beatIndex % 2 === 1);
    if (isSnareBeat && beatTime < 0.18) {
      // Deterministic noise without Math.random() for 100% reproducibility
      const noise = ((Math.sin(i * 12.9898 + i * 78.233) * 43758.5453) % 1) * 2 - 1;
      const tone = Math.sin(2 * Math.PI * 220 * beatTime) * 0.4;
      const snareEnv = Math.exp(-beatTime * 22);
      snare = (noise * 0.6 + tone) * snareEnv * 0.45;
    }

    // 3. Hi-Hat (Every 1/8 note off-beat)
    let hat = 0;
    const eighthTime = t % (beatDuration / 2);
    const isOffBeat = Math.floor(t / (beatDuration / 2)) % 2 === 1;
    if (isOffBeat && eighthTime < 0.06) {
      const hatNoise = ((Math.sin(i * 93.123 + i * 31.456) * 23421.12) % 1) * 2 - 1;
      hat = hatNoise * Math.exp(-eighthTime * 65) * 0.25;
    }

    // 4. Bassline
    const bassNote = measureIndex % 2 === 0 ? 55.0 : 65.4; // A1 or C2
    const bass = (Math.sin(2 * Math.PI * bassNote * t) + 0.3 * Math.sin(2 * Math.PI * bassNote * 2 * t)) * 0.35;

    // 5. Melodic Synth Arp (16th notes: 4 notes per beat)
    const sixteenth = Math.floor(t / (beatDuration / 4));
    const notePattern = [0, 2, 4, 5, 7, 5, 4, 2, 0, 3, 4, 7, 5, 4, 3, 1];
    const noteIdx = notePattern[sixteenth % notePattern.length];
    const synthFreq = notes[noteIdx % notes.length];
    const sixteenthTime = t % (beatDuration / 4);
    const synthEnv = Math.exp(-sixteenthTime * 12);
    // Sawtooth-like wave
    const synthTone = (Math.sin(2 * Math.PI * synthFreq * t) + 0.5 * Math.sin(4 * Math.PI * synthFreq * t)) * synthEnv * 0.28;

    // Master Mix
    let leftSample = kick + snare + hat + bass + synthTone;
    let rightSample = kick + snare - hat + bass + synthTone * 0.95;

    // Soft clipper to prevent clipping
    leftSample = Math.max(-1, Math.min(1, leftSample));
    rightSample = Math.max(-1, Math.min(1, rightSample));

    buffer.writeInt16LE(Math.floor(leftSample * 32767), offset);
    buffer.writeInt16LE(Math.floor(rightSample * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated demo audio: ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

const outDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
generateDemoWav(path.join(outDir, 'demo.wav'));

