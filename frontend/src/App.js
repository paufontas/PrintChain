import { useRef } from 'react';
import './App.css';
import logo from './assets/logo.svg';
import { usePrintQueueWS } from './hooks/usePrintQueueWS';
import { QueueList } from './components/QueueList/QueueList';
import { SystemStatus } from './components/SystemStatus/SystemStatus';
import { ConnectionBadge } from './components/ConnectionBadge/ConnectionBadge';
import { LanguageSelector } from './components/LanguageSelector/LanguageSelector';
import { uploadGcodeFile, pauseQueue, resumeQueue } from './services/api';
import { useLanguage } from './context/LanguageContext';
import { Upload } from 'lucide-react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

function App() {
  const { queue, current_job, status, time_left, is_paused, isConnected } = usePrintQueueWS(WS_URL);
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.gcode')) {
        alert("Només es permeten fitxers .gcode");
        return;
      }
      await uploadGcodeFile(file);
      e.target.value = '';
    }
  };

  const togglePause = async () => {
    if (is_paused) {
      await resumeQueue();
    } else {
      await pauseQueue();
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={logo} alt="Logo" style={{ height: '48px' }} />
        <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center' }}>
          <ConnectionBadge isConnected={isConnected} />
          <LanguageSelector />
        </div>
      </header>

      <main className="main-content">
        <SystemStatus
          status={status}
          currentJob={current_job}
          timeLeft={time_left}
          isPaused={is_paused}
          onTogglePause={togglePause}
        />

        <section className="queue-section">
          <div className="queue-header">
            <h2>{t('next_in_queue')} ({queue.length})</h2>
            <input
              type="file"
              accept=".gcode"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="btn-primary"
              onClick={() => fileInputRef.current.click()}
            >
              <Upload size={14} />
              {t('upload_gcode')}
            </button>
          </div>

          <QueueList queue={queue} />
        </section>
      </main>
    </div>
  );
}

export default App;
