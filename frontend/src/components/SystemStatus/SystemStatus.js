import { useLanguage } from '../../context/LanguageContext';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { ControlButton } from '../ControlButton/ControlButton';
import './SystemStatus.css';

export function SystemStatus({ status, currentJob, timeLeft, isPaused, onTogglePause }) {
  const { t } = useLanguage();

  return (
    <section className="current-status-card">
      <div className="status-header">
        <h2>{t('system_status')}</h2>
        <ControlButton isPaused={isPaused} onToggle={onTogglePause} />
      </div>

      {status === 'PRINTING' && currentJob && (
        <div className="status-box printing flex-col">
          <div className="status-box-main">
            <div className="job-details-group">
              {currentJob.image_url && (
                <img
                  src={currentJob.image_url}
                  alt={currentJob.name}
                  className="current-job-image"
                />
              )}
              <div>
                <div className="job-title">{currentJob.name}</div>
                <div className="job-subtitle">
                  {t('file_label')} <code>{currentJob.filename}</code> • {t('printing')} {isPaused && t('will_pause')}
                </div>
              </div>
            </div>
            <div className="timer-display">{timeLeft}s</div>
          </div>

          <ProgressBar timeLeft={timeLeft} totalDuration={currentJob.duration_seconds} />
        </div>
      )}

      {status === 'ROBOT_MOVING' && (
        <div className="status-box robot">
          <div className="job-details-group">
            {currentJob && currentJob.image_url && (
              <img
                src={currentJob.image_url}
                alt={currentJob.name}
                className="current-job-image"
              />
            )}
            <div>
              <div className="job-title">{t('robot_active')}</div>
              <div className="job-subtitle">
                {currentJob ? `${currentJob.name} • ` : ''}{t('robot_desc')}
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'IDLE' && (
        <div className="status-box idle">
          <div>
            <div className="job-title">
              {isPaused ? t('system_paused') : t('system_idle')}
            </div>
            <div className="job-subtitle">
              {isPaused ? t('paused_desc') : t('idle_desc')}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
