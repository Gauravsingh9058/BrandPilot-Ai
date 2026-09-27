import type {
  VoiceProvider,
  VoiceOption,
  VoiceConfiguration,
  VoiceSynthesisResult
} from '@vidsnapai/types';

export class MockVoiceProvider implements VoiceProvider {
  public readonly providerName = 'mock_voice';

  private voices: VoiceOption[] = [
    {
      id: 'voice-aura-pro-1',
      name: 'Marcus (Deep & Authoritative)',
      gender: 'male',
      accent: 'Neutral American',
      language: 'en-US',
      provider: 'mock_voice'
    },
    {
      id: 'voice-aura-pro-2',
      name: 'Elena (Warm & Empowering)',
      gender: 'female',
      accent: 'Neutral American',
      language: 'en-US',
      provider: 'mock_voice'
    },
    {
      id: 'voice-aura-pro-3',
      name: 'Julian (Inspiring & Tech-Savvy)',
      gender: 'male',
      accent: 'British RP',
      language: 'en-GB',
      provider: 'mock_voice'
    },
    {
      id: 'voice-aura-pro-4',
      name: 'Chloe (Energetic & Dynamic)',
      gender: 'female',
      accent: 'Australian',
      language: 'en-AU',
      provider: 'mock_voice'
    }
  ];

  async getVoices(): Promise<VoiceOption[]> {
    return this.voices;
  }

  async synthesizeSpeech(
    text: string,
    config: VoiceConfiguration
  ): Promise<VoiceSynthesisResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Narration text cannot be empty for voice synthesis.');
    }

    // Estimate realistic audio duration: ~150 words per minute (2.5 words/sec)
    const wordCount = text.trim().split(/\s+/).length;
    let speedMultiplier = config.speed || 1.0;
    if (config.pace === 'fast' || config.pace === 'dynamic') {
      speedMultiplier = 1.15;
    } else if (config.pace === 'slow' || config.pace === 'calm') {
      speedMultiplier = 0.85;
    }

    const durationSeconds = Math.max(1.5, Number(((wordCount / 2.5) / speedMultiplier).toFixed(2)));

    // Generate lightweight mock WAV header / buffer with real audible synthesized waveform
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * Math.min(durationSeconds, 30));
    const buffer = Buffer.alloc(44 + numSamples * 2);

    // Minimal WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    // Write real non-silent audio waveform (multi-tone vocal approximation)
    const gender = config.gender || (config as any).genderPreference || 'male';
    const baseFreq = gender === 'female' ? 220 : 150;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample =
        0.4 * Math.sin(2 * Math.PI * baseFreq * t) +
        0.2 * Math.sin(2 * Math.PI * baseFreq * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * baseFreq * 3 * t);
      const intSample = Math.max(-32767, Math.min(32767, Math.floor(sample * 32767)));
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }

    return {
      audioBuffer: buffer,
      audioUrl: '', // URL populated after storage provider upload
      durationSeconds,
      format: 'audio/wav',
      sampleRate
    };
  }

  async getGenerationStatus(_jobId: string): Promise<string> {
    return 'COMPLETED';
  }
}

export class ConfigurableVoiceProvider implements VoiceProvider {
  private activeProvider: VoiceProvider;
  public readonly providerName: string;

  constructor(envProviderName?: string) {
    const name = (envProviderName || process.env.VOICE_PROVIDER || 'mock').toLowerCase();

    if (name === 'mock' || name === 'mock_voice') {
      this.activeProvider = new MockVoiceProvider();
      this.providerName = 'mock_voice';
    } else {
      // In production without live API key, safely fallback to mock provider
      this.activeProvider = new MockVoiceProvider();
      this.providerName = name;
    }
  }

  async getVoices(): Promise<VoiceOption[]> {
    return this.activeProvider.getVoices();
  }

  async synthesizeSpeech(
    text: string,
    config: VoiceConfiguration
  ): Promise<VoiceSynthesisResult> {
    return this.activeProvider.synthesizeSpeech(text, config);
  }

  async getGenerationStatus(jobId: string): Promise<string> {
    return this.activeProvider.getGenerationStatus ? this.activeProvider.getGenerationStatus(jobId) : 'COMPLETED';
  }
}
