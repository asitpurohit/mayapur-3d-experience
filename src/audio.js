let audioContext = null;
let intentionallySuspended = false;

export function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended' && !intentionallySuspended) {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// Fully silence every WebAudio sound (rain, thunder, chimes) - used when the
// player deliberately leaves the game.
export function suspendAudio() {
  intentionallySuspended = true;
  if (audioContext && audioContext.state === 'running') {
    audioContext.suspend().catch(() => {});
  }
}

export function resumeAudio() {
  intentionallySuspended = false;
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
}

export function playChime({
  notes = [523.25, 659.25, 783.99],
  duration = 1.5,
  volume = 0.11,
  spacing = 0.09,
  type = 'sine',
} = {}) {
  const audio = getAudioContext();
  if (!audio) return;
  const now = audio.currentTime;

  for (let i = 0; i < notes.length; i++) {
    const start = now + i * spacing;
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(notes[i], start);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}

export function playCollect() {
  playChime({ notes: [880, 1174.66, 1567.98], duration: 0.8, volume: 0.07, spacing: 0.05 });
}

export function playQuestComplete() {
  playChime({ notes: [523.25, 659.25, 783.99, 1046.5], duration: 1.8, volume: 0.12, spacing: 0.11 });
}

export function playYatraComplete() {
  playChime({ notes: [392, 523.25, 659.25, 783.99, 1046.5], duration: 2.4, volume: 0.13, spacing: 0.14 });
}

// Looping helicopter rotor chop for the final gift delivery. Returns a handle
// with setVolume()/stop(), or null when audio is unavailable.
export function startHelicopterLoop({ bladeRate = 12 } = {}) {
  const audio = getAudioContext();
  if (!audio) return null;
  const now = audio.currentTime;

  const duration = 2;
  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    const t = i / audio.sampleRate;
    const phase = (t * bladeRate) % 1;
    const pulse = Math.exp(-phase * 16);
    const wobble = 0.7 + 0.3 * Math.sin(t * Math.PI * 2 * 1.6);
    samples[i] = (Math.random() * 2 - 1) * pulse * wobble;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const lowpass = audio.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 340;

  const gain = audio.createGain();
  gain.gain.value = 0;

  source.connect(lowpass).connect(gain).connect(audio.destination);
  source.start(now);

  return {
    setVolume(volume) {
      gain.gain.setTargetAtTime(Math.max(0, volume), audio.currentTime, 0.25);
    },
    stop() {
      gain.gain.setTargetAtTime(0, audio.currentTime, 0.35);
      setTimeout(() => {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
      }, 1600);
    },
  };
}
