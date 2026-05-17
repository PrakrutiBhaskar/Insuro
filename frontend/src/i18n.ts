import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "intake": {
        "title": "Health & Financial Intake",
        "desc": "Fill out your profile for hyper-personalized insurance matching.",
        "prefilled_tip": "I've pre-filled some info for our demo. Feel free to adjust!",
        "ask_anything": "Ask me anything...",
        "thinking": "Thinking..."
      },
      "common": {
        "next": "Next Step",
        "back": "Back",
        "submit": "Generate Recommendations"
      }
    }
  },
  hi: {
    translation: {
      "intake": {
        "title": "स्वास्थ्य और वित्तीय सेवन",
        "desc": "हाइपर-पर्सनलाइज्ड इंश्योरेंस मैचिंग के लिए अपना प्रोफाइल भरें।",
        "prefilled_tip": "मैने डेमो के लिए कुछ जानकारी भर दी है। आप इसे बदल सकते हैं!",
        "ask_anything": "मुझसे कुछ भी पूछें...",
        "thinking": "सोच रहा हूँ..."
      },
      "common": {
        "next": "अगला कदम",
        "back": "पीछे",
        "submit": "सिफारिशें जेनरेट करें"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
