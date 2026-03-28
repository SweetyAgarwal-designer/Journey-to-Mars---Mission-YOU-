const root = document.documentElement;
const body = document.body;
const wakeScreen = document.getElementById("wakeScreen");
const wakeButton = document.getElementById("wakeButton");
const siteShell = document.getElementById("siteShell");
const missionAnnouncements = document.getElementById("missionAnnouncements");
const audioToggle = document.getElementById("audioToggle");
const audioToggleText = document.getElementById("audioToggleText");
const textBoostToggle = document.getElementById("textBoostToggle");
const textBoostToggleText = document.getElementById("textBoostToggleText");
const motionToggle = document.getElementById("motionToggle");
const motionToggleText = document.getElementById("motionToggleText");
const terminalOutput = document.getElementById("terminalOutput");
const pilotForm = document.getElementById("pilotForm");
const pilotNameInput = document.getElementById("pilotName");
const authFeedback = document.getElementById("authFeedback");
const statusPhase = document.getElementById("statusPhase");
const statusName = document.getElementById("statusName");
const statusDistance = document.getElementById("statusDistance");
const statusObjective = document.getElementById("statusObjective");
const statusMood = document.getElementById("statusMood");
const statusSteps = [...document.querySelectorAll(".status-step")];
const catConsole = document.getElementById("catConsole");
const catMessage = document.getElementById("catMessage");
const catWaveform = document.getElementById("catWaveform");
const catVoiceToggle = document.getElementById("catVoiceToggle");
const catVoiceToggleText = document.getElementById("catVoiceToggleText");
const briefReadout = document.getElementById("briefReadout");
const briefTabs = [...document.querySelectorAll(".brief-tab")];
const prepReadout = document.getElementById("prepReadout");
const prepCards = [...document.querySelectorAll(".prep-card")];
const scenes = [...document.querySelectorAll(".scene")];
const fuelValue = document.getElementById("fuelValue");
const fuelFill = document.getElementById("fuelFill");
const thrustValue = document.getElementById("thrustValue");
const thrustFill = document.getElementById("thrustFill");
const altitudeValue = document.getElementById("altitudeValue");
const altitudeFill = document.getElementById("altitudeFill");
const interactivePanels = [...document.querySelectorAll(".interactive-panel")];
const idlePrompt = document.getElementById("idlePrompt");
const landingDial = document.getElementById("landingDial");
const landingConsole = document.getElementById("landingConsole");
const angleValue = document.getElementById("angleValue");
const stabilityValue = document.getElementById("stabilityValue");
const thermalValue = document.getElementById("thermalValue");
const entryWarning = document.getElementById("entryWarning");
const scanResults = document.getElementById("scanResults");
const finalNote = document.getElementById("finalNote");
const finalBeacon = document.getElementById("finalBeacon");
const hotspots = [...document.querySelectorAll(".hotspot")];
const parallaxStages = [...document.querySelectorAll("[data-parallax]")];
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const wakeDelayMs = 3600;
const idleDelayMs = 6500;
const terminalLines = [
  "BOOTING MARS TRANSIT VEHICLE // MISSION: YOU",
  "INERTIAL STABILIZERS ...... NOMINAL",
  "COCKPIT CHROME ........... RESPONSIVE",
  "VISOR PARALLAX ........... ONLINE",
  "EMOTIVE SOUND BED ........ ARMED",
  "AWAITING PILOT AUTHORIZATION"
];

const astronautBriefs = {
  profile: {
    text:
      "Departure framing keeps Earth dominant on purpose: cloud systems, blue atmospheric edge, and a strong hull silhouette so the ship feels physically present around the view.",
    message: "The first window should feel like departure, not decoration."
  },
  suit: {
    text:
      "Cabin data stays peripheral. Bio-state, contrast, and glare compensation remain visible, but the exterior feed never gets buried under ornamental UI.",
    message: "Pressure is real enough already. The cockpit should reduce noise, not add to it."
  },
  mission: {
    text:
      "Approach framing shifts the emphasis forward: Mars grows dense and textured, Earth drops small in the distance, and the guidance stack tightens as the ship closes the corridor.",
    message: "Approach should feel inevitable: less ornament, more forward intent."
  }
};

const catSceneMessages = {
  "scene-boot": "State your designation and I'll open the bridge.",
  "scene-launch": "All clamps green. Breathe with the engine.",
  "scene-space": "Cruise is the part no one prepares you for.",
  "scene-entry": "Keep the angle calm. Mars punishes hesitation.",
  "scene-mars": "Surface link stable. Let's see what the silence kept."
};

const sceneCues = {
  "scene-launch": "launch",
  "scene-space": "select",
  "scene-entry": "select",
  "scene-mars": "arrival"
};

const sceneAudioMix = {
  "scene-boot": { hum: 54, warm: 108, sub: 27, air: 1850, rumble: 180, ambience: 0.085, low: 0.013, high: 0.004 },
  "scene-launch": { hum: 58, warm: 118, sub: 31, air: 2400, rumble: 150, ambience: 0.12, low: 0.028, high: 0.008 },
  "scene-space": { hum: 46, warm: 94, sub: 24, air: 1450, rumble: 220, ambience: 0.06, low: 0.01, high: 0.003 },
  "scene-entry": { hum: 64, warm: 128, sub: 30, air: 2900, rumble: 135, ambience: 0.13, low: 0.022, high: 0.01 },
  "scene-mars": { hum: 50, warm: 100, sub: 26, air: 1700, rumble: 210, ambience: 0.075, low: 0.012, high: 0.004 }
};

const soundState = {
  context: null,
  master: null,
  compressor: null,
  convolver: null,
  reverbGain: null,
  ambienceGain: null,
  humOsc: null,
  warmOsc: null,
  subOsc: null,
  subGain: null,
  noiseSource: null,
  noiseLowFilter: null,
  noiseHighFilter: null,
  noiseLowGain: null,
  noiseHighGain: null,
  noiseBuffer: null,
  initialized: false,
  enabled: false
};

const voiceState = {
  supported: "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function",
  enabled: true,
  voice: null,
  activeUtterance: null,
  completionResolvers: [],
  lastMessage: "",
  lastSpokenAt: 0
};

let activeSceneId = "scene-boot";
let pilotName = "Awaiting ID";
let wakeDismissed = false;
let terminalStarted = false;
let scrollTicking = false;
let launchIgnited = false;
let landingAngle = 0;
let currentEntryProgress = 0;
let idleTimer = 0;
let spaceIdleTriggered = false;
let visitedHotspots = new Set();
let lastEntryState = null;
let audioManuallyToggled = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function announce(message) {
  missionAnnouncements.textContent = message;
}

function scrollBehavior() {
  return body.classList.contains("is-motion-calm") ? "auto" : "smooth";
}

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.35;
  }

  return buffer;
}

function createImpulseResponse(context, duration = 1.8, decay = 2.4) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channelIndex = 0; channelIndex < impulse.numberOfChannels; channelIndex += 1) {
    const channel = impulse.getChannelData(channelIndex);

    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      const envelope = Math.pow(1 - sampleIndex / length, decay);
      channel[sampleIndex] = (Math.random() * 2 - 1) * envelope * 0.22;
    }
  }

  return impulse;
}

function initSound() {
  if (soundState.initialized) {
    return true;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return false;
  }

  const context = new AudioContextClass();
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const convolver = context.createConvolver();
  const reverbGain = context.createGain();
  const ambienceGain = context.createGain();
  const humOsc = context.createOscillator();
  const humGain = context.createGain();
  const warmOsc = context.createOscillator();
  const warmGain = context.createGain();
  const subOsc = context.createOscillator();
  const subGain = context.createGain();
  const noiseSource = context.createBufferSource();
  const noiseLowFilter = context.createBiquadFilter();
  const noiseHighFilter = context.createBiquadFilter();
  const noiseLowGain = context.createGain();
  const noiseHighGain = context.createGain();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  const detuneLfo = context.createOscillator();
  const detuneGain = context.createGain();

  master.gain.value = 0.0001;
  ambienceGain.gain.value = 0.08;
  compressor.threshold.value = -18;
  compressor.knee.value = 24;
  compressor.ratio.value = 2.5;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.35;
  convolver.buffer = createImpulseResponse(context);
  reverbGain.gain.value = 0.06;
  humOsc.type = "sine";
  humOsc.frequency.value = 54;
  humGain.gain.value = 0.07;
  warmOsc.type = "triangle";
  warmOsc.frequency.value = 108;
  warmGain.gain.value = 0.018;
  subOsc.type = "triangle";
  subOsc.frequency.value = 27;
  subGain.gain.value = 0.012;
  noiseSource.buffer = createNoiseBuffer(context);
  noiseSource.loop = true;
  noiseLowFilter.type = "lowpass";
  noiseLowFilter.frequency.value = 200;
  noiseHighFilter.type = "highpass";
  noiseHighFilter.frequency.value = 1800;
  noiseLowGain.gain.value = 0.012;
  noiseHighGain.gain.value = 0.004;
  lfo.type = "sine";
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.01;
  detuneLfo.type = "sine";
  detuneLfo.frequency.value = 0.11;
  detuneGain.gain.value = 2.4;

  lfo.connect(lfoGain);
  lfoGain.connect(ambienceGain.gain);
  detuneLfo.connect(detuneGain);
  detuneGain.connect(humOsc.detune);
  humOsc.connect(humGain).connect(ambienceGain);
  warmOsc.connect(warmGain).connect(ambienceGain);
  subOsc.connect(subGain).connect(ambienceGain);
  noiseSource.connect(noiseLowFilter).connect(noiseLowGain).connect(ambienceGain);
  noiseSource.connect(noiseHighFilter).connect(noiseHighGain).connect(ambienceGain);
  ambienceGain.connect(convolver).connect(reverbGain).connect(compressor);
  ambienceGain.connect(compressor);
  compressor.connect(master).connect(context.destination);

  humOsc.start();
  warmOsc.start();
  subOsc.start();
  noiseSource.start();
  lfo.start();
  detuneLfo.start();

  soundState.context = context;
  soundState.master = master;
  soundState.compressor = compressor;
  soundState.convolver = convolver;
  soundState.reverbGain = reverbGain;
  soundState.ambienceGain = ambienceGain;
  soundState.humOsc = humOsc;
  soundState.warmOsc = warmOsc;
  soundState.subOsc = subOsc;
  soundState.subGain = subGain;
  soundState.noiseSource = noiseSource;
  soundState.noiseLowFilter = noiseLowFilter;
  soundState.noiseHighFilter = noiseHighFilter;
  soundState.noiseLowGain = noiseLowGain;
  soundState.noiseHighGain = noiseHighGain;
  soundState.noiseBuffer = noiseSource.buffer;
  soundState.initialized = true;

  setSceneMix(activeSceneId);
  return true;
}

function updateAudioUi() {
  audioToggle.setAttribute("aria-pressed", String(soundState.enabled));
  audioToggleText.textContent = soundState.enabled ? "Active" : "Standby";
}

function setSceneMix(sceneId) {
  if (!soundState.initialized) {
    return;
  }

  const mix = sceneAudioMix[sceneId] || sceneAudioMix["scene-boot"];
  const now = soundState.context.currentTime;

  soundState.humOsc.frequency.setTargetAtTime(mix.hum, now, 0.28);
  soundState.warmOsc.frequency.setTargetAtTime(mix.warm, now, 0.28);
  soundState.subOsc.frequency.setTargetAtTime(mix.sub, now, 0.28);
  soundState.noiseLowFilter.frequency.setTargetAtTime(mix.rumble, now, 0.24);
  soundState.noiseHighFilter.frequency.setTargetAtTime(mix.air, now, 0.24);
  soundState.noiseLowGain.gain.setTargetAtTime(mix.low, now, 0.24);
  soundState.noiseHighGain.gain.setTargetAtTime(mix.high, now, 0.24);
  soundState.ambienceGain.gain.setTargetAtTime(soundState.enabled ? mix.ambience : 0.0001, now, 0.25);
}

function playTone({ frequency = 440, duration = 0.18, volume = 0.025, type = "sine", glideTo = null }) {
  if (!soundState.initialized || !soundState.enabled) {
    return;
  }

  const oscillator = soundState.context.createOscillator();
  const gain = soundState.context.createGain();
  const now = soundState.context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(frequency, 1), now);
  if (glideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain).connect(soundState.master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playNoiseBurst({ duration = 0.14, frequency = 1800, volume = 0.018, type = "bandpass", q = 1.4 } = {}) {
  if (!soundState.initialized || !soundState.enabled) {
    return;
  }

  const source = soundState.context.createBufferSource();
  const filter = soundState.context.createBiquadFilter();
  const gain = soundState.context.createGain();
  const now = soundState.context.currentTime;

  source.buffer = soundState.noiseBuffer || createNoiseBuffer(soundState.context);
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, now);
  filter.Q.value = q;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter).connect(gain).connect(soundState.master);
  source.start(now);
  source.stop(now + duration + 0.03);
}

function playCue(kind) {
  if (!soundState.enabled) {
    return;
  }

  if (kind === "wake") {
    playNoiseBurst({ duration: 0.24, frequency: 950, volume: 0.015, q: 0.8 });
    playTone({ frequency: 176, glideTo: 248, duration: 0.22, type: "sine", volume: 0.02 });
    window.setTimeout(() => {
      playTone({ frequency: 330, glideTo: 440, duration: 0.28, type: "triangle", volume: 0.017 });
    }, 110);
    return;
  }

  if (kind === "click") {
    playNoiseBurst({ duration: 0.08, frequency: 2200, volume: 0.012, q: 1.6 });
    playTone({ frequency: 310, glideTo: 280, duration: 0.05, type: "triangle", volume: 0.012 });
    return;
  }

  if (kind === "comms") {
    playNoiseBurst({ duration: 0.09, frequency: 1420, volume: 0.01, q: 1.8 });
    playTone({ frequency: 486, glideTo: 452, duration: 0.08, type: "sine", volume: 0.011 });
    window.setTimeout(() => {
      playTone({ frequency: 612, glideTo: 572, duration: 0.06, type: "triangle", volume: 0.009 });
    }, 70);
    return;
  }

  if (kind === "select") {
    playNoiseBurst({ duration: 0.11, frequency: 1650, volume: 0.014, q: 1.1 });
    playTone({ frequency: 420, glideTo: 560, duration: 0.12, type: "sine", volume: 0.017 });
    return;
  }

  if (kind === "launch") {
    playNoiseBurst({ duration: 0.42, frequency: 130, volume: 0.018, type: "lowpass", q: 0.7 });
    playTone({ frequency: 82, glideTo: 118, duration: 0.42, type: "sawtooth", volume: 0.015 });
    window.setTimeout(() => {
      playTone({ frequency: 190, glideTo: 260, duration: 0.18, type: "triangle", volume: 0.012 });
    }, 120);
    return;
  }

  if (kind === "scan") {
    playNoiseBurst({ duration: 0.1, frequency: 2400, volume: 0.012, q: 2.2 });
    playTone({ frequency: 620, glideTo: 860, duration: 0.16, type: "sine", volume: 0.018 });
    return;
  }

  if (kind === "success") {
    playNoiseBurst({ duration: 0.12, frequency: 1400, volume: 0.012, q: 1.1 });
    playTone({ frequency: 360, glideTo: 520, duration: 0.18, type: "sine", volume: 0.018 });
    window.setTimeout(() => {
      playTone({ frequency: 520, glideTo: 740, duration: 0.14, type: "triangle", volume: 0.014 });
    }, 90);
    return;
  }

  if (kind === "warning") {
    playNoiseBurst({ duration: 0.18, frequency: 760, volume: 0.014, q: 0.9 });
    playTone({ frequency: 196, glideTo: 138, duration: 0.18, type: "triangle", volume: 0.02 });
    window.setTimeout(() => {
      playTone({ frequency: 144, glideTo: 118, duration: 0.14, type: "square", volume: 0.013 });
    }, 130);
    return;
  }

  if (kind === "arrival") {
    playNoiseBurst({ duration: 0.22, frequency: 1250, volume: 0.013, q: 0.9 });
    playTone({ frequency: 300, glideTo: 440, duration: 0.22, type: "sine", volume: 0.018 });
    window.setTimeout(() => {
      playTone({ frequency: 440, glideTo: 620, duration: 0.26, type: "triangle", volume: 0.014 });
    }, 150);
  }
}

async function setAudioEnabled(nextEnabled, { announceChange = true, userInitiated = true } = {}) {
  if (userInitiated) {
    audioManuallyToggled = true;
  }

  if (!initSound()) {
    return false;
  }

  try {
    await soundState.context.resume();
  } catch {
    return false;
  }

  soundState.enabled = nextEnabled;
  const now = soundState.context.currentTime;
  soundState.master.gain.cancelScheduledValues(now);
  soundState.master.gain.setTargetAtTime(nextEnabled ? 0.22 : 0.0001, now, 0.18);
  setSceneMix(activeSceneId);
  updateAudioUi();

  if (announceChange) {
    announce(nextEnabled ? "Soundfield active." : "Soundfield muted.");
  }

  if (nextEnabled) {
    playCue("wake");
  }

  return true;
}

function primeAudioFromIntent() {
  primeVoiceFromIntent();

  if (soundState.enabled || audioManuallyToggled) {
    return Promise.resolve(soundState.enabled);
  }

  return setAudioEnabled(true, { announceChange: false, userInitiated: false });
}

function setTextBoost(nextEnabled, { announceChange = true } = {}) {
  body.classList.toggle("is-text-boost", nextEnabled);
  textBoostToggle.setAttribute("aria-pressed", String(nextEnabled));
  textBoostToggleText.textContent = nextEnabled ? "On" : "Off";

  if (announceChange) {
    announce(nextEnabled ? "Text boost enabled." : "Text boost disabled.");
  }
}

function resetParallaxStage(stage) {
  stage.style.setProperty("--tilt-x", "0deg");
  stage.style.setProperty("--tilt-y", "0deg");
  stage.style.setProperty("--glow-x", "50%");
  stage.style.setProperty("--glow-y", "28%");
}

function applyMotionCalm(nextEnabled, { announceChange = true } = {}) {
  body.classList.toggle("is-motion-calm", nextEnabled);
  motionToggle.setAttribute("aria-pressed", String(nextEnabled));
  motionToggleText.textContent = nextEnabled ? "On" : "Off";
  parallaxStages.forEach(resetParallaxStage);

  if (announceChange) {
    announce(nextEnabled ? "Motion calm enabled." : "Motion calm disabled.");
  }
}

function normalizeCatSpeech(message) {
  return message
    .replace(/\s*\/\/\s*/g, ". ")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickCatVoice(voices) {
  if (!voices.length) {
    return null;
  }

  const preferredMatches = ["aria", "zira", "jenny", "samantha", "hazel", "serena", "priya", "heera", "female"];
  return (
    voices.find((voice) => {
      const descriptor = `${voice.name} ${voice.voiceURI}`.toLowerCase();
      return /^en/i.test(voice.lang) && preferredMatches.some((match) => descriptor.includes(match));
    }) ||
    voices.find((voice) => /^en/i.test(voice.lang)) ||
    voices[0] ||
    null
  );
}

function primeVoiceFromIntent() {
  if (!voiceState.supported) {
    return;
  }

  refreshCatVoice();

  try {
    window.speechSynthesis.resume();
  } catch {
    // Ignore resume failures for browsers that expose but do not implement resume cleanly.
  }
}

function refreshCatVoice() {
  if (!voiceState.supported) {
    updateVoiceUi();
    return;
  }

  voiceState.voice = pickCatVoice(window.speechSynthesis.getVoices());
  updateVoiceUi();
}

function updateVoiceUi() {
  if (!catVoiceToggle || !catVoiceToggleText) {
    return;
  }

  const isAvailable = voiceState.supported;
  const isPressed = isAvailable && voiceState.enabled;
  catVoiceToggle.disabled = !isAvailable;
  catVoiceToggle.setAttribute("aria-pressed", String(isPressed));
  catVoiceToggleText.textContent = isAvailable ? (voiceState.enabled ? "On" : "Off") : "N/A";
  catVoiceToggle.title = !isAvailable
    ? "Browser speech is unavailable in this session."
    : voiceState.voice
      ? "CAT voice is ready."
      : "Waiting for the browser voice engine to finish loading.";

  if (catWaveform) {
    catWaveform.dataset.state = isPressed ? "armed" : "muted";
  }
}

function flushCatSpeechResolvers() {
  if (!voiceState.completionResolvers.length) {
    return;
  }

  const resolvers = [...voiceState.completionResolvers];
  voiceState.completionResolvers.length = 0;
  resolvers.forEach((resolve) => resolve());
}

function stopCatSpeech() {
  voiceState.activeUtterance = null;

  if (voiceState.supported) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore browser-specific speech cancellation failures.
    }
  }

  catConsole?.classList.remove("is-speaking");
  flushCatSpeechResolvers();
}

function speakCatMessage(message, { force = false } = {}) {
  if (!voiceState.supported || !voiceState.enabled) {
    return;
  }

  const normalized = normalizeCatSpeech(message || "");
  if (!normalized) {
    return;
  }

  const now = performance.now();
  if (!force && normalized === voiceState.lastMessage && now - voiceState.lastSpokenAt < 3500) {
    return;
  }

  primeVoiceFromIntent();
  stopCatSpeech();
  if (soundState.enabled) {
    playCue("comms");
  }

  const utterance = new SpeechSynthesisUtterance(normalized);
  if (voiceState.voice) {
    utterance.voice = voiceState.voice;
  }
  utterance.rate = 0.94;
  utterance.pitch = 1.04;
  utterance.volume = 0.74;

  utterance.onstart = () => {
    catConsole?.classList.add("is-speaking");
  };

  utterance.onend = utterance.onerror = () => {
    if (voiceState.activeUtterance !== utterance) {
      return;
    }

    voiceState.activeUtterance = null;
    catConsole?.classList.remove("is-speaking");
    flushCatSpeechResolvers();
  };

  voiceState.activeUtterance = utterance;
  voiceState.lastMessage = normalized;
  voiceState.lastSpokenAt = now;
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    voiceState.activeUtterance = null;
    catConsole?.classList.remove("is-speaking");
    flushCatSpeechResolvers();
  }
}

function setCatMessage(message, { speak = false, forceSpeak = false } = {}) {
  catMessage.textContent = message;

  if (speak) {
    speakCatMessage(message, { force: forceSpeak });
  }
}

function waitForCatSpeechCompletion({ timeoutMs = 14000 } = {}) {
  if (!voiceState.activeUtterance) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    voiceState.completionResolvers.push(finish);

    window.setTimeout(() => {
      const resolverIndex = voiceState.completionResolvers.indexOf(finish);
      if (resolverIndex >= 0) {
        voiceState.completionResolvers.splice(resolverIndex, 1);
      }
      finish();
    }, timeoutMs);
  });
}

function dismissWakeScreen(fromUserGesture = false) {
  if (wakeDismissed) {
    return;
  }

  if (fromUserGesture) {
    primeAudioFromIntent();
  }

  wakeDismissed = true;
  wakeScreen.classList.add("is-hidden");
  siteShell.classList.add("is-live");
  siteShell.setAttribute("aria-hidden", "false");
  startTerminalSequence();
  syncStatus(document.getElementById(activeSceneId));

  window.setTimeout(() => {
    pilotNameInput.focus();
  }, 1000);
}

function appendTerminalLine(line, delay) {
  window.setTimeout(() => {
    const lineNode = document.createElement("div");
    lineNode.className = "terminal-line";
    lineNode.textContent = `> ${line}`;
    terminalOutput.appendChild(lineNode);
    playCue("click");
  }, delay);
}

function startTerminalSequence() {
  if (terminalStarted) {
    return;
  }

  terminalStarted = true;
  terminalOutput.innerHTML = "";

  const controls = pilotForm.querySelectorAll("input, button");
  controls.forEach((control) => {
    control.disabled = true;
  });

  terminalLines.forEach((line, index) => {
    appendTerminalLine(line, index * 280);
  });

  window.setTimeout(() => {
    pilotForm.classList.add("is-ready");
    authFeedback.textContent = "Identity channel open. Enter your call sign to continue.";
    controls.forEach((control) => {
      control.disabled = false;
    });
  }, terminalLines.length * 280 + 240);
}

function syncStatus(scene) {
  if (!scene) {
    return;
  }

  const phase = scene.dataset.statusPhase || scene.dataset.phase || "Mission";
  const distance = scene.dataset.distance || "Vector unknown";
  const objective = scene.dataset.objective || "Proceed";
  const mood = scene.dataset.mood || "Steady";

  statusPhase.textContent = phase;
  statusDistance.textContent = distance;
  statusObjective.textContent = objective;
  statusMood.textContent = mood;

  statusSteps.forEach((step) => {
    const sceneIndex = scenes.findIndex((item) => item.id === step.dataset.scene);
    const activeIndex = scenes.findIndex((item) => item.id === scene.id);
    const isActive = step.dataset.scene === scene.id;

    step.classList.toggle("is-active", isActive);
    step.classList.toggle("is-done", sceneIndex < activeIndex);

    if (isActive) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }
  });
}

function closeInteractivePanels() {
  interactivePanels.forEach((panel) => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-pressed", "false");
  });
}

function activateScene(scene) {
  if (!scene || activeSceneId === scene.id) {
    return;
  }

  activeSceneId = scene.id;
  scenes.forEach((item) => {
    item.classList.toggle("is-active", item.id === scene.id);
  });

  syncStatus(scene);
  setCatMessage(catSceneMessages[scene.id] || scene.dataset.cat || catMessage.textContent, {
    speak: wakeDismissed && scene.id !== "scene-boot"
  });
  setSceneMix(scene.id);

  if (sceneCues[scene.id]) {
    playCue(sceneCues[scene.id]);
  }

  if (scene.id === "scene-launch" && !launchIgnited) {
    launchIgnited = true;
    scene.classList.add("ignition");
    window.setTimeout(() => {
      scene.classList.remove("ignition");
    }, 1000);
  }

  if (scene.id !== "scene-launch") {
    closeInteractivePanels();
  }

  if (scene.id === "scene-space") {
    scheduleIdleWatch();
  } else {
    clearTimeout(idleTimer);
    spaceIdleTriggered = false;
  }
}

function sectionProgress(scene) {
  const start = scene.offsetTop - window.innerHeight * 0.12;
  const distance = Math.max(scene.offsetHeight - window.innerHeight * 0.2, 1);
  return clamp((window.scrollY - start) / distance, 0, 1);
}

function updateLaunchMetrics(progress) {
  const fuel = Math.round(100 - progress * 36);
  const thrust = Math.round(35 + progress * 65);
  const altitude = Math.round(progress * 390);

  fuelValue.textContent = `${fuel}%`;
  thrustValue.textContent = `${thrust}%`;
  altitudeValue.textContent = `${altitude} km`;

  fuelFill.style.width = `${fuel}%`;
  thrustFill.style.width = `${thrust}%`;
  altitudeFill.style.width = `${clamp(progress * 100, 10, 100)}%`;

  if (soundState.initialized && activeSceneId === "scene-launch") {
    const now = soundState.context.currentTime;
    soundState.subGain.gain.setTargetAtTime(soundState.enabled ? 0.014 + progress * 0.024 : 0.0001, now, 0.12);
    soundState.noiseLowGain.gain.setTargetAtTime(soundState.enabled ? 0.018 + progress * 0.02 : 0.0001, now, 0.12);
    soundState.noiseHighGain.gain.setTargetAtTime(soundState.enabled ? 0.005 + progress * 0.006 : 0.0001, now, 0.12);
  }
}

function updateEntryState() {
  const safeAngle = 6;
  const error = Math.abs(landingAngle - safeAngle);
  const thermal = clamp(64 + currentEntryProgress * 18 + error * 1.15, 54, 99);
  const previousEntryState = lastEntryState;
  let stability = "Balanced";
  let warning = "Drag the dial to settle inside the narrow safe corridor.";

  landingConsole.classList.remove("is-warning", "is-optimal");

  if (error <= 5) {
    stability = "Optimal";
    warning = "Corridor stable. Hold it here and the hull stops arguing.";
    landingConsole.classList.add("is-optimal");
  } else if (error <= 12) {
    stability = "Unsteady";
    warning = "You are close, but Mars is tugging the craft off-center.";
    landingConsole.classList.add("is-warning");
  } else {
    stability = "Critical";
    warning = "Unsafe vector. Too much drift and the entry window snaps shut.";
    landingConsole.classList.add("is-warning");
  }

  angleValue.innerHTML = `${Math.round(landingAngle)}&deg;`;
  stabilityValue.textContent = stability;
  thermalValue.textContent = `${Math.round(thermal)}%`;
  entryWarning.textContent = warning;
  landingDial.setAttribute("aria-valuenow", String(Math.round(landingAngle)));
  landingDial.setAttribute("aria-valuetext", `${Math.round(landingAngle)} degrees, ${stability.toLowerCase()} stability`);

  if (previousEntryState && stability !== previousEntryState && activeSceneId === "scene-entry") {
    if (stability === "Optimal") {
      playCue("success");
    } else if (stability === "Critical") {
      playCue("warning");
    } else {
      playCue("select");
    }
  }

  lastEntryState = stability;

  if (activeSceneId === "scene-entry" && stability !== previousEntryState) {
    if (stability === "Optimal") {
      setCatMessage("That's it. Soft hands. Let the atmosphere work with you.", { speak: true });
    } else if (stability === "Critical") {
      setCatMessage("Too far off corridor. Ease it back before the heat spikes.", { speak: true });
    }
  }
}

function setLandingAngle(nextAngle) {
  landingAngle = clamp(nextAngle, -35, 35);
  root.style.setProperty("--landing-angle", landingAngle.toFixed(2));
  updateEntryState();
}

function setBrief(briefKey, { announceChange = true, updateCompanion = true, playSound = true } = {}) {
  const brief = astronautBriefs[briefKey];
  if (!brief) {
    return;
  }

  briefTabs.forEach((tab) => {
    const isActive = tab.dataset.brief === briefKey;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });

  briefReadout.textContent = brief.text;

  if (updateCompanion) {
    setCatMessage(brief.message, { speak: playSound });
  }

  if (announceChange) {
    announce(`${briefKey} brief loaded.`);
  }

  if (playSound) {
    playCue("select");
  }
}

function updatePrepModule(card) {
  prepCards.forEach((item) => {
    const isActive = item === card;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  prepReadout.innerHTML = `<strong>${card.dataset.title}.</strong> ${card.dataset.copy}`;
  setCatMessage(card.dataset.message || "Prep module loaded.", { speak: true });
  announce(`${card.dataset.title} module previewed.`);
  playCue("select");
}

function updateHotspotResult(hotspot) {
  const title = hotspot.dataset.title || "Surface trace";
  const copy = hotspot.dataset.copy || "Signal found.";
  visitedHotspots.add(title);
  hotspot.classList.add("is-visited");
  scanResults.innerHTML = `<h3>${title}</h3><p>${copy}</p>`;
  playCue("scan");
  announce(`${title} scanned.`);

  if (visitedHotspots.size === hotspots.length) {
    finalBeacon.classList.add("is-active");
    finalNote.textContent = `The final signal is only an echo of a human heartbeat, ${pilotName}. Mars gives nothing back but reflection, and somehow that feels enough.`;
    setCatMessage("We made it. The silence sounds different when you survive it.", { speak: true, forceSpeak: true });
    playCue("arrival");
  } else {
    finalNote.textContent = `${visitedHotspots.size}/${hotspots.length} surface findings recorded. The rest of the story is still buried in the dust.`;
    setCatMessage("Surface scan received. There is still more hidden under the dust.", { speak: true });
  }
}

function scheduleIdleWatch() {
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (activeSceneId !== "scene-space") {
      return;
    }

    spaceIdleTriggered = true;
    idlePrompt.textContent =
      "No input detected. The cabin feels larger when you stop moving, doesn't it?";
    setCatMessage("You went quiet. I can keep watch until you're ready to move again.", { speak: true });
  }, idleDelayMs);
}

function registerActivity() {
  if (activeSceneId === "scene-space") {
    if (spaceIdleTriggered) {
      idlePrompt.textContent =
        "Minimal telemetry only. Stay still long enough and EVA-9 notices the silence changing shape.";
      setCatMessage("There you are. I kept the stars from slipping while you were away.", { speak: true });
      spaceIdleTriggered = false;
    }
    scheduleIdleWatch();
  }
}

function updateScrollState() {
  scrollTicking = false;
  root.style.setProperty("--global-scroll", String(window.scrollY));

  scenes.forEach((scene) => {
    const progress = sectionProgress(scene);

    if (scene.id === "scene-launch") {
      root.style.setProperty("--launch-progress", progress.toFixed(4));
      updateLaunchMetrics(progress);
    }

    if (scene.id === "scene-space") {
      root.style.setProperty("--space-progress", progress.toFixed(4));
    }

    if (scene.id === "scene-entry") {
      currentEntryProgress = progress;
      root.style.setProperty("--entry-progress", progress.toFixed(4));
      updateEntryState();

      if (soundState.initialized && activeSceneId === "scene-entry") {
        const now = soundState.context.currentTime;
        soundState.noiseLowGain.gain.setTargetAtTime(soundState.enabled ? 0.018 + progress * 0.012 : 0.0001, now, 0.14);
        soundState.noiseHighGain.gain.setTargetAtTime(soundState.enabled ? 0.008 + progress * 0.014 : 0.0001, now, 0.14);
      }
    }

    if (scene.id === "scene-mars") {
      root.style.setProperty("--mars-progress", progress.toFixed(4));
    }

    const rect = scene.getBoundingClientRect();
    const visible = rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.45;
    if (visible) {
      activateScene(scene);
    }
  });
}

function requestScrollUpdate() {
  registerActivity();
  if (scrollTicking) {
    return;
  }

  scrollTicking = true;
  window.requestAnimationFrame(updateScrollState);
}

async function authorizePilot(event) {
  event.preventDefault();
  await primeAudioFromIntent();
  playCue("success");

  const value = pilotNameInput.value.trim();
  pilotName = value || "Pilot";
  statusName.textContent = pilotName;
  authFeedback.textContent = `Access granted, ${pilotName}. Bridge controls unlocked.`;
  setCatMessage(`Welcome aboard, ${pilotName}. I'll keep the long dark from feeling empty.`, {
    speak: true,
    forceSpeak: true
  });
  announce(`Access granted for ${pilotName}.`);

  if (voiceState.supported && voiceState.enabled) {
    await waitForCatSpeechCompletion();
  }

  document.getElementById("scene-launch").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

function updateAngleFromPointer(clientX) {
  const bounds = landingDial.getBoundingClientRect();
  const percent = clamp((clientX - bounds.left) / bounds.width, 0, 1);
  const nextAngle = -35 + percent * 70;
  setLandingAngle(nextAngle);
}

function bindLandingDial() {
  let dragging = false;

  landingDial.addEventListener("pointerdown", (event) => {
    primeAudioFromIntent();
    dragging = true;
    landingDial.classList.add("is-dragging");
    landingDial.setPointerCapture(event.pointerId);
    updateAngleFromPointer(event.clientX);
  });

  landingDial.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }
    updateAngleFromPointer(event.clientX);
  });

  const release = () => {
    dragging = false;
    landingDial.classList.remove("is-dragging");
  };

  landingDial.addEventListener("pointerup", release);
  landingDial.addEventListener("pointercancel", release);
  landingDial.addEventListener("lostpointercapture", release);
  landingDial.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      primeAudioFromIntent();
      setLandingAngle(landingAngle - 2);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      primeAudioFromIntent();
      setLandingAngle(landingAngle + 2);
    }
  });
}

function bindParallaxStages() {
  parallaxStages.forEach((stage) => {
    resetParallaxStage(stage);

    stage.addEventListener("pointermove", (event) => {
      if (body.classList.contains("is-motion-calm")) {
        return;
      }

      const bounds = stage.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
      const tiltY = (x - 0.5) * 10;
      const tiltX = (0.5 - y) * 8;

      stage.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      stage.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      stage.style.setProperty("--glow-x", `${(x * 100).toFixed(1)}%`);
      stage.style.setProperty("--glow-y", `${(y * 100).toFixed(1)}%`);
    });

    stage.addEventListener("pointerleave", () => resetParallaxStage(stage));
  });
}

function initializeStatusSteps() {
  statusSteps.forEach((step) => {
    step.addEventListener("click", () => {
      primeAudioFromIntent();
      playCue("click");
      const target = document.getElementById(step.dataset.scene);
      if (target) {
        target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      }
    });
  });
}

function initializeBriefTabs() {
  briefTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      primeAudioFromIntent();
      setBrief(tab.dataset.brief);
    });
  });
}

function initializePrepCards() {
  prepCards.forEach((card) => {
    card.addEventListener("click", () => {
      primeAudioFromIntent();
      updatePrepModule(card);
    });
  });
}

function initializeInteractivePanels() {
  interactivePanels.forEach((panel) => {
    panel.addEventListener("click", () => {
      primeAudioFromIntent();
      const willOpen = !panel.classList.contains("is-open");

      interactivePanels.forEach((item) => {
        const isCurrent = item === panel;
        item.classList.toggle("is-open", willOpen && isCurrent);
        item.setAttribute("aria-pressed", String(willOpen && isCurrent));
      });

      setCatMessage(
        willOpen ? panel.dataset.message || panel.querySelector(".panel-reveal")?.textContent?.trim() || catMessage.textContent
          : catSceneMessages[activeSceneId] || catMessage.textContent,
        { speak: willOpen }
      );
      playCue(willOpen ? "select" : "click");
    });
  });
}

function initializeHotspots() {
  hotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", () => {
      primeAudioFromIntent();
      updateHotspotResult(hotspot);
    });
  });
}

function initializeControls() {
  updateAudioUi();
  setTextBoost(false, { announceChange: false });
  applyMotionCalm(motionQuery.matches, { announceChange: false });
  refreshCatVoice();

  audioToggle.addEventListener("click", async () => {
    const turningOff = soundState.enabled;

    if (turningOff) {
      playCue("click");
    }

    await setAudioEnabled(!soundState.enabled);
  });

  textBoostToggle.addEventListener("click", () => {
    primeAudioFromIntent();
    const nextEnabled = textBoostToggle.getAttribute("aria-pressed") !== "true";
    setTextBoost(nextEnabled);
    playCue("click");
  });

  motionToggle.addEventListener("click", () => {
    primeAudioFromIntent();
    const nextEnabled = motionToggle.getAttribute("aria-pressed") !== "true";
    applyMotionCalm(nextEnabled);
    playCue("click");
  });

  if (voiceState.supported) {
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", refreshCatVoice);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshCatVoice;
    }
  }

  catVoiceToggle?.addEventListener("click", () => {
    primeVoiceFromIntent();
    voiceState.enabled = !voiceState.enabled;

    if (!voiceState.enabled) {
      stopCatSpeech();
    } else {
      speakCatMessage(catMessage.textContent, { force: true });
    }

    updateVoiceUi();
    playCue("click");
    announce(voiceState.enabled ? "CAT voice enabled." : "CAT voice muted.");
  });

  const handleMotionPreferenceChange = (event) => {
    applyMotionCalm(event.matches, { announceChange: false });
  };

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", handleMotionPreferenceChange);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(handleMotionPreferenceChange);
  }
}

function bootMission() {
  window.setTimeout(() => dismissWakeScreen(false), wakeDelayMs);

  wakeScreen.addEventListener("click", () => dismissWakeScreen(true));
  wakeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    dismissWakeScreen(true);
  });

  pilotForm.addEventListener("submit", authorizePilot);

  initializeControls();
  initializeStatusSteps();
  initializeBriefTabs();
  initializePrepCards();
  initializeInteractivePanels();
  initializeHotspots();
  bindLandingDial();
  bindParallaxStages();

  setBrief("profile", { announceChange: false, updateCompanion: false, playSound: false });
  setLandingAngle(0);
  updateLaunchMetrics(0);
  updateScrollState();

  ["pointermove", "pointerdown", "keydown", "touchstart", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, registerActivity, { passive: true });
  });

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
}

bootMission();
