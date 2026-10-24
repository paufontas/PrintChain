import './ConnectionBadge.css';
import { CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function ConnectionBadge({ isConnected }) {
  const { t } = useLanguage();

  return (
    <span className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
      {isConnected ? (
        <>
          <CheckCircle size={16} />
          {t('connected')}
        </>
      ) : (
        <>
          <XCircle size={16} />
          {t('disconnected')}
        </>
      )}
    </span>
  );
}
