const supportedLanguages=['nl','en','fr','es','de'];
let currentLanguage=(()=>{const saved=localStorage.getItem('epbf-language');if(supportedLanguages.includes(saved))return saved;const browser=(navigator.language||'en').slice(0,2).toLowerCase();return supportedLanguages.includes(browser)?browser:'en';})();
function t(key){return translations[currentLanguage]?.[key]??translations.en[key]??key;}
function setAppLanguage(lang){if(!supportedLanguages.includes(lang))return;currentLanguage=lang;localStorage.setItem('epbf-language',lang);document.documentElement.lang=lang;document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));document.querySelectorAll('[data-language-label]').forEach(el=>el.textContent=lang.toUpperCase());}
