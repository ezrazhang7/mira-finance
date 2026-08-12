import { useState } from 'react';
import type { Settings } from '@/domain/types';
import type { TranslationKey } from '@/i18n/translations';
import { useAppStore } from '@/store/AppStore';
import { buildExportPayload, downloadJson } from '@/storage/export';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Dialog } from '@/ui/Dialog';
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
  const [confirmingErase, setConfirmingErase] = useState(false);

  const save = async (patch: Partial<Settings>) => {
    const result = await store.updateSettings({ ...store.settings, ...patch });
    setToastKey(result.ok ? 'settings.saved' : 'error.persistence-failed');
  };

  const handleExport = () => {
    const json = buildExportPayload(store.transactions, store.budgets, store.settings);
    downloadJson(json, `mira-finance-export-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleErase = async () => {
    const result = await store.eraseAllData();
    setConfirmingErase(false);
    setToastKey(result.ok ? 'settings.erased' : 'error.persistence-failed');
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

      <Card title={t('settings.privacyTitle')}>
        <div className="settings-stack">
          <p className="field__hint">{t('settings.privacyBody')}</p>
          <div>
            <Button variant="secondary" onClick={handleExport}>
              {t('settings.export')}
            </Button>
            <p className="field__hint">{t('settings.exportHint')}</p>
          </div>
          <div>
            <Button variant="danger" onClick={() => setConfirmingErase(true)}>
              {t('settings.erase')}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog
        open={confirmingErase}
        title={t('settings.eraseConfirmTitle')}
        onClose={() => setConfirmingErase(false)}
      >
        <p>{t('settings.eraseConfirmBody')}</p>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setConfirmingErase(false)}>
            {t('settings.eraseCancel')}
          </Button>
          <Button variant="danger" onClick={() => void handleErase()}>
            {t('settings.eraseConfirm')}
          </Button>
        </div>
      </Dialog>

      {toastKey ? <Toast message={t(toastKey)} onDismiss={() => setToastKey(null)} /> : null}
    </>
  );
}
