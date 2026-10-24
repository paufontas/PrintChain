import { Play, Pause } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './ControlButton.css';

export function ControlButton({ isPaused, onToggle }) {
  const { t } = useLanguage();

  return (
    <button
      className={`btn-control ${isPaused ? 'btn-resume' : 'btn-pause'}`}
      onClick={onToggle}
    >
      {isPaused ? <Play size={14} /> : <Pause size={14} />}
      {isPaused ? t('start_queue') : t('pause_queue')}
    </button>
  );
}
