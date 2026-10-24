import './LanguageSelector.css';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronDown } from 'lucide-react';

const OPTIONS = [
  { value: 'ca', label: 'CAT', flag: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Catalonia.svg' },
  { value: 'es', label: 'ESP', flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg' },
  { value: 'eu', label: 'EUS', flag: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Flag_of_the_Basque_Country.svg' },
  { value: 'en', label: 'ENG', flag: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Flag_of_the_United_Kingdom_%283-5%29.svg' } // <--- ANGLÈS (UK)
];

export function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = OPTIONS.find((o) => o.value === lang) || OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="lang-container" ref={ref}>
      <button 
        type="button" 
        className="lang-selector" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <img src={selectedOption.flag} alt="" className="lang-flag" />
        <span>{selectedOption.label}</span>
        <ChevronDown size={14} className={`lang-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="lang-dropdown">
          {OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`lang-option ${item.value === lang ? 'active' : ''}`}
              onClick={() => {
                setLang(item.value);
                setIsOpen(false);
              }}
            >
              <img src={item.flag} alt="" className="lang-flag" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
