// frontend/src/components/quest/AudioSynth.ts

export class AudioSynth {
  private ctx: AudioContext | null = null;
  private crtHumOsc: OscillatorNode | null = null;
  private crtHumGain: GainNode | null = null;
  private crtNoiseSource: AudioBufferSourceNode | null = null;
  private crtNoiseGain: GainNode | null = null;
  private spinOsc: OscillatorNode | null = null;
  private spinNoise: AudioBufferSourceNode | null = null;
  private spinOscGain: GainNode | null = null;
  private spinNoiseGain: GainNode | null = null;

  // Hologram sound nodes
  private holoOscL: OscillatorNode | null = null;
  private holoOscR: OscillatorNode | null = null;
  private holoMerger: ChannelMergerNode | null = null;
  private holoGain: GainNode | null = null;
  private holoNoiseSource: AudioBufferSourceNode | null = null;
  private holoNoiseGain: GainNode | null = null;
  private holoLfo: OscillatorNode | null = null;
  private holoLfoGain: GainNode | null = null;
  private holoNoiseFilter: BiquadFilterNode | null = null;
  private holoDelayL: DelayNode | null = null;
  private holoDelayR: DelayNode | null = null;
  private holoFeedback: GainNode | null = null;
  private holoDelayMerger: ChannelMergerNode | null = null;
  private holoDelayGain: GainNode | null = null;

  constructor() {}

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public startCrtHum() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      this.stopCrtHum();

      // Гул 50 Гц (синусоида)
      this.crtHumOsc = this.ctx.createOscillator();
      this.crtHumGain = this.ctx.createGain();
      this.crtHumOsc.type = 'sine';
      this.crtHumOsc.frequency.setValueAtTime(50, now);

      // Lowpass фильтр для мягкости гула
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(90, now);

      this.crtHumGain.gain.setValueAtTime(0, now);
      this.crtHumGain.gain.linearRampToValueAtTime(0.015, now + 1.0);

      // Статический шум (белый шум)
      const bufferSize = this.ctx.sampleRate * 2; // 2 секунды циклического шума
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.crtNoiseSource = this.ctx.createBufferSource();
      this.crtNoiseSource.buffer = buffer;
      this.crtNoiseSource.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.Q.setValueAtTime(0.5, now);

      this.crtNoiseGain = this.ctx.createGain();
      this.crtNoiseGain.gain.setValueAtTime(0, now);
      this.crtNoiseGain.gain.linearRampToValueAtTime(0.0015, now + 1.0);

      // Подключения
      this.crtHumOsc.connect(filter);
      filter.connect(this.crtHumGain);
      this.crtHumGain.connect(this.ctx.destination);

      this.crtNoiseSource.connect(noiseFilter);
      noiseFilter.connect(this.crtNoiseGain);
      this.crtNoiseGain.connect(this.ctx.destination);

      this.crtHumOsc.start(now);
      this.crtNoiseSource.start(now);
    } catch (e) {
      console.warn("AudioSynth: Failed to start CRT hum", e);
    }
  }

  public stopCrtHum() {
    try {
      if (this.crtHumOsc) {
        this.crtHumOsc.stop();
        this.crtHumOsc.disconnect();
        this.crtHumOsc = null;
      }
      if (this.crtHumGain) {
        this.crtHumGain.disconnect();
        this.crtHumGain = null;
      }
      if (this.crtNoiseSource) {
        this.crtNoiseSource.stop();
        this.crtNoiseSource.disconnect();
        this.crtNoiseSource = null;
      }
      if (this.crtNoiseGain) {
        this.crtNoiseGain.disconnect();
        this.crtNoiseGain = null;
      }
    } catch (e) {}
  }

  public playClickSound() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const bufferSize = this.ctx.sampleRate * 0.02; // 20ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.Q.setValueAtTime(3, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.01);

      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  public playTypeSound() {
    try {
      this.initContext();
      if (!this.ctx || this.ctx.state === 'suspended') return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, now);

      gainNode.gain.setValueAtTime(0.015, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.01);
    } catch (e) {}
  }

  public playPowerOnSound() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(15000, now);
      osc.frequency.exponentialRampToValueAtTime(8000, now + 0.8);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.015, now + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    } catch (e) {}
  }

  public playDiskInsert() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(600, now);
      noiseFilter.Q.setValueAtTime(2, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch (e) {}
  }

  public startDriveSpinUp() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      this.stopDriveSpin();

      this.spinOsc = this.ctx.createOscillator();
      this.spinOscGain = this.ctx.createGain();
      this.spinOsc.type = 'triangle';
      this.spinOsc.frequency.setValueAtTime(80, now);
      this.spinOsc.frequency.exponentialRampToValueAtTime(320, now + 1.2);

      this.spinOscGain.gain.setValueAtTime(0, now);
      this.spinOscGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      this.spinOscGain.gain.setValueAtTime(0.08, now + 1.2);

      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.spinNoise = this.ctx.createBufferSource();
      this.spinNoise.buffer = buffer;
      this.spinNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 1.2);

      this.spinNoiseGain = this.ctx.createGain();
      this.spinNoiseGain.gain.setValueAtTime(0, now);
      this.spinNoiseGain.gain.linearRampToValueAtTime(0.02, now + 0.4);

      this.spinOsc.connect(this.spinOscGain);
      this.spinOscGain.connect(this.ctx.destination);

      this.spinNoise.connect(filter);
      filter.connect(this.spinNoiseGain);
      this.spinNoiseGain.connect(this.ctx.destination);

      this.spinOsc.start(now);
      this.spinNoise.start(now);
    } catch (e) {}
  }

  public stopDriveSpin() {
    try {
      if (this.spinOsc) {
        this.spinOsc.stop();
        this.spinOsc.disconnect();
        this.spinOsc = null;
      }
      if (this.spinOscGain) {
        this.spinOscGain.disconnect();
        this.spinOscGain = null;
      }
      if (this.spinNoise) {
        this.spinNoise.stop();
        this.spinNoise.disconnect();
        this.spinNoise = null;
      }
      if (this.spinNoiseGain) {
        this.spinNoiseGain.disconnect();
        this.spinNoiseGain = null;
      }
    } catch (e) {}
  }

  public playDriveClicks(durationSeconds: number) {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const stepInterval = 0.12;
      const numSteps = Math.floor(durationSeconds / stepInterval);

      for (let i = 0; i < numSteps; i++) {
        const stepTime = now + i * stepInterval + Math.random() * 0.03;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(140 + Math.random() * 60, stepTime);
        osc.frequency.exponentialRampToValueAtTime(50, stepTime + 0.03);

        gainNode.gain.setValueAtTime(0.05, stepTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.03);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start(stepTime);
        osc.stop(stepTime + 0.04);
      }
    } catch (e) {}
  }

  public playRadarPing() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(960, now);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.setValueAtTime(0.35, now);

      const feedback = this.ctx.createGain();
      feedback.gain.setValueAtTime(0.4, now);

      osc.connect(gainNode);
      
      gainNode.connect(this.ctx.destination);
      
      gainNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(this.ctx.destination);
      feedback.connect(delay);

      osc.start(now);
      osc.stop(now + 2.0);
    } catch (e) {}
  }

  public startHologramSound() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      this.stopHologramSound();

      // 1. Бинауральный гул 110Гц / 110.5Гц
      this.holoOscL = this.ctx.createOscillator();
      this.holoOscR = this.ctx.createOscillator();
      this.holoMerger = this.ctx.createChannelMerger(2);
      this.holoGain = this.ctx.createGain();

      this.holoOscL.type = 'sine';
      this.holoOscL.frequency.setValueAtTime(110, now);
      
      this.holoOscR.type = 'sine';
      this.holoOscR.frequency.setValueAtTime(110.5, now);

      this.holoGain.gain.setValueAtTime(0, now);
      this.holoGain.gain.linearRampToValueAtTime(0.04, now + 1.5);

      this.holoOscL.connect(this.holoMerger, 0, 0);
      this.holoOscR.connect(this.holoMerger, 0, 1);
      this.holoMerger.connect(this.holoGain);
      this.holoGain.connect(this.ctx.destination);

      // 2. Отфильтрованный шум с LFO
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.holoNoiseSource = this.ctx.createBufferSource();
      this.holoNoiseSource.buffer = buffer;
      this.holoNoiseSource.loop = true;

      this.holoNoiseFilter = this.ctx.createBiquadFilter();
      this.holoNoiseFilter.type = 'bandpass';
      this.holoNoiseFilter.frequency.setValueAtTime(600, now);
      this.holoNoiseFilter.Q.setValueAtTime(1.5, now);

      this.holoLfo = this.ctx.createOscillator();
      this.holoLfo.type = 'sine';
      this.holoLfo.frequency.setValueAtTime(0.3, now);

      this.holoLfoGain = this.ctx.createGain();
      this.holoLfoGain.gain.setValueAtTime(250, now);

      this.holoLfo.connect(this.holoLfoGain);
      this.holoLfoGain.connect(this.holoNoiseFilter.frequency);

      this.holoNoiseGain = this.ctx.createGain();
      this.holoNoiseGain.gain.setValueAtTime(0, now);
      this.holoNoiseGain.gain.linearRampToValueAtTime(0.008, now + 1.5);

      this.holoNoiseSource.connect(this.holoNoiseFilter);
      this.holoNoiseFilter.connect(this.holoNoiseGain);
      this.holoNoiseGain.connect(this.ctx.destination);

      // 3. Ping-Pong Delay
      this.holoDelayL = this.ctx.createDelay(1.0);
      this.holoDelayR = this.ctx.createDelay(1.0);
      this.holoFeedback = this.ctx.createGain();
      this.holoDelayMerger = this.ctx.createChannelMerger(2);
      this.holoDelayGain = this.ctx.createGain();

      this.holoDelayL.delayTime.setValueAtTime(0.3, now);
      this.holoDelayR.delayTime.setValueAtTime(0.6, now);
      this.holoFeedback.gain.setValueAtTime(0.4, now);
      this.holoDelayGain.gain.setValueAtTime(0, now);
      this.holoDelayGain.gain.linearRampToValueAtTime(0.005, now + 1.5);

      this.holoNoiseGain.connect(this.holoDelayL);
      this.holoDelayL.connect(this.holoDelayR);
      this.holoDelayR.connect(this.holoFeedback);
      this.holoFeedback.connect(this.holoDelayL);

      this.holoDelayL.connect(this.holoDelayMerger, 0, 0);
      this.holoDelayR.connect(this.holoDelayMerger, 0, 1);
      this.holoDelayMerger.connect(this.holoDelayGain);
      this.holoDelayGain.connect(this.ctx.destination);

      this.holoOscL.start(now);
      this.holoOscR.start(now);
      this.holoNoiseSource.start(now);
      this.holoLfo.start(now);
    } catch (e) {
      console.warn("AudioSynth: Failed to start hologram sound", e);
    }
  }

  public stopHologramSound() {
    try {
      if (this.holoOscL) {
        this.holoOscL.stop();
        this.holoOscL.disconnect();
        this.holoOscL = null;
      }
      if (this.holoOscR) {
        this.holoOscR.stop();
        this.holoOscR.disconnect();
        this.holoOscR = null;
      }
      if (this.holoMerger) {
        this.holoMerger.disconnect();
        this.holoMerger = null;
      }
      if (this.holoGain) {
        this.holoGain.disconnect();
        this.holoGain = null;
      }
      if (this.holoNoiseSource) {
        this.holoNoiseSource.stop();
        this.holoNoiseSource.disconnect();
        this.holoNoiseSource = null;
      }
      if (this.holoLfo) {
        this.holoLfo.stop();
        this.holoLfo.disconnect();
        this.holoLfo = null;
      }
      if (this.holoLfoGain) {
        this.holoLfoGain.disconnect();
        this.holoLfoGain = null;
      }
      if (this.holoNoiseFilter) {
        this.holoNoiseFilter.disconnect();
        this.holoNoiseFilter = null;
      }
      if (this.holoNoiseGain) {
        this.holoNoiseGain.disconnect();
        this.holoNoiseGain = null;
      }
      if (this.holoDelayL) {
        this.holoDelayL.disconnect();
        this.holoDelayL = null;
      }
      if (this.holoDelayR) {
        this.holoDelayR.disconnect();
        this.holoDelayR = null;
      }
      if (this.holoFeedback) {
        this.holoFeedback.disconnect();
        this.holoFeedback = null;
      }
      if (this.holoDelayMerger) {
        this.holoDelayMerger.disconnect();
        this.holoDelayMerger = null;
      }
      if (this.holoDelayGain) {
        this.holoDelayGain.disconnect();
        this.holoDelayGain = null;
      }
    } catch (e) {
      console.warn("AudioSynth: Failed to stop hologram sound", e);
    }
  }

  public destroy() {
    this.stopCrtHum();
    this.stopDriveSpin();
    this.stopHologramSound();
    if (this.ctx) {
      if (this.ctx.state !== 'closed') {
        this.ctx.close();
      }
      this.ctx = null;
    }
  }
}
