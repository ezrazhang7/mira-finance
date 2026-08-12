import { useState } from 'react';
import type { Settings } from '@/domain/types';
import type { TranslationKey } from '@/i18n/translations';
import { useAppStore } from '@/store/AppStore';
import { useI18n } from '@/i18n/I18nProvider';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Toast } from '@/ui/Toast';

/** Currencies offered in settings; ISO 4217 codes formatted via Intl. */
const CURRENCIES = ['USD', 'MXN', 'GTQ', 'HNL', 'COP', 'PEN', 'DOP', 'EUR'] as const;

export function SettingsPage() {
  const store = useAppStore();
  const { t } = useI18n();
  // Stored as a key so the toast renders in the live locale even when
  // the setting being changed is the language itself.
  const [toastKey, setToastKey] = useState<TranslationKey | null>(null);

  const save = async (patch: Partial<Settings>) => {
    const result = await store.updateSettings({ ...store.settings, ...patch });
    setToastKey(result.ok ? 'settings.saved' : 'error.persistence-failed');
  };

  return (
    <>
      <h1 className="page-title">{t('settings.title')}</h1>

      <Card>
        <div className="settings-stack">
          <Field label={t('settings.language')}>
            <select
              value={store.settings.locale}
              onChange={(e) => void save({ locale: e.target.value as Settings['locale'] })}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </Field>

          <Field label={t('settings.currency')}>
            <select
              value={store.settings.currency}
              onChange={(e) => void save({ currency: e.target.value })}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>

          <div className="settings-toggle">
            <div>
              <p className="field__label">{t('settings.speakResponses')}</p>
              <p className="field__hint">{t('settings.speakResponsesHint')}</p>
            </div>
            <input
              type="checkbox"
              className="settings-toggle__checkbox"
              checked={store.settings.speakResponses}
              onChange={(e) => void save({ speakResponses: e.target.checked })}
              aria-label={t('settings.speakResponses')}
            />
          </div>
        </div>
      </Card>

      {toastKey ? <Toast message={t(toastKey)} onDismiss={() => setToastKey(null)} /> : null}
    </>
  );
}
