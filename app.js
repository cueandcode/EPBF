    "use strict";
    // EPBF app. Rankings and legacy matches remain demo data; player search uses EPBF D1.
    const $ = (s) => document.querySelector(s);

    // Officiële EPBF Live API en kalender-API.
    const EPBF_LIVE_API = "https://epbf-api.nicolasmintjens.workers.dev/live";
    const EPBF_ARCHIVE_API =
      "https://epbf-api.nicolasmintjens.workers.dev/archive";
    const EPBF_EVENT_API =
      "https://epbf-api.nicolasmintjens.workers.dev/epbf";
    const EPBF_PLAYERS_SEARCH_API = "https://epbf-api.nicolasmintjens.workers.dev/players/search";
    const EPBF_PROFILE_SELECT_API = "https://epbf-api.nicolasmintjens.workers.dev/app/profile/select";
    const EPBF_PERSONAL_PROFILE_KEY = "epbf_personal_profile_v1";
    const EPBF_INSTALLATION_KEY = "epbf_installation_id_v1";
    // Profielfoto's blijven uitsluitend op dit toestel, per EPBF Player ID.
    const EPBF_LOCAL_PHOTO_PREFIX = "epbf_private_photo_v1_";
    const photoLabels = {
      nl: { photo: "Profielfoto toevoegen of wijzigen", remove: "Profielfoto verwijderen", language: "Taal", app: "App-instellingen", profile: "Mijn profiel", photoError: "Foto opslaan mislukt. Probeer een andere afbeelding." },
      en: { photo: "Add or change profile photo", remove: "Remove profile photo", language: "Language", app: "App settings", profile: "My profile", photoError: "Could not save the photo. Try another image." },
      fr: { photo: "Ajouter ou modifier la photo", remove: "Supprimer la photo", language: "Langue", app: "Paramètres de l’application", profile: "Mon profil", photoError: "Impossible d’enregistrer la photo. Essayez une autre image." },
      es: { photo: "Añadir o cambiar foto de perfil", remove: "Eliminar foto de perfil", language: "Idioma", app: "Ajustes de la aplicación", profile: "Mi perfil", photoError: "No se pudo guardar la foto. Prueba otra imagen." },
      de: { photo: "Profilfoto hinzufügen oder ändern", remove: "Profilfoto entfernen", language: "Sprache", app: "App-Einstellungen", profile: "Mein Profil", photoError: "Foto konnte nicht gespeichert werden. Versuche ein anderes Bild." }
    };
    const photoText = () => photoLabels[currentLanguage] || photoLabels.en;
    const localPhoto = (id) => {
      try { return localStorage.getItem(EPBF_LOCAL_PHOTO_PREFIX + id) || ""; }
      catch { return ""; }
    };
    function personalPortrait(id, large = false) {
      const photo = localPhoto(id);
      return `<div class="portrait ${large ? "large" : ""}" style="${photo ? "overflow:hidden;" : ""}">${photo ? `<img src="${safe(photo)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">` : '<i data-lucide="user-round"></i>'}</div>`;
    }
    let photoError = "";
    async function savePersonalPhoto(file) {
      if (!file || !personalProfile || !file.type.startsWith("image/")) return;
      try {
        const img = await new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const picture = new Image();
          picture.onload = () => { URL.revokeObjectURL(objectUrl); resolve(picture); };
          picture.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Invalid image")); };
          picture.src = objectUrl;
        });
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
        localStorage.setItem(EPBF_LOCAL_PHOTO_PREFIX + personalProfile.playerId, canvas.toDataURL("image/jpeg", 0.78));
        photoError = "";
      } catch (error) {
        console.error("EPBF local photo:", error);
        photoError = photoText().photoError;
      }
      if (detail?.type === "personal-settings") render();
    }

    const personalLabels = {
      nl: { choose: "Kies je EPBF-spelersprofiel", help: "Zoek je naam in de officiële EPBF-spelersindex. Je keuze wordt op dit toestel onthouden en als profielkeuze geregistreerd.", search: "Zoek je naam…", saved: "Mijn spelersprofiel", change: "Ander profiel kiezen", confirm: "Dit profiel kiezen", saving: "Profiel opslaan…", error: "Opslaan mislukt. Controleer je verbinding en probeer opnieuw.", noMatches: "Geen spelers gevonden.", empty: "Typ een naam om te zoeken.", note: "Een profiel kiezen is geen identiteitscontrole.", back: "Terug naar mijn profiel" },
      en: { choose: "Choose your EPBF player profile", help: "Search the official EPBF player index. Your choice is remembered on this device and registered as a profile selection.", search: "Search your name…", saved: "My player profile", change: "Choose another profile", confirm: "Select this profile", saving: "Saving profile…", error: "Could not save. Check your connection and try again.", noMatches: "No players found.", empty: "Enter a name to search.", note: "Choosing a profile does not verify identity.", back: "Back to my profile" },
      fr: { choose: "Choisissez votre profil EPBF", help: "Recherchez votre nom dans l’index officiel EPBF. Votre choix est mémorisé sur cet appareil et enregistré.", search: "Rechercher votre nom…", saved: "Mon profil joueur", change: "Choisir un autre profil", confirm: "Choisir ce profil", saving: "Enregistrement…", error: "Échec de l’enregistrement. Vérifiez votre connexion.", noMatches: "Aucun joueur trouvé.", empty: "Saisissez un nom pour rechercher.", note: "Le choix d’un profil ne vérifie pas l’identité.", back: "Retour à mon profil" },
      es: { choose: "Elige tu perfil EPBF", help: "Busca tu nombre en el índice oficial EPBF. La selección se guarda en este dispositivo y se registra.", search: "Busca tu nombre…", saved: "Mi perfil de jugador", change: "Elegir otro perfil", confirm: "Elegir este perfil", saving: "Guardando…", error: "No se pudo guardar. Comprueba tu conexión.", noMatches: "No se encontraron jugadores.", empty: "Escribe un nombre para buscar.", note: "Elegir un perfil no verifica la identidad.", back: "Volver a mi perfil" },
      de: { choose: "Wähle dein EPBF-Spielerprofil", help: "Suche deinen Namen im offiziellen EPBF-Index. Die Auswahl wird auf diesem Gerät gespeichert und registriert.", search: "Namen suchen…", saved: "Mein Spielerprofil", change: "Anderes Profil wählen", confirm: "Dieses Profil wählen", saving: "Profil wird gespeichert…", error: "Speichern fehlgeschlagen. Prüfe deine Verbindung.", noMatches: "Keine Spieler gefunden.", empty: "Namen eingeben, um zu suchen.", note: "Die Profilauswahl ist keine Identitätsprüfung.", back: "Zurück zu meinem Profil" }
    };
    const personalText = () => personalLabels[currentLanguage] || personalLabels.en;
    function readPersonalProfile() {
      try {
        const value = JSON.parse(localStorage.getItem(EPBF_PERSONAL_PROFILE_KEY) || "null");
        return value && Number.isInteger(value.playerId) && value.playerId > 0 ? value : null;
      } catch { return null; }
    }
    let personalProfile = readPersonalProfile();
    let personalChoosing = !personalProfile;
    let personalSaving = false;
    let personalError = "";
    function installationId() {
      let id = localStorage.getItem(EPBF_INSTALLATION_KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(EPBF_INSTALLATION_KEY, id);
      }
      return id;
    }
    async function selectPersonalProfile(playerId) {
      if (personalSaving) return;
      const player = epbfSearchResults.find(p => Number(p.playerId) === playerId);
      if (!player) return;
      personalSaving = true;
      personalError = "";
      render();
      try {
        const response = await fetch(EPBF_PROFILE_SELECT_API, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installationId: installationId(), playerId })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || `HTTP ${response.status}`);
        personalProfile = { playerId, name: String(player.name || ""), country: String(player.country || "") };
        localStorage.setItem(EPBF_PERSONAL_PROFILE_KEY, JSON.stringify(personalProfile));
        personalChoosing = false;
        searchText = "";
        epbfSearchResults = [];
        epbfSearchState = "idle";
      } catch (error) {
        console.error("EPBF personal profile:", error);
        personalError = personalText().error;
      } finally {
        personalSaving = false;
        render();
      }
    }
    let epbfSearchResults = [];
    let epbfSearchState = "idle";
    let epbfSearchTimer = null;
    let epbfSearchController = null;
    let epbfSearchRequestId = 0;

    // Eventgegevens worden per EPBF-tornooi opgehaald en lokaal in geheugen bewaard.
    const officialEventDetails = new Map();
    const officialEventRequests = new Map();
    const officialEventFailures = new Set();

    // De actuele Spaanse EuroTours gebruiken elk hun eigen EPBF-registratiepagina.
    // Historische toernooien blijven hun eigen evenementgegevens gebruiken.
    const EPBF_EUROTOUR_REGISTRATIONS_BASE =
      "https://epbf-api.nicolasmintjens.workers.dev/registrations";
    const currentEurotourRegistrations = new Map();
    const currentEurotourRegistrationsRequests = new Map();
    const currentEurotourRegistrationsErrors = new Map();

    function currentSpanishOpenCategory(event) {
      if (!event || event.dateObject || event.status === "finished") return null;
      const category = String(event.eventCategory || event.category || event.classification || "").toLowerCase();
      const name = String(event.name || "").toLowerCase();
      const place = String([event.city, event.country, event.location].filter(Boolean).join(" ")).toLowerCase();
      const isSpanishOpen = /spanish open/.test(name) || /gandia/.test(place);
      if (!isSpanishOpen) return null;
      if (event.start === "2026-10-30" &&
          (/eurotour.women|euro.?tour.women/.test(category) ||
           (/women|ladies/.test(category + " " + name) && /euro.?tour/.test(category + " " + name)))) {
        return "eurotour-women";
      }
      if (event.start === "2026-10-29" &&
          !/women|ladies/.test(category + " " + name) &&
          (category.includes("eurotour") || /euro.?tour/.test(name))) {
        return "eurotour";
      }
      return null;
    }

    function ensureCurrentEurotourRegistrations(event) {
      const category = currentSpanishOpenCategory(event);
      if (!category || currentEurotourRegistrations.has(category) ||
          currentEurotourRegistrationsRequests.has(category)) return;
      const request = (async () => {
        const response = await fetch(`${EPBF_EUROTOUR_REGISTRATIONS_BASE}/${category}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`EuroTour-inschrijvingen: HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.success || data.category !== category ||
            data.scope !== "category-registration-list" || !Array.isArray(data.participants)) {
          throw new Error("Ongeldig EuroTour-deelnemersantwoord");
        }
        currentEurotourRegistrations.set(category, data.participants);
        currentEurotourRegistrationsErrors.delete(category);
      })().catch(error => {
        currentEurotourRegistrationsErrors.set(category, String(error?.message || error));
        console.error(`EPBF ${category} participants:`, error);
      }).finally(() => {
        currentEurotourRegistrationsRequests.delete(category);
        if (detail?.type === "tournament" &&
            currentSpanishOpenCategory(officialTournaments.find(e => String(e.id) === String(detail.id))) === category) {
          const content = $("#content");
          const scrollPosition = content?.scrollTop || 0;
          render();
          if (content) content.scrollTop = scrollPosition;
        }
      });
      currentEurotourRegistrationsRequests.set(category, request);
    }

    const championshipDisciplinesCache = new Map();
    const championshipDisciplinesRequests = new Map();
    const championshipDisciplineEvents = new Map();

    let officialEventError = "";
    let officialMatchPlayerFilter = "";
    let officialMatchCountryFilter = "";
    let officialParticipantCountryFilter = "";

    const EPBF_ARCHIVE_CATEGORIES = [
      { id: "european-championships", name: "European Championships" },
      { id: "eurotour", name: "Euro Tour" },
      { id: "eurotour-women", name: "Euro Tour Women" },
      { id: "youth-tour", name: "Youth Tour" },
      { id: "hey-ball", name: "Heyball" }
    ];

    let officialArchiveTournaments = [];
    let officialTournamentsState = "loading";
    let officialTournamentsError = "";
    let officialTournamentsRequest = false;

    async function refreshOfficialTournaments() {
      if (officialTournamentsRequest) return;

      officialTournamentsRequest = true;

      try {
        const results = await Promise.all(
          EPBF_ARCHIVE_CATEGORIES.map(async (category) => {
            const response = await fetch(
              `${EPBF_ARCHIVE_API}/${category.id}`,
              { cache: "no-store" }
            );

            if (!response.ok) {
              throw new Error(
                `${category.name}: HTTP ${response.status}`
              );
            }

            const data = await response.json();

            if (
              !data.success ||
              !Array.isArray(data.tournaments)
            ) {
              throw new Error(
                `Ongeldig antwoord voor ${category.name}`
              );
            }

            return data.tournaments;
          })
        );

        officialArchiveTournaments = results
          .flat()
          .map((event) => ({
            ...event,
            dateObject: parseOfficialTournamentDate(event)
          }))
          .sort((a, b) => {
            const dateA = a.dateObject?.getTime() ?? 0;
            const dateB = b.dateObject?.getTime() ?? 0;
            return dateA - dateB;
          });

        officialTournamentsState = "ready";
        officialTournamentsError = "";

        console.log(
          "EPBF-toernooien geladen:",
          officialTournaments.length
        );
      } catch (error) {
        officialTournamentsError = String(error);
        officialTournamentsState = "error";

        console.error(
          "EPBF Tournament API:",
          error
        );
      
      } finally {
        officialTournamentsRequest = false;

        if (mode && (page === "tournaments" || page === "home")) {
          const content = $("#content");
          const scrollPosition = content.scrollTop;
          render();
          content.scrollTop = scrollPosition;
        }
      }

    }

    function parseOfficialTournamentDate(event) {
      const match = String(event.date || "").match(
        /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/
      );

      if (!match) return null;

      const months = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11
      };

      const month = months[match[1].toLowerCase()];

      if (month === undefined) return null;

      const date = new Date(
        Number(match[3]),
        month,
        Number(match[2]),
        12
      );

      if (
        date.getFullYear() !== Number(match[3]) ||
        date.getMonth() !== month ||
        date.getDate() !== Number(match[2])
      ) {
        return null;
      }

      return date;
    }

    const LIVE_REFRESH_MS = 30000;
    const EPBF_CALENDAR_API = "https://epbf-api.nicolasmintjens.workers.dev/calendar-v2";
    let officialTournaments = [];
    let officialCalendarState = "loading";
    let officialCalendarRequest = false;
    let officialMatches = [];
    let officialLiveState = "loading";
    let officialLiveError = "";
    let officialLiveUpdatedAt = null;
    let officialLiveRequest = false;

    const countryFlags = {
  AUT: "🇦🇹",
  BEL: "🇧🇪",
  BIH: "🇧🇦",
  CHE: "🇨🇭",
  CYP: "🇨🇾",
  CZE: "🇨🇿",
  DEU: "🇩🇪",
  ESP: "🇪🇸",
  EST: "🇪🇪",
  FIN: "🇫🇮",
  FRA: "🇫🇷",
  GBR: "🇬🇧",
  HUN: "🇭🇺",
  ITA: "🇮🇹",
  LUX: "🇱🇺",
  NLD: "🇳🇱",
  NOR: "🇳🇴",
  POL: "🇵🇱",
  PRT: "🇵🇹",
  SRB: "🇷🇸",
  SVK: "🇸🇰",
  SVN: "🇸🇮",
  SWE: "🇸🇪",
  TUR: "🇹🇷"
};

function officialFlag(country) {
      const raw = typeof country === "object" && country !== null
        ? (country.code || country.countryCode || country.iso3 || country.name || "")
        : country;
      const code = String(raw || "").trim().toUpperCase();
      const aliases = {
        AT: "AUT", BE: "BEL", BA: "BIH", CH: "CHE", CY: "CYP",
        CZ: "CZE", DE: "DEU", ES: "ESP", EE: "EST", FI: "FIN",
        FR: "FRA", GB: "GBR", UK: "GBR", HU: "HUN", IT: "ITA",
        LU: "LUX", NL: "NLD", NO: "NOR", PL: "POL", PT: "PRT",
        RS: "SRB", SK: "SVK", SI: "SVN", SE: "SWE", TR: "TUR",
        SUI: "CHE", GER: "DEU", NED: "NLD", ENG: "GBR",
        SWI: "CHE", SPA: "ESP", DEN: "DNK", DK: "DNK",
        CRO: "HRV", HR: "HRV", ROU: "ROU", RO: "ROU",
        GRE: "GRC", GR: "GRC", IRL: "IRL", IE: "IRL",
        ALB: "ALB", AL: "ALB", BUL: "BGR", BG: "BGR",
        LAT: "LVA", LV: "LVA", LTU: "LTU", LT: "LTU",
        UKR: "UKR", UA: "UKR", ISL: "ISL", IS: "ISL",
        MLT: "MLT", MT: "MLT", MNE: "MNE", ME: "MNE",
        MKD: "MKD", MK: "MKD", KOS: "XKX", XK: "XKX"
      };
      const normalized = aliases[code] || code;
      if (countryFlags[normalized]) return countryFlags[normalized];
      const iso2 = {
        DNK: "DK", HRV: "HR", ROU: "RO", GRC: "GR", IRL: "IE",
        ALB: "AL", BGR: "BG", LVA: "LV", LTU: "LT",
        UKR: "UA", ISL: "IS", MLT: "MT", MNE: "ME",
        MKD: "MK", XKX: "XK"
      }[normalized];
      if (iso2) return String.fromCodePoint(...iso2.split("").map(c => 127397 + c.charCodeAt(0)));
      if (/^[A-Z]{2}$/.test(normalized)) {
        return String.fromCodePoint(...normalized.split("").map(c => 127397 + c.charCodeAt(0)));
      }
      return "🌐";
    }

    function officialStatus(status) {
      const names = {
        RUNNING: "LIVE",
        TIMEOUT: "TIMEOUT",
        FINISHED: "FINISHED",
        SCHEDULED: "SCHEDULED"
      };
      return names[status] || status || "UNKNOWN";
    }

    function officialMatchCard(match) {
      const playerA = match.playerA || {};
      const playerB = match.playerB || {};
      const isRunning = match.status === "RUNNING";

      return `
        <button class="mini-match" data-official-match="${match.id}">
          <span>${t("table")} ${safe(match.table || "–")}</span>
          <span class="mini-players">
            <span>${officialFlag(playerA.country)} ${safe(playerA.name || "–")}</span>
            <span>${officialFlag(playerB.country)} ${safe(playerB.name || "–")}</span>
          </span>
          <span class="mini-scores">
            <b>${Number.isFinite(match.scoreA) ? match.scoreA : "–"}</b>
            <b>${Number.isFinite(match.scoreB) ? match.scoreB : "–"}</b>
          </span>
          <span class="mini-right">
            ${badge(officialStatus(match.status), isRunning)}
            <small>${safe(match.discipline || match.category || "EPBF")}</small>
          </span>
        </button>
      `;
    }

    function officialLiveContent(showAll = false) {
      if (officialLiveState === "loading") {
        return `<div class="empty">EPBF livegegevens laden…</div>`;
      }
      if (officialLiveState === "error") {
        return `<div class="empty">EPBF livegegevens tijdelijk niet beschikbaar.
          <button class="pill" data-refresh-live="1">Opnieuw proberen</button></div>`;
      }

      const list = officialMatches.filter(
        (match) => liveFilter === "All" || match.category === liveFilter
      );
      if (!list.length) {
        return `<div class="empty">${t("noLive")}</div>`;
      }
      return (showAll ? list : list.slice(0, 1)).map(officialMatchCard).join("");
    }

    function renderOfficialMatchDetail(match) {
      if (!match) return `<div class="empty">${t("noResults")}</div>`;

      const playerA = match.playerA || {};
      const playerB = match.playerB || {};
      return `
        ${detailBack(t("live"))}
        <div class="detail-event">${safe(match.discipline || "EPBF")} · ${safe(match.category || "")}</div>
        <div class="match-scoreboard">
          <div class="competitor">
            <span class="portrait"><i data-lucide="user-round"></i></span>
            <strong>${safe(playerA.name || "–")}</strong>
            <small>${officialFlag(playerA.country)} ${safe(playerA.country || "")}</small>
          </div>
          <div class="score-center">
            <small>${t("table")} ${safe(match.table || "–")}</small>
            <strong>${match.scoreA ?? "–"} <span>–</span> ${match.scoreB ?? "–"}</strong>
            ${badge(officialStatus(match.status), match.status === "RUNNING")}
          </div>
          <div class="competitor">
            <span class="portrait"><i data-lucide="user-round"></i></span>
            <strong>${safe(playerB.name || "–")}</strong>
            <small>${officialFlag(playerB.country)} ${safe(playerB.country || "")}</small>
          </div>
        </div>
        <div class="info-card">
          ${infoRow(t("discipline"), match.discipline || "–")}
          ${infoRow(t("category"), match.category || "–")}
          ${infoRow(t("table"), match.table || "–")}
          ${infoRow(t("status"), officialStatus(match.status))}
          ${infoRow("EPBF Match ID", match.id)}
        </div>
      `;
    }

    async function refreshOfficialLive() {
      if (officialLiveRequest) return;
      officialLiveRequest = true;

      try {
        const response = await fetch(EPBF_LIVE_API, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !Array.isArray(data.matches)) {
          throw new Error("Ongeldig EPBF-antwoord");
        }

        officialMatches = data.matches;
        officialLiveState = "ready";
        officialLiveError = "";
        officialLiveUpdatedAt = data.updatedAt || null;
      } catch (error) {
        officialLiveError = String(error);
        // Laat eerder ontvangen scores staan als een latere verversing faalt.
        if (!officialMatches.length) officialLiveState = "error";
        console.error("EPBF Live API:", error);
      } finally {
        officialLiveRequest = false;
        if (mode && (page === "live" || (page === "home" && (!detail || detail.type === "personal")) || detail?.type === "official-match")) {
          const content = $("#content");
          const scrollPosition = content.scrollTop;
          render();
          content.scrollTop = scrollPosition;
        }
      }
    }

    // Start een eerste aanvraag en ververs daarna maximaal één keer per 30 seconden.
    refreshOfficialLive();
    setInterval(refreshOfficialLive, LIVE_REFRESH_MS);
    const icons = {
      home: "house",
      live: "radio",
      tournaments: "calendar-days",
      ranking: "chart-no-axes-column",
      players: "users-round",
    };
    const players = [
      {
        id: 1,
        name: "Fedor Gorst",
        flag: "🇺🇸",
        country: "United States",
        points: 8950,
        age: 26,
        category: "men",
        wins: 38,
        losses: 7,
      },
      {
        id: 2,
        name: "Joshua Filler",
        flag: "🇩🇪",
        country: "Germany",
        points: 8420,
        age: 28,
        category: "men",
        wins: 35,
        losses: 9,
      },
      {
        id: 3,
        name: "Ko Pin Yi",
        flag: "🇹🇼",
        country: "Chinese Taipei",
        points: 7810,
        age: 36,
        category: "men",
        wins: 33,
        losses: 10,
      },
      {
        id: 4,
        name: "Francisco Sánchez Ruiz",
        flag: "🇪🇸",
        country: "Spain",
        points: 7260,
        age: 35,
        category: "men",
        wins: 30,
        losses: 11,
      },
      {
        id: 5,
        name: "Jayson Shaw",
        flag: "🇬🇧",
        country: "United Kingdom",
        points: 6890,
        age: 38,
        category: "men",
        wins: 28,
        losses: 12,
      },
      {
        id: 6,
        name: "Carlo Biado",
        flag: "🇵🇭",
        country: "Philippines",
        points: 6420,
        age: 42,
        category: "men",
        wins: 26,
        losses: 13,
      },
      {
        id: 7,
        name: "Aloysius Yapp",
        flag: "🇸🇬",
        country: "Singapore",
        points: 5950,
        age: 29,
        category: "men",
        wins: 25,
        losses: 14,
      },
      {
        id: 8,
        name: "Eklent Kaçi",
        flag: "🇦🇱",
        country: "Albania",
        points: 5710,
        age: 27,
        category: "men",
        wins: 24,
        losses: 14,
      },
      {
        id: 9,
        name: "Jasmin Ouschan",
        flag: "🇦🇹",
        country: "Austria",
        points: 6150,
        age: 40,
        category: "women",
        wins: 28,
        losses: 8,
      },
      {
        id: 10,
        name: "Kelly Fisher",
        flag: "🇬🇧",
        country: "United Kingdom",
        points: 5900,
        age: 47,
        category: "women",
        wins: 25,
        losses: 9,
      },
      {
        id: 11,
        name: "Lena Primus",
        flag: "🇩🇪",
        country: "Germany",
        points: 3200,
        age: 19,
        category: "youth",
        wins: 17,
        losses: 7,
      },
      {
        id: 12,
        name: "Henrik Larsson",
        flag: "🇸🇪",
        country: "Sweden",
        points: 2800,
        age: 54,
        category: "wheelchair",
        wins: 15,
        losses: 6,
      },
    ];
    // Toernooien worden uitsluitend vanuit de officiële EPBF-kalender geladen.
    const tournaments = officialTournaments;

    function calendarLocation(location) {
      const parts = String(location || "").split("/").map((p) => p.trim());
      return { city: parts[0] || "–", country: parts.slice(1).join(" / ") };
    }

    function calendarDiscipline(value) {
      return String(value || "")
        .split(",")
        .map((part) => ({ "8": "8-Ball", "9": "9-Ball", "10": "10-Ball", "14.1": "14.1", "PY": "Pyramid", "HB": "Heyball", "Team": "Team" })[part.trim()] || part.trim())
        .filter(Boolean)
        .join(", ") || "–";
    }

    function calendarEvent(event) {
      const place = calendarLocation(event.location);
      return {
        id: event.id,
        name: event.name,
        city: place.city,
        country: place.country,
        flag: "🌐",
        start: event.start,
        end: event.end,
        discipline: calendarDiscipline(event.disciplines),
        category: event.classification || "–",
        status: event.status,
        website: event.website || null,
        classification: event.classification || "",
        eventCategory: event.category || ""
      };
    }

    async function refreshOfficialCalendar() {
      if (officialCalendarRequest) return;
      officialCalendarRequest = true;
      try {
        const response = await fetch(EPBF_CALENDAR_API, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.success || !Array.isArray(data.events)) throw new Error("Ongeldig EPBF-kalenderantwoord");
        officialTournaments.splice(0, officialTournaments.length,
          ...data.events.filter((e) => e.start && e.end).map(calendarEvent));
        officialCalendarState = "ready";
      } catch (error) {
        console.error("EPBF Calendar API:", error);
        if (!officialTournaments.length) officialCalendarState = "error";
      } finally {
        officialCalendarRequest = false;
        if (mode && (page === "tournaments" || (page === "home" && !detail) || detail?.type === "tournament")) {
          const content = $("#content");
          const scrollPosition = content.scrollTop;
          render();
          content.scrollTop = scrollPosition;
        }
      }
    }

    const matches = [
      {
        id: 1,
        p1: 2,
        p2: 3,
        s1: 5,
        s2: 3,
        race: 9,
        table: 1,
        event: 5,
        category: "EPBF",
        round: "Men's Division · Round 1",
        status: "live",
      },
      {
        id: 2,
        p1: 4,
        p2: 7,
        s1: 4,
        s2: 4,
        race: 9,
        table: 2,
        event: 5,
        category: "EPBF",
        round: "Men's Division · Round 1",
        status: "live",
      },
      {
        id: 3,
        p1: 5,
        p2: 8,
        s1: 2,
        s2: 1,
        race: 9,
        table: 3,
        event: 5,
        category: "EPBF",
        round: "Men's Division · Round 1",
        status: "live",
      },
      {
        id: 4,
        p1: 1,
        p2: 6,
        s1: 9,
        s2: 7,
        race: 9,
        table: 4,
        event: 6,
        category: "Eurotour",
        round: "Quarterfinal",
        status: "finished",
      },
      {
        id: 5,
        p1: 9,
        p2: 10,
        s1: 0,
        s2: 0,
        race: 7,
        table: 5,
        event: 4,
        category: "Other",
        round: "Women · Round 1",
        status: "upcoming",
      },
      {
        id: 6,
        p1: 1,
        p2: 2,
        s1: 0,
        s2: 0,
        race: 9,
        table: 6,
        event: 1,
        category: "EPBF",
        round: "Men · Round 1",
        status: "upcoming",
      },
    ];
    let mode = null,
      page = "home",
      detail = null,
      liveFilter = "All",
      tournamentFilter = "ongoing",
      tournamentView = "calendar",
      tournamentArchiveCategory = "all",
      rankingFilter = "eurotour",
      tournamentTab = "information",
      matchTab = "score",
      playerTab = "overview",
      searchText = "";
    const person = (id) => players.find((p) => p.id === id),
      eventById = (id) => tournaments.find((e) => e.id === id);
    const safe = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
            c
          ],
      );
    const fmtDate = (s) =>
      new Date(s + "T12:00:00Z").toLocaleDateString(
        { nl: "nl-BE", en: "en-GB", fr: "fr-FR", es: "es-ES", de: "de-DE" }[
          currentLanguage
        ],
        { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
      );
    const dateRange = (e) => e.start && e.end ? `${fmtDate(e.start)} – ${fmtDate(e.end)}` : "–";
    const demo = () => `<div class="demo-note">${t("demo")}</div>`;
    const badge = (label, green = false) =>
      `<span class="badge ${green ? "green" : ""}">${safe(label)}</span>`;
    const playerName = (id) => safe(person(id)?.name || "?");
    const flag = (id) => person(id)?.flag || "🌐";
    const playerRow = (p, rank = null) =>
      `<button class="person-row" data-player="${p.id}">${rank !== null ? `<span class="rank-num">${rank}</span>` : '<span class="avatar">♟</span>'}<span class="flag">${p.flag}</span>
          <span class="person-name">${safe(p.name)}</span>${rank !== null ? `<strong class="points">${p.points}</strong>` : '<span class="chev">›</span>'}</button>`;
    const playerNavLabels = {
      nl: { history: "Vorige tornooien", settings: "Instellingen" },
      en: { history: "Past events", settings: "Settings" },
      fr: { history: "Tournois passés", settings: "Paramètres" },
      es: { history: "Torneos previos", settings: "Ajustes" },
      de: { history: "Frühere Turniere", settings: "Einstellungen" }
    };
    function nav() {
      const playerMode = mode === "player";
      const items = playerMode
        ? ["home", "live", "tournaments", "ranking", "players", "settings"]
        : ["home", "live", "tournaments", "ranking", "players"];
      const labels = playerNavLabels[currentLanguage] || playerNavLabels.en;
      const playerIcons = { history: "history", settings: "settings" };
      $("#nav").classList.toggle("player-navigation", playerMode);
      $("#nav").innerHTML = items.map(key => {
        const label = key === "history" || key === "settings" ? labels[key] : t(key);
        const selected = page === key && (!detail || (key === "home" && detail.type === "personal") || (key === "settings" && detail.type === "personal-settings"));
        return `<button class="nav-item ${selected ? "selected" : ""}" data-page="${key}">
          <span class="nav-icon"><i data-lucide="${playerIcons[key] || icons[key]}"></i></span>
          <small>${safe(label)}</small></button>`;
      }).join("");
    }
    // Bewaar het vorige app-scherm voor de terugknop.
    const epbfScreenHistory = [];
    function rememberEPBFScreen() {
      epbfScreenHistory.push({ page, detail: detail ? { ...detail } : null, tournamentTab, tournamentView, tournamentFilter, tournamentArchiveCategory, playerTab, matchTab });
      if (epbfScreenHistory.length > 40) epbfScreenHistory.shift();
    }
    function showMode(next) {
      epbfScreenHistory.length = 0;
      mode = next;
      $("#splash").classList.add("hidden");
      $("#main").classList.remove("hidden");
      page = "home";
      detail = next === "player" ? { type: "personal", id: 0 } : null;
      personalChoosing = !personalProfile;
      render();
    }
    function go(next) {
      if (page !== next || detail) rememberEPBFScreen();
      page = next;
      detail = mode === "player" && next === "home" ? { type: "personal", id: 0 }
        : mode === "player" && next === "settings" ? { type: "personal-settings", id: 0 }
        : null;
      searchText = "";
      clearTimeout(epbfSearchTimer);
      if (epbfSearchController) epbfSearchController.abort();
      epbfSearchRequestId++;
      epbfSearchResults = [];
      epbfSearchState = "idle";
      render();
    }
    function openDetail(type, id) {
      rememberEPBFScreen();
      detail = { type, id };
      render();
    }
    function back() {
      const previous = epbfScreenHistory.pop();
      if (previous) {
        page = previous.page;
        detail = previous.detail;
        tournamentTab = previous.tournamentTab;
        tournamentView = previous.tournamentView;
        tournamentFilter = previous.tournamentFilter;
        tournamentArchiveCategory = previous.tournamentArchiveCategory;
        playerTab = previous.playerTab;
        matchTab = previous.matchTab;
        render();
        return;
      }
      // Terugval voor schermen die zonder navigatiehistoriek geopend zijn.
      if (detail?.type === "personal-settings") {
        page = "home";
        detail = { type: "personal", id: 0 };
        render();
      } else if (detail) {
        if (mode === "player") return go("home");
        detail = null;
        render();
      } else if (page !== "home") {
        go("home");
      } else {
        $("#main").classList.add("hidden");
        $("#splash").classList.remove("hidden");
        mode = null;
      }
    }
    function render() {
      setAppLanguage(currentLanguage);
      $("#mode-label").textContent = t(mode === "player" ? "player" : "spectator");
      // Discrete, vertaalde vermelding dat dit geen officiële EPBF-app is.
      const unofficialNotice = {
        nl: "Onafhankelijke app · Niet officieel van EPBF",
        en: "Independent app · Not an official EPBF app",
        fr: "Application indépendante · Non officielle EPBF",
        es: "Aplicación independiente · No oficial de EPBF",
        de: "Unabhängige App · Keine offizielle EPBF-App"
      };
      const headerBar = document.querySelector(".topbar");
      if (headerBar) headerBar.dataset.unofficialNotice = unofficialNotice[currentLanguage] || unofficialNotice.en;
      const backButton = $("#back");
      backButton.textContent = "‹";
      backButton.classList.toggle("hidden", !epbfScreenHistory.length && ((mode === "player" && page === "home" && detail?.type === "personal") || (!detail && page === "home")));
      nav();
      // In spelersmodus staat de taalkeuze onder Instellingen; in kijkersmodus blijft ze bovenaan.
      // De splash behoudt zijn taalkeuze; enkel de hoofdheader wordt verborgen in spelersmodus.
      const headerLanguage = document.querySelector(".topbar [data-language-toggle]");
      if (headerLanguage) {
        headerLanguage.classList.toggle("hidden", mode === "player");
        headerLanguage.style.display = mode === "player" ? "none" : "";
      }
      $("#content").innerHTML = detail
        ? renderDetail()
        : (
            {
              home: renderHome,
              live: renderLive,
              tournaments: renderTournaments,
              ranking: renderRanking,
              players: renderPlayers,
              history: renderPersonalHistory,
              settings: renderPersonalSettings,
            }[page] || renderHome
          )();
      $("#content").scrollTop = 0;

    if (window.lucide) {
      lucide.createIcons();
    }
    }
    function title(name, sub = "") {
      return `<div class="page-title">
          <h1>${name}</h1>${sub ? `<p>${sub}</p>` : ""}</div>`;
    }

    function renderHome() {
      return `
        <div class="home-hero">
          <span class="hero-chip">
            EPBF · ${t(mode === "player" ? "player" : "spectator")}
          </span>
        </div>

        <div class="dashboard-grid">

          <button class="dash-card" data-page="live">
            <span class="dash-icon">
              <i data-lucide="radio"></i>
            </span>
            <strong>${t("live")}</strong>
            <small>${t("liveSubtitle")}</small>
          </button>

          <button class="dash-card" data-page="tournaments">
            <span class="dash-icon">
              <i data-lucide="calendar-days"></i>
            </span>
            <strong>${t("tournaments")}</strong>
            <small>${t("tournamentSubtitle")}</small>
          </button>

          <button class="dash-card" data-page="ranking">
            <span class="dash-icon">
              <i data-lucide="chart-no-axes-column"></i>
            </span>
            <strong>${t("ranking")}</strong>
            <small>${t("rankingSubtitle")}</small>
          </button>

          <button class="dash-card" data-page="players">
            <span class="dash-icon">
              <i data-lucide="users-round"></i>
            </span>
            <strong>${t("players")}</strong>
            <small>${t("playersSubtitle")}</small>
          </button>

        </div>

        ${mode === "spectator" ? `<button class="feature-card" data-switch-to-viewer="1">
          <span><i data-lucide="refresh-cw"></i></span>
          <div><strong>${safe(({nl:"App opnieuw instellen",en:"Change app mode",fr:"Changer de mode",es:"Cambiar modo",de:"App-Modus ändern"}[currentLanguage] || "Change app mode"))}</strong>
          <small>${safe(({nl:"Kies opnieuw tussen Speler en Kijker",en:"Choose Player or Spectator again",fr:"Choisir Joueur ou Spectateur",es:"Elegir Jugador o Espectador",de:"Spieler oder Zuschauer wählen"}[currentLanguage] || "Choose Player or Spectator again"))}</small></div><b>›</b>
        </button>` : ""}

        ${
          mode === "player"
            ? `
              <button class="feature-card" data-personal="1">
                <span>
                  <i data-lucide="user-round"></i>
                </span>

                <div>
                  <strong>${t("myProfile")}</strong>
                  <small>${t("playerModeHint")}</small>
                </div>

                <b>›</b>
              </button>
            `
            : ""
        }

        <div class="section-heading">
          <strong>${t("liveNow")}</strong>
          <button data-page="live">
            ${t("viewAll")} ›
          </button>
        </div>

        ${officialLiveContent()}

        <div class="section-heading">
          <strong>${t("nextTournament")}</strong>
          <button data-page="tournaments">
            ${t("viewAll")} ›
          </button>
        </div>

        ${officialCalendarState === "loading"
          ? `<div class="empty">EPBF-kalender laden…</div>`
          : officialCalendarState === "error"
            ? `<div class="empty">EPBF-kalender tijdelijk niet beschikbaar.</div>`
            : (() => {
                const next = tournaments
                  .filter((e) => e.status === "upcoming" || e.status === "ongoing")
                  .sort((a, b) => a.start.localeCompare(b.start))[0];
                return next ? tournamentCard(next) : `<div class="empty">${t("noResults")}</div>`;
              })()}

        ${demo()}
      `;
    }

    function miniMatch(m) {
      return `<button class="mini-match" data-match="${m.id}">
          <span>${t("table")} ${m.table}</span>
          <span class="mini-players">
          <span>${flag(m.p1)} ${playerName(m.p1)}</span>
          <span>${flag(m.p2)} ${playerName(m.p2)}</span>
          </span>
          <span class="mini-scores">
          <b>${m.s1}</b>
          <b>${m.s2}</b>
          </span>
          <span class="mini-right">${badge(m.status === "live" ? "LIVE" : t(m.status), m.status === "live")}<small>${t("raceTo")} ${m.race}</small>
          </span>
          </button>`;
    }
    function pills(items, active, attr) {
      return `<div class="pills">${items.map(([value, label]) => `<button class="pill ${active === value ? "active" : ""}" data-${attr}="${value}">${label}</button>`).join("")}</div>`;
    }
    function renderLive() {
      const categories = [...new Set(officialMatches.map((match) => match.category).filter(Boolean))];
      const filters = [["All", t("all")], ...categories.map((category) => [category, category])];

      return `
        ${title(t("liveMatches"), '<span class="live-dot">●</span> EPBF')}
        ${pills(filters, liveFilter, "live-filter")}
        ${officialLiveContent(true)}
      `;
    }

    function epbfTournamentImage(event) {
      const category = String(event?.category || event?.eventCategory || "").toLowerCase();
      const name = String(event?.name || "").toLowerCase();
      if (category === "youth-tour" || /youth tour|youth euro|youth european tour/.test(name)) return "assets/ETY-logo.png";
      if (category === "eurotour" || category === "eurotour-women" || /euro.?tour/.test(name)) return "assets/ET-logo.png";
      if (category === "european-championships" || /european (pool )?championship|european championships/.test(name)) return "assets/ECC-logo.png";
      if (category === "hey-ball" || category === "heyball" || /hey.?ball/.test(name)) return "assets/epbf-icon.png";
      if (/sanctioned/.test(category) || /sanctioned/.test(name)) return "assets/epbf-icon.png";
      return null;
    }

    function epbfTournamentThumbnail(event) {
      const image = epbfTournamentImage(event);
      return `<span class="event-thumb ${image ? "event-thumb-logo" : ""}"${image ? ` style="background-image: url('${image}')"` : ""}></span>`;
    }

    function tournamentCard(e) {
      return `<button class="tournament-row" data-tournament="${e.id}">
          ${epbfTournamentThumbnail(e)}
          <span class="event-summary">
          <strong>${safe(e.name)}</strong>
          <small>${e.flag} ${safe([e.city, e.country].filter(Boolean).join(", "))}</small>
          <small>${dateRange(e)}</small>
          </span>
          <span class="chev">›</span>
          </button>`;
    }

    function renderTournaments() {
      const views = [
        ["calendar", t("upcomingAndLive")],
        ["archive", t("previousEvents")]
      ];

      const viewTabs = `<div class="pills">${
        views.map(([value, label]) =>
          `<button class="pill ${tournamentView === value ? "active" : ""}"
            data-tournament-view="${value}">${label}</button>`
        ).join("")
      }</div>`;

      if (tournamentView === "calendar") {
        return `${title(t("tournaments"))}
          ${viewTabs}
          ${pills(
            [
              ["upcoming", t("upcoming")],
              ["ongoing", t("ongoing")]
            ],
            tournamentFilter,
            "tournament-filter"
          )}
          <div class="tournament-list">
            ${officialCalendarState === "loading"
              ? `<div class="empty">EPBF-kalender laden…</div>`
              : officialCalendarState === "error"
                ? `<div class="empty">EPBF-kalender tijdelijk niet beschikbaar.</div>`
                : tournaments
                    .filter(e => e.status === tournamentFilter)
                    .sort((a, b) => tournamentFilter === "finished"
                      ? b.start.localeCompare(a.start)
                      : a.start.localeCompare(b.start))
                    .map(tournamentCard)
                    .join("") || `<div class="empty">${t("noResults")}</div>`
            }
          </div>`;
      }

      const categories = [
        ["all", "All categories"],
        ...EPBF_ARCHIVE_CATEGORIES.map(c => [c.id, c.name])
      ];

      const archiveFilters = `<div class="pills">${
        categories.map(([value, label]) =>
          `<button class="pill ${tournamentArchiveCategory === value ? "active" : ""}"
            data-archive-category="${value}">${label}</button>`
        ).join("")
      }</div>`;

      let archiveContent = "";

      if (officialTournamentsState === "loading") {
        archiveContent = `<div class="empty">EPBF-archief laden…</div>`;
      } else if (officialTournamentsState === "error") {
        archiveContent = `<div class="empty">
          EPBF-archief tijdelijk niet beschikbaar.
          <button class="pill" data-refresh-archive="1">Retry</button>
        </div>`;
      } else {
        const events = officialArchiveTournaments
          .filter(e =>
            tournamentArchiveCategory === "all" ||
            e.category === tournamentArchiveCategory
          )
          .sort((a, b) => {
            const dateA = a.dateObject?.getTime() ?? 0;
            const dateB = b.dateObject?.getTime() ?? 0;
            return dateB - dateA;
          });

        archiveContent = events.length
          ? `<div class="tournament-list">${
              events.map(e => `
                <button class="tournament-row"
      data-archive-tournament="${e.id}">
                  ${epbfTournamentThumbnail(e)}
                  <span class="event-summary">
                    <strong>${safe(e.name)}</strong>
                    <small>${safe(e.categoryName || e.category)}</small>
                    <small>${safe(e.date || "–")}</small>
                  </span>
                  <span class="chev">↗</span>
                </button>
              `).join("")
            }</div>`
          : `<div class="empty">${t("noResults")}</div>`;
      }

      return `${title(t("tournaments"))}
        ${viewTabs}
        ${archiveFilters}
        ${archiveContent}`;
    }

    // Officiële Euro Tour-rankings. Beide categorieën hebben een eigen cache.
    const EPBF_RANKINGS_API = "https://epbf-api.nicolasmintjens.workers.dev/rankings";
    const epbfRankings = new Map();
    const epbfRankingRequests = new Map();
    const epbfRankingErrors = new Map();
    let rankingSearchText = "";
    let rankingCountryFilter = "";

    const rankingLabels = {
      nl: { country: "Land", allCountries: "Alle landen", search: "Zoek een speler in de ranking…", loading: "Ranking laden…", error: "Ranking tijdelijk niet beschikbaar.", retry: "Opnieuw proberen", points: "punten", empty: "Geen spelers gevonden." },
      en: { country: "Country", allCountries: "All countries", search: "Search for a player in the ranking…", loading: "Loading ranking…", error: "Ranking temporarily unavailable.", retry: "Try again", points: "points", empty: "No players found." },
      fr: { country: "Pays", allCountries: "Tous les pays", search: "Rechercher un joueur dans le classement…", loading: "Chargement du classement…", error: "Classement temporairement indisponible.", retry: "Réessayer", points: "points", empty: "Aucun joueur trouvé." },
      es: { country: "País", allCountries: "Todos los países", search: "Buscar un jugador en la clasificación…", loading: "Cargando clasificación…", error: "Clasificación temporalmente no disponible.", retry: "Reintentar", points: "puntos", empty: "No se encontraron jugadores." },
      de: { country: "Land", allCountries: "Alle Länder", search: "Spieler in der Rangliste suchen…", loading: "Rangliste wird geladen…", error: "Rangliste vorübergehend nicht verfügbar.", retry: "Erneut versuchen", points: "Punkte", empty: "Keine Spieler gefunden." }
    };

    async function loadEPBFRanking(category, force = false) {
      if (!["eurotour", "eurotour-women"].includes(category)) return;
      if (!force && (epbfRankings.has(category) || epbfRankingRequests.has(category))) return;
      if (epbfRankingRequests.has(category)) return;
      epbfRankingErrors.delete(category);
      const request = (async () => {
        const response = await fetch(`${EPBF_RANKINGS_API}/${category}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.success || !Array.isArray(data.players) || data.category !== category) {
          throw new Error("Invalid EPBF ranking response");
        }
        epbfRankings.set(category, data.players);
      })();
      epbfRankingRequests.set(category, request);
      try {
        await request;
      } catch (error) {
        epbfRankingErrors.set(category, String(error?.message || error));
        console.error("EPBF ranking:", category, error);
      } finally {
        epbfRankingRequests.delete(category);
        if (mode && page === "ranking" && !detail && rankingFilter === category) {
          const content = $("#content");
          const scrollTop = content?.scrollTop || 0;
          render();
          if (content) content.scrollTop = scrollTop;
        }
      }
    }

    function renderRankingList() {
      const labels = rankingLabels[currentLanguage] || rankingLabels.en;
      const all = epbfRankings.get(rankingFilter);
      if (!all) {
        if (epbfRankingErrors.has(rankingFilter)) {
          return `<div class="empty">${safe(labels.error)} <button class="pill" data-retry-ranking="1">${safe(labels.retry)}</button></div>`;
        }
        return `<div class="empty">${safe(labels.loading)}</div>`;
      }
      const query = rankingSearchText.trim().toLocaleLowerCase();
      const filtered = all.filter(p => String(p.name || "").toLocaleLowerCase().includes(query) &&
        (!rankingCountryFilter || String(p.country || "").trim() === rankingCountryFilter));
      if (!filtered.length) return `<div class="empty">${safe(labels.empty)}</div>`;
      return filtered.map(p => {
        const id = Number(p.playerId);
        const position = Number(p.position);
        const points = Number(p.points);
        return `<button class="person-row" ${Number.isInteger(id) && id > 0 ? `data-epbf-player="${id}"` : "disabled"}>
          <span class="rank-num">${Number.isInteger(position) && position > 0 ? position : "–"}</span>
          <span class="flag">${officialFlag(p.country)}</span>
          <span class="person-name">${safe(p.name || "–")}</span>
          <strong class="points">${p.points !== null && p.points !== undefined && Number.isFinite(points) ? safe(points.toLocaleString(currentLanguage === "nl" ? "nl-BE" : currentLanguage)) : "–"}</strong>
        </button>`;
      }).join("");
    }

    function renderRanking() {
      const labels = rankingLabels[currentLanguage] || rankingLabels.en;
      if (!epbfRankings.has(rankingFilter) && !epbfRankingRequests.has(rankingFilter) && !epbfRankingErrors.has(rankingFilter)) {
        Promise.resolve().then(() => loadEPBFRanking(rankingFilter));
      }
      const countries = [...new Set((epbfRankings.get(rankingFilter) || [])
        .map(p => String(p.country || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      return `${title(t("ranking"))}
        ${pills([["eurotour", "Euro Tour"], ["eurotour-women", "Euro Tour Women"]], rankingFilter, "ranking-filter")}
        <div class="search-wrap"><span>⌕</span><input id="ranking-search" type="search" placeholder="${safe(labels.search)}" value="${safe(rankingSearchText)}" autocomplete="off"></div>
        <div class="epbf-match-filter"><div class="epbf-filter-fields"><div class="epbf-filter-field">
          <label for="ranking-country-filter">${safe(labels.country)}</label>
          <select id="ranking-country-filter">
            <option value="">${safe(labels.allCountries)}</option>
            ${countries.map(country => `<option value="${safe(country)}" ${rankingCountryFilter === country ? "selected" : ""}>${officialFlag(country)} ${safe(country)}</option>`).join("")}
          </select>
        </div></div></div>
        <div class="person-list" id="ranking-list">${renderRankingList()}</div>`;
    }
    function epbfSearchRow(p) {
      const id = Number(p.playerId);
      if (!Number.isInteger(id) || id <= 0) return "";
      return `<button class="person-row" data-epbf-player="${id}">
        <span class="avatar">♟</span>
        <span class="flag">${officialFlag(p.country)}</span>
        <span class="person-name">${safe(p.name || "–")}</span>
        <span class="chev">›</span>
      </button>`;
    }

    function epbfSearchList() {
      if (!searchText.trim()) return `<div class="empty">${safe({
        nl: "Typ een spelersnaam om te zoeken.",
        en: "Type a player name to search.",
        fr: "Saisissez un nom de joueur pour rechercher.",
        es: "Escribe el nombre de un jugador para buscar.",
        de: "Gib einen Spielernamen ein, um zu suchen."
      }[currentLanguage] || "Type a player name to search.")}</div>`;
      if (epbfSearchState === "loading") return `<div class="empty">${safe({
        nl: "Spelers zoeken…", en: "Searching players…", fr: "Recherche de joueurs…",
        es: "Buscando jugadores…", de: "Spieler werden gesucht…"
      }[currentLanguage] || "Searching players…")}</div>`;
      if (epbfSearchState === "error") return `<div class="empty">${safe({
        nl: "Zoeken tijdelijk niet beschikbaar. Probeer opnieuw.",
        en: "Search is temporarily unavailable. Please try again.",
        fr: "Recherche temporairement indisponible. Réessayez.",
        es: "Búsqueda temporalmente no disponible. Inténtalo de nuevo.",
        de: "Suche vorübergehend nicht verfügbar. Bitte erneut versuchen."
      }[currentLanguage] || "Search unavailable.")}</div>`;
      return epbfSearchResults.map(epbfSearchRow).join("") || `<div class="empty">${t("noResults")}</div>`;
    }

    function renderPlayers() {
      return `${title(t("players"))}<div class="search-wrap">
        <span>⌕</span>
        <input id="player-search" type="search" placeholder="${t("searchPlayer")}" value="${safe(searchText)}" autocomplete="off">
        </div><div class="person-list" id="player-list">${epbfSearchList()}</div>`;
    }

    function refreshEPBFSearchList() {
      if (detail?.type === "personal" && personalChoosing) {
        const list = $("#personal-player-list");
        if (list) list.innerHTML = personalSearchList();
        return;
      }
      if (page !== "players" || detail) return;
      const list = $("#player-list");
      if (list) list.innerHTML = epbfSearchList();
    }

    async function searchEPBFPlayers(query, requestId) {
      const controller = new AbortController();
      epbfSearchController = controller;
      try {
        const response = await fetch(`${EPBF_PLAYERS_SEARCH_API}?q=${encodeURIComponent(query)}`, {
          signal: controller.signal, cache: "no-store"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.success || !Array.isArray(data.players)) throw new Error("Invalid player search response");
        if (requestId !== epbfSearchRequestId) return;
        epbfSearchResults = data.players;
        epbfSearchState = "ready";
      } catch (error) {
        if (requestId !== epbfSearchRequestId || error.name === "AbortError") return;
        epbfSearchResults = [];
        epbfSearchState = "error";
        console.error("EPBF player search:", error);
      } finally {
        if (requestId === epbfSearchRequestId) {
          epbfSearchController = null;
          refreshEPBFSearchList();
        }
      }
    }

    function renderDetail() {
      if (detail.type === "personal-settings") return renderPersonalSettings();
      if (detail.type === "official-match") {
        return renderOfficialMatchDetail(
          officialMatches.find((match) => match.id === detail.id)
        );
      }
      if (detail.type === "match")
        return renderMatchDetail(matches.find((m) => m.id === detail.id));
      
      if (detail.type === "archive-tournament") {
        const event = officialArchiveTournaments.find(
          (e) => e.id === detail.id
        );

        return renderArchiveTournamentDetail(event);
      }

      if (detail.type === "championship-discipline") {
        return renderEPBFTournamentDetail(
          championshipDisciplineEvents.get(String(detail.id)),
          false
        );
      }
      if (detail.type === "tournament")
        return renderTournamentDetail(eventById(detail.id));
      if (detail.type === "epbf-player") return renderEPBFPlayerDetail(Number(detail.id));
      if (detail.type === "player") return renderPlayerDetail(person(detail.id));
      return renderPersonal();
    }
    function detailBack(label) {
      return `<button class="detail-back" data-back="1">‹ <span>${({nl:"Terug",en:"Back",fr:"Retour",es:"Volver",de:"Zurück"}[currentLanguage] || "Back")}</span>
          </button>`;
    }
    function renderMatchDetail(m) {
      if (!m) return `<div class="empty">${t("noResults")}</div>`;
      const p1 = person(m.p1),
        p2 = person(m.p2);
      return `${detailBack(t("live"))}<div class="detail-event">${safe(m.round)}</div>
          <div class="match-scoreboard">
          <button class="competitor" data-player="${p1.id}">
          <span class="portrait">♟</span>
          <strong>${safe(p1.name)}</strong>
          <small>${p1.flag} ${safe(p1.country)}</small>
          </button>
          <div class="score-center">
          <small>${t("raceTo")} ${m.race}</small>
          <strong>${m.s1} <span>–</span> ${m.s2}</strong>${badge(m.status === "live" ? "LIVE" : t(m.status), m.status === "live")}</div>
          <button class="competitor" data-player="${p2.id}">
          <span class="portrait">♟</span>
          <strong>${safe(p2.name)}</strong>
          <small>${p2.flag} ${safe(p2.country)}</small>
          </button>
          </div>${pills(
        [
          ["score", t("score")],
          ["statistics", t("statistics")],
          ["information", t("information")],
        ],
        matchTab,
        "match-tab",
      )}${matchTab === "score" ? `<div class="frame-grid">
          <div class="frame-heading">Frame ${Array.from({ length: m.race }, (_, i) => `<span>${i + 1}</span>`).join("")}</div>${[p1, p2].map((p, row) => `<div class="frame-line">
          <span>${row + 1}</span>${Array.from({ length: m.race }, (_, i) => `<span class="frame-dot ${i < (row ? m.s2 : m.s1) ? "won" : ""}">
          </span>`).join("")}</div>`).join("")}</div>` : matchTab === "statistics" ? `<div class="info-card">${infoRow(t("score"), `${m.s1} – ${m.s2}`)}${infoRow(t("raceTo"), m.race)}${infoRow(t("table"), m.table)}</div>` : `<div class="info-card">${infoRow(t("event"), eventById(m.event)?.name || "EPBF")}${infoRow(t("round"), m.round)}${infoRow(t("table"), m.table)}${infoRow(t("status"), t(m.status === "live" ? "live" : m.status))}</div>`}${demo()}`;
    }
    function infoRow(label, value) {
      return `<div class="info-row">
          <span>${label}</span>
          <strong>${safe(value)}</strong>
          </div>`;
    }

    

function championshipParentId(event) {
  const candidates = [
    event?.website,
    event?.url,
    event?.informationUrl
  ].filter(Boolean);

  for (const candidate of candidates) {
    const match = String(candidate).match(
      /\/tournaments\/european-championships\/live\/(\d+)(?:\/|$)/i
    );

    if (match) return Number(match[1]);
  }

  // De kalender bevat geen officiële link voor dit verzameltornooi.
  // ID 1423 is gecontroleerd via de bestaande Worker.
  if (
    /european pool championships/i.test(String(event?.name || "")) &&
    /seniors\s*&\s*ladies/i.test(String(event?.name || ""))
  ) {
    return 1423;
  }

  return null;
}



function isChampionshipOverview(event) {
  const name = String(event?.name || "");
  const parentId = championshipParentId(event);

  if (/seniors\s*&\s*ladies/i.test(name)) {
    console.log("EPBF verzameltornooi controle:", {
      name,
      website: event?.website,
      url: event?.url,
      informationUrl: event?.informationUrl,
      parentId,
      nameMatches: /european (?:pool )?championships/i.test(name)
    });
  }

  return /european (?:pool )?championships/i.test(name) &&
    /seniors\s*&\s*ladies/i.test(name) &&
    !!parentId;
}


    async function loadChampionshipDisciplines(event) {
      const parentId = championshipParentId(event);
      if (!parentId) throw new Error("De officiële EPBF-ID van dit verzameltornooi ontbreekt in de kalenderlink.");
      if (championshipDisciplinesCache.has(parentId)) return championshipDisciplinesCache.get(parentId);
      if (championshipDisciplinesRequests.has(parentId)) return championshipDisciplinesRequests.get(parentId);

      const request = (async () => {
        const response = await fetch(`https://epbf-api.nicolasmintjens.workers.dev/tournament/${parentId}`, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`Disciplines ophalen: HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.success || !Array.isArray(data.events)) {
          throw new Error(data?.error || "De EPBF-API gaf geen disciplineoverzicht terug.");
        }
        data.events.forEach(item => {
          championshipDisciplineEvents.set(String(item.id), {
            id: Number(item.id),
            name: item.name,
            date: item.date || "",
            category: "european-championships",
            categoryName: "European Championships",
            classification: item.category || "",
            discipline: item.discipline || "",
            city: event.city || "",
            country: event.country || "",
            website: item.informationUrl,
            url: item.informationUrl,
            championshipParentId: parentId
          });
        });
        championshipDisciplinesCache.set(parentId, data);
        return data;
      })();

      championshipDisciplinesRequests.set(parentId, request);
      try {
        return await request;
      } finally {
        championshipDisciplinesRequests.delete(parentId);
      }
    }

    function ensureChampionshipDisciplines(event) {
      const parentId = championshipParentId(event);
      if (!parentId || championshipDisciplinesCache.has(parentId) || championshipDisciplinesRequests.has(parentId)) return;
      loadChampionshipDisciplines(event).then(() => {
        if (detail?.type === "tournament" && String(detail.id) === String(event.id)) render();
      }).catch(error => {
        officialEventError = String(error?.message || error);
        console.error("EPBF disciplines:", error);
        if (detail?.type === "tournament" && String(detail.id) === String(event.id)) render();
      });
    }

    function renderChampionshipDisciplineList(event, data) {
      if (!data) {
        const parentId = championshipParentId(event);
        if (!parentId) return `<div class="empty">Geen officiële EPBF-link naar de disciplines gevonden.</div>`;
        const loading = championshipDisciplinesRequests.has(parentId);
        return `<div class="empty">${loading ? "Disciplines laden…" : "Disciplines nog niet beschikbaar."}
          ${!loading ? `<button class="pill" data-retry-championship="${safe(event.id)}">Opnieuw proberen</button>` : ""}
          ${officialEventError ? `<p>${safe(officialEventError)}</p>` : ""}
        </div>`;
      }
      if (!data.events.length) return `<div class="empty">De EPBF heeft geen afzonderlijke disciplines teruggegeven.</div>`;
      return `<div class="epbf-discipline-list">${data.events.map(item => `
        <button class="info-card epbf-discipline-card" data-championship-discipline="${safe(item.id)}">
          <span class="epbf-discipline-card-copy">
            <strong>${safe(item.name)}</strong>
            <small>${safe(item.date || "")}${item.category ? ` · ${safe(item.category)}` : ""}${item.discipline && item.discipline !== "Other" ? ` · ${safe(item.discipline)}` : ""}</small>
          </span>
          <span class="epbf-discipline-arrow">›</span>
        </button>`).join("")}</div>`;
    }

    function epbfCategoryForEvent(e) {
      const source = [
        e?.eventCategory, e?.classification, e?.category,
        e?.name, e?.website, e?.url
      ].filter(Boolean).join(" ").toLowerCase();

      if (/hey.?ball|heyball/.test(source)) return "hey-ball";
      if (/women|ladies|dames/.test(source) && /euro.?tour/.test(source)) return "eurotour-women";
      if (/youth|junior|jeugd/.test(source)) return "youth-tour";
      if (/euro.?tour/.test(source)) return "eurotour";
      return "european-championships";
    }

    function epbfEventBaseUrl(e) {
      const category = e?.category && EPBF_ARCHIVE_CATEGORIES.some(c => c.id === e.category)
        ? e.category
        : epbfCategoryForEvent(e);
      return { category, url: `https://www.epbf.com/tournaments/${category}/id/${e.id}/` };
    }

    async function loadOfficialEventDetail(event) {
      if (!event?.id) throw new Error("Dit tornooi heeft geen EPBF-ID.");
      const key = `${event.id}:${epbfCategoryForEvent(event)}`;
      if (officialEventDetails.has(key)) return officialEventDetails.get(key);
      if (officialEventRequests.has(key)) return officialEventRequests.get(key);

      const request = (async () => {
        const category = epbfCategoryForEvent(event);
        const url = `${EPBF_EVENT_API}/${encodeURIComponent(category)}/${encodeURIComponent(event.id)}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`EPBF-eventgegevens: HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.success) throw new Error(data?.error || "De EPBF gaf geen geldige tornooigegevens terug.");
        officialEventDetails.set(key, data);
        officialEventFailures.delete(key);
        officialEventError = "";
        return data;
      })();

      officialEventRequests.set(key, request);
      try {
        return await request;
      } catch (error) {
        officialEventFailures.add(key);
        throw error;
      } finally {
        officialEventRequests.delete(key);
        // Werk het zichtbare tornooi bij, ook als de aanvraag eerder
        // vanuit een andere weergave gestart werd.
        if (detail &&
            (detail.type === "tournament" || detail.type === "archive-tournament" ||
             detail.type === "championship-discipline") &&
            String(detail.id) === String(event.id)) {
          const content = $("#content");
          const scrollPosition = content ? content.scrollTop : 0;
          render();
          if (content) content.scrollTop = scrollPosition;
        }
      }
    }

    function ensureOfficialEventDetail(event) {
      if (!event?.id) return;
      const key = `${event.id}:${epbfCategoryForEvent(event)}`;
      if (officialEventDetails.has(key) || officialEventRequests.has(key) || officialEventFailures.has(key)) return;
      loadOfficialEventDetail(event).catch(error => {
        officialEventFailures.add(key);
        officialEventError = String(error?.message || error);
        console.error("EPBF event details:", error);
      });
    }

    const eventRefreshLabels = {
      nl: ["Vernieuwen", "Vernieuwen…"],
      en: ["Refresh", "Refreshing…"],
      fr: ["Actualiser", "Actualisation…"],
      es: ["Actualizar", "Actualizando…"],
      de: ["Aktualisieren", "Aktualisierung…"]
    };

    async function refreshVisibleEvent() {
      if (!detail || !["tournament", "archive-tournament", "championship-discipline"].includes(detail.type)) return;
      const event = detail.type === "archive-tournament"
        ? officialArchiveTournaments.find(e => String(e.id) === String(detail.id))
        : detail.type === "championship-discipline"
          ? championshipDisciplineEvents.get(String(detail.id))
          : officialTournaments.find(e => String(e.id) === String(detail.id));
      if (!event) return;
      if (isChampionshipOverview(event)) {
        const parentId = championshipParentId(event);
        if (!parentId || championshipDisciplinesRequests.has(parentId)) return;
        const previous = championshipDisciplinesCache.get(parentId);
        championshipDisciplinesCache.delete(parentId);
        officialEventError = "";
        render();
        try { await loadChampionshipDisciplines(event); }
        catch (error) {
          if (previous) championshipDisciplinesCache.set(parentId, previous);
          officialEventError = String(error?.message || error);
        }
      } else {
        const key = `${event.id}:${epbfCategoryForEvent(event)}`;
        if (officialEventRequests.has(key)) return;
        const previous = officialEventDetails.get(key);
        officialEventDetails.delete(key);
        officialEventFailures.delete(key);
        officialEventError = "";
        render();
        try { await loadOfficialEventDetail(event); }
        catch (error) {
          if (previous) officialEventDetails.set(key, previous);
          else officialEventFailures.add(key);
          officialEventError = String(error?.message || error);
        }
      }
      if (detail && String(detail.id) === String(event.id)) {
        const content = $("#content");
        const scrollTop = content?.scrollTop || 0;
        render();
        if (content) content.scrollTop = scrollTop;
      }
    }

    function epbfEventData(e) {
      return officialEventDetails.get(`${e.id}:${epbfCategoryForEvent(e)}`) || null;
    }

    function epbfPlayerName(player) {
      if (!player) return "–";
      if (typeof player === "string") return player.trim() || "–";
      const nested = player.player || player.participant || player.competitor;
      const direct = player.name || player.playerName || player.fullName ||
        player.player_name || player.teamName || player.team;
      if (typeof direct === "string" && direct.trim()) return direct.trim();
      if (nested && nested !== player) {
        const nestedName = epbfPlayerName(nested);
        if (nestedName !== "–") return nestedName;
      }
      const first = player.firstName || player.firstname || player.first_name || "";
      const last = player.lastName || player.lastname || player.last_name || player.surname || "";
      return [first, last].filter(Boolean).join(" ").trim() || "–";
    }

    function epbfPlayerCountry(player) {
      if (!player || typeof player !== "object") return "";
      const direct = player.countryCode || player.country_code || player.nationalityCode ||
        player.country || player.nationality || player.nation || player.flag;
      if (direct) return direct;
      const nested = player.player || player.participant || player.competitor;
      return nested && nested !== player ? epbfPlayerCountry(nested) : "";
    }

    // Officiele EPBF-spelersfiche: resultaten per pagina van vier toernooien.
    const EPBF_PLAYER_API = "https://epbf-api.nicolasmintjens.workers.dev/player";
    // Bewaar de openbare EPBF-wedstrijdhistoriek lokaal zodat een refresh niet opnieuw
    // het volledige laadscherm toont. Cache wordt per Player ID bewaard en na 6 uur
    // stil op de achtergrond vernieuwd.
    const EPBF_PROFILE_STORAGE_PREFIX = "epbf_player_stats_cache_v1_";
    const EPBF_PROFILE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
    const epbfProfileCache = new Map();
    const epbfProfileRequests = new Set();
    const epbfProfileExpanded = new Set();

    function readEPBFProfileCache(id) {
      try {
        const raw = localStorage.getItem(EPBF_PROFILE_STORAGE_PREFIX + id);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (!saved || Number(saved.playerId) !== Number(id) || !Array.isArray(saved.tournaments)) return null;
        return saved;
      } catch (error) {
        console.warn("EPBF lokale statistiekencache kon niet worden gelezen:", error);
        return null;
      }
    }

    function saveEPBFProfileCache(id, state) {
      try {
        const saved = {
          version: 1,
          playerId: Number(id),
          playerName: state.playerName || "",
          totalTournaments: state.totalTournaments,
          tournaments: state.tournaments,
          nextOffset: state.nextOffset,
          baseLoaded: Boolean(state.baseLoaded),
          cachedAt: state.cachedAt || Date.now(),
          lastRefreshAttemptAt: state.lastRefreshAttemptAt || 0
        };
        localStorage.setItem(EPBF_PROFILE_STORAGE_PREFIX + id, JSON.stringify(saved));
        state.cachedAt = saved.cachedAt;
      } catch (error) {
        // De app blijft bruikbaar als opslagruimte vol is of lokale opslag uitstaat.
        console.warn("EPBF lokale statistiekencache kon niet worden opgeslagen:", error);
      }
    }

    function epbfPlayerLink(player, className = "") {
      const id = Number(player?.playerId);
      const name = epbfPlayerName(player);
      if (!Number.isInteger(id) || id <= 0) return `<span class="${className}">${safe(name)}</span>`;
      return `<button type="button" class="epbf-player-link ${className}" data-epbf-player="${id}">${safe(name)}</button>`;
    }

    function epbfProfileState(id) {
      if (!epbfProfileCache.has(id)) {
        const saved = readEPBFProfileCache(id);
        const hasSavedData = Boolean(saved && saved.tournaments.length);
        epbfProfileCache.set(id, {
          playerName: saved?.playerName || "",
          totalTournaments: saved?.totalTournaments ?? null,
          tournaments: hasSavedData ? saved.tournaments : [],
          nextOffset: saved ? saved.nextOffset : 0,
          error: "", loading: false, baseLoading: false,
          baseLoaded: Boolean(saved?.baseLoaded), baseError: "",
          started: hasSavedData, retryCount: 0,
          cachedAt: Number(saved?.cachedAt) || 0,
          lastRefreshAttemptAt: Number(saved?.lastRefreshAttemptAt) || 0,
          backgroundRefreshing: false
        });
      }
      return epbfProfileCache.get(id);
    }

    function epbfProfileRefresh(id) {
      if (!((detail?.type === "epbf-player" && Number(detail.id) === id) || (detail?.type === "personal" && personalProfile?.playerId === id && !personalChoosing) || (mode === "player" && page === "history" && !detail && personalProfile?.playerId === id))) return;
      const content = $("#content");
      const scroll = content?.scrollTop || 0;
      render();
      if (content) content.scrollTop = scroll;
    }

    function epbfTournamentKey(tournament) {
      return `${tournament.category || ""}:${tournament.eventId ?? tournament.id ?? ""}`;
    }

    // Haal de lichte spelersfiche eerst op. De zware wedstrijdstatistieken
    // worden vervolgens in de achtergrond per vier toernooien verwerkt.
    async function loadEPBFProfileBase(id) {
      const state = epbfProfileState(id);
      if (state.baseLoading || state.baseLoaded) return;
      state.baseLoading = true;
      state.baseError = "";
      try {
        const response = await fetch(`${EPBF_PLAYER_API}/${id}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.success || !Array.isArray(data.tournaments)) {
          throw new Error("Ongeldige EPBF-spelersfiche");
        }
        state.playerName = data.playerName || data.player?.name || data.name || state.playerName;
        state.totalTournaments = data.totalTournaments ?? data.tournaments.length;
        const detailed = new Map(state.tournaments.map(t => [epbfTournamentKey(t), t]));
        state.tournaments = data.tournaments.map(t => {
          const previous = detailed.get(epbfTournamentKey(t));
          return previous ? { ...t, ...previous } : t;
        });
        state.baseLoaded = true;
        state.cachedAt = Date.now();
        saveEPBFProfileCache(id, state);
      } catch (error) {
        // Een fout in de lichte fiche mag de bestaande stats-route niet blokkeren.
        state.baseError = String(error?.message || error);
        console.error("EPBF player base:", error);
      } finally {
        state.baseLoading = false;
        epbfProfileRefresh(id);
        loadEPBFProfilePage(id);
      }
    }

    async function loadEPBFProfilePage(id) {
      const state = epbfProfileState(id);
      if (state.loading || state.baseLoading || state.nextOffset === null) return;
      const offset = state.nextOffset;
      const key = `${id}:${offset}`;
      if (epbfProfileRequests.has(key)) return;
      epbfProfileRequests.add(key);
      state.loading = true;
      state.error = "";
      epbfProfileRefresh(id);
      try {
        const response = await fetch(`${EPBF_PLAYER_API}/${id}/stats?offset=${offset}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.success || !Array.isArray(data.tournaments)) throw new Error("Ongeldig EPBF-antwoord");
        state.playerName = data.playerName || state.playerName;
        state.totalTournaments = data.totalTournaments ?? state.totalTournaments;
        const indices = new Map(state.tournaments.map((t, i) => [epbfTournamentKey(t), i]));
        for (const tournament of data.tournaments) {
          const tournamentKey = epbfTournamentKey(tournament);
          if (indices.has(tournamentKey)) {
            const i = indices.get(tournamentKey);
            state.tournaments[i] = { ...state.tournaments[i], ...tournament };
          } else {
            indices.set(tournamentKey, state.tournaments.length);
            state.tournaments.push(tournament);
          }
        }
        state.nextOffset = data.nextOffset;
        state.retryCount = 0;
        state.cachedAt = Date.now();
        saveEPBFProfileCache(id, state);
      } catch (error) {
        state.error = String(error?.message || error);
        state.retryCount = (state.retryCount || 0) + 1;
      } finally {
        state.loading = false;
        epbfProfileRequests.delete(key);
        epbfProfileRefresh(id);
        // Bij tijdelijke fetch-fouten automatisch herhalen vanaf dezelfde offset.
        // Reeds opgehaalde tornooien blijven behouden.
        if (state.nextOffset !== null) {
          if (!state.error) {
            Promise.resolve().then(() => loadEPBFProfilePage(id));
          } else if (state.retryCount <= 5) {
            const delay = Math.min(12000, 1200 * Math.pow(2, state.retryCount - 1));
            setTimeout(() => {
              if (epbfProfileState(id) === state && state.nextOffset === offset && !state.loading) {
                loadEPBFProfilePage(id);
              }
            }, delay);
          }
        }
      }
    }

    // Vernieuw een volledige cache stil op de achtergrond. Het dashboard blijft
    // zichtbaar; bij een netwerkfout behouden we de laatst opgeslagen resultaten.
    async function refreshEPBFProfileInBackground(id) {
      const state = epbfProfileState(id);
      if (state.backgroundRefreshing || !state.baseLoaded || state.nextOffset !== null) return;
      state.backgroundRefreshing = true;
      state.lastRefreshAttemptAt = Date.now();
      try {
        let offset = 0;
        let nextOffset = 0;
        while (nextOffset !== null) {
          const response = await fetch(`${EPBF_PLAYER_API}/${id}/stats?offset=${offset}`, { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (!data?.success || !Array.isArray(data.tournaments)) throw new Error("Ongeldig EPBF-antwoord");
          state.playerName = data.playerName || state.playerName;
          state.totalTournaments = data.totalTournaments ?? state.totalTournaments;
          const indices = new Map(state.tournaments.map((t, i) => [epbfTournamentKey(t), i]));
          for (const tournament of data.tournaments) {
            const key = epbfTournamentKey(tournament);
            if (indices.has(key)) {
              const i = indices.get(key);
              state.tournaments[i] = { ...state.tournaments[i], ...tournament };
            } else {
              indices.set(key, state.tournaments.length);
              state.tournaments.push(tournament);
            }
          }
          nextOffset = data.nextOffset ?? null;
          if (nextOffset !== null && (!Number.isFinite(Number(nextOffset)) || Number(nextOffset) <= offset)) {
            throw new Error("Ongeldige EPBF-paginering");
          }
          offset = nextOffset;
        }
        state.nextOffset = null;
        state.error = "";
        state.cachedAt = Date.now();
      } catch (error) {
        console.warn("EPBF achtergrondvernieuwing mislukt; bestaande cache blijft beschikbaar:", error);
      } finally {
        state.backgroundRefreshing = false;
        saveEPBFProfileCache(id, state);
        epbfProfileRefresh(id);
      }
    }

    // Interfacevertalingen voor EPBF-toernooi- en spelershistoriek.
    const epbfUiLabels = {
      historyLoading: {nl: "Toernooihistoriek laden…", en: "Loading tournament history…", fr: "Chargement de l’historique des tournois…", es: "Cargando historial de torneos…", de: "Turnierverlauf wird geladen…"},
      historyComplete: {nl: "Volledige beschikbare wedstrijdstatistieken", en: "All available match statistics", fr: "Toutes les statistiques disponibles", es: "Todas las estadísticas disponibles", de: "Alle verfügbaren Spielstatistiken"},
      historyProgress: {nl: "Wedstrijdstatistieken worden op de achtergrond geladen", en: "Match statistics are loading in the background", fr: "Chargement des statistiques en arrière-plan", es: "Cargando estadísticas en segundo plano", de: "Spielstatistiken werden im Hintergrund geladen"},
      processed: {nl: "verwerkt", en: "processed", fr: "traités", es: "procesados", de: "verarbeitet"},
      provisionalWin: {nl: "Voorlopig winstpercentage", en: "Provisional win rate", fr: "Taux de victoire provisoire", es: "Porcentaje de victorias provisional", de: "Vorläufige Siegquote"},
      unknownResults: {nl: "wedstrijd(en) zonder uitslag", en: "matches without results", fr: "matchs sans résultat", es: "partidos sin resultado", de: "Spiele ohne Ergebnis"},
      history: {nl: "Toernooihistoriek", en: "Tournament history", fr: "Historique des tournois", es: "Historial de torneos", de: "Turnierverlauf"},
      unknownPlace: {nl: "Plaats onbekend", en: "Position unknown", fr: "Classement inconnu", es: "Posición desconocida", de: "Platzierung unbekannt"},
      place: {nl: "plaats", en: "place", fr: "place", es: "puesto", de: "Platz"},
      matchesLoading: {nl: "Wedstrijdgegevens worden nog geladen…", en: "Match details are still loading…", fr: "Chargement des détails des matchs…", es: "Cargando detalles de los partidos…", de: "Spieldetails werden noch geladen…"},
      matchesUnavailable: {nl: "Wedstrijdgegevens niet beschikbaar.", en: "Match details unavailable.", fr: "Détails des matchs indisponibles.", es: "Detalles de los partidos no disponibles.", de: "Spieldetails nicht verfügbar."},
      noIndividual: {nl: "Geen individuele wedstrijden beschikbaar.", en: "No individual matches available.", fr: "Aucun match individuel disponible.", es: "No hay partidos individuales disponibles.", de: "Keine Einzelspiele verfügbar."},
      unknownOpponent: {nl: "Onbekende tegenstander", en: "Unknown opponent", fr: "Adversaire inconnu", es: "Rival desconocido", de: "Unbekannter Gegner"},
      historyUnavailable: {nl: "Snelle toernooihistoriek niet beschikbaar; wedstrijdgegevens worden afzonderlijk opgehaald.", en: "Tournament summary unavailable; match details are loaded separately.", fr: "Résumé indisponible ; les matchs sont chargés séparément.", es: "Resumen no disponible; los partidos se cargan por separado.", de: "Turnierübersicht nicht verfügbar; Spiele werden einzeln geladen."},
      backgroundLoading: {nl: "Wedstrijdgegevens op de achtergrond laden…", en: "Loading match details in the background…", fr: "Chargement des matchs en arrière-plan…", es: "Cargando partidos en segundo plano…", de: "Spiele werden im Hintergrund geladen…"},
      loadInterrupted: {nl: "Laden onderbroken:", en: "Loading interrupted:", fr: "Chargement interrompu :", es: "Carga interrumpida:", de: "Laden unterbrochen:"},
      retry: {nl: "Opnieuw proberen", en: "Try again", fr: "Réessayer", es: "Reintentar", de: "Erneut versuchen"},
      otherLoading: {nl: "Overige wedstrijdgegevens worden automatisch geladen…", en: "Remaining match details are loading automatically…", fr: "Les autres matchs sont chargés automatiquement…", es: "Los demás partidos se cargan automáticamente…", de: "Weitere Spieldetails werden automatisch geladen…"},
      noHistory: {nl: "Geen historische toernooien gevonden.", en: "No past tournaments found.", fr: "Aucun ancien tournoi trouvé.", es: "No se encontraron torneos anteriores.", de: "Keine vergangenen Turniere gefunden."},
      event: {nl: "Tornooi", en: "Tournament", fr: "Tournoi", es: "Torneo", de: "Turnier"},
      events: {nl: "Toernooien", en: "Tournaments", fr: "Tournois", es: "Torneos", de: "Turniere"},
      matchesProcessed: {nl: "Wedstrijden verwerkt", en: "Matches processed", fr: "Matchs traités", es: "Partidos procesados", de: "Spiele verarbeitet"},
      wins: {nl: "Gewonnen", en: "Won", fr: "Gagnés", es: "Ganados", de: "Gewonnen"},
      losses: {nl: "Verloren", en: "Lost", fr: "Perdus", es: "Perdidos", de: "Verloren"},
      winRate: {nl: "Winstpercentage", en: "Win rate", fr: "Taux de victoire", es: "Porcentaje de victorias", de: "Siegquote"},
      categories: {nl: "Categorieën", en: "Categories", fr: "Catégories", es: "Categorías", de: "Kategorien"},
      numberDisciplines: {nl: "Aantal disciplines", en: "Number of disciplines", fr: "Nombre de disciplines", es: "Número de disciplinas", de: "Anzahl Disziplinen"},
      eventLoading: {nl: "Tornooigegevens laden…", en: "Loading tournament details…", fr: "Chargement des données du tournoi…", es: "Cargando datos del torneo…", de: "Turnierdaten werden geladen…"},
      eventUnavailable: {nl: "Tornooigegevens nog niet beschikbaar.", en: "Tournament details not available yet.", fr: "Données du tournoi indisponibles pour le moment.", es: "Datos del torneo aún no disponibles.", de: "Turnierdaten noch nicht verfügbar."},
      participants: {nl: "Deelnemers", en: "Participants", fr: "Participants", es: "Participantes", de: "Teilnehmer"},
      rankingEntries: {nl: "Rankingregels", en: "Ranking entries", fr: "Entrées du classement", es: "Entradas de clasificación", de: "Ranglisteneinträge"},
      lastUpdated: {nl: "Laatst bijgewerkt", en: "Last updated", fr: "Dernière mise à jour", es: "Última actualización", de: "Zuletzt aktualisiert"},
      viewEPBF: {nl: "Bekijk op EPBF.com", en: "View on EPBF.com", fr: "Voir sur EPBF.com", es: "Ver en EPBF.com", de: "Auf EPBF.com ansehen"},
      nationality: {nl: "Nationaliteit", en: "Nationality", fr: "Nationalité", es: "Nacionalidad", de: "Nationalität"},
      allCountries: {nl: "Alle landen", en: "All countries", fr: "Tous les pays", es: "Todos los países", de: "Alle Länder"},
      allPlayers: {nl: "Alle spelers", en: "All players", fr: "Tous les joueurs", es: "Todos los jugadores", de: "Alle Spieler"},
      player: {nl: "Speler", en: "Player", fr: "Joueur", es: "Jugador", de: "Spieler"},
      players: {nl: "Spelers", en: "Players", fr: "Joueurs", es: "Jugadores", de: "Spieler"},
      match: {nl: "Wedstrijd", en: "Match", fr: "Match", es: "Partido", de: "Spiel"},
      matches: {nl: "Wedstrijden", en: "Matches", fr: "Matchs", es: "Partidos", de: "Spiele"},
      otherMatches: {nl: "Overige wedstrijden", en: "Other matches", fr: "Autres matchs", es: "Otros partidos", de: "Weitere Spiele"},
      noFilteredMatches: {nl: "Geen wedstrijden gevonden voor deze filters.", en: "No matches found for these filters.", fr: "Aucun match pour ces filtres.", es: "No se encontraron partidos con estos filtros.", de: "Keine Spiele für diese Filter gefunden."},
      noEPBFMatches: {nl: "Geen wedstrijdgegevens ontvangen van de EPBF.", en: "No match details received from EPBF.", fr: "Aucune donnée de match reçue de l’EPBF.", es: "No se recibieron datos de partidos de EPBF.", de: "Keine Spieldaten von EPBF erhalten."},
      noFinalRanking: {nl: "De EPBF heeft nog geen eindstand gepubliceerd.", en: "EPBF has not published final standings yet.", fr: "L’EPBF n’a pas encore publié le classement final.", es: "EPBF aún no ha publicado la clasificación final.", de: "EPBF hat noch keine Endrangliste veröffentlicht."},
      unknownDate: {nl: "Datum onbekend", en: "Date unknown", fr: "Date inconnue", es: "Fecha desconocida", de: "Datum unbekannt"},
    };
    function epbfUi(key) {
      const item = epbfUiLabels[key];
      return item ? (item[currentLanguage] || item.en) : key;
    }

    function renderEPBFPlayerDetail(id) {
      const state = epbfProfileState(id);
      if (!state.started) {
        state.started = true;
        Promise.resolve().then(() => loadEPBFProfileBase(id));
      }
      const played = state.tournaments.reduce((n, x) => n + (x.stats?.played || 0), 0);
      const wins = state.tournaments.reduce((n, x) => n + (x.stats?.wins || 0), 0);
      const losses = state.tournaments.reduce((n, x) => n + (x.stats?.losses || 0), 0);
      const unknown = state.tournaments.reduce((n, x) => n + (x.matches || []).filter(m => m.result === "unknown").length, 0);
      const allLoaded = state.nextOffset === null;
      const heading = state.playerName || `EPBF-speler #${id}`;
      const loadedStats = state.tournaments.filter(x => x.stats || Array.isArray(x.matches) || x.status).length;
      return `${detailBack(t("players"))}
        <div class="profile-hero">${personalPortrait(id, true)}
          <div><h1>${safe(heading)}</h1><p>EPBF ID ${id}</p></div></div>
        <div class="epbf-profile-status">${state.baseLoading && !state.tournaments.length
          ? epbfUi("historyLoading")
          : allLoaded ? epbfUi("historyComplete")
          : `${epbfUi("historyProgress")} · ${loadedStats} / ${state.totalTournaments ?? "…"} ${epbfUi("events")}`}</div>
        <div class="stats-grid">
          <div><strong>${state.totalTournaments ?? state.tournaments.length}</strong><small>${epbfUi("events")}</small></div>
          <div><strong>${played}</strong><small>${epbfUi("matchesProcessed")}</small></div>
          <div><strong>${wins}</strong><small>${epbfUi("wins")}</small></div>
          <div><strong>${losses}</strong><small>${epbfUi("losses")}</small></div>
        </div>
        <div class="epbf-profile-status">${allLoaded ? epbfUi("winRate") : epbfUi("provisionalWin")}: ${played ? (100 * wins / played).toFixed(1).replace(".", ",") + "%" : "–"}${unknown ? ` · ${unknown} ${epbfUi("unknownResults")}` : ""}</div>
        <h2 class="group-title">${epbfUi("history")}</h2>
        ${state.tournaments.map(x => {
          const key = `${id}:${x.eventId ?? x.id}`;
          const expanded = epbfProfileExpanded.has(key);
          const matchList = Array.isArray(x.matches) ? x.matches : [];
          const hasDetails = x.status || x.stats || Array.isArray(x.matches);
          return `<div class="epbf-profile-tournament">
            <button class="epbf-profile-toggle" data-epbf-expand="${safe(key)}">
              <span><strong>${safe(x.disciplineName || x.name || epbfUi("event"))}</strong><small>${safe(x.date || String(x.year || ""))} · ${x.position == null ? epbfUi("unknownPlace") : `${safe(x.position)} · ${epbfUi("place")}`}</small></span>
              <span>${expanded ? "⌃" : "⌄"}</span>
            </button>
            ${expanded ? `<div class="epbf-profile-matches">
              ${!hasDetails ? `<p>${epbfUi("matchesLoading")}</p>` : x.status !== "ok" ? `<p>${epbfUi("matchesUnavailable")}</p>` : !matchList.length ? `<p>${epbfUi("noIndividual")}</p>` : matchList.map(m => `<div class="epbf-profile-match">
                <span><small>${safe(m.round || "")} ${m.matchNumber ? "· " + safe(m.matchNumber) : ""}</small><strong>${safe(m.opponent?.name || epbfUi("unknownOpponent"))}</strong></span>
                <b class="${m.result === "win" ? "epbf-result-win" : m.result === "loss" ? "epbf-result-loss" : ""}">${m.score ?? "–"} – ${m.opponentScore ?? "–"}</b>
              </div>`).join("")}
            </div>` : ""}
          </div>`;
        }).join("")}
        ${state.baseError && !state.baseLoaded ? `<div class="empty">${epbfUi("historyUnavailable")}</div>` : ""}
        ${state.loading ? `<div class="empty">${epbfUi("backgroundLoading")}</div>` : ""}
        ${state.error ? `<div class="empty">${epbfUi("loadInterrupted")} ${safe(state.error)}<br><button class="pill" data-epbf-more="${id}">${epbfUi("retry")}</button></div>` : ""}
        ${!state.loading && !state.error && !allLoaded ? `<div class="empty">${epbfUi("otherLoading")}</div>` : ""}
        ${allLoaded && !state.tournaments.length ? `<div class="empty">${epbfUi("noHistory")}</div>` : ""}`;
    }

    function epbfScore(value) {
      return value === null || value === undefined || value === "" ? "–" : String(value);
    }

    function epbfMatchRow(match, index) {
      const players = Array.isArray(match.players) ? match.players : [];
      const playerA = players[0] || {};
      const playerB = players[1] || {};
      const scoreA = Number(match.scoreA);
      const scoreB = Number(match.scoreB);
      const hasScore = match.scoreA !== null && match.scoreA !== undefined &&
        match.scoreA !== "" && match.scoreB !== null && match.scoreB !== undefined &&
        match.scoreB !== "" && Number.isFinite(scoreA) && Number.isFinite(scoreB);
      const aWon = hasScore && scoreA > scoreB;
      const bWon = hasScore && scoreB > scoreA;
      const matchLabel = match.matchNumber ? String(match.matchNumber) : `Wedstrijd ${index + 1}`;

      return `<div class="info-card epbf-match-row">
        <div class="section-heading">
          <strong>${safe(matchLabel)}</strong>
          <small>${safe(match.scheduled || "")}${match.table ? ` · ${t("table")} ${safe(match.table)}` : ""}</small>
        </div>
        <div class="epbf-match-players">
          <span class="epbf-player-name ${aWon ? "epbf-winner" : ""}">${officialFlag(epbfPlayerCountry(playerA))} ${epbfPlayerLink(playerA)}</span>
          <strong class="epbf-match-score">${epbfScore(match.scoreA)} – ${epbfScore(match.scoreB)}</strong>
          <span class="epbf-player-name epbf-player-b ${bWon ? "epbf-winner" : ""}">${officialFlag(epbfPlayerCountry(playerB))} ${epbfPlayerLink(playerB)}</span>
        </div>
      </div>`;
    }

    function epbfEventCountry(player, eventData) {
      const direct = epbfPlayerCountry(player);
      if (direct) return direct;
      const id = player?.playerId;
      if (id == null) return "";
      const lists = [eventData?.participants || [], eventData?.ranking || [],
        ...(eventData?.matches || []).map(m => m.players || [])];
      for (const list of lists) {
        const found = list.find(p => String(p?.playerId) === String(id) && epbfPlayerCountry(p));
        if (found) return epbfPlayerCountry(found);
      }
      return "";
    }

    function epbfParticipantRow(player, index, eventData) {
      const country = epbfEventCountry(player, eventData);
      return `<div class="person-row epbf-person-row">
        <span class="rank-num">${index + 1}</span>
        <span class="flag">${country ? officialFlag(country) : "–"}</span>
        ${epbfPlayerLink(player, "person-name")}
        <small>${safe(country)}</small>
      </div>`;
    }

    function epbfRankingRow(player, index) {
      const name = epbfPlayerName(player);
      const rank = player.rank ?? player.position ?? player.place ?? index + 1;
      const country = epbfPlayerCountry(player);
      const points = player.points ?? player.score ?? player.totalPoints;
      return `<div class="person-row epbf-person-row">
        <span class="rank-num">${safe(rank)}</span>
        <span class="flag">${officialFlag(country)}</span>
        ${epbfPlayerLink(player, "person-name")}
        <strong class="points">${points === undefined || points === null || points === "" ? "" : safe(points)}</strong>
      </div>`;
    }

    function renderArchiveTournamentDetail(e) {
      if (!e) return `<div class="empty">${t("noResults")}</div>`;
      return renderEPBFTournamentDetail(e, true);
    }

    function renderEPBFTournamentDetail(e, isArchive = false) {
      if (!e) return `<div class="empty">${t("noResults")}</div>`;
      const championshipOverview = isChampionshipOverview(e);
      if (championshipOverview) ensureChampionshipDisciplines(e);
      else ensureOfficialEventDetail(e);
      if (!isArchive) ensureCurrentEurotourRegistrations(e);
      const eventData = championshipOverview ? null : epbfEventData(e);
      const registrationCategory = !isArchive ? currentSpanishOpenCategory(e) : null;
      const registrationList = registrationCategory
        ? currentEurotourRegistrations.get(registrationCategory) : null;
      const data = !championshipOverview && !eventData && Array.isArray(registrationList)
        ? { participants: registrationList, matches: [], ranking: [] }
        : eventData;
      const championshipId = championshipOverview ? championshipParentId(e) : null;
      const championshipData = championshipOverview ? championshipDisciplinesCache.get(championshipId) || null : null;
      const categoryInfo = epbfCategoryForEvent(e);
      const base = epbfEventBaseUrl(e);
      const tabs = championshipOverview ? [
        ["information", t("information")],
        ["disciplines", "Disciplines"]
      ] : [
        ["information", t("information")],
        ["participants", t("participants")],
        ["matches", epbfUi("matches")],
        ["ranking", t("standings")]
      ];
      let body = "";

      if (championshipOverview) {
        if (tournamentTab === "disciplines") {
          body = renderChampionshipDisciplineList(e, championshipData);
        } else {
          body = `<div class="info-card">
            ${infoRow(epbfUi("event"), e.name)}
            ${infoRow(t("location"), [e.city, e.country].filter(Boolean).join(", ") || "–")}
            ${infoRow(t("period"), isArchive ? (e.date || "–") : dateRange(e))}
            ${infoRow(t("discipline"), e.disciplines || e.discipline || "–")}
            ${infoRow(epbfUi("categories"), e.classification || "Seniors & Ladies")}
            ${infoRow(t("status"), e.status ? t(e.status) : "–")}
            ${infoRow(epbfUi("numberDisciplines"), championshipData?.count ?? "…")}
          </div>`;
        }
      } else if (!data) {
        const key = `${e.id}:${categoryInfo}`;
        const loading = officialEventRequests.has(key);
        body = `<div class="empty">${loading ? epbfUi("eventLoading") : epbfUi("eventUnavailable")}
          ${!loading ? `<button class="pill" data-retry-event="${safe(e.id)}">${epbfUi("retry")}</button>` : ""}
        </div>`;
        if (officialEventError) body += `<div class="empty">${safe(officialEventError)}</div>`;
      } else if (tournamentTab === "information") {
        const urls = data.urls || {};
        const officialInfoUrl = urls.information || urls.info || e.website || e.url || base.url;
        const headerLogo = document.querySelector("header img")?.getAttribute("src") ||
          document.querySelector(".header-logo img")?.getAttribute("src") || "";
        body = `<div class="info-card">
          ${infoRow(epbfUi("event"), e.name)}
          ${infoRow(t("location"), [e.city, e.country].filter(Boolean).join(", ") || "–")}
          ${infoRow(t("period"), isArchive ? (e.date || "–") : dateRange(e))}
          ${infoRow(t("discipline"), e.disciplines || e.discipline || "–")}
          ${infoRow(t("category"), e.categoryName || e.category || e.classification || "–")}
          ${infoRow(t("status"), e.status ? t(e.status) : "–")}
          ${infoRow(epbfUi("participants"), data.counts?.participants ?? data.participants?.length ?? 0)}
          ${infoRow(epbfUi("matches"), data.counts?.matches ?? data.matches?.length ?? 0)}
          ${infoRow(epbfUi("rankingEntries"), data.counts?.ranking ?? data.ranking?.length ?? 0)}
          ${infoRow(epbfUi("lastUpdated"), data.updatedAt ? new Date(data.updatedAt).toLocaleString(currentLanguage === "nl" ? "nl-BE" : currentLanguage) : "–")}
        </div>
        <div class="epbf-official-link-wrap">
          <a class="epbf-official-link" href="${safe(officialInfoUrl)}" target="_blank" rel="noopener noreferrer">
            <span class="epbf-official-link-logo">${headerLogo ? `<img src="${safe(headerLogo)}" alt="EPBF">` : "EPBF"}</span>
            <span class="epbf-official-link-label">${epbfUi("viewEPBF")}</span>
            <span class="epbf-official-link-arrow" aria-hidden="true">↗</span>
          </a>
        </div>`;
      } else if (tournamentTab === "participants") {
        const officialList = Array.isArray(data.participants) ? data.participants : [];
        const list = Array.isArray(registrationList) ? registrationList : officialList;
        const countries = [...new Set(list.map(player => epbfEventCountry(player, data)).filter(Boolean))]
          .sort((a, b) => String(a).localeCompare(String(b), "nl"));
        const selectedCountry = countries.some(country => String(country) === officialParticipantCountryFilter)
          ? officialParticipantCountryFilter : "";
        const filteredPlayers = selectedCountry
          ? list.filter(player => String(epbfEventCountry(player, data)) === selectedCountry)
          : list;
        body = list.length
          ? `<div class="epbf-match-filter">
              <div class="epbf-filter-fields">
                <div class="epbf-filter-field">
                  <label for="epbf-participant-country-filter">${epbfUi("nationality")}</label>
                  <select id="epbf-participant-country-filter">
                    <option value="">${epbfUi("allCountries")}</option>
                    ${countries.map(country => `<option value="${safe(country)}" ${String(country) === selectedCountry ? "selected" : ""}>${officialFlag(country)} ${safe(country)}</option>`).join("")}
                  </select>
                </div>
              </div>
              <small>${filteredPlayers.length} van ${list.length} spelers</small>
            </div>
            <div class="person-list">${filteredPlayers.map((player, index) => epbfParticipantRow(player, index, data)).join("")}</div>`
          : `<div class="empty">${registrationCategory && currentEurotourRegistrationsRequests.has(registrationCategory)
              ? "EuroTour-deelnemers laden…"
              : "Geen deelnemerslijst ontvangen van de EPBF."}${registrationCategory && currentEurotourRegistrationsErrors.has(registrationCategory)
              ? `<p>${safe(currentEurotourRegistrationsErrors.get(registrationCategory))}</p>` : ""}</div>`;
      } else if (tournamentTab === "matches") {
        const allMatches = Array.isArray(data.matches) ? data.matches : [];
        const names = [...new Set([
          ...(Array.isArray(data.participants) ? data.participants.map(epbfPlayerName) : []),
          ...allMatches.flatMap(match => (Array.isArray(match.players) ? match.players : []).map(epbfPlayerName))
        ])].filter(name => name && name !== "–").sort((a, b) => a.localeCompare(b, "nl"));
        const countryByPlayerId = new Map(
          (Array.isArray(data.participants) ? data.participants : [])
            .filter(player => player.playerId != null)
            .map(player => [String(player.playerId), epbfPlayerCountry(player)])
        );
        const matchPlayerCountry = player =>
          epbfPlayerCountry(player) ||
          countryByPlayerId.get(String(player?.playerId ?? "")) || "";
        const countries = [...new Set([
          ...(Array.isArray(data.participants) ? data.participants : []).map(epbfPlayerCountry),
          ...allMatches.flatMap(match =>
            (Array.isArray(match.players) ? match.players : []).map(matchPlayerCountry))
        ])].filter(Boolean).sort((a, b) => a.localeCompare(b, "nl"));
        const list = allMatches.filter(match => {
          const players = Array.isArray(match.players) ? match.players : [];
          const matchesPlayer = !officialMatchPlayerFilter ||
            players.some(player => epbfPlayerName(player) === officialMatchPlayerFilter);
          const matchesCountry = !officialMatchCountryFilter ||
            players.some(player => matchPlayerCountry(player) === officialMatchCountryFilter);
          return matchesPlayer && matchesCountry;
        });
        const roundNames = [...new Set(list.map(m => m.round || epbfUi("otherMatches")))];
        body = `<div class="epbf-match-filter">
          <div class="epbf-filter-fields">
            <div class="epbf-filter-field">
              <label for="epbf-match-player-filter">${epbfUi("player")}</label>
              <select id="epbf-match-player-filter">
                <option value="">${epbfUi("allPlayers")}</option>
                ${names.map(name => `<option value="${safe(name)}" ${name === officialMatchPlayerFilter ? "selected" : ""}>${safe(name)}</option>`).join("")}
              </select>
            </div>
            <div class="epbf-filter-field">
              <label for="epbf-match-country-filter">${epbfUi("nationality")}</label>
              <select id="epbf-match-country-filter">
                <option value="">${epbfUi("allCountries")}</option>
                ${countries.map(country => `<option value="${safe(country)}" ${country === officialMatchCountryFilter ? "selected" : ""}>${officialFlag(country)} ${safe(country)}</option>`).join("")}
              </select>
            </div>
          </div>
          <small>${list.length} van ${allMatches.length} wedstrijden</small>
        </div>` + (list.length
          ? roundNames.map(round => {
              const roundMatches = list.filter(m => (m.round || epbfUi("otherMatches")) === round);
              return `<div class="epbf-round-heading">
                <strong>${safe(round)}</strong>
                <small>${roundMatches.length} ${roundMatches.length === 1 ? "wedstrijd" : "wedstrijden"}</small>
              </div>${roundMatches.map((match, index) => epbfMatchRow(match, index)).join("")}`;
            }).join("")
          : `<div class="empty">${officialMatchPlayerFilter || officialMatchCountryFilter ? epbfUi("noFilteredMatches") : epbfUi("noEPBFMatches")}</div>`);
      } else if (tournamentTab === "ranking" || tournamentTab === "standings") {
        const list = Array.isArray(data.ranking) ? data.ranking : [];
        body = list.length
          ? `<div class="person-list">${list.map(epbfRankingRow).join("")}</div>`
          : `<div class="empty">${epbfUi("noFinalRanking")}</div>`;
      } else if (tournamentTab === "schedule") {
        const list = Array.isArray(data.matches) ? data.matches.filter(m => m.scheduled || m.table) : [];
        body = list.length
          ? list.map((m, i) => `<div class="info-card">
              ${infoRow(epbfUi("match"), `${m.matchNumber || i + 1}${m.round ? ` · ${m.round}` : ""}`)}
              ${infoRow("Tijd", m.scheduled || "–")}
              ${infoRow(t("table"), m.table || "–")}
              ${infoRow(epbfUi("players"), `${epbfPlayerName(m.players?.[0])} – ${epbfPlayerName(m.players?.[1])}`)}
              ${infoRow("Score", `${epbfScore(m.scoreA)} – ${epbfScore(m.scoreB)}`)}
            </div>`).join("")
          : `<div class="empty">Het speelschema is nog niet beschikbaar als gestructureerde gegevens.</div>
             ${data.scheduleUrl ? `<p><a href="${safe(data.scheduleUrl)}" target="_blank" rel="noopener noreferrer">Open Order of Play op EPBF ↗</a></p>` : ""}`;
      }

      return `${detailBack(t("tournaments"))}
        <div class="event-hero ${epbfTournamentImage(e) ? "event-hero-logo" : ""}"${epbfTournamentImage(e) ? ` style="--epbf-hero-logo: url('${epbfTournamentImage(e)}')"` : ""}><div><h1>${safe(e.name)}</h1>
          <small>${safe(e.categoryName || e.category || e.classification || "")}<br>
          ${safe(isArchive ? (e.date || epbfUi("unknownDate")) : [e.city, e.country].filter(Boolean).join(", "))}<br>
          ${safe(isArchive ? "" : dateRange(e))}</small>
        </div></div>
        ${pills(tabs, tournamentTab, "tournament-tab")}
        <div style="display:flex;justify-content:flex-end;margin:10px 0 12px;">
          <button class="pill" data-refresh-event="1" ${(!championshipOverview && officialEventRequests.has(`${e.id}:${categoryInfo}`)) || (championshipOverview && championshipDisciplinesRequests.has(championshipId)) ? "disabled" : ""}>
            <i data-lucide="refresh-cw" style="width:15px;height:15px;vertical-align:middle;margin-right:5px;"></i>
            ${safe((eventRefreshLabels[currentLanguage] || eventRefreshLabels.en)[(!championshipOverview && officialEventRequests.has(`${e.id}:${categoryInfo}`)) || (championshipOverview && championshipDisciplinesRequests.has(championshipId)) ? 1 : 0])}
          </button>
        </div>
        ${body}
        ${data ? "" : `<div class="epbf-official-link-wrap">
          <a class="epbf-official-link" href="${safe(e.url || e.website || base.url)}" target="_blank" rel="noopener noreferrer">
            <span class="epbf-official-link-logo">EPBF</span>
            <span class="epbf-official-link-label">${epbfUi("viewEPBF")}</span>
            <span class="epbf-official-link-arrow" aria-hidden="true">↗</span>
          </a>
        </div>`}`;
    }

    function renderTournamentDetail(e) {
      if (!e) return `<div class="empty">${t("noResults")}</div>`;
      return renderEPBFTournamentDetail(e, false);
    }

    function renderPlayerDetail(p) {
      if (!p) return `<div class="empty">${t("noResults")}</div>`;
      const ranking =
        players
          .filter((x) => x.category === p.category)
          .sort((a, b) => b.points - a.points)
          .findIndex((x) => x.id === p.id) + 1;
      let body =
        playerTab === "overview"
          ? `<div class="info-card">${infoRow(t("worldRanking"), "#" + ranking)}${infoRow(t("nationality"), `${p.flag} ${p.country}`)}${infoRow(t("age"), p.age)}${infoRow(t("discipline"), "9-Ball / 10-Ball")}${infoRow(t("rankingPoints"), p.points)}</div>`
          : playerTab === "statistics"
            ? `<div class="stats-grid">
          <div>
          <strong>${p.wins + p.losses}</strong>
          <small>${t("matchesPlayed")}</small>
          </div>
          <div>
          <strong>${p.wins}</strong>
          <small>${t("wins")}</small>
          </div>
          <div>
          <strong>${p.losses}</strong>
          <small>${t("losses")}</small>
          </div>
          <div>
          <strong>${Math.round((p.wins / (p.wins + p.losses)) * 100)}%</strong>
          <small>${t("winRate")}</small>
          </div>
          </div>`
            : matches
                .filter((m) => m.p1 === p.id || m.p2 === p.id)
                .map(miniMatch)
                .join("") || `<div class="empty">${t("noResults")}</div>`;
      return `${detailBack(t("players"))}<div class="profile-hero">
          <div class="portrait large">♟</div>
          <div>
          <h1>${safe(p.name)}</h1>
          <p>${p.flag} ${safe(p.country)}</p>
          </div>
          </div>${pills(
        [
          ["overview", t("overview")],
          ["statistics", t("statistics")],
          ["results", t("results")],
        ],
        playerTab,
        "player-tab",
      )}${body}${demo()}`;
    }
    function personalSearchList() {
      const labels = personalText();
      if (!searchText.trim()) return `<div class="empty">${safe(labels.empty)}</div>`;
      if (epbfSearchState === "loading") return `<div class="empty">${safe(t("players") + "…")}</div>`;
      if (epbfSearchState === "error") return `<div class="empty">${safe(labels.error)}</div>`;
      return epbfSearchResults.map(p => {
        const id = Number(p.playerId);
        if (!Number.isInteger(id) || id <= 0) return "";
        return `<button class="person-row" data-select-personal="${id}" ${personalSaving ? "disabled" : ""}>
          <span class="avatar"><i data-lucide="user-round"></i></span>
          <span class="flag">${officialFlag(p.country)}</span>
          <span class="person-name">${safe(p.name || "–")} <small>EPBF ID ${id}</small></span>
          <span class="chev">›</span></button>`;
      }).join("") || `<div class="empty">${safe(labels.noMatches)}</div>`;
    }
    function renderPersonalHistory() {
      if (!personalProfile) return renderPersonal();
      const labels = playerNavLabels[currentLanguage] || playerNavLabels.en;
      const full = renderEPBFPlayerDetail(personalProfile.playerId);
      const historyHeading = `<h2 class="group-title">${epbfUi("history")}</h2>`;
      const section = full.indexOf(historyHeading);
      return `${title(safe(labels.history))}${section >= 0 ? full.slice(section + historyHeading.length) : full}`;
    }
    function renderPersonalSettings() {
      const labels = personalText();
      const p = photoText();
      const settings = { nl: "Instellingen", en: "Settings", fr: "Paramètres", es: "Ajustes", de: "Einstellungen" }[currentLanguage] || "Settings";
      const id = personalProfile?.playerId;
      const languageNames = { nl: "🇳🇱 Nederlands", en: "🇬🇧 English", fr: "🇫🇷 Français", es: "🇪🇸 Español", de: "🇩🇪 Deutsch" };
      const viewerLabels = { nl: "App opnieuw instellen", en: "Set up app again", fr: "Reconfigurer l’application", es: "Configurar la app de nuevo", de: "App neu einrichten" };
      return `${title(safe(settings))}
        <div class="profile-hero">${personalPortrait(id, true)}
          <div><h1>${safe(personalProfile?.name || "")}</h1><p>EPBF ID ${id || "–"}</p></div></div>
        <div class="section-heading"><strong>${safe(p.profile)}</strong></div>
        <input type="file" id="personal-photo-file" accept="image/*" style="display:none">
        <button class="feature-card" data-upload-personal-photo="1">
          <span><i data-lucide="camera"></i></span><div><strong>${safe(p.photo)}</strong></div><b>›</b>
        </button>
        ${localPhoto(id) ? `<button class="feature-card" data-remove-personal-photo="1"><span><i data-lucide="trash-2"></i></span><div><strong>${safe(p.remove)}</strong></div><b>›</b></button>` : ""}
        ${photoError ? `<p class="epbf-profile-status">${safe(photoError)}</p>` : ""}
        <button class="feature-card" data-change-personal="1">
          <span><i data-lucide="user-round-cog"></i></span>
          <div><strong>${safe(labels.change)}</strong></div><b>›</b>
        </button>
        <div class="section-heading"><strong>${safe(p.app)}</strong></div>
        <button class="feature-card" data-settings-language="1">
          <span><i data-lucide="languages"></i></span>
          <div><strong>${safe(p.language)}</strong><small>${safe(languageNames[currentLanguage] || "")}</small></div><b>›</b>
        </button>
        <button class="feature-card" data-switch-to-viewer="1">
          <span><i data-lucide="eye"></i></span>
          <div><strong>${safe(viewerLabels[currentLanguage] || viewerLabels.en)}</strong></div><b>›</b>
        </button>
        <p class="epbf-profile-status">${safe(labels.note)}</p>`;
    }
    const personalDashboardLabels = {
      nl: { last: "Laatste wedstrijd", next: "Volgende wedstrijd", live: "Nu live", all: "Bekijk alles", opponent: "Tegen", noLast: "Nog geen afgewerkte wedstrijd beschikbaar.", noNext: "Geen geplande wedstrijd beschikbaar via de huidige EPBF-koppeling.", loading: "Wedstrijdhistoriek wordt geladen…", provisional: "Recentste beschikbare uitslag", currentTournament: "Actueel European Championship", scheduled: "Live of gepland", match: "Wedstrijd" },
      en: { last: "Last match", next: "Next match", live: "Live now", all: "View all", opponent: "Against", noLast: "No completed match available yet.", noNext: "No upcoming match available from the current EPBF feed.", loading: "Loading match history…", provisional: "Most recent available result", currentTournament: "Current European Championship", scheduled: "Live or scheduled", match: "Match" },
      fr: { last: "Dernier match", next: "Prochain match", live: "En direct", all: "Tout voir", opponent: "Contre", noLast: "Aucun match terminé disponible.", noNext: "Aucun prochain match disponible dans les données EPBF.", loading: "Chargement de l'historique…", provisional: "Dernier résultat disponible", currentTournament: "Championnats d'Europe en cours", scheduled: "En direct ou prévu", match: "Match" },
      es: { last: "Último partido", next: "Próximo partido", live: "En directo", all: "Ver todos", opponent: "Contra", noLast: "Aún no hay partidos terminados disponibles.", noNext: "No hay próximo partido disponible en los datos EPBF.", loading: "Cargando historial…", provisional: "Último resultado disponible", currentTournament: "Campeonato de Europa actual", scheduled: "En directo o programado", match: "Partido" },
      de: { last: "Letztes Spiel", next: "Nächstes Spiel", live: "Jetzt live", all: "Alle ansehen", opponent: "Gegen", noLast: "Noch kein abgeschlossenes Spiel verfügbar.", noNext: "Kein kommendes Spiel über die EPBF-Daten verfügbar.", loading: "Spielverlauf wird geladen…", provisional: "Neueste verfügbare Partie", currentTournament: "Aktuelle Europameisterschaft", scheduled: "Live oder geplant", match: "Spiel" }
    };

    // Ergebnisse des laufenden European-Championships-9-Ball-Turniers.
    // Der Endpunkt wird höchstens alle zwei Minuten abgefragt und unabhängig
    // von der historische Spielercache gehalten.
    const EPBF_CURRENT_CHAMPIONSHIP_TTL_MS = 2 * 60 * 1000;
    let currentChampionshipMatches = [];
    let currentChampionshipLoadedAt = 0;
    let currentChampionshipRequest = null;
    let currentChampionshipAttemptAt = 0;
    let currentChampionshipError = "";
    let currentChampionshipIds = [];

    // De spelersgerichte Worker-route leest rechtstreeks de officiële draw-results
    // van alle actuele kampioenschapsdisciplines. Cache kort zodat nieuwe uitslagen
    // snel zichtbaar worden zonder bij elke render opnieuw een aanvraag te doen.
    const EPBF_CURRENT_PLAYER_MATCH_TTL_MS = 15 * 1000;
    const currentPlayerMatchCache = new Map();
    const currentPlayerMatchRequests = new Map();
    const currentPlayerMatchAttemptAt = new Map();

    async function ensureCurrentPlayerMatches(playerId, force = false) {
      const id = Number(playerId);
      if (!Number.isSafeInteger(id) || id < 1) return;
      const now = Date.now();
      let cached = currentPlayerMatchCache.get(id);
      // Herstel een eerder succesvol resultaat na een herstart of tijdelijke API-fout.
      if (!cached) {
        try {
          const saved = JSON.parse(localStorage.getItem(`epbf-current-player-matches-${id}`) || "null");
          if (saved?.data?.success && Array.isArray(saved.data.matches) &&
              Number(saved.loadedAt) > 0 && now - Number(saved.loadedAt) < 60 * 60 * 1000) {
            cached = { data: saved.data, loadedAt: Number(saved.loadedAt) };
            currentPlayerMatchCache.set(id, cached);
          }
        } catch (_) { /* Opslag niet beschikbaar: gewoon live ophalen. */ }
      }
      if (!force && cached && now - cached.loadedAt < EPBF_CURRENT_PLAYER_MATCH_TTL_MS) return;
      if (currentPlayerMatchRequests.has(id)) return currentPlayerMatchRequests.get(id);
      const lastAttempt = currentPlayerMatchAttemptAt.get(id) || 0;
      if (!force && !cached && now - lastAttempt < 5000) return;

      currentPlayerMatchAttemptAt.set(id, now);
      const request = (async () => {
        try {
          const response = await fetch(`${EPBF_PLAYER_API}/${id}/current-matches${force ? "?refresh=1" : ""}`, { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (!data?.success || !Array.isArray(data.matches)) {
            throw new Error(data?.error || "Ongeldig actueel wedstrijdantwoord");
          }
          const loadedAt = Date.now();
          currentPlayerMatchCache.set(id, { data, loadedAt });
          try { localStorage.setItem(`epbf-current-player-matches-${id}`, JSON.stringify({ data, loadedAt })); }
          catch (_) { /* Privémodus of volle opslag: geheugen-cache blijft werken. */ }
        } catch (error) {
          console.warn("EPBF actuele spelerswedstrijden:", error);
          // Bij een netwerkfout blijft een eerder ontvangen resultaat bruikbaar.
          if (!currentPlayerMatchCache.get(id)?.data?.success) {
            // Geen definitieve lege uitslag opslaan bij een netwerkfout.
            currentPlayerMatchCache.set(id, { data: null, loadedAt: 0, error: String(error?.message || error) });
          }
        } finally {
          currentPlayerMatchRequests.delete(id);
          epbfProfileRefresh(id);
        }
      })();
      currentPlayerMatchRequests.set(id, request);
      return request;
    }

    async function fetchCurrentChampionshipDiscipline(id) {
      const response = await fetch(`${EPBF_EVENT_API}/european-championships/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data?.success || !Array.isArray(data.matches)) return [];
      return data.matches.map((match, index) => ({ ...match, __disciplineId: Number(id), __sourceIndex: index }));
    }

    async function ensureCurrentChampionshipMatches() {
      const now = Date.now();
      if (currentChampionshipRequest) return currentChampionshipRequest;
      if (currentChampionshipLoadedAt && now - currentChampionshipLoadedAt < EPBF_CURRENT_CHAMPIONSHIP_TTL_MS) return null;
      // Bij een fout maximaal één nieuwe poging per minuut.
      if (currentChampionshipAttemptAt && now - currentChampionshipAttemptAt < 60 * 1000) return null;

      currentChampionshipAttemptAt = now;
      currentChampionshipRequest = (async () => {
        try {
          // Ontdek telkens het actuele verzameltornooi via de officiële EPBF-pagina.
          const discoveryResponse = await fetch("https://epbf-api.nicolasmintjens.workers.dev/current-championship", { cache: "no-store" });
          if (!discoveryResponse.ok) throw new Error(`Tornooi detecteren: HTTP ${discoveryResponse.status}`);
          const discovery = await discoveryResponse.json();
          const disciplineIds = Array.isArray(discovery?.disciplineIds)
            ? [...new Set(discovery.disciplineIds.map(Number).filter(id => Number.isSafeInteger(id) && id > 0))]
            : [];
          if (!discovery?.success || !disciplineIds.length) throw new Error(discovery?.error || "Geen actuele EPBF-disciplines gevonden.");
          currentChampionshipIds = disciplineIds;

          // Maximaal vier gelijktijdige aanvragen om de Worker en EPBF niet te overbelasten.
          const results = [];
          for (let i = 0; i < disciplineIds.length; i += 4) {
            const batch = disciplineIds.slice(i, i + 4);
            const batchResults = await Promise.allSettled(batch.map(fetchCurrentChampionshipDiscipline));
            for (const result of batchResults) {
              if (result.status === "fulfilled") results.push(...result.value);
              else console.warn("EPBF-discipline kon niet worden geladen:", result.reason);
            }
          }
          currentChampionshipMatches = results;
          currentChampionshipLoadedAt = Date.now();
          currentChampionshipError = results.length ? "" : "Geen wedstrijdgegevens uit de actuele EPBF-disciplines ontvangen.";
        } catch (error) {
          currentChampionshipError = String(error?.message || error);
          console.warn("EPBF resultaten huidig tornooi:", currentChampionshipError);
        } finally {
          currentChampionshipRequest = null;
          if (isPersonalDashboardVisible()) {
            const content = $("#content");
            const scrollPosition = content?.scrollTop || 0;
            render();
            if (content) content.scrollTop = scrollPosition;
          }
        }
      })();
      return currentChampionshipRequest;
    }

    function latestCurrentTournamentResult(playerId) {
      ensureCurrentPlayerMatches(playerId);
      const playerCache = currentPlayerMatchCache.get(Number(playerId));
      const playerData = playerCache?.data;

      // Gebruik eerst het spelersgerichte antwoord uit de officiële draw-results.
      // Dit vermijdt dat de volgorde van historische statistieken een nieuwer
      // resultaat uit het lopende kampioenschap overschaduwt.
      if (playerData?.success) {
        const latest = playerData.latestCompleted;
        if (!latest || !Array.isArray(latest.players) || latest.players.length < 2) return null;
        const playerIndex = latest.players.findIndex(player => Number(player?.playerId) === Number(playerId));
        if (playerIndex < 0) return null;
        const opponent = latest.players[playerIndex === 0 ? 1 : 0];
        const score = playerIndex === 0 ? latest.scoreA : latest.scoreB;
        const opponentScore = playerIndex === 0 ? latest.scoreB : latest.scoreA;
        if (!opponent || score == null || opponentScore == null ||
            String(score).trim() === "" || String(opponentScore).trim() === "" ||
            String(score) === String(opponentScore)) return null;
        return {
          match: {
            ...latest,
            __disciplineId: Number(latest.eventId || 0),
            playerA: latest.players[0],
            playerB: latest.players[1]
          },
          opponent,
          score,
          opponentScore,
          result: Number(score) > Number(opponentScore) ? "win" : "loss"
        };
      }

      // Geen tweede selectie uit alle disciplines: die sorteert op event-ID
      // en kan een oudere wedstrijd als recentste tonen.
      // Alleen de spelersgerichte Worker-route bepaalt de actuele laatste match.
      return null;
    }

    function personalMatchSections(state, playerId) {
      const l = personalDashboardLabels[currentLanguage] || personalDashboardLabels.en;
      const currentResult = latestCurrentTournamentResult(playerId);
      const historical = state.tournaments.flatMap((event, eventIndex) =>
        (Array.isArray(event.matches) ? event.matches : []).filter(m => m.result === "win" || m.result === "loss")
          .map((match, matchIndex) => ({ match, event, eventIndex, matchIndex })));
      // Prioriteit aan een afgewerkte match in het lopende tornooi; gebruik
      // de spelershistoriek alleen als terugvaloptie.
      const recent = historical[0];
      // Toon geen oude historische uitslag zolang de actuele Worker-route nog
      // niet heeft geantwoord. Zo flitst een wedstrijd uit 2024 niet eerst in beeld.
      const currentPlayerCacheEntry = currentPlayerMatchCache.get(Number(playerId));
      const currentPlayerCheckPending = !currentPlayerCacheEntry ||
        !currentPlayerCacheEntry.data?.success;
      const recentHtml = currentPlayerCheckPending && !currentResult
        ? `<div class="epbf-dashboard-empty" role="status" aria-live="polite">${safe(currentPlayerCacheEntry?.error
          ? `${({nl:"Laatste uitslag tijdelijk niet bereikbaar",en:"Latest result temporarily unavailable",fr:"Dernier résultat temporairement indisponible",es:"Último resultado temporalmente no disponible",de:"Letztes Ergebnis vorübergehend nicht verfügbar"}[currentLanguage] || "Latest result temporarily unavailable")} (${currentPlayerCacheEntry.error})`
          : ({nl:"Recentste wedstrijd ophalen…",en:"Loading latest match…",fr:"Chargement du dernier match…",es:"Cargando el último partido…",de:"Letztes Spiel wird geladen…"}[currentLanguage] || "Loading latest match…"))}</div>`
        : currentResult ? `<div class="epbf-dashboard-match">
        <small>${safe(l.currentTournament)} · ${safe(currentResult.match.round || "")}${currentResult.match.table ? ` · ${safe(currentResult.match.table)}` : ""}</small>
        <div class="epbf-dashboard-match-line"><strong>${safe(l.opponent)} ${safe(currentResult.opponent.name || "–")}</strong>
          <b class="${currentResult.result === "win" ? "epbf-result-win" : "epbf-result-loss"}">${safe(epbfScore(currentResult.score))} – ${safe(epbfScore(currentResult.opponentScore))}</b></div>
      </div>` : currentPlayerCacheEntry?.data?.success && recent ? `<div class="epbf-dashboard-match">
        <small>${safe(l.provisional)} · ${safe(recent.event.disciplineName || recent.event.name || "EPBF")}</small>
        <div class="epbf-dashboard-match-line"><strong>${safe(l.opponent)} ${safe(recent.match.opponent?.name || "–")}</strong>
          <b class="${recent.match.result === "win" ? "epbf-result-win" : "epbf-result-loss"}">${safe(epbfScore(recent.match.score))} – ${safe(epbfScore(recent.match.opponentScore))}</b></div>
        <small>${safe(recent.event.date || String(recent.event.year || ""))}</small>
      </div>` : `<div class="epbf-dashboard-empty">${safe(state.loading || state.baseLoading || !state.baseLoaded ? l.loading : l.noLast)}</div>`;

      // Zoek de volgende wedstrijd eerst in de dynamisch ontdekte disciplines
      // van het actuele European Championship. De aparte livefeed blijft fallback.
      // De huidige toernooipagina kan wedstrijden bevatten die nog niet in officialMatches staan.
      const playerIsInMatch = m =>
        Number(m.playerA?.playerId) === playerId || Number(m.playerB?.playerId) === playerId;
      const normalizedMatchStatus = m => String(m.status || "").trim().toUpperCase();
      const hasValidScore = m => m.scoreA != null && m.scoreB != null &&
        String(m.scoreA).trim() !== "" && String(m.scoreB).trim() !== "" &&
        Number.isFinite(Number(m.scoreA)) && Number.isFinite(Number(m.scoreB));
      const isFinishedStatus = m => ["FINISHED", "COMPLETED", "COMPLETE", "DONE", "CLOSED", "WALKOVER", "WO"].includes(normalizedMatchStatus(m));
      // EPBF-draws geven geplande wedstrijden soms terug met status UNKNOWN,
      // terwijl beide scores 0 zijn. Behandel die als gepland, maar nooit als
      // gepland wanneer de bron de match expliciet als afgewerkt markeert.
      const isUpcomingStatus = m => {
        const status = normalizedMatchStatus(m);
        if (["RUNNING", "SCHEDULED", "NOT_STARTED", "PENDING", "WAITING", "UNKNOWN", ""].includes(status)) return true;
        return !isFinishedStatus(m) && hasValidScore(m) && Number(m.scoreA) === 0 && Number(m.scoreB) === 0;
      };
      const currentTournamentUpcoming = currentChampionshipMatches
        .filter(m => playerIsInMatch(m) && isUpcomingStatus(m))
        .map(m => ({ match: m, source: "championship" }));
      const liveFeedUpcoming = officialMatches
        .filter(m => playerIsInMatch(m) && isUpcomingStatus(m))
        .map(m => ({ match: m, source: "live" }));
      // Extra terugvaloptie: de spelersgerichte Worker-route bevat ook de
      // lopende draw-wedstrijd, zelfs wanneer de algemene livefeed achterloopt.
      // Alleen dezelfde discipline als de laatst afgewerkte wedstrijd komt in
      // aanmerking, zodat oudere disciplines niet als 'volgende' verschijnen.
      const playerCurrentData = currentPlayerMatchCache.get(Number(playerId))?.data;
      const latestEventId = Number(playerCurrentData?.latestCompleted?.eventId || 0);
      const playerDrawUpcoming = latestEventId && Array.isArray(playerCurrentData?.matches)
        ? playerCurrentData.matches.filter(m => {
            if (Number(m.eventId) !== latestEventId || !Array.isArray(m.players)) return false;
            if (!m.players.some(p => Number(p.playerId) === playerId)) return false;
            const target = Number(m.cells?.[3]);
            const a = Number(m.scoreA), b = Number(m.scoreB);
            // Het EPBF-draw toont de te behalen score in de vierde cel.
            // Bijvoorbeeld 5-4 met race to 8: nog bezig.
            return Number.isFinite(target) && target > 0 &&
              Number.isFinite(a) && Number.isFinite(b) &&
              a < target && b < target;
          }).map(m => ({ match: {
            ...m, playerA: m.players[0], playerB: m.players[1],
            __disciplineId: Number(m.eventId),
            id: m.matchNumber || m.sourceOrder,
            status: (Number(m.scoreA) > 0 || Number(m.scoreB) > 0) ? "RUNNING" : "SCHEDULED",
            discipline: "EPBF"
          }, source: "player-draw" })) : [];
      const upcomingCandidates = [...currentTournamentUpcoming, ...liveFeedUpcoming, ...playerDrawUpcoming];
      // Een wedstrijd die al bezig is heeft voorrang; daarna gebruik de eerstvolgende
      // beschikbare wedstrijd-ID binnen de officiële draw. Dedupliceer dezelfde match.
      const seenUpcoming = new Set();
      const uniqueUpcoming = upcomingCandidates.filter(item => {
        const key = `${item.match.__disciplineId || "live"}:${item.match.id}`;
        if (seenUpcoming.has(key)) return false;
        seenUpcoming.add(key);
        return true;
      });
      uniqueUpcoming.sort((a, b) => {
        const statusDiff = Number(String(b.match.status).toUpperCase() === "RUNNING") - Number(String(a.match.status).toUpperCase() === "RUNNING");
        if (statusDiff) return statusDiff;
        if (a.source === "championship" && b.source === "championship") {
          const disciplineDiff = Number(a.match.__disciplineId || 0) - Number(b.match.__disciplineId || 0);
          if (disciplineDiff) return disciplineDiff;
          return Number(a.match.id || 0) - Number(b.match.id || 0);
        }
        return 0;
      });
      const selectedUpcoming = uniqueUpcoming[0] || null;
      const current = selectedUpcoming?.match || null;
      const currentSource = selectedUpcoming?.source || "";
      const other = current && (Number(current.playerA?.playerId) === playerId ? current.playerB : current.playerA);
      const rawCurrentStatus = current ? normalizedMatchStatus(current) : "";
      const currentStatusLabel = current && ["UNKNOWN", "NOT_STARTED", "PENDING", "WAITING", ""].includes(rawCurrentStatus) &&
        hasValidScore(current) && Number(current.scoreA) === 0 && Number(current.scoreB) === 0
        ? ({nl:"GEPLAND", en:"SCHEDULED", fr:"PROGRAMMÉ", es:"PROGRAMADO", de:"GEPLANT"}[currentLanguage] || "SCHEDULED")
        : current ? officialStatus(rawCurrentStatus) : "";
      const upcomingHtml = current ? `${currentSource === "live" ? `<button class="epbf-dashboard-match epbf-dashboard-match-button" data-official-match="${Number(current.id)}">` : `<div class="epbf-dashboard-match">`}
        <small>${safe(l.scheduled)} · ${safe(current.discipline || "EPBF")} · ${safe(current.table || "")}</small>
        <div class="epbf-dashboard-match-line"><strong>${safe(l.opponent)} ${safe(other?.name || "–")}</strong><span class="badge ${rawCurrentStatus === "RUNNING" ? "green" : ""}">${safe(currentStatusLabel)}</span></div>
      ${currentSource === "live" ? `</button>` : `</div>`}` : `<div class="epbf-dashboard-empty">${safe(l.noNext)}</div>`;
      return `<div class="epbf-dashboard-section"><div class="section-heading"><strong>${safe(l.last)}</strong></div>${recentHtml}</div>
        <div class="epbf-dashboard-section"><div class="section-heading"><strong>${safe(l.next)}</strong></div>${upcomingHtml}</div>
        <div class="epbf-dashboard-section"><div class="section-heading"><strong>${safe(l.live)}</strong><button data-page="live">${safe(l.all)} ›</button></div>${officialLiveContent()}</div>`;
    }
    const personalLoadingLabels = {
      nl: { title: "Je spelersgegevens worden geladen", oneTime: "Eenmalige voorbereiding: bij een volgend bezoek gebruiken we de eerder opgeslagen gegevens. Ontbrekende gegevens kunnen opnieuw geladen worden.", subtitle: "Laat dit scherm open totdat alle beschikbare wedstrijdgegevens verwerkt zijn.", tournaments: "Toernooien verwerkt", initial: "Spelersfiche ophalen…", progress: "Wedstrijdgegevens verwerken…", retry: "Opnieuw proberen", error: "Het laden is onderbroken. Je gegevens zijn nog niet volledig.", complete: "Laden voltooid" },
      en: { title: "Loading your player data", oneTime: "One-time setup: on your next visit, we reuse previously saved data. Missing data may need to be loaded again.", subtitle: "Keep this screen open until all available match data has loaded.", tournaments: "Tournaments processed", initial: "Fetching player profile…", progress: "Processing match data…", retry: "Try again", error: "Loading was interrupted. Your data is not complete.", complete: "Loading complete" },
      fr: { title: "Chargement de vos données", oneTime: "Préparation initiale : lors de votre prochaine visite, les données déjà enregistrées seront réutilisées. Les données manquantes pourront être rechargées.", subtitle: "Gardez cet écran ouvert jusqu'à la fin du chargement des matchs.", tournaments: "Tournois traités", initial: "Récupération du profil…", progress: "Traitement des matchs…", retry: "Réessayer", error: "Chargement interrompu. Données incomplètes.", complete: "Chargement terminé" },
      es: { title: "Cargando tus datos", oneTime: "Preparación inicial: en tu próxima visita reutilizaremos los datos guardados. Es posible que deban cargarse de nuevo los datos que falten.", subtitle: "Mantén esta pantalla abierta hasta que se carguen los partidos.", tournaments: "Torneos procesados", initial: "Obteniendo perfil…", progress: "Procesando partidos…", retry: "Reintentar", error: "Carga interrumpida. Datos incompletos.", complete: "Carga completada" },
      de: { title: "Deine Spielerdaten werden geladen", oneTime: "Einmalige Vorbereitung: Beim nächsten Besuch verwenden wir bereits gespeicherte Daten. Fehlende Daten müssen eventuell erneut geladen werden.", subtitle: "Lass diesen Bildschirm geöffnet, bis alle Matchdaten geladen sind.", tournaments: "Turniere verarbeitet", initial: "Spielerprofil wird geladen…", progress: "Spiele werden verarbeitet…", retry: "Erneut versuchen", error: "Laden unterbrochen. Daten unvollständig.", complete: "Laden abgeschlossen" }
    };
    function renderPersonalLoading(state, id) {
      const l = personalLoadingLabels[currentLanguage] || personalLoadingLabels.en;
      const total = Number.isFinite(Number(state.totalTournaments)) ? Number(state.totalTournaments) : null;
      const processed = state.tournaments.filter(t => t.stats || Array.isArray(t.matches) || t.status).length;
      const count = total === null ? processed : Math.min(processed, total);
      const percent = total === null ? null : total === 0 ? (state.nextOffset === null ? 100 : 0) : Math.min(100, Math.round(count / total * 100));
      const error = state.error || (!state.loading && !state.baseLoading && state.baseError && !state.baseLoaded && state.nextOffset !== null ? state.baseError : "");
      return `<div class="epbf-personal-loading" role="status" aria-live="polite">
        ${personalPortrait(id, true)}
        <h1>${safe(l.title)}</h1>
        <strong class="epbf-loading-player">${safe(state.playerName || personalProfile.name || `EPBF #${id}`)}</strong>
        <p>${safe(l.subtitle)}</p>
        <p class="epbf-loading-onetime">${safe(l.oneTime)}</p>
        <div class="epbf-loading-track" role="progressbar" aria-label="${safe(l.tournaments)}" aria-valuemin="0" ${percent === null ? '' : `aria-valuenow="${percent}" aria-valuemax="100"`}><span style="width:${percent === null ? 0 : percent}%"></span></div>
        <div class="epbf-loading-count"><strong>${percent === null ? '…' : percent + '%'}</strong><span>${safe(l.tournaments)}: ${count} / ${total === null ? '…' : total}</span></div>
        <small>${safe(error && state.retryCount <= 5 ? `Verbinding onderbroken. Automatisch opnieuw proberen (${state.retryCount}/5)…` : error ? l.error : state.baseLoading || !state.baseLoaded && !state.loading && !state.baseError ? l.initial : l.progress)}</small>
        ${error && state.retryCount > 5 ? `<button class="pill" data-epbf-more="${id}">${safe(l.retry)}</button><small>${safe(error)}</small>` : ''}
      </div>`;
    }
    function renderPersonal() {
      const labels = personalText();
      if (personalProfile && !personalChoosing) {
        const id = personalProfile.playerId;
        const state = epbfProfileState(id);
        if (!state.started) {
          state.started = true;
          if (state.baseLoaded) {
            if (state.nextOffset !== null) Promise.resolve().then(() => loadEPBFProfilePage(id));
          } else {
            Promise.resolve().then(() => loadEPBFProfileBase(id));
          }
        } else if (state.baseLoaded && state.nextOffset !== null && !state.loading && !state.baseLoading && !state.error) {
          Promise.resolve().then(() => loadEPBFProfilePage(id));
        }
        // Een volledig gecacheerd dashboard verschijnt direct. Verouderde gegevens
        // worden maximaal om de 6 uur stil op de achtergrond bijgewerkt.
        const refreshReference = Math.max(state.cachedAt || 0, state.lastRefreshAttemptAt || 0);
        if (state.nextOffset === null && state.baseLoaded && Date.now() - refreshReference >= EPBF_PROFILE_CACHE_TTL_MS) {
          Promise.resolve().then(() => refreshEPBFProfileInBackground(id));
        }
        // Toon geen nulstatistieken zolang de EPBF-stats nog niet volledig zijn opgehaald.
        // De progressie komt uit werkelijk verwerkte toernooien, nooit uit een timer.
        if (state.nextOffset !== null) return renderPersonalLoading(state, id);
        const played = state.tournaments.reduce((n, x) => n + (x.stats?.played || 0), 0);
        const wins = state.tournaments.reduce((n, x) => n + (x.stats?.wins || 0), 0);
        const losses = state.tournaments.reduce((n, x) => n + (x.stats?.losses || 0), 0);
        return `<div class="epbf-personal-dashboard">
          <div class="epbf-personal-header">
            ${personalPortrait(id, true)}
            <div class="epbf-personal-identity">
              <strong>${safe(state.playerName || personalProfile.name || `EPBF #${id}`)}</strong>
              <small>${officialFlag(personalProfile.country)} ${safe(personalProfile.country || "")} · EPBF ID ${id}</small>
            </div>
            <button type="button" data-refresh-personal="1" aria-label="${safe(({nl:"Vernieuwen",en:"Refresh",fr:"Actualiser",es:"Actualizar",de:"Aktualisieren"}[currentLanguage] || "Refresh"))}" title="${safe(({nl:"Vernieuwen",en:"Refresh",fr:"Actualiser",es:"Actualizar",de:"Aktualisieren"}[currentLanguage] || "Refresh"))}" style="margin-left:auto;flex:0 0 auto;display:grid;place-items:center;width:42px;height:42px;border:1px solid #20d69a;border-radius:12px;background:#102d43;color:#20d69a;cursor:pointer;"><i data-lucide="refresh-cw"></i></button>
          </div>
          <div class="epbf-personal-circles">
            <div class="epbf-personal-stat"><span><strong>${played}</strong></span><small>${t("myMatches")}</small></div>
            <div class="epbf-personal-stat"><span><strong>${wins}</strong></span><small>${safe({nl:"Gewonnen",en:"Won",fr:"Gagnés",es:"Ganados",de:"Gewonnen"}[currentLanguage] || "Won")}</small></div>
            <div class="epbf-personal-stat"><span><strong>${losses}</strong></span><small>${safe({nl:"Verloren",en:"Lost",fr:"Perdus",es:"Perdidos",de:"Verloren"}[currentLanguage] || "Lost")}</small></div>
            <div class="epbf-personal-stat"><span><strong>${played ? (100 * wins / played).toFixed(1) + "%" : "–"}</strong></span><small>Win %</small></div>
          </div>
          ${personalMatchSections(state, id)}
          <button class="feature-card" data-page="history"><span><i data-lucide="history"></i></span>
            <div><strong>${safe((playerNavLabels[currentLanguage] || playerNavLabels.en).history)}</strong></div><b>›</b></button>
        </div>`;
      }
      return `${title(safe(labels.choose), safe(labels.help))}
        ${personalProfile ? `<button class="pill" data-cancel-personal="1">${safe(labels.back)}</button>` : ""}
        <div class="search-wrap"><span>⌕</span>
        <input id="personal-player-search" type="search" placeholder="${safe(labels.search)}" value="${safe(searchText)}" autocomplete="off" ${personalSaving ? "disabled" : ""}></div>
        <div class="person-list" id="personal-player-list">${personalSearchList()}</div>
        ${personalSaving ? `<div class="empty">${safe(labels.saving)}</div>` : ""}
        ${personalError ? `<div class="empty">${safe(personalError)}</div>` : ""}
        <p class="epbf-profile-status">${safe(labels.note)}</p>`;
    }
    function languageMenu() {
      const languages = [
        ["nl", "🇳🇱", "Nederlands"],
        ["en", "🇬🇧", "English"],
        ["fr", "🇫🇷", "Français"],
        ["es", "🇪🇸", "Español"],
        ["de", "🇩🇪", "Deutsch"],
      ];
      $("#language-panel").innerHTML = languages
        .map(
          ([code, flag, label]) =>
            `<button data-set-language="${code}">
          <span>${flag}</span>
          <strong>${label}</strong>
          <span class="language-check">${currentLanguage === code ? "✓" : ""}</span>
          </button>`,
        )
        .join("");
      $("#language-overlay").classList.remove("hidden");
    }
    document.addEventListener("click", (e) => {
      const target = e.target.closest("button");
      if (!target) {
        if (e.target.id === "language-overlay")
          $("#language-overlay").classList.add("hidden");
        return;
      }
      if (target.matches("[data-language-toggle]") || target.dataset.settingsLanguage) return languageMenu();
      if (target.dataset.uploadPersonalPhoto) return $("#personal-photo-file")?.click();
      if (target.dataset.removePersonalPhoto && personalProfile) {
        localStorage.removeItem(EPBF_LOCAL_PHOTO_PREFIX + personalProfile.playerId);
        photoError = "";
        return render();
      }
      if (target.dataset.setLanguage) {
        setAppLanguage(target.dataset.setLanguage);
        $("#language-overlay").classList.add("hidden");
        if (mode) render();
        return;
      }
      if (target.dataset.switchToViewer) {
        // Terug naar het beginscherm met de keuze Speler / Kijker.
        // Het opgeslagen spelersprofiel blijft behouden.
        mode = null;
        page = "home";
        detail = null;
        $("#main").classList.add("hidden");
        $("#splash").classList.remove("hidden");
        return;
      }
      if (target.dataset.mode) return showMode(target.dataset.mode);
      if (target.id === "back" || target.dataset.back) return back();
      if (target.id === "brand") return go("home");
      if (target.dataset.page) return go(target.dataset.page);
      if (target.dataset.officialMatch)
        return openDetail("official-match", Number(target.dataset.officialMatch));
      if (target.dataset.refreshPersonal && personalProfile) {
        const id = personalProfile.playerId;
        // Vernieuw de actuele wedstrijden, livefeed en statistieken zonder het dashboard te verlaten.
        ensureCurrentPlayerMatches(id, true);
        refreshOfficialLive();
        refreshEPBFProfileInBackground(id);
        return;
      }
      if (target.dataset.refreshLive) return refreshOfficialLive();
      if (target.dataset.refreshEvent || target.dataset.retryEvent) return refreshVisibleEvent();
      if (target.dataset.match)
        return openDetail("match", Number(target.dataset.match));
      if (target.dataset.championshipDiscipline) {
        tournamentTab = "information";
        officialMatchPlayerFilter = "";
        officialMatchCountryFilter = "";
        return openDetail("championship-discipline", Number(target.dataset.championshipDiscipline));
      }
      if (target.dataset.retryChampionship) {
        const event = tournaments.find(e => String(e.id) === String(target.dataset.retryChampionship));
        if (event) {
          const parentId = championshipParentId(event);
          if (parentId) championshipDisciplinesCache.delete(parentId);
          if (parentId) championshipDisciplinesRequests.delete(parentId);
          officialEventError = "";
          loadChampionshipDisciplines(event).then(() => render()).catch(error => {
            officialEventError = String(error?.message || error);
            render();
          });
          render();
        }
        return;
      }
      if (target.dataset.archiveTournament) {
      tournamentTab = "information";
      officialMatchPlayerFilter = "";
      officialMatchCountryFilter = "";
      return openDetail(
        "archive-tournament",
        Number(target.dataset.archiveTournament)
      );
    }
      if (target.dataset.tournament) {
        tournamentTab = "information";
        officialMatchPlayerFilter = "";
        officialMatchCountryFilter = "";
        return openDetail("tournament", Number(target.dataset.tournament));
      }
      if (target.dataset.epbfPlayer) return openDetail("epbf-player", Number(target.dataset.epbfPlayer));
      if (target.dataset.epbfExpand) {
        const key = target.dataset.epbfExpand;
        if (epbfProfileExpanded.has(key)) epbfProfileExpanded.delete(key);
        else epbfProfileExpanded.add(key);
        const scroll = $("#content").scrollTop;
        render();
        $("#content").scrollTop = scroll;
        return;
      }
      if (target.dataset.epbfMore) {
        const id = Number(target.dataset.epbfMore);
        const state = epbfProfileState(id);
        if (!state.baseLoaded && !state.baseLoading) loadEPBFProfileBase(id);
        return loadEPBFProfilePage(id);
      }
      if (target.dataset.player)
        return openDetail("player", Number(target.dataset.player));
      if (target.dataset.personal) return openDetail("personal", 0);
      if (target.dataset.personalSettings) return go("settings");
      if (target.dataset.selectPersonal) return selectPersonalProfile(Number(target.dataset.selectPersonal));
      if (target.dataset.changePersonal) {
        detail = { type: "personal", id: 0 };
        personalChoosing = true;
        personalError = "";
        searchText = "";
        epbfSearchResults = [];
        epbfSearchState = "idle";
        return render();
      }
      if (target.dataset.cancelPersonal) {
        personalChoosing = false;
        personalError = "";
        return render();
      }
      if (target.dataset.liveFilter) {
        liveFilter = target.dataset.liveFilter;
        return render();
      }
      
      if (target.dataset.tournamentView) {
        tournamentView = target.dataset.tournamentView;
        if (
          tournamentView === "archive" &&
          officialTournamentsState === "loading"
        ) {
          refreshOfficialTournaments();
        }
        return render();
      }

      if (target.dataset.archiveCategory) {
        tournamentArchiveCategory = target.dataset.archiveCategory;
        return render();
      }

      if (target.dataset.refreshArchive) {
        officialTournamentsState = "loading";
        officialTournamentsError = "";
        refreshOfficialTournaments();
        return render();
      }

      if (target.dataset.tournamentFilter) {
        tournamentFilter = target.dataset.tournamentFilter;
        return render();
      }
      if (target.dataset.rankingFilter) {
        rankingFilter = target.dataset.rankingFilter;
        rankingSearchText = "";
        rankingCountryFilter = "";
        return render();
      }
      if (target.dataset.retryRanking) {
        epbfRankingErrors.delete(rankingFilter);
        loadEPBFRanking(rankingFilter, true);
        return render();
      }
      if (target.dataset.tournamentTab) {
        tournamentTab = target.dataset.tournamentTab;
        return render();
      }
      if (target.dataset.matchTab) {
        matchTab = target.dataset.matchTab;
        return render();
      }
      if (target.dataset.playerTab) {
        playerTab = target.dataset.playerTab;
        return render();
      }
      if (target.id === "demo-sign-in") alert(t("signInInfo"));
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "ranking-country-filter") {
        rankingCountryFilter = e.target.value;
        const list = $("#ranking-list");
        if (list) list.innerHTML = renderRankingList();
        return;
      }
      if (e.target.id === "epbf-participant-country-filter") {
        officialParticipantCountryFilter = e.target.value;
        const scrollTop = $("#content").scrollTop;
        render();
        $("#content").scrollTop = scrollTop;
        return;
      }
      if (e.target.id === "epbf-match-player-filter" ||
          e.target.id === "epbf-match-country-filter") {
        if (e.target.id === "epbf-match-player-filter") {
          officialMatchPlayerFilter = e.target.value;
        } else {
          officialMatchCountryFilter = e.target.value;
        }
        const scrollTop = $("#content").scrollTop;
        render();
        $("#content").scrollTop = scrollTop;
      }
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "personal-photo-file") {
        const file = e.target.files?.[0];
        if (file) savePersonalPhoto(file);
      }
    });
    document.addEventListener("input", (e) => {
      if (e.target.id === "ranking-search") {
        rankingSearchText = e.target.value;
        const list = $("#ranking-list");
        if (list) list.innerHTML = renderRankingList();
        return;
      }
      if (e.target.id !== "player-search" && e.target.id !== "personal-player-search") return;
      searchText = e.target.value;
      clearTimeout(epbfSearchTimer);
      if (epbfSearchController) epbfSearchController.abort();
      const requestId = ++epbfSearchRequestId;
      epbfSearchResults = [];
      epbfSearchState = searchText.trim() ? "loading" : "idle";
      refreshEPBFSearchList();
      if (searchText.trim()) {
        const query = searchText.trim();
        epbfSearchTimer = setTimeout(() => searchEPBFPlayers(query, requestId), 350);
      }
    });
    setAppLanguage(currentLanguage);
    if (personalProfile) showMode("player");
    refreshOfficialCalendar();
    refreshOfficialTournaments();

    if (window.lucide) {
      lucide.createIcons();
    }
