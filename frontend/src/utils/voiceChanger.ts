// frontend/src/utils/voiceChanger.ts

export type VoiceChangerPreset = 'original' | 'deep' | 'cyber' | 'radio' | 'helium';

export interface VoicePresetMetadata {
  id: VoiceChangerPreset;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  isPremiumOnly: boolean;
}

export const VOICE_CHANGER_PRESETS: VoicePresetMetadata[] = [
  {
    id: 'original',
    label: 'Оригинал (Без эффектов)',
    shortLabel: 'Обычный',
    icon: '🎙️',
    description: 'Естественный голос с микрофона без тембральной модуляции.',
    isPremiumOnly: false,
  },
  {
    id: 'deep',
    label: 'Аноним (Низкий тембр)',
    shortLabel: 'Аноним',
    icon: '🕵️',
    description: 'Сдвиг высоты тона вниз (-4.5 полутона) с маскировкой формант голоса.',
    isPremiumOnly: true,
  },
  {
    id: 'cyber',
    label: 'Киберпанк (Синтезатор)',
    shortLabel: 'Кибер',
    icon: '🤖',
    description: 'Кольцевая модуляция (Ring Modulator 55 Гц) с металлическим резонансом.',
    isPremiumOnly: true,
  },
  {
    id: 'radio',
    label: 'Радиостудия (Broadcast)',
    shortLabel: 'Студия',
    icon: '📻',
    description: 'Ламповая компрессия, плотный бас и срезание комнатного гула.',
    isPremiumOnly: true,
  },
  {
    id: 'helium',
    label: 'Высокий (Гелий)',
    shortLabel: 'Гелий',
    icon: '⚡',
    description: 'Сдвиг высоты тона вверх (+5 полутонов) с осветлением спектра.',
    isPremiumOnly: true,
  },
];

export interface VoiceGraphResult {
  recordingStream: MediaStream;
  audioCtx: AudioContext | null;
  analyser: AnalyserNode | null;
  cleanup: () => void;
}

function makeSoftSaturationCurve(amount: number): Float32Array {
  const k = Math.max(1, amount);
  const nSamples = 4096;
  const curve = new Float32Array(nSamples);
  const deg = Math.PI / 180;
  for (let i = 0; i < nSamples; ++i) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Real-time granular dual-delay pitch shifter node for Web Audio API.
 * Shifts pitch by `pitchRatio` (e.g. 0.76 for deep anonymous voice, 1.33 for helium)
 * without changing real-time stream duration.
 */
function createGranularPitchShifter(
  audioCtx: AudioContext,
  pitchRatio: number
): ScriptProcessorNode {
  const bufferSize = 2048;
  const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
  const delayBufferLength = 8192;
  const delayBuffer = new Float32Array(delayBufferLength);
  let writeIndex = 0;
  let phaseA = 0;
  let phaseB = 0.5;
  const grainWindow = 2048;
  // Delay sweep speed proportional to (1 - pitchRatio)
  const sweepRate = (1.0 - pitchRatio) / grainWindow;

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);

    for (let i = 0; i < input.length; i++) {
      delayBuffer[writeIndex] = input[i];

      phaseA += sweepRate;
      if (phaseA >= 1.0) phaseA -= 1.0;
      if (phaseA < 0.0) phaseA += 1.0;

      phaseB = phaseA + 0.5;
      if (phaseB >= 1.0) phaseB -= 1.0;

      const delaySamplesA = phaseA * grainWindow;
      const delaySamplesB = phaseB * grainWindow;

      const readPosA = (writeIndex - delaySamplesA + delayBufferLength) % delayBufferLength;
      const readPosB = (writeIndex - delaySamplesB + delayBufferLength) % delayBufferLength;

      const idxA0 = Math.floor(readPosA);
      const idxA1 = (idxA0 + 1) % delayBufferLength;
      const fracA = readPosA - idxA0;
      const sampleA = delayBuffer[idxA0] * (1 - fracA) + delayBuffer[idxA1] * fracA;

      const idxB0 = Math.floor(readPosB);
      const idxB1 = (idxB0 + 1) % delayBufferLength;
      const fracB = readPosB - idxB0;
      const sampleB = delayBuffer[idxB0] * (1 - fracB) + delayBuffer[idxB1] * fracB;

      // Raised-cosine (Hann) crossfade window to eliminate clicks at grain boundaries
      const gainA = 0.5 * (1 - Math.cos(2 * Math.PI * phaseA));
      const gainB = 0.5 * (1 - Math.cos(2 * Math.PI * phaseB));

      output[i] = sampleA * gainA + sampleB * gainB;
      writeIndex = (writeIndex + 1) % delayBufferLength;
    }
  };

  return processor;
}

/**
 * Builds a real-time Web Audio API processing graph for the selected preset.
 * Returns the processed MediaStream to pass into MediaRecorder, plus an AnalyserNode for waveform visualization.
 */
export function buildVoiceChangerGraph(
  rawStream: MediaStream,
  preset: VoiceChangerPreset
): VoiceGraphResult {
  const AudioContextClass =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioContextClass) {
    return {
      recordingStream: rawStream,
      audioCtx: null,
      analyser: null,
      cleanup: () => {},
    };
  }

  let audioCtx: AudioContext | null = null;
  const oscillators: OscillatorNode[] = [];

  try {
    audioCtx = new AudioContextClass();
    const source = audioCtx.createMediaStreamSource(rawStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.25;

    if (preset === 'original') {
      source.connect(analyser);
      return {
        recordingStream: rawStream,
        audioCtx,
        analyser,
        cleanup: () => {
          audioCtx?.close().catch(() => {});
        },
      };
    }

    const destination = audioCtx.createMediaStreamDestination();
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    let tailNode: AudioNode = source;

    if (preset === 'deep') {
      // Anonymous deep voice: pitch ratio 0.77 (-4.5 semitones) + low-shelf boost + formant filter
      const pitchShifter = createGranularPitchShifter(audioCtx, 0.77);
      const lowShelf = audioCtx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 220;
      lowShelf.gain.value = 6.5;

      const lowPass = audioCtx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 3400;
      lowPass.Q.value = 0.8;

      source.connect(pitchShifter);
      pitchShifter.connect(lowShelf);
      lowShelf.connect(lowPass);
      tailNode = lowPass;
    } else if (preset === 'cyber') {
      // Cyberpunk ring modulator + slight pitch down + metallic resonator
      const pitchShifter = createGranularPitchShifter(audioCtx, 0.90);
      const ringGain = audioCtx.createGain();
      ringGain.gain.value = 0.0;

      const modOsc = audioCtx.createOscillator();
      modOsc.type = 'sawtooth';
      modOsc.frequency.value = 54;
      const modDepth = audioCtx.createGain();
      modDepth.gain.value = 0.85;
      modOsc.connect(modDepth);
      modDepth.connect(ringGain.gain);
      modOsc.start();
      oscillators.push(modOsc);

      const dryGain = audioCtx.createGain();
      dryGain.gain.value = 0.55;

      const bandPass = audioCtx.createBiquadFilter();
      bandPass.type = 'peaking';
      bandPass.frequency.value = 1400;
      bandPass.Q.value = 2.4;
      bandPass.gain.value = 7.0;

      source.connect(pitchShifter);
      pitchShifter.connect(ringGain);
      pitchShifter.connect(dryGain);
      ringGain.connect(bandPass);
      dryGain.connect(bandPass);
      tailNode = bandPass;
    } else if (preset === 'radio') {
      // Studio Broadcast: highpass rumble cut + warm tube saturation + presence boost
      const highPass = audioCtx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 95;

      const bassBoost = audioCtx.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.value = 180;
      bassBoost.gain.value = 5.0;

      const presenceBoost = audioCtx.createBiquadFilter();
      presenceBoost.type = 'peaking';
      presenceBoost.frequency.value = 3800;
      presenceBoost.Q.value = 1.1;
      presenceBoost.gain.value = 4.5;

      const shaper = audioCtx.createWaveShaper();
      shaper.curve = makeSoftSaturationCurve(14) as Float32Array<ArrayBuffer>;
      shaper.oversample = '2x';

      source.connect(highPass);
      highPass.connect(bassBoost);
      bassBoost.connect(presenceBoost);
      presenceBoost.connect(shaper);
      tailNode = shaper;
    } else if (preset === 'helium') {
      // High pitch (+5 semitones, ratio 1.34) + highshelf brightness
      const pitchShifter = createGranularPitchShifter(audioCtx, 1.34);
      const highPass = audioCtx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 260;

      const highShelf = audioCtx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 2400;
      highShelf.gain.value = 5.0;

      source.connect(pitchShifter);
      pitchShifter.connect(highPass);
      highPass.connect(highShelf);
      tailNode = highShelf;
    }

    tailNode.connect(compressor);
    compressor.connect(analyser);
    compressor.connect(destination);

    return {
      recordingStream: destination.stream,
      audioCtx,
      analyser,
      cleanup: () => {
        for (const osc of oscillators) {
          try {
            osc.stop();
          } catch {}
        }
        audioCtx?.close().catch(() => {});
      },
    };
  } catch (err) {
    console.warn('[VoiceChanger] Failed to initialize DSP pipeline, falling back to raw stream:', err);
    return {
      recordingStream: rawStream,
      audioCtx,
      analyser: null,
      cleanup: () => {
        audioCtx?.close().catch(() => {});
      },
    };
  }
}
