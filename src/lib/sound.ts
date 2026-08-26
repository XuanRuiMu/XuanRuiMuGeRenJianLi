type Tone = {
  freq: number;
  to?: number;
  type?: OscillatorType;
  at?: number;
  peak?: number;
  attack?: number;
  decay: number;
};

/* Shared: browsers cap how many contexts a document may open. */
let ctx: AudioContext | null = null;
let userHasInteracted = false;

function ensureUserInteraction() {
  if (!userHasInteracted) {
    userHasInteracted = true;
    // Initialize AudioContext on first user gesture
    if (!ctx) {
      ctx = new AudioContext();
    }
  }
}

function audio(): AudioContext {
  if (!ctx) {
    // Don't create here - wait for user gesture
    return null as unknown as AudioContext;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function voice({
  freq,
  to,
  type = "sine",
  at = 0,
  peak = 0.1,
  attack,
  decay,
}: Tone) {
  const c = audio();
  if (!c) return; // AudioContext not ready yet
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;

  const t = c.currentTime + at;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + decay);
  gain.gain.setValueAtTime(attack ? 0 : peak, t);
  if (attack) gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
  osc.start(t);
  osc.stop(t + decay);
}

export function play(tones: Tone[]) {
  if (localStorage.getItem("soundEnabled") === "false") return;
  // Check if we're in a user gesture context - only create AudioContext if we have interaction
  if (!userHasInteracted) {
    return;
  }
  ensureUserInteraction();
  try {
    tones.forEach(voice);
  } catch {}
}

// Attach user interaction listeners once
if (typeof window !== "undefined") {
  ["click", "keydown", "touchstart", "pointerdown"].forEach((event) => {
    window.addEventListener(event, ensureUserInteraction, { once: true, passive: true });
  });
}

export const CHIME: Tone[] = [440, 554, 659].map((freq, i) => ({
  freq,
  type: "triangle",
  at: i * 0.055,
  peak: 0.09,
  attack: 0.01,
  decay: 0.18,
}));

export const HEARTBEAT: Tone[] = [0, 0.18].map((at) => ({
  freq: 80,
  at,
  peak: 0.18,
  decay: 0.12,
}));

export const CARD_HOVER: Tone[] = [
  { freq: 1100, to: 500, peak: 0.12, decay: 0.018 },
];
