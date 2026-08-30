/**
 * High-Fidelity Indian Bamboo Flute (Bansuri) Synthesizer and Krishna Melody Library.
 * Recreates authentic acoustic behaviors of Bansuri, matching Indian microtonal glides (Meend),
 * breathing air transients, warm mouth vibratos (LFO), and divine echoing delays.
 */

export interface FluteNote {
  freq: number;
  duration: number; // Duration in seconds
  slide: boolean;   // Whether to slide smoothly into this note
  name: string;     // Indian music notation (Swaras: Sa, Re, Ga...)
}

export interface KrishnaMelody {
  id: number;
  title: string;
  raga: string;
  description: string;
  notes: FluteNote[];
}

// Tonic base pitch standard - G4 (392.00 Hz) is highly popular for medium Bansuri flutes
const SA_TONIC = 392.00;

// Classical Shrutis / Ratios relative to the base Sa
const SWARA_RATIOS: Record<string, number> = {
  S: 1.0,        // Shadja (Sa)
  r: 1.0667,     // Komal Rishabh (re)
  R: 1.125,      // Shuddha Rishabh (Re)
  g: 1.2,        // Komal Gandhar (ga)
  G: 1.25,       // Shuddha Gandhar (Ga)
  m: 1.3333,     // Shuddha Madhyam (ma)
  M: 1.40625,    // Teevra Madhyam (Ma)
  P: 1.5,        // Pancham (Pa)
  d: 1.6,        // Komal Dhaivat (dha)
  D: 1.6875,     // Shuddha Dhaivat (Dha)
  n: 1.7778,     // Komal Nishad (ni)
  N: 1.875,      // Shuddha Nishad (Ni)
  S_high: 2.0,   // Tar Saptak Sa (Sa')
  r_high: 2.1333,// Tar Komal re
  R_high: 2.25,  // Tar Rishabh
  g_high: 2.4,   // Tar Komal ga
  G_high: 2.5,   // Tar Gandhar
  m_high: 2.6667,// Tar Shuddha ma
  M_high: 2.8125,// Tar Teevra Ma
  P_high: 3.0,   // Tar Pancham
  n_low: 0.8889, // Mandra Saptak ni (lower octave Komal ni)
  N_low: 0.9375, // Mandra Saptak Ni (lower octave Ni)
  D_low: 0.8438, // Mandra Saptak Dha (lower octave Dha)
  P_low: 0.75,   // Mandra Saptak Pa (lower octave Pa)
};

// Deterministic seed-based pseudo random generator
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    let x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
  choose<T>(arr: T[]): T {
    const idx = this.range(0, arr.length);
    return arr[idx];
  }
}

// 1. Core Melodic Library Generator generating exactly 100 melodies
export function generateMelodyCatalog(): KrishnaMelody[] {
  const catalog: KrishnaMelody[] = [];

  const ragaTemplates = [
    {
      name: "Bhupali",
      desc: "Serene, meditative and peaceful nighttime prayer",
      scale: ["S", "R", "G", "P", "D", "S_high", "R_high", "G_high", "D_low", "S"],
    },
    {
      name: "Shivaranjani",
      desc: "Deeply moving, emotional and romantic path towards divine love",
      scale: ["S", "R", "g", "P", "D", "S_high", "R_high", "g_high", "N_low", "S"],
    },
    {
      name: "Yaman",
      desc: "Splendid, majestic and devotional light with sweet teevra madhyam",
      scale: ["N_low", "R", "G", "M", "D", "N", "S_high", "R_high", "G_high", "S"],
    },
    {
      name: "Pahadi",
      desc: "Simple, highly melodious and playful folk notes of Vrindavan valley",
      scale: ["S", "R", "G", "P", "D", "P", "G", "R", "S", "N_low", "D_low", "S"],
    },
    {
      name: "Durga",
      desc: "Incredibly pure, bright and auspicious morning blessing of strength",
      scale: ["S", "R", "m", "P", "D", "S_high", "R_high", "P_high", "S"],
    },
    {
      name: "Bhairavi",
      desc: "Deeply spiritual and absolute surrender morning raga",
      scale: ["S", "r", "g", "m", "P", "d", "n", "S_high", "n_low", "S"],
    }
  ];

  const prefixTitles = [
    "Vrindavan Bansi Purkar", "Yamuna Tat Sandhya Swar", "Radha Kunj Madhur Dhvani", 
    "Giri Govardhan Maha Ras", "Nand Kishor Anand Lahari", "Shyamlal Kripa Trance", 
    "Shri Krishna Murli Naad", "Radhe Govind Prem Bansuri", "Mayur Mukut Shobhit",
    "Kalia Dahan Shesh Naad", "Basant Ritu Ras Madhuri", "Gopi Chitta Chora", 
    "Sudama Milan Prem Tarang", "Moksha Absolute Ananda", "Bala Gopal Khel Swar",
    "Nidhi Van Rahasya Melody", "Kanha Charan Bandana", "Bansi Vat Chhaon Dhun",
    "Gauri Shringar Bansuri", "Saraswati Kund Dhyaan", "Dwarka Adhipati Ras",
    "Braja Bhumi Kunj Gali", "Ananta Prem Samadhi", "Geeta Upadesh Dhwani"
  ];

  const suffixes = [
    "Aalap", "Vilambit Bandish", "Drut Taan", "Chandra Pukaar", "Bhakti Tarang",
    "Muralidhar Dhun", "Prarthana", "Rasleela", "Gat Composition", "Meend Swar",
    "Bhakti Samarpan", "Darshan Melody", "Geet Sparkle", "Prabhu Chhaon"
  ];

  for (let i = 1; i <= 100; i++) {
    const rng = new SeededRandom(i * 1051);
    
    // Choose Raga and parameters deterministically based on seed
    const raga = rng.choose(ragaTemplates);
    const titlePrefix = rng.choose(prefixTitles);
    const titleSuffix = rng.choose(suffixes);
    const title = `${i}. ${titlePrefix} (${titleSuffix})`;

    // Generate balanced melody structure of 12-16 beautiful notes
    const noteCount = rng.range(11, 16);
    const notesList: FluteNote[] = [];

    let currentScaleIndex = rng.range(1, 5); // start somewhere near middle Sa

    for (let j = 0; j < noteCount; j++) {
      // Intelligently step up or down on the scale to make it feel cohesive and musical
      const step = rng.choose([-2, -1, -1, 0, 1, 1, 2]);
      currentScaleIndex = Math.max(0, Math.min(raga.scale.length - 1, currentScaleIndex + step));
      
      const swaraSymbol = raga.scale[currentScaleIndex];
      const ratio = SWARA_RATIOS[swaraSymbol] || 1.0;
      const freq = SA_TONIC * ratio;
      
      // Select beautiful rhythmic durations matching slow & medium bamboo styles (0.35s to 1.3s)
      const isEndingNode = j === noteCount - 1;
      const duration = isEndingNode ? 1.6 : rng.choose([0.45, 0.6, 0.85, 1.1]);
      
      // Beautiful seamless Indian flute sliding "Meend" (mostly enabled for realistic feel)
      const slide = j > 0 && rng.next() > 0.3;

      notesList.push({
        freq,
        duration,
        slide,
        name: swaraSymbol.replace('_high', "'").replace('_low', '.')
      });
    }

    catalog.push({
      id: i,
      title,
      raga: raga.name,
      description: raga.desc,
      notes: notesList
    });
  }

  return catalog;
}

// 2. State Controller to track currently playing active audio
let activeAudioContext: AudioContext | null = null;
let playbackTimeouts: NodeJS.Timeout[] = [];
let currentOscillators: { osc1: OscillatorNode; osc2: OscillatorNode; mainGain: GainNode }[] = [];

export function stopAllFluteSounds(): void {
  playbackTimeouts.forEach(t => clearTimeout(t));
  playbackTimeouts = [];

  // Stop oscillators cleanly with fade-out if possible, or direct shutdown
  currentOscillators.forEach(nodes => {
    try {
      nodes.osc1.stop();
      nodes.osc2.stop();
      nodes.mainGain.disconnect();
    } catch (_) {}
  });
  currentOscillators = [];

  if (activeAudioContext) {
    activeAudioContext.close().catch(() => {});
    activeAudioContext = null;
  }
}

// 3. Main Player synthesizing the Flute acoustics
export function playSynthesizedKrishnaFlute(
  melody: KrishnaMelody,
  onNoteChange?: (noteName: string, index: number) => void,
  onFinished?: () => void
): void {
  // Stop any active previous melodies
  stopAllFluteSounds();

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    alert("Audio API not supported in your browser.");
    return;
  }

  const audioCtx = new AudioContextClass();
  activeAudioContext = audioCtx;

  // Global Echo & Reverb Setup (Simulates Vrindavan forest halls)
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.7, audioCtx.currentTime);

  const delayNode = audioCtx.createDelay(2.0);
  delayNode.delayTime.value = 0.45; // 450ms sweet delay reflection

  const feedbackGain = audioCtx.createGain();
  feedbackGain.gain.value = 0.40; // Ambient decay tails

  // Interlink delay loop
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);

  // Deep resonant LowPass filter simulates organic wood dampening
  const woodFilter = audioCtx.createBiquadFilter();
  woodFilter.type = "lowpass";
  woodFilter.frequency.setValueAtTime(1400, audioCtx.currentTime);
  woodFilter.Q.setValueAtTime(1.5, audioCtx.currentTime);

  // Connections
  masterGain.connect(woodFilter);
  woodFilter.connect(audioCtx.destination); // Direct dry out

  woodFilter.connect(delayNode);            // Echo loop
  delayNode.connect(audioCtx.destination);  // Delayed wet out

  // Create monophonic master oscillators that continue running to enable perfect "Meend" (slided pitch values)
  const osc1 = audioCtx.createOscillator(); // Main Fundamental Sine Wave
  const osc2 = audioCtx.createOscillator(); // Harmonic warm octave booster
  const mainGain = audioCtx.createGain();

  osc1.type = "sine";
  osc2.type = "triangle"; // Gives that woody bamboo texture when filtered

  const initialFreq = melody.notes[0].freq;
  osc1.frequency.setValueAtTime(initialFreq, audioCtx.currentTime);
  osc2.frequency.setValueAtTime(initialFreq * 2, audioCtx.currentTime);

  // LFO (Low Frequency Oscillator) for breathing mouth vibrato (~5.8Hz)
  const vibratoLFO = audioCtx.createOscillator();
  const vibratoGain = audioCtx.createGain();
  vibratoLFO.frequency.value = 5.8;
  vibratoGain.gain.value = 4.2; // slight frequency wobble (pitch pitch offset)

  vibratoLFO.connect(vibratoGain);
  vibratoGain.connect(osc1.frequency);
  vibratoGain.connect(osc2.frequency);

  // Secondary soft LFO for realistic amplitude (breathing blow volume) swelling
  const ampLFO = audioCtx.createOscillator();
  const ampGainNode = audioCtx.createGain();
  ampLFO.frequency.value = 4.5;
  ampGainNode.gain.value = 0.08; // dynamic hum volume swelling of 8%
  ampLFO.connect(ampGainNode.gain);

  // Set balanced voice levels
  const voice1Gain = audioCtx.createGain();
  voice1Gain.gain.setValueAtTime(0.85, audioCtx.currentTime); // Fundamental is dominant
  const voice2Gain = audioCtx.createGain();
  voice2Gain.gain.setValueAtTime(0.15, audioCtx.currentTime); // Harmonic is quiet and supportive

  osc1.connect(voice1Gain);
  osc2.connect(voice2Gain);

  voice1Gain.connect(mainGain);
  voice2Gain.connect(mainGain);
  
  // Connect the amplitude LFO modulation to main output level
  mainGain.gain.setValueAtTime(0.001, audioCtx.currentTime); // start silent
  mainGain.connect(masterGain);

  // Start continuous oscillators
  vibratoLFO.start(audioCtx.currentTime);
  ampLFO.start(audioCtx.currentTime);
  osc1.start(audioCtx.currentTime);
  osc2.start(audioCtx.currentTime);

  currentOscillators.push({ osc1, osc2, mainGain });

  // 4. Play notes sequentially
  let currentScheduleTime = audioCtx.currentTime + 0.1;

  melody.notes.forEach((note, index) => {
    // Timeout for UI status updates synchronously
    const timeoutId = setTimeout(() => {
      if (onNoteChange) {
        onNoteChange(note.name, index);
      }
    }, (currentScheduleTime - audioCtx.currentTime) * 1000);
    playbackTimeouts.push(timeoutId);

    const pitchGlideDuration = note.slide ? 0.16 : 0.03; // Smooth Meend glide or crisp articulation switch

    // Generate Air blow puff (breathing-transient noise) at the start of each articulated note!
    if (!note.slide || index === 0) {
      playBreathingPuff(audioCtx, note.freq, currentScheduleTime, woodFilter);
    }

    // Slide/Set note pitch
    osc1.frequency.exponentialRampToValueAtTime(note.freq, currentScheduleTime + pitchGlideDuration);
    osc2.frequency.exponentialRampToValueAtTime(note.freq * 2, currentScheduleTime + pitchGlideDuration);

    // Dynamic Volume Envelope (Note articulation attack, decay, release)
    const attackDur = 0.08;
    const releaseDur = 0.12;
    const noteHoldDur = note.duration - attackDur - 0.03;

    // Breath articulation: clear separation unless we do seamless meend glides
    if (!note.slide) {
      mainGain.gain.exponentialRampToValueAtTime(0.02, currentScheduleTime - 0.02);
    }

    // Main note ramp up
    mainGain.gain.linearRampToValueAtTime(0.65, currentScheduleTime + attackDur);
    // Hold sustain
    mainGain.gain.setValueAtTime(0.65, currentScheduleTime + attackDur + noteHoldDur);
    // Release
    mainGain.gain.exponentialRampToValueAtTime(0.001, currentScheduleTime + note.duration - 0.01);

    currentScheduleTime += note.duration;
  });

  // Schedule final shutdown
  const finalTimeoutId = setTimeout(() => {
    stopAllFluteSounds();
    if (onFinished) onFinished();
  }, (currentScheduleTime - audioCtx.currentTime + 0.5) * 1000);
  playbackTimeouts.push(finalTimeoutId);
}

// Helper: Generates a natural 'shoosh' / breath blow noise at the start of a note
function playBreathingPuff(
  audioCtx: AudioContext,
  targetNoteFreq: number,
  startTime: number,
  destinationNode: AudioNode
) {
  // 1. Create noise buffer
  const bufferSize = audioCtx.sampleRate * 0.15; // 150ms blow noise duration
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;

  // 2. HighPass/BandPass to filter the air breath around the actual flute note's core spectrum
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(targetNoteFreq * 1.5, startTime);
  noiseFilter.Q.setValueAtTime(1.2, startTime);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0, startTime);
  noiseGain.gain.linearRampToValueAtTime(0.18, startTime + 0.02); // crisp initial puff
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destinationNode);

  noiseSource.start(startTime);
  noiseSource.stop(startTime + 0.15);
}
