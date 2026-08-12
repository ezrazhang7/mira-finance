import type { VoiceLocale } from './lexicon';

/**
 * Wrappers over the Web Speech API with capability detection and a
 * stable error taxonomy. Voice is an enhancement in Mira — every caller
 * must handle the unsupported case by offering the manual flow instead.
 */

/** BCP-47 tags used for both recognition and synthesis. */
export const SPEECH_LANG: Record<VoiceLocale, string> = {
  en: 'en-US',
  es: 'es-US',
};

export type RecognitionErrorCode =
  | 'not-supported'
  | 'permission-denied'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'unknown';

export interface RecognizerCallbacks {
  /** Called with the accumulated transcript; `isFinal` marks completion. */
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (code: RecognitionErrorCode) => void;
  onEnd: () => void;
}

export interface Recognizer {
  start(): void;
  stop(): void;
  abort(): void;
}

function recognitionConstructor(w: Window): SpeechRecognitionConstructor | undefined {
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isRecognitionSupported(w: Window = window): boolean {
  return recognitionConstructor(w) !== undefined;
}

export function isSynthesisSupported(w: Window = window): boolean {
  return 'speechSynthesis' in w && typeof w.speechSynthesis?.speak === 'function';
}

function mapRecognitionError(error: string): RecognitionErrorCode {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission-denied';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'audio-capture';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

/**
 * Creates a single-utterance recognizer. Returns null when the browser
 * has no speech recognition, so callers must fall back to text input.
 */
export function createRecognizer(
  locale: VoiceLocale,
  callbacks: RecognizerCallbacks,
  w: Window = window,
): Recognizer | null {
  const Constructor = recognitionConstructor(w);
  if (!Constructor) {
    return null;
  }
  const recognition = new Constructor();
  recognition.lang = SPEECH_LANG[locale];
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let transcript = '';
    let isFinal = false;
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i]!;
      transcript += result[0]?.transcript ?? '';
      if (result.isFinal) {
        isFinal = true;
      }
    }
    callbacks.onResult(transcript.trim(), isFinal);
  };
  recognition.onerror = (event) => {
    callbacks.onError(mapRecognitionError(event.error));
  };
  recognition.onend = () => {
    callbacks.onEnd();
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}

/**
 * Speaks a response aloud, preferring a voice that matches the locale.
 * Resolves when the utterance finishes; resolves immediately (without
 * failing) when synthesis is unavailable or disabled.
 */
export function speak(text: string, locale: VoiceLocale, w: Window = window): Promise<void> {
  if (!isSynthesisSupported(w) || text.trim() === '') {
    return Promise.resolve();
  }
  const synthesis = w.speechSynthesis;
  synthesis.cancel();

  return new Promise((resolve) => {
    const utterance = new w.SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[locale];
    const languagePrefix = locale === 'en' ? 'en' : 'es';
    const voice = synthesis.getVoices().find((v) => v.lang.startsWith(languagePrefix));
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synthesis.speak(utterance);
  });
}
