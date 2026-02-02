import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from './locales/en.json';
import sv from './locales/sv.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pl from './locales/pl.json';
import uk from './locales/uk.json';
import ro from './locales/ro.json';
import lt from './locales/lt.json';
import et from './locales/et.json';

const resources = {
  en: { translation: en },
  sv: { translation: sv },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  pl: { translation: pl },
  uk: { translation: uk },
  ro: { translation: ro },
  lt: { translation: lt },
  et: { translation: et },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('i18nextLng') || 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
