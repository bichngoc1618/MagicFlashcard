import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

let activeSound: Audio.Sound | null = null;

async function stopRemoteSound() {
  if (activeSound) {
    try {
      await activeSound.stopAsync();
    } catch (e) {
      // ignore
    }
    try {
      await activeSound.unloadAsync();
    } catch (e) {
      // ignore
    }
    activeSound = null;
  }
}

export async function stopTextToSpeech() {
  Speech.stop();
  await stopRemoteSound();
}

async function configureAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.warn('Unable to configure audio mode for TTS', e);
  }
}

async function playRemoteTts(text: string, language = 'ja-JP') {
  await stopRemoteSound();
  await configureAudioMode();

  const langCode = language.split('-')[0] || 'ja';
  const uri = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`;

  const { sound } = await Audio.Sound.createAsync(
    { uri, headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' } },
    { shouldPlay: true, volume: 1.0 }
  );

  activeSound = sound;
  sound.setOnPlaybackStatusUpdate(async (status) => {
    if (status.isLoaded && status.didJustFinish) {
      await stopRemoteSound();
    }
  });
}

function speakWithExpoSpeech(text: string, language: string, rate: number, pitch: number) {
  return new Promise<void>((resolve, reject) => {
    let finished = false;
    const timeout = setTimeout(async () => {
      if (!finished) {
        finished = true;
        try {
          Speech.stop();
        } catch (_e) {
          // ignore
        }
        reject(new Error('expo-speech timeout'));
      }
    }, 2500);

    Speech.speak(text, {
      language,
      rate,
      pitch,
      onDone: () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve();
        }
      },
      onError: (error) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          try {
            Speech.stop();
          } catch (_e) {
            // ignore
          }
          reject(error);
        }
      },
    });
  });
}

export async function speakTextToSpeech(
  text: string,
  options?: {
    language?: string;
    rate?: number;
    pitch?: number;
  }
) {
  if (!text || !text.trim()) return;

  await stopTextToSpeech();

  const language = options?.language || 'ja-JP';
  const rate = options?.rate ?? 0.85;
  const pitch = options?.pitch ?? 1.0;

  try {
    await speakWithExpoSpeech(text, language, rate, pitch);
    return;
  } catch (expoError) {
    console.warn('expo-speech unavailable or timed out, falling back', expoError);
  }

  try {
    await playRemoteTts(text, language);
    return;
  } catch (remoteError) {
    console.warn('Remote TTS fallback failed', remoteError);
  }

  try {
    // Dynamically require react-native-tts only if available on native build
    // @ts-ignore
    const Tts = require('react-native-tts');
    if (Tts && typeof Tts.speak === 'function') {
      Tts.stop && Tts.stop();
      try {
        Tts.setDefaultLanguage && Tts.setDefaultLanguage(language);
      } catch (_e) {}
      try {
        Tts.setDefaultRate && Tts.setDefaultRate(rate);
      } catch (_e) {}
      Tts.speak(text);
      return;
    }
  } catch (ttsError) {
    console.warn('react-native-tts fallback unavailable', ttsError);
  }

  console.warn('No available TTS method could play audio');
}
