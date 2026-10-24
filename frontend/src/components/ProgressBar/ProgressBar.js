import './ProgressBar.css';
import { useLanguage } from '../../context/LanguageContext';

export function ProgressBar({ timeLeft, totalDuration }) {
  const { t } = useLanguage();
  const total = totalDuration || 1;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((total - timeLeft) / total) * 100)
  );

  return (
    <div className="progress-container">
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="progress-text">
        <span>{t('progress')} {Math.round(progressPercent)}%</span>
        <span>{total - timeLeft}s / {total}s</span>
      </div>
    </div>
  );
}
