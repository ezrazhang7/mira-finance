import { useId, useState } from 'react';
import type { Cents } from '@/domain/money';
import { useI18n } from '@/i18n/I18nProvider';
import { niceCeiling } from './scale';

export interface MonthlyDatum {
  monthKey: string;
  label: string;
  amount: Cents;
}

const WIDTH = 320;
const HEIGHT = 180;
const MARGIN = { top: 8, right: 8, bottom: 24, left: 44 };

/**
 * Single-series bar chart of monthly spending. One hue (the app
 * primary); values surface via hover/focus tooltip and a table fallback
 * rendered by the page. Bars are keyboard-focusable.
 */
export function MonthlyTrendChart({ data }: { data: MonthlyDatum[] }) {
  const { money, t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const max = niceCeiling(Math.max(...data.map((d) => d.amount)));

  const slot = plotWidth / data.length;
  const barWidth = Math.min(36, slot - 8);

  const gridLines = [0.5, 1].map((f) => ({
    y: MARGIN.top + plotHeight * (1 - f),
    value: max * f,
  }));

  const activeDatum = active !== null ? data[active] : undefined;

  return (
    <figure className="chart" role="group" aria-labelledby={titleId}>
      <figcaption id={titleId} className="visually-hidden">
        {t('insights.spendingTrend')}
      </figcaption>
      <div className="chart__frame">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="chart__svg"
          role="img"
          aria-label={t('insights.spendingTrend')}
        >
          {gridLines.map((line) => (
            <g key={line.y}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={line.y}
                y2={line.y}
                className="chart__grid"
              />
              <text x={MARGIN.left - 6} y={line.y + 3} textAnchor="end" className="chart__tick">
                {money(line.value)}
              </text>
            </g>
          ))}
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={MARGIN.top + plotHeight}
            y2={MARGIN.top + plotHeight}
            className="chart__axis"
          />
          {data.map((d, i) => {
            const height = max === 0 ? 0 : (d.amount / max) * plotHeight;
            const x = MARGIN.left + slot * i + (slot - barWidth) / 2;
            const y = MARGIN.top + plotHeight - height;
            return (
              <g key={d.monthKey}>
                {/* Invisible hit target wider than the bar itself. */}
                <rect
                  x={MARGIN.left + slot * i}
                  y={MARGIN.top}
                  width={slot}
                  height={plotHeight}
                  className="chart__hit"
                  tabIndex={0}
                  aria-label={`${d.label}: ${money(d.amount)}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
                {d.amount > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(2, height)}
                    rx={4}
                    className={active === i ? 'chart__bar chart__bar--active' : 'chart__bar'}
                    pointerEvents="none"
                  />
                ) : null}
                <text
                  x={MARGIN.left + slot * i + slot / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="chart__tick"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
        {activeDatum ? (
          <div className="chart__tooltip" role="status">
            <span className="chart__tooltip-label">{activeDatum.label}</span>
            <span className="chart__tooltip-value">{money(activeDatum.amount)}</span>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
