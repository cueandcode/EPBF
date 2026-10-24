    "use strict";
    // EPBF app. Rankings, players and legacy matches remain demo data.
    const $ = (s) => document.querySelector(s);

    // Officiële EPBF Live API en kalender-API.
    const EPBF_LIVE_API = "https://epbf-api.nicolasmintjens.workers.dev/live";
    const EPBF_ARCHIVE_API =
      "https://epbf-api.nicolasmintjens.workers.dev/archive";
    const EPBF_EVENT_API =
      "https://epbf-api.nicolasmintjens.workers.dev/epbf";

    // Eventgegevens worden per EPBF-tornooi opgehaald en lokaal in geheugen bewaard.
    const officialEventDetails = new Map();
    const officialEventRequests = new Map();
    const championshipDisciplinesCache = new Map();
    const championshipDisciplinesRequests = new Map();
    const championshipDisciplineEvents = new Map();

    let officialEventError = "";
    let officialMatchPlayerFilter = "";
    let officialMatchCountryFilter = "";

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
        if (mode && (page === "live" || (page === "home" && !detail) || detail?.type === "official-match")) {
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
      rankingFilter = "men",
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
    function nav() {
      const items = ["home", "live", "tournaments", "ranking", "players"];
      $("#nav").innerHTML = items
        .map(
          (key) =>
            `<button class="nav-item ${page === key ? "selected" : ""}" data-page="${key}">
          <span class="nav-icon">
      <i data-lucide="${icons[key]}">
          </i>
    </span>
          <small>${t(key)}</small>
          </button>`,
        )
        .join("");
    }
    function showMode(next) {
      mode = next;
      $("#splash").classList.add("hidden");
      $("#main").classList.remove("hidden");
      page = "home";
      detail = null;
      render();
    }
    function go(next) {
      page = next;
      detail = null;
      searchText = "";
      render();
    }
    function openDetail(type, id) {
      detail = { type, id };
      render();
    }
    function back() {
      if (detail) {
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
      $("#back").classList.toggle("hidden", !detail && page === "home");
      nav();
      $("#content").innerHTML = detail
        ? renderDetail()
        : (
            {
              home: renderHome,
              live: renderLive,
              tournaments: renderTournaments,
              ranking: renderRanking,
              players: renderPlayers,
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
        ["calendar", "Upcoming & Live"],
        ["archive", "Previous Events"]
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
              ["ongoing", t("ongoing")],
              ["finished", t("finished")]
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

    function renderRanking() {
      const list = players
        .filter((p) => p.category === rankingFilter)
        .sort((a, b) => b.points - a.points);
      return `${title(t("ranking"))}${pills(
        [
          ["men", t("men")],
          ["women", t("women")],
          ["youth", t("youth")],
          ["wheelchair", t("wheelchair")],
        ],
        rankingFilter,
        "ranking-filter",
      )}${demo()}<div class="person-list">${list.map((p, i) => playerRow(p, i + 1)).join("")}</div>`;
    }
    function renderPlayers() {
      const list = players.filter((p) =>
        `${p.name} ${p.country}`
          .toLocaleLowerCase()
          .includes(searchText.toLocaleLowerCase()),
      );
      return `${title(t("players"))}<div class="search-wrap">
          <span>⌕</span>
          <input id="player-search" type="search" placeholder="${t("searchPlayer")}" value="${safe(searchText)}" autocomplete="off">
          </div>${demo()}<div class="person-list" id="player-list">${list.map((p) => playerRow(p)).join("") || `<div class="empty">${t("noResults")}</div>`}</div>`;
    }
    function renderDetail() {
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
      if (detail.type === "player") return renderPlayerDetail(person(detail.id));
      return renderPersonal();
    }
    function detailBack(label) {
      return `<button class="detail-back" data-back="1">‹ <span>${label}</span>
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
        return data;
      })();

      officialEventRequests.set(key, request);
      try {
        return await request;
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
      if (officialEventDetails.has(key) || officialEventRequests.has(key)) return;
      loadOfficialEventDetail(event).catch(error => {
        officialEventError = String(error?.message || error);
        console.error("EPBF event details:", error);
      });
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
          <span class="epbf-player-name ${aWon ? "epbf-winner" : ""}">${officialFlag(epbfPlayerCountry(playerA))} ${safe(epbfPlayerName(playerA))}</span>
          <strong class="epbf-match-score">${epbfScore(match.scoreA)} – ${epbfScore(match.scoreB)}</strong>
          <span class="epbf-player-name epbf-player-b ${bWon ? "epbf-winner" : ""}">${officialFlag(epbfPlayerCountry(playerB))} ${safe(epbfPlayerName(playerB))}</span>
        </div>
      </div>`;
    }

    function epbfParticipantRow(player, index) {
      return `<div class="person-row epbf-person-row">
        <span class="rank-num">${index + 1}</span>
        <span class="flag">${officialFlag(epbfPlayerCountry(player))}</span>
        <span class="person-name">${safe(epbfPlayerName(player))}</span>
        <small>${safe(epbfPlayerCountry(player))}</small>
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
        <span class="person-name">${safe(name)}</span>
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
      const data = championshipOverview ? null : epbfEventData(e);
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
        ["matches", "Wedstrijden"],
        ["ranking", "Eindstand"],
        ["schedule", t("schedule")]
      ];
      let body = "";

      if (championshipOverview) {
        if (tournamentTab === "disciplines") {
          body = renderChampionshipDisciplineList(e, championshipData);
        } else {
          body = `<div class="info-card">
            ${infoRow("Tornooi", e.name)}
            ${infoRow(t("location"), [e.city, e.country].filter(Boolean).join(", ") || "–")}
            ${infoRow(t("period"), isArchive ? (e.date || "–") : dateRange(e))}
            ${infoRow(t("discipline"), e.disciplines || e.discipline || "–")}
            ${infoRow("Categorieën", e.classification || "Seniors & Ladies")}
            ${infoRow(t("status"), e.status ? t(e.status) : "–")}
            ${infoRow("Aantal disciplines", championshipData?.count ?? "…")}
          </div>
          <div class="section-heading"><strong>Disciplines en onderdelen</strong></div>
          ${renderChampionshipDisciplineList(e, championshipData)}`;
        }
      } else if (!data) {
        const key = `${e.id}:${categoryInfo}`;
        const loading = officialEventRequests.has(key);
        body = `<div class="empty">${loading ? "Tornooigegevens laden…" : "Tornooigegevens nog niet beschikbaar."}
          ${!loading ? `<button class="pill" data-retry-event="${safe(e.id)}">Opnieuw proberen</button>` : ""}
        </div>`;
        if (officialEventError) body += `<div class="empty">${safe(officialEventError)}</div>`;
      } else if (tournamentTab === "information") {
        const urls = data.urls || {};
        const officialInfoUrl = urls.information || urls.info || e.website || e.url || base.url;
        const headerLogo = document.querySelector("header img")?.getAttribute("src") ||
          document.querySelector(".header-logo img")?.getAttribute("src") || "";
        body = `<div class="info-card">
          ${infoRow("Tornooi", e.name)}
          ${infoRow(t("location"), [e.city, e.country].filter(Boolean).join(", ") || "–")}
          ${infoRow(t("period"), isArchive ? (e.date || "–") : dateRange(e))}
          ${infoRow(t("discipline"), e.disciplines || e.discipline || "–")}
          ${infoRow(t("category"), e.categoryName || e.category || e.classification || "–")}
          ${infoRow(t("status"), e.status ? t(e.status) : "–")}
          ${infoRow("Deelnemers", data.counts?.participants ?? data.participants?.length ?? 0)}
          ${infoRow("Wedstrijden", data.counts?.matches ?? data.matches?.length ?? 0)}
          ${infoRow("Rankingregels", data.counts?.ranking ?? data.ranking?.length ?? 0)}
          ${infoRow("Laatst bijgewerkt", data.updatedAt ? new Date(data.updatedAt).toLocaleString(currentLanguage === "nl" ? "nl-BE" : currentLanguage) : "–")}
        </div>
        <div class="epbf-official-link-wrap">
          <a class="epbf-official-link" href="${safe(officialInfoUrl)}" target="_blank" rel="noopener noreferrer">
            <span class="epbf-official-link-logo">${headerLogo ? `<img src="${safe(headerLogo)}" alt="EPBF">` : "EPBF"}</span>
            <span class="epbf-official-link-label">Bekijk op EPBF.com</span>
            <span class="epbf-official-link-arrow" aria-hidden="true">↗</span>
          </a>
        </div>`;
      } else if (tournamentTab === "participants") {
        const list = Array.isArray(data.participants) ? data.participants : [];
        body = list.length
          ? `<div class="person-list">${list.map(epbfParticipantRow).join("")}</div>`
          : `<div class="empty">Geen deelnemerslijst ontvangen van de EPBF.</div>`;
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
        const roundNames = [...new Set(list.map(m => m.round || "Overige wedstrijden"))];
        body = `<div class="epbf-match-filter">
          <div class="epbf-filter-fields">
            <div class="epbf-filter-field">
              <label for="epbf-match-player-filter">Speler</label>
              <select id="epbf-match-player-filter">
                <option value="">Alle spelers</option>
                ${names.map(name => `<option value="${safe(name)}" ${name === officialMatchPlayerFilter ? "selected" : ""}>${safe(name)}</option>`).join("")}
              </select>
            </div>
            <div class="epbf-filter-field">
              <label for="epbf-match-country-filter">Nationaliteit</label>
              <select id="epbf-match-country-filter">
                <option value="">Alle landen</option>
                ${countries.map(country => `<option value="${safe(country)}" ${country === officialMatchCountryFilter ? "selected" : ""}>${officialFlag(country)} ${safe(country)}</option>`).join("")}
              </select>
            </div>
          </div>
          <small>${list.length} van ${allMatches.length} wedstrijden</small>
        </div>` + (list.length
          ? roundNames.map(round => {
              const roundMatches = list.filter(m => (m.round || "Overige wedstrijden") === round);
              return `<div class="epbf-round-heading">
                <strong>${safe(round)}</strong>
                <small>${roundMatches.length} ${roundMatches.length === 1 ? "wedstrijd" : "wedstrijden"}</small>
              </div>${roundMatches.map((match, index) => epbfMatchRow(match, index)).join("")}`;
            }).join("")
          : `<div class="empty">${officialMatchPlayerFilter || officialMatchCountryFilter ? "Geen wedstrijden gevonden voor deze filters." : "Geen wedstrijdgegevens ontvangen van de EPBF."}</div>`);
      } else if (tournamentTab === "ranking" || tournamentTab === "standings") {
        const list = Array.isArray(data.ranking) ? data.ranking : [];
        body = list.length
          ? `<div class="person-list">${list.map(epbfRankingRow).join("")}</div>`
          : `<div class="empty">De EPBF heeft nog geen eindstand gepubliceerd.</div>`;
      } else if (tournamentTab === "schedule") {
        const list = Array.isArray(data.matches) ? data.matches.filter(m => m.scheduled || m.table) : [];
        body = list.length
          ? list.map((m, i) => `<div class="info-card">
              ${infoRow("Wedstrijd", `${m.matchNumber || i + 1}${m.round ? ` · ${m.round}` : ""}`)}
              ${infoRow("Tijd", m.scheduled || "–")}
              ${infoRow(t("table"), m.table || "–")}
              ${infoRow("Spelers", `${epbfPlayerName(m.players?.[0])} – ${epbfPlayerName(m.players?.[1])}`)}
              ${infoRow("Score", `${epbfScore(m.scoreA)} – ${epbfScore(m.scoreB)}`)}
            </div>`).join("")
          : `<div class="empty">Het speelschema is nog niet beschikbaar als gestructureerde gegevens.</div>
             ${data.scheduleUrl ? `<p><a href="${safe(data.scheduleUrl)}" target="_blank" rel="noopener noreferrer">Open Order of Play op EPBF ↗</a></p>` : ""}`;
      }

      return `${detailBack(t("tournaments"))}
        <div class="event-hero ${epbfTournamentImage(e) ? "event-hero-logo" : ""}"${epbfTournamentImage(e) ? ` style="--epbf-hero-logo: url('${epbfTournamentImage(e)}')"` : ""}><div><h1>${safe(e.name)}</h1>
          <small>${safe(e.categoryName || e.category || e.classification || "")}<br>
          ${safe(isArchive ? (e.date || "Datum onbekend") : [e.city, e.country].filter(Boolean).join(", "))}<br>
          ${safe(isArchive ? "" : dateRange(e))}</small>
        </div></div>
        ${pills(tabs, tournamentTab, "tournament-tab")}
        ${body}
        ${data ? "" : `<p><a href="${safe(e.url || e.website || base.url)}" target="_blank" rel="noopener noreferrer">Open officiële EPBF-pagina ↗</a></p>`}`;
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
    function renderPersonal() {
      return `${detailBack(t("home"))}${title(t("myProfile"), t("playerModeHint"))}<div class="profile-hero">
          <div class="portrait large">♟</div>
          <div>
          <h1>${t("playerMode")}</h1>
          <p>${t("signInInfo")}</p>
          </div>
          </div>
          <div class="info-card">${infoRow(t("myMatches"), t("noUpcoming"))}${infoRow(t("status"), t("notAvailable"))}</div>
          <button class="cta" id="demo-sign-in">${t("signIn")}</button>${demo()}`;
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
      if (target.matches("[data-language-toggle]")) return languageMenu();
      if (target.dataset.setLanguage) {
        setAppLanguage(target.dataset.setLanguage);
        $("#language-overlay").classList.add("hidden");
        if (mode) render();
        return;
      }
      if (target.dataset.mode) return showMode(target.dataset.mode);
      if (target.id === "back" || target.dataset.back) return back();
      if (target.id === "brand") return go("home");
      if (target.dataset.page) return go(target.dataset.page);
      if (target.dataset.officialMatch)
        return openDetail("official-match", Number(target.dataset.officialMatch));
      if (target.dataset.refreshLive) return refreshOfficialLive();
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
      if (target.dataset.player)
        return openDetail("player", Number(target.dataset.player));
      if (target.dataset.personal) return openDetail("personal", 0);
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
    document.addEventListener("input", (e) => {
      if (e.target.id !== "player-search") return;
      searchText = e.target.value;
      const list = players.filter((p) =>
        `${p.name} ${p.country}`
          .toLocaleLowerCase()
          .includes(searchText.toLocaleLowerCase()),
      );
      $("#player-list").innerHTML =
        list.map((p) => playerRow(p)).join("") ||
        `<div class="empty">${t("noResults")}</div>`;
    });
    setAppLanguage(currentLanguage);
    refreshOfficialCalendar();
    refreshOfficialTournaments();

    if (window.lucide) {
      lucide.createIcons();
    }
