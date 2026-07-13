import { useLanguageStore } from '../store/languageStore';

type Language = 'en' | 'hi' | 'ta';

const translations: Record<Language, Record<string, string>> = {
  en: {
    greeting: 'Good Morning',
    home: 'Home',
    certifications: 'Certifications',
    applications: 'Applications',
    insights: 'Insights',
    profile: 'Profile',
    documents: 'Documents',
    settings: 'Settings',
    logout: 'Logout',
    search: 'Search',
    notifications: 'Notifications',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    back: 'Back',
    loading: 'Loading...',
    error: 'Something went wrong',
    success: 'Success',
    language: 'Language',
  },
  hi: {
    greeting: 'सुप्रभात',
    home: 'होम',
    certifications: 'प्रमाणन',
    applications: 'आवेदन',
    insights: 'अंतर्दृष्टि',
    profile: 'प्रोफ़ाइल',
    documents: 'दस्तावेज़',
    settings: 'सेटिंग्स',
    logout: 'लॉग आउट',
    search: 'खोज',
    notifications: 'सूचनाएं',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    submit: 'जमा करें',
    back: 'वापस',
    loading: 'लोड हो रहा है...',
    error: 'कुछ गलत हुआ',
    success: 'सफलता',
    language: 'भाषा',
  },
  ta: {
    greeting: 'காலை வணக்கம்',
    home: 'முகப்பு',
    certifications: 'சான்றிதழ்கள்',
    applications: 'விண்ணப்பங்கள்',
    insights: 'நுண்ணறிவு',
    profile: 'சுயவிவரம்',
    documents: 'ஆவணங்கள்',
    settings: 'அமைப்புகள்',
    logout: 'வெளியேறு',
    search: 'தேடு',
    notifications: 'அறிவிப்புகள்',
    save: 'சேமி',
    cancel: 'ரத்துசெய்',
    submit: 'சமர்ப்பி',
    back: 'திரும்பு',
    loading: 'ஏற்றுகிறது...',
    error: 'ஏதோ தவறு நடந்தது',
    success: 'வெற்றி',
    language: 'மொழி',
  },
};

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);

  const t = (key: string): string => {
    return translations[language]?.[key] ?? translations['en'][key] ?? key;
  };

  return { t, language };
}

export function translate(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] ?? translations['en'][key] ?? key;
}

export default translations;
