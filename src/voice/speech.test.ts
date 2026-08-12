import { describe, expect, it, vi } from 'vitest';
import { createRecognizer, isRecognitionSupported, isSynthesisSupported, speak } from './speech';

class FakeRecognition implements SpeechRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;
  aborted = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  abort() {
    this.aborted = true;
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent(): boolean {
    return true;
  }

  emitResult(parts: { transcript: string; isFinal: boolean }[]) {
    const results = parts.map((p) => ({
      isFinal: p.isFinal,
      length: 1,
      0: { transcript: p.transcript, confidence: 1 },
      item(i: number) {
        return this[i as 0]!;
      },
    }));
    this.onresult?.({
      resultIndex: 0,
      results: Object.assign(results, {
        item: (i: number) => results[i]!,
      }) as unknown as SpeechRecognitionResultList,
    } as SpeechRecognitionEvent);
  }

  emitError(error: string) {
    this.onerror?.({ error, message: '' } as SpeechRecognitionErrorEvent);
  }
}

function windowWithRecognition(): Window {
  return { SpeechRecognition: FakeRecognition } as unknown as Window;
}

describe('capability detection', () => {
  it('detects missing recognition and synthesis', () => {
    const bare = {} as Window;
    expect(isRecognitionSupported(bare)).toBe(false);
    expect(isSynthesisSupported(bare)).toBe(false);
  });

  it('detects prefixed recognition', () => {
    const prefixed = { webkitSpeechRecognition: FakeRecognition } as unknown as Window;
    expect(isRecognitionSupported(prefixed)).toBe(true);
  });
});

describe('createRecognizer', () => {
  it('returns null when unsupported', () => {
    const callbacks = { onResult: vi.fn(), onError: vi.fn(), onEnd: vi.fn() };
    expect(createRecognizer('en', callbacks, {} as Window)).toBeNull();
  });

  it('configures language and relays results', () => {
    const callbacks = { onResult: vi.fn(), onError: vi.fn(), onEnd: vi.fn() };
    const recognizer = createRecognizer('es', callbacks, windowWithRecognition());
    expect(recognizer).not.toBeNull();

    const fake = FakeRecognition.instances.at(-1)!;
    expect(fake.lang).toBe('es-US');
    expect(fake.interimResults).toBe(true);

    recognizer!.start();
    expect(fake.started).toBe(true);

    fake.emitResult([{ transcript: 'gaste 20 ', isFinal: false }]);
    expect(callbacks.onResult).toHaveBeenLastCalledWith('gaste 20', false);

    fake.emitResult([
      { transcript: 'gaste 20 ', isFinal: false },
      { transcript: 'en comida', isFinal: true },
    ]);
    expect(callbacks.onResult).toHaveBeenLastCalledWith('gaste 20 en comida', true);
  });

  it('maps browser error codes to the stable taxonomy', () => {
    const callbacks = { onResult: vi.fn(), onError: vi.fn(), onEnd: vi.fn() };
    createRecognizer('en', callbacks, windowWithRecognition());
    const fake = FakeRecognition.instances.at(-1)!;

    fake.emitError('not-allowed');
    expect(callbacks.onError).toHaveBeenLastCalledWith('permission-denied');
    fake.emitError('no-speech');
    expect(callbacks.onError).toHaveBeenLastCalledWith('no-speech');
    fake.emitError('something-novel');
    expect(callbacks.onError).toHaveBeenLastCalledWith('unknown');

    fake.onend?.();
    expect(callbacks.onEnd).toHaveBeenCalled();
  });
});

describe('speak', () => {
  it('resolves immediately when synthesis is unavailable', async () => {
    await expect(speak('hello', 'en', {} as Window)).resolves.toBeUndefined();
  });

  it('speaks with a locale-matched voice and resolves on end', async () => {
    const spoken: { text: string; lang: string; voiceLang?: string }[] = [];
    class FakeUtterance {
      lang = '';
      voice: { lang: string } | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const fakeWindow = {
      SpeechSynthesisUtterance: FakeUtterance,
      speechSynthesis: {
        cancel: vi.fn(),
        getVoices: () => [{ lang: 'en-GB' }, { lang: 'es-MX' }],
        speak: (utterance: FakeUtterance) => {
          spoken.push({
            text: utterance.text,
            lang: utterance.lang,
            ...(utterance.voice ? { voiceLang: utterance.voice.lang } : {}),
          });
          utterance.onend?.();
        },
      },
    } as unknown as Window;

    await speak('Agregado', 'es', fakeWindow);
    expect(spoken).toEqual([{ text: 'Agregado', lang: 'es-US', voiceLang: 'es-MX' }]);
  });
});
