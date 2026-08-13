import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '@/store/AppStore';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { Field } from '@/ui/Field';
import { MicIcon } from '@/app/icons';
import { parseTranscript } from '@/voice/parser';
import { createRecognizer, isRecognitionSupported, speak } from '@/voice/speech';
import type { RecognitionErrorCode, Recognizer } from '@/voice/speech';
import type { Page } from '@/voice/intents';
import { executeIntent } from './executeIntent';

type Phase = 'idle' | 'listening' | 'processing';

/** Example commands rendered as tappable chips — tapping one runs it. */
const EXAMPLE_KEYS = [
  'voice.exampleSpend',
  'voice.exampleIncome',
  'voice.exampleQuery',
  'voice.exampleBudget',
  'voice.exampleNavigate',
] as const;

export function VoiceAssistant({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const store = useAppStore();
  const i18n = useI18n();
  const { t, locale } = i18n;

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [typed, setTyped] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognizerRef = useRef<Recognizer | null>(null);
  const finalHandledRef = useRef(false);
  const recognitionSupported = isRecognitionSupported();

  const errorText = useCallback(
    (code: RecognitionErrorCode): string => {
      switch (code) {
        case 'not-supported':
          return t('voice.notSupported');
        case 'permission-denied':
          return t('voice.micDenied');
        case 'no-speech':
          return t('voice.noSpeech');
        case 'network':
          return t('voice.networkError');
        default:
          return t('voice.errorGeneric');
      }
    },
    [t],
  );

  const process = useCallback(
    async (text: string) => {
      setPhase('processing');
      setErrorMessage(null);
      const intent = parseTranscript(text, locale);
      const replyText = await executeIntent(intent, {
        transactions: store.transactions,
        addTransaction: store.addTransaction,
        saveBudget: store.saveBudget,
        navigate: onNavigate,
        i18n,
      });
      setReply(replyText);
      setPhase('idle');
      if (store.settings.speakResponses) {
        await speak(replyText, locale);
      }
    },
    [locale, store, i18n, onNavigate],
  );

  const stopListening = useCallback(() => {
    recognizerRef.current?.abort();
    recognizerRef.current = null;
    setPhase('idle');
  }, []);

  const startListening = useCallback(() => {
    setReply(null);
    setErrorMessage(null);
    setTranscript('');
    finalHandledRef.current = false;

    const recognizer = createRecognizer(locale, {
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal && !finalHandledRef.current) {
          finalHandledRef.current = true;
          recognizerRef.current = null;
          void process(text);
        }
      },
      onError: (code) => {
        if (code !== 'aborted') {
          setErrorMessage(errorText(code));
        }
        recognizerRef.current = null;
        setPhase('idle');
      },
      onEnd: () => {
        // Recognition ended without a final result (silence/timeouts).
        if (recognizerRef.current) {
          recognizerRef.current = null;
          setPhase('idle');
        }
      },
    });

    if (!recognizer) {
      setErrorMessage(errorText('not-supported'));
      return;
    }
    recognizerRef.current = recognizer;
    setPhase('listening');
    recognizer.start();
  }, [locale, process, errorText]);

  // Abort any live recognition when the panel closes or unmounts.
  useEffect(() => {
    if (!open) {
      recognizerRef.current?.abort();
      recognizerRef.current = null;
    }
    return () => {
      recognizerRef.current?.abort();
      recognizerRef.current = null;
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setPhase('idle');
    setTranscript('');
    setReply(null);
    setErrorMessage(null);
  }, []);

  const handleTypedSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = typed.trim();
    if (text === '' || phase === 'processing') {
      return;
    }
    setTyped('');
    setTranscript(text);
    void process(text);
  };

  return (
    <>
      <button
        type="button"
        className="voice-fab"
        onClick={() => setOpen(true)}
        aria-label={t('voice.open')}
      >
        <MicIcon className="voice-fab__icon" />
      </button>

      <Dialog open={open} title={t('voice.open')} onClose={close}>
        <div className="voice-panel">
          {recognitionSupported ? (
            <div className="voice-panel__mic">
              <button
                type="button"
                className={
                  phase === 'listening'
                    ? 'voice-panel__mic-button voice-panel__mic-button--listening'
                    : 'voice-panel__mic-button'
                }
                onClick={phase === 'listening' ? stopListening : startListening}
                disabled={phase === 'processing'}
                aria-label={phase === 'listening' ? t('voice.listening') : t('voice.tapToTalk')}
              >
                <MicIcon />
              </button>
              <p className="voice-panel__mic-label" aria-hidden="true">
                {phase === 'listening' ? t('voice.listening') : t('voice.tapToTalk')}
              </p>
            </div>
          ) : (
            <p className="voice-panel__notice">{t('voice.notSupported')}</p>
          )}

          <div className="voice-panel__log" aria-live="polite">
            {transcript ? <p className="voice-panel__transcript">“{transcript}”</p> : null}
            {phase === 'processing' ? (
              <p className="voice-panel__status">{t('voice.processing')}</p>
            ) : null}
            {reply ? <p className="voice-panel__reply">{reply}</p> : null}
            {errorMessage ? <p className="voice-panel__error">{errorMessage}</p> : null}
          </div>

          <form className="voice-panel__form" onSubmit={handleTypedSubmit}>
            <Field label={t('voice.typeInstead')}>
              <input
                type="text"
                value={typed}
                placeholder={t('voice.typePlaceholder')}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={phase === 'processing'}>
              {t('voice.send')}
            </Button>
          </form>

          <div className="voice-panel__examples">
            <h3>{t('voice.examplesTitle')}</h3>
            <ul className="voice-chips">
              {EXAMPLE_KEYS.map((key) => {
                const phrase = t(key).replace(/^[“«]|[”»]$/g, '');
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="voice-chip"
                      disabled={phase === 'processing'}
                      onClick={() => {
                        setTranscript(phrase);
                        void process(phrase);
                      }}
                    >
                      {t(key)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Dialog>
    </>
  );
}
