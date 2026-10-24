EPBF APP — COMPLETE VISUAL PROTOTYPE
====================================

1. Open deze map in VS Code.
2. Start index.html met Live Server (of open het bestand rechtstreeks in een browser).
3. Kies Kijker of Speler.
4. Gebruik de onderste navigatie, klik op wedstrijden, toernooien en spelers.
5. Wissel taal via NL / EN / FR / ES / DE rechtsboven.

BESTANDEN
index.html       Basisstructuur
style.css        Volledige opmaak
app.js           Navigatie, demodata en alle interactieve schermen
translations.js  Vijf talen
language.js      Taalinstellingen + localStorage
assets/          EPBF-icoon en illustraties

BELANGRIJK
- Dit is een visueel en interactief PROTOTYPE op basis van de mock-up.
- Alle wedstrijden, ranglijsten, scores, spelersgegevens en toernooidata
  zijn VOORBEELDEN, niet afkomstig van de EPBF.
- Aanmelding voor spelers is nog niet gekoppeld aan een accountdienst.
- Foto's van individuele spelers ontbreken: neutrale avatars worden gebruikt.
- De illustraties zijn reeds lokaal aanwezig: geen externe bibliotheken nodig.
- Er is nog geen koppeling met een EPBF-API, PWA manifest of service worker.
- De demotoernooien zijn niet bedoeld als een echte EPBF-kalender.

Om later officiële EPBF-gegevens te gebruiken: vervang de arrays `players`,
`tournaments` en `matches` bovenaan app.js door data uit een geschikte bron.
