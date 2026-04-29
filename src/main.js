const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { pathToFileURL } = require('url');
const { translations, DEFAULT_LANGUAGE } = require('./i18n.js');

if (process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data'));
}

let mainWindow = null;
let isQuitting = false;

const SITE_TRANSLATIONS = translations.site || {};
const DIALOG_TRANSLATIONS = translations.dialogs || {};

function interpolate(message, values = {}) {
  return String(message).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function normalizeLanguage(language) {
  return language === 'en' ? 'en' : DEFAULT_LANGUAGE;
}

function getLocalizedDictionary(section, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const dictionary = section?.[normalizedLanguage];
  return dictionary || section?.[DEFAULT_LANGUAGE] || {};
}

function translate(section, language, key, values) {
  const dictionary = getLocalizedDictionary(section, language);
  return interpolate(dictionary[key] ?? key, values);
}

function getLanguageSuffix(language) {
  return language === 'en' ? 'En' : 'Ru';
}

function getAlternateLanguage(language) {
  return language === 'ru' ? 'en' : 'ru';
}

function getLocalizedPropertyName(base, language) {
  return `${base}${getLanguageSuffix(language)}`;
}

function getLocalizedValue(entity, base, language) {
  const primaryKey = getLocalizedPropertyName(base, language);
  const alternateKey = getLocalizedPropertyName(base, getAlternateLanguage(language));

  return String(
    entity?.[primaryKey]
    || entity?.[base]
    || entity?.[alternateKey]
    || ''
  ).trim();
}

function getAppDataDir() {
  return app.getPath('userData');
}

function getPortfolioPath() {
  return path.join(getAppDataDir(), 'portfolio.json');
}

function getCoversDir() {
  return path.join(getAppDataDir(), 'covers');
}

function getProgramRootDir() {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }

  return path.resolve(__dirname, '..');
}

function getExportRootDir() {
  return path.join(getProgramRootDir(), 'export');
}

function formatDateForFolder(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('-');
}

function getExportDir() {
  return path.join(getExportRootDir(), `portfolio_${formatDateForFolder()}`);
}

function normalizeDeveloperProfile(profile) {
  const name = String(profile?.name || '');
  const bio = String(profile?.bio || '');

  return {
    name,
    nameRu: String(profile?.nameRu || profile?.i18n?.ru?.name || name),
    nameEn: String(profile?.nameEn || profile?.i18n?.en?.name || name),
    bio,
    bioRu: String(profile?.bioRu || profile?.i18n?.ru?.bio || bio),
    bioEn: String(profile?.bioEn || profile?.i18n?.en?.bio || bio),
    photo: String(profile?.photo || '')
  };
}

function normalizeProject(project) {
  const title = String(project?.title || '');
  const description = String(project?.description || '');
  const additional = String(project?.additional || '');

  return {
    id: project?.id,
    title,
    titleRu: String(project?.titleRu || project?.i18n?.ru?.title || title),
    titleEn: String(project?.titleEn || project?.i18n?.en?.title || title),
    description,
    descriptionRu: String(project?.descriptionRu || project?.i18n?.ru?.description || description),
    descriptionEn: String(project?.descriptionEn || project?.i18n?.en?.description || description),
    link: String(project?.link || ''),
    additional,
    additionalRu: String(project?.additionalRu || project?.i18n?.ru?.additional || additional),
    additionalEn: String(project?.additionalEn || project?.i18n?.en?.additional || additional),
    cover: String(project?.cover || ''),
    createdAt: project?.createdAt,
    updatedAt: project?.updatedAt
  };
}

function normalizeTheme(theme) {
  const name = String(theme?.name || '');

  return {
    id: theme?.id,
    name,
    nameRu: String(theme?.nameRu || theme?.i18n?.ru?.name || name),
    nameEn: String(theme?.nameEn || theme?.i18n?.en?.name || name),
    createdAt: theme?.createdAt,
    projects: Array.isArray(theme?.projects) ? theme.projects.map(normalizeProject) : []
  };
}

function normalizePortfolio(data) {
  const themes = Array.isArray(data?.themes) ? data.themes : [];

  return {
    settings: {
      language: normalizeLanguage(data?.settings?.language),
      bilingualMode: Boolean(data?.settings?.bilingualMode)
    },
    developerProfile: normalizeDeveloperProfile(data?.developerProfile),
    themes: themes.map(normalizeTheme)
  };
}

async function ensureStorage() {
  await fsp.mkdir(getCoversDir(), { recursive: true });

  const portfolioPath = getPortfolioPath();
  try {
    await fsp.access(portfolioPath);
  } catch {
    const emptyData = normalizePortfolio({
      settings: {
        language: DEFAULT_LANGUAGE,
        bilingualMode: false
      },
      developerProfile: {},
      themes: []
    });

    await fsp.writeFile(portfolioPath, JSON.stringify(emptyData, null, 2), 'utf8');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.webContents.send('app:before-close');
  });
}

async function loadRawPortfolio() {
  try {
    const text = await fsp.readFile(getPortfolioPath(), 'utf8');
    return JSON.parse(text);
  } catch {
    return normalizePortfolio({
      settings: {
        language: DEFAULT_LANGUAGE,
        bilingualMode: false
      },
      developerProfile: {},
      themes: []
    });
  }
}

async function saveRawPortfolio(data) {
  const clean = normalizePortfolio(data);
  await ensureStorage();
  await fsp.writeFile(getPortfolioPath(), JSON.stringify(clean, null, 2), 'utf8');
  return clean;
}

async function removeExistingProjectCovers(projectId) {
  const files = await fsp.readdir(getCoversDir()).catch(() => []);
  const prefix = `project_${projectId}.`;

  await Promise.all(
    files
      .filter((file) => file.startsWith(prefix))
      .map((file) => fsp.unlink(path.join(getCoversDir(), file)).catch(() => {}))
  );
}

async function removeExistingDeveloperPhoto() {
  const files = await fsp.readdir(getCoversDir()).catch(() => []);
  const prefix = 'developer_profile.';

  await Promise.all(
    files
      .filter((file) => file.startsWith(prefix))
      .map((file) => fsp.unlink(path.join(getCoversDir(), file)).catch(() => {}))
  );
}

function addCoverUrls(data) {
  const clean = normalizePortfolio(data);

  let developerPhotoUrl = '';
  if (clean.developerProfile.photo) {
    const abs = path.join(getAppDataDir(), clean.developerProfile.photo);
    try {
      developerPhotoUrl = pathToFileURL(abs).href;
    } catch {
      developerPhotoUrl = '';
    }
  }

  return {
    settings: clean.settings,
    developerProfile: {
      ...clean.developerProfile,
      photoUrl: developerPhotoUrl
    },
    themes: clean.themes.map((theme) => ({
      ...theme,
      projects: theme.projects.map((project) => {
        let coverUrl = '';

        if (project.cover) {
          const abs = path.join(getAppDataDir(), project.cover);
          try {
            coverUrl = pathToFileURL(abs).href;
          } catch {
            coverUrl = '';
          }
        }

        return {
          ...project,
          coverUrl
        };
      })
    }))
  };
}

function mapPortfolioForSingleLanguage(data, language) {
  return {
    settings: {
      language,
      bilingualMode: false
    },
    developerProfile: {
      name: getLocalizedValue(data.developerProfile, 'name', language),
      bio: getLocalizedValue(data.developerProfile, 'bio', language),
      photo: data.developerProfile.photo
    },
    themes: data.themes.map((theme) => ({
      id: theme.id,
      name: getLocalizedValue(theme, 'name', language),
      createdAt: theme.createdAt,
      projects: theme.projects.map((project) => ({
        id: project.id,
        title: getLocalizedValue(project, 'title', language),
        description: getLocalizedValue(project, 'description', language),
        link: project.link,
        additional: getLocalizedValue(project, 'additional', language),
        cover: project.cover,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    }))
  };
}

function mapPortfolioForBilingual(data) {
  return {
    settings: {
      language: normalizeLanguage(data.settings.language),
      bilingualMode: true
    },
    developerProfile: {
      nameRu: getLocalizedValue(data.developerProfile, 'name', 'ru'),
      nameEn: getLocalizedValue(data.developerProfile, 'name', 'en'),
      bioRu: getLocalizedValue(data.developerProfile, 'bio', 'ru'),
      bioEn: getLocalizedValue(data.developerProfile, 'bio', 'en'),
      photo: data.developerProfile.photo
    },
    themes: data.themes.map((theme) => ({
      id: theme.id,
      nameRu: getLocalizedValue(theme, 'name', 'ru'),
      nameEn: getLocalizedValue(theme, 'name', 'en'),
      createdAt: theme.createdAt,
      projects: theme.projects.map((project) => ({
        id: project.id,
        titleRu: getLocalizedValue(project, 'title', 'ru'),
        titleEn: getLocalizedValue(project, 'title', 'en'),
        descriptionRu: getLocalizedValue(project, 'description', 'ru'),
        descriptionEn: getLocalizedValue(project, 'description', 'en'),
        additionalRu: getLocalizedValue(project, 'additional', 'ru'),
        additionalEn: getLocalizedValue(project, 'additional', 'en'),
        link: project.link,
        cover: project.cover,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    }))
  };
}

function buildSiteHtml(language, bilingualMode) {
  const siteT = getLocalizedDictionary(SITE_TRANSLATIONS, language);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${siteT.pageTitle}</title>
  <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="./favicon.png" type="image/png" />
  <link rel="icon" href="./favicon.ico" sizes="any" />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand__label" id="brandLabel">${siteT.brandLabel}</div>
        ${bilingualMode ? `
        <div class="language-switch" id="languageSwitch">
          <button class="lang-btn" id="langRuBtn" type="button" data-language="ru">RU</button>
          <button class="lang-btn" id="langEnBtn" type="button" data-language="en">EN</button>
        </div>` : ''}
      </div>

      <div class="developer-card">
        <div class="developer-photo-preview" id="developerPhotoPreview">
          <span>${siteT.developerPhotoFallback}</span>
        </div>

        <div class="developer-name" id="developerName">${siteT.developerNameFallback}</div>
        <div class="developer-bio" id="developerBio">${siteT.developerBioFallback}</div>
      </div>

      <div class="themes-panel">
        <div class="themes-panel__title" id="themesPanelTitle">${siteT.themesTitle}</div>
        <div class="themes" id="themesList"></div>
      </div>
    </aside>

    <main class="main">
      <div class="topbar">
        <div>
          <h2 id="currentThemeTitle">${siteT.chooseTheme}</h2>
          <p id="currentThemeSubtitle">${siteT.chooseThemeSubtitle}</p>
        </div>
      </div>

      <div class="toolbar">
        <div class="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 21l-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input id="searchInput" type="search" placeholder="${siteT.searchPlaceholder}" />
        </div>
        <div class="stats">
          <div class="stat">
            <b id="themeCount">0</b>
            <span id="themeCountLabel">${siteT.themesCountLabel}</span>
          </div>
          <div class="stat">
            <b id="projectCount">0</b>
            <span id="projectCountLabel">${siteT.projectsCountLabel}</span>
          </div>
        </div>
      </div>

      <section id="projectsContainer" class="projects"></section>
    </main>
  </div>

  <script>
    window.__PORTFOLIO_DATA__ = __PORTFOLIO_DATA_JSON__;
    window.__PORTFOLIO_TRANSLATIONS__ = __PORTFOLIO_TRANSLATIONS_JSON__;
  </script>
  <script src="./script.js"></script>
</body>
</html>`;
}

function buildSiteCss() {
  return `:root{
  --bg:#0f1220;
  --bg-2:#0b1020;
  --panel:#151a2c;
  --panel-2:#1a2036;
  --line:#2a3150;
  --text:#eef1fb;
  --muted:#aab2cf;
  --accent:#7c8cff;
  --accent-2:#5ad7c5;
  --shadow:0 18px 50px rgba(0,0,0,.28);
  --radius:24px;
  --radius-sm:16px;
  --maxw:1400px;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family:Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color:var(--text);
  background:
    radial-gradient(circle at top left, rgba(124,140,255,.16), transparent 28%),
    radial-gradient(circle at top right, rgba(90,215,197,.12), transparent 24%),
    linear-gradient(180deg, var(--bg-2), var(--bg) 35%, var(--bg-2));
}
img{max-width:100%;display:block}
a{color:inherit}
.app{
  min-height:100vh;
  display:grid;
  grid-template-columns:300px 1fr;
  gap:18px;
  padding:18px;
}
.sidebar,
.main{
  background:rgba(21,26,44,.9);
  border:1px solid rgba(255,255,255,.06);
  box-shadow:var(--shadow);
  backdrop-filter:blur(10px);
}
.sidebar{
  border-radius:var(--radius);
  padding:18px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.brand{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding-bottom:14px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.brand__label{
  font-size:.82rem;
  font-weight:700;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:#d8ddf4;
}
.language-switch{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:4px;
  border-radius:16px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.06);
}
.lang-btn{
  min-width:46px;
  border:none;
  border-radius:12px;
  padding:8px 12px;
  background:transparent;
  color:var(--muted);
  cursor:pointer;
  transition:background .18s ease, color .18s ease, transform .18s ease;
}
.lang-btn:hover{
  color:var(--text);
  background:rgba(255,255,255,.04);
}
.lang-btn.is-active{
  background:linear-gradient(135deg, rgba(124,140,255,.22), rgba(90,215,197,.16));
  color:var(--text);
  box-shadow:inset 0 0 0 1px rgba(124,140,255,.18);
}
.developer-card{
  display:grid;
  gap:12px;
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.06);
}
.developer-photo-preview{
  aspect-ratio:1/1;
  border-radius:18px;
  overflow:hidden;
  background:
    radial-gradient(circle at 30% 20%, rgba(255,255,255,.12), transparent 40%),
    linear-gradient(135deg, rgba(124,140,255,.24), rgba(90,215,197,.18));
  border:1px solid rgba(255,255,255,.08);
  display:flex;
  align-items:center;
  justify-content:center;
  color:rgba(255,255,255,.38);
  font-weight:700;
  font-size:1rem;
}
.developer-photo-preview img{
  width:100%;
  height:100%;
  object-fit:cover;
}
.developer-name{
  font-size:1.05rem;
  font-weight:700;
  line-height:1.25;
}
.developer-bio{
  color:var(--muted);
  line-height:1.55;
  white-space:pre-wrap;
  word-break:break-word;
  font-size:.95rem;
}
.themes-panel{
  display:flex;
  flex-direction:column;
  gap:10px;
  flex:1;
  min-height:0;
}
.themes-panel__title{
  font-size:.9rem;
  font-weight:700;
  color:#d8ddf4;
  text-transform:uppercase;
  letter-spacing:.06em;
}
.themes{
  display:flex;
  flex-direction:column;
  gap:8px;
  overflow:auto;
  padding-right:2px;
  flex:1;
}
.theme-item{
  padding:12px;
  border-radius:16px;
  background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.06);
  cursor:pointer;
  transition:transform .18s ease, background .18s ease, border-color .18s ease;
}
.theme-item:hover{transform:translateY(-1px)}
.theme-item.active{
  background:rgba(124,140,255,.16);
  border-color:rgba(124,140,255,.34);
}
.theme-item strong{
  display:block;
  font-size:.98rem;
  line-height:1.3;
  margin-bottom:2px;
}
.theme-item span{
  color:var(--muted);
  font-size:.86rem;
}
.main{
  border-radius:var(--radius);
  padding:18px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.topbar{
  display:flex;
  justify-content:space-between;
  gap:16px;
  flex-wrap:wrap;
  padding-bottom:4px;
}
.topbar h2{
  margin:0 0 6px;
  font-size:1.6rem;
  line-height:1.2;
}
.topbar p{
  margin:0;
  color:var(--muted);
}
.toolbar{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  align-items:center;
  justify-content:space-between;
  padding:14px;
  background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.06);
  border-radius:var(--radius-sm);
}
.search{
  flex:1;
  min-width:min(460px, 100%);
  position:relative;
}
.search input{
  width:100%;
  border:none;
  outline:none;
  color:var(--text);
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.06);
  padding:12px 14px 12px 42px;
  border-radius:16px;
}
.search svg{
  position:absolute;
  left:14px;
  top:50%;
  transform:translateY(-50%);
  opacity:.65;
}
.stats{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.stat{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.06);
  border-radius:16px;
  padding:10px 12px;
  min-width:112px;
}
.stat b{
  display:block;
  font-size:1rem;
  margin-bottom:2px;
}
.stat span{
  font-size:.84rem;
  color:var(--muted);
}
.projects{
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(270px, 1fr));
  gap:14px;
  align-content:start;
}
.card{
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.07);
  border-radius:20px;
  overflow:hidden;
  display:flex;
  flex-direction:column;
}
.cover{
  aspect-ratio:16/9;
  background:linear-gradient(135deg, rgba(124,140,255,.25), rgba(90,215,197,.18));
  border-bottom:1px solid rgba(255,255,255,.05);
  position:relative;
}
.cover img{
  width:100%;
  height:100%;
  object-fit:cover;
}
.cover .fallback{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:2.8rem;
  font-weight:800;
  color:rgba(255,255,255,.24);
  letter-spacing:.08em;
}
.card-body{
  padding:14px;
  display:flex;
  flex-direction:column;
  gap:10px;
  flex:1;
}
.card-title h3{
  margin:0;
  font-size:1.05rem;
  line-height:1.25;
}
.desc{
  color:var(--muted);
  line-height:1.55;
  white-space:pre-wrap;
  word-break:break-word;
}
.pill{
  display:inline-flex;
  width:fit-content;
  padding:6px 10px;
  border-radius:999px;
  font-size:.8rem;
  color:var(--muted);
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.06);
}
.card-links{
  margin-top:auto;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.link-btn{
  text-decoration:none;
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:10px 12px;
  border-radius:14px;
  background:rgba(124,140,255,.12);
  border:1px solid rgba(124,140,255,.22);
}
.empty{
  border:1px dashed rgba(255,255,255,.16);
  border-radius:24px;
  padding:34px 18px;
  text-align:center;
  background:rgba(255,255,255,.03);
  color:var(--muted);
  display:grid;
  gap:10px;
  place-items:center;
}
.empty h3{margin:0;color:var(--text)}
.empty p{margin:0;max-width:52ch;line-height:1.6}
@media (max-width: 980px){
  .app{grid-template-columns:1fr}
  .sidebar{min-height:auto}
  .search{min-width:100%}
  .brand{
    align-items:flex-start;
    flex-direction:column;
  }
}`;
}

function buildSiteScript() {
  return `const data = window.__PORTFOLIO_DATA__ || { settings: { language: 'ru', bilingualMode: false }, developerProfile: {}, themes: [] };
const translations = window.__PORTFOLIO_TRANSLATIONS__ || {};
const bilingualMode = Boolean(data.settings && data.settings.bilingualMode);
let activeLanguage = data.settings && data.settings.language === 'en' ? 'en' : 'ru';
let activeThemeId = Array.isArray(data.themes) && data.themes.length ? data.themes[0].id : null;
let searchQuery = '';

const els = {
  brandLabel: document.getElementById('brandLabel'),
  themesPanelTitle: document.getElementById('themesPanelTitle'),
  developerPhotoPreview: document.getElementById('developerPhotoPreview'),
  developerName: document.getElementById('developerName'),
  developerBio: document.getElementById('developerBio'),
  themesList: document.getElementById('themesList'),
  currentThemeTitle: document.getElementById('currentThemeTitle'),
  currentThemeSubtitle: document.getElementById('currentThemeSubtitle'),
  projectsContainer: document.getElementById('projectsContainer'),
  searchInput: document.getElementById('searchInput'),
  themeCount: document.getElementById('themeCount'),
  projectCount: document.getElementById('projectCount'),
  themeCountLabel: document.getElementById('themeCountLabel'),
  projectCountLabel: document.getElementById('projectCountLabel'),
  langRuBtn: document.getElementById('langRuBtn'),
  langEnBtn: document.getElementById('langEnBtn')
};

function interpolate(message, values) {
  return String(message).replace(/\\{(\\w+)\\}/g, function (_, key) {
    return String(values && values[key] != null ? values[key] : '');
  });
}

function getDictionary(language) {
  return translations[language] || translations.ru || {};
}

function t(key, values) {
  const dictionary = getDictionary(activeLanguage);
  return interpolate(dictionary[key] || key, values);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function getAlternateLanguage(language) {
  return language === 'ru' ? 'en' : 'ru';
}

function getLocalizedPropertyName(base, language) {
  return base + (language === 'en' ? 'En' : 'Ru');
}

function getLocalizedValue(entity, base, language) {
  if (!bilingualMode) {
    return normalizeText(entity && entity[base]);
  }

  const primaryKey = getLocalizedPropertyName(base, language);
  const alternateKey = getLocalizedPropertyName(base, getAlternateLanguage(language));

  return normalizeText(entity && entity[primaryKey])
    || normalizeText(entity && entity[base])
    || normalizeText(entity && entity[alternateKey]);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getActiveTheme() {
  return (data.themes || []).find(function (theme) {
    return theme.id === activeThemeId;
  }) || null;
}

function getFilteredProjects(projects) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return projects;

  return projects.filter(function (project) {
    const blob = [
      project.title,
      project.titleRu,
      project.titleEn,
      project.description,
      project.descriptionRu,
      project.descriptionEn,
      project.additional,
      project.additionalRu,
      project.additionalEn,
      project.link
    ].join(' ').toLowerCase();

    return blob.includes(query);
  });
}

function updateLanguageButtons() {
  if (!els.langRuBtn || !els.langEnBtn) return;

  els.langRuBtn.classList.toggle('is-active', activeLanguage === 'ru');
  els.langEnBtn.classList.toggle('is-active', activeLanguage === 'en');
}

function updateStaticTexts() {
  document.documentElement.lang = activeLanguage;
  document.title = t('pageTitle');

  if (els.brandLabel) els.brandLabel.textContent = t('brandLabel');
  if (els.themesPanelTitle) els.themesPanelTitle.textContent = t('themesTitle');
  if (els.currentThemeTitle && !getActiveTheme()) els.currentThemeTitle.textContent = t('chooseTheme');
  if (els.currentThemeSubtitle && !getActiveTheme()) els.currentThemeSubtitle.textContent = t('chooseThemeSubtitle');
  if (els.searchInput) els.searchInput.placeholder = t('searchPlaceholder');
  if (els.themeCountLabel) els.themeCountLabel.textContent = t('themesCountLabel');
  if (els.projectCountLabel) els.projectCountLabel.textContent = t('projectsCountLabel');

  updateLanguageButtons();
}

function renderDeveloperProfile() {
  const profile = data.developerProfile || {};
  const name = getLocalizedValue(profile, 'name', activeLanguage) || t('developerNameFallback');
  const bio = getLocalizedValue(profile, 'bio', activeLanguage) || t('developerBioFallback');
  const photo = normalizeText(profile.photo);

  els.developerName.textContent = name;
  els.developerBio.textContent = bio;

  if (photo) {
    els.developerPhotoPreview.innerHTML = '<img src="./' + escapeHtml(photo) + '" alt="' + escapeHtml(t('developerPhotoFallback')) + '">';
  } else {
    const letter = name.trim().charAt(0).toUpperCase() || t('developerPhotoFallback');
    els.developerPhotoPreview.innerHTML = '<span>' + escapeHtml(letter) + '</span>';
  }
}

function renderThemes() {
  const themes = Array.isArray(data.themes) ? data.themes : [];
  els.themeCount.textContent = String(themes.length);
  els.themesList.innerHTML = '';

  if (themes.length === 0) {
    els.themesList.innerHTML = '<div class="empty"><h3>' + escapeHtml(t('emptyThemesTitle')) + '</h3><p>' + escapeHtml(t('emptyThemesDescription')) + '</p></div>';
    els.currentThemeTitle.textContent = t('chooseTheme');
    els.currentThemeSubtitle.textContent = t('chooseThemeSubtitle');
    els.projectsContainer.innerHTML = '<div class="empty"><h3>' + escapeHtml(t('emptyNoSelectionTitle')) + '</h3><p>' + escapeHtml(t('emptyNoSelectionDescription')) + '</p></div>';
    els.projectCount.textContent = '0';
    return;
  }

  themes.forEach(function (theme) {
    const item = document.createElement('div');
    const themeName = getLocalizedValue(theme, 'name', activeLanguage) || t('themesTitle');

    item.className = 'theme-item' + (theme.id === activeThemeId ? ' active' : '');
    item.innerHTML = '<strong>' + escapeHtml(themeName) + '</strong><span>' + (Array.isArray(theme.projects) ? theme.projects.length : 0) + ' ' + escapeHtml(t('projectsShortLabel')) + '</span>';
    item.addEventListener('click', function () {
      activeThemeId = theme.id;
      render();
    });
    els.themesList.appendChild(item);
  });
}

function renderProjects() {
  const theme = getActiveTheme();
  if (!theme) {
    els.currentThemeTitle.textContent = t('chooseTheme');
    els.currentThemeSubtitle.textContent = t('chooseThemeSubtitle');
    els.projectsContainer.innerHTML = '<div class="empty"><h3>' + escapeHtml(t('emptyNoSelectionTitle')) + '</h3><p>' + escapeHtml(t('emptyNoSelectionDescription')) + '</p></div>';
    els.projectCount.textContent = '0';
    return;
  }

  const projects = getFilteredProjects(Array.isArray(theme.projects) ? theme.projects : [])
    .slice()
    .sort(function (a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  els.currentThemeTitle.textContent = getLocalizedValue(theme, 'name', activeLanguage) || t('themesTitle');
  els.currentThemeSubtitle.textContent = t('chooseThemeSubtitle');
  els.projectCount.textContent = String(projects.length);

  if (projects.length === 0) {
    els.projectsContainer.innerHTML = '<div class="empty"><h3>' + escapeHtml(t('emptySearchTitle')) + '</h3><p>' + escapeHtml(t('emptySearchDescription')) + '</p></div>';
    return;
  }

  els.projectsContainer.innerHTML = '';
  projects.forEach(function (project) {
    const card = document.createElement('article');
    card.className = 'card';

    const title = getLocalizedValue(project, 'title', activeLanguage) || t('openProject');
    const description = getLocalizedValue(project, 'description', activeLanguage);
    const additional = getLocalizedValue(project, 'additional', activeLanguage);
    const cover = normalizeText(project.cover);
    const coverHtml = cover
      ? '<img src="./' + escapeHtml(cover) + '" alt="' + escapeHtml(title) + '">'
      : '<div class="fallback">' + escapeHtml((title || 'P').slice(0, 1).toUpperCase()) + '</div>';

    card.innerHTML =
      '<div class="cover">' + coverHtml + '</div>' +
      '<div class="card-body">' +
        '<div class="card-title">' +
          '<h3>' + escapeHtml(title) + '</h3>' +
        '</div>' +
        (description ? '<div class="desc">' + escapeHtml(description) + '</div>' : '') +
        (additional ? '<div class="pill">' + escapeHtml(t('additionalLabel') + ': ' + additional) + '</div>' : '') +
        '<div class="card-links">' +
          (project.link ? '<a class="link-btn" href="' + escapeHtml(project.link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t('openProject')) + '</a>' : '') +
        '</div>' +
      '</div>';

    els.projectsContainer.appendChild(card);
  });
}

function render() {
  updateStaticTexts();
  renderDeveloperProfile();
  renderThemes();
  renderProjects();
}

if (els.searchInput) {
  els.searchInput.addEventListener('input', function (event) {
    searchQuery = event.target.value;
    renderProjects();
  });
}

if (els.langRuBtn) {
  els.langRuBtn.addEventListener('click', function () {
    activeLanguage = 'ru';
    render();
  });
}

if (els.langEnBtn) {
  els.langEnBtn.addEventListener('click', function () {
    activeLanguage = 'en';
    render();
  });
}

render();`;
}

async function copyPortfolioAssets(data, exportDir) {
  const usedCovers = new Set();

  for (const theme of data.themes) {
    for (const project of theme.projects) {
      if (!project.cover || usedCovers.has(project.cover)) continue;

      usedCovers.add(project.cover);

      const sourceAbs = path.join(getAppDataDir(), project.cover);
      const targetAbs = path.join(exportDir, project.cover);

      await fsp.mkdir(path.dirname(targetAbs), { recursive: true }).catch(() => {});
      await fsp.copyFile(sourceAbs, targetAbs).catch(() => {});
    }
  }

  if (data.developerProfile.photo) {
    const sourceAbs = path.join(getAppDataDir(), data.developerProfile.photo);
    const targetAbs = path.join(exportDir, data.developerProfile.photo);

    await fsp.mkdir(path.dirname(targetAbs), { recursive: true }).catch(() => {});
    await fsp.copyFile(sourceAbs, targetAbs).catch(() => {});
  }
}

ipcMain.handle('confirm-delete', async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const language = normalizeLanguage(payload?.language);
  const type = payload?.type || 'item';
  const name = payload?.name || 'item';

  const result = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: [
      translate(DIALOG_TRANSLATIONS, language, 'cancel'),
      translate(DIALOG_TRANSLATIONS, language, 'delete')
    ],
    defaultId: 1,
    cancelId: 0,
    title: translate(DIALOG_TRANSLATIONS, language, 'confirmDeleteTitle'),
    message: translate(DIALOG_TRANSLATIONS, language, 'confirmDeleteMessage', {
      type,
      name
    }),
    detail: translate(DIALOG_TRANSLATIONS, language, 'confirmDeleteDetail')
  });

  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
  }

  return result.response === 1;
});

ipcMain.handle('portfolio:load', async () => {
  const raw = await loadRawPortfolio();
  return addCoverUrls(raw);
});

ipcMain.handle('portfolio:save', async (event, data) => {
  await saveRawPortfolio(data);
  return { ok: true };
});

ipcMain.handle('app:openExternal', async (event, url) => {
  if (!url) return { ok: false };

  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('portfolio:copyCover', async (event, { sourcePath, projectId }) => {
  if (!sourcePath || !projectId) {
    return { ok: false };
  }

  const ext = path.extname(sourcePath).toLowerCase() || '.png';
  await ensureStorage();
  await removeExistingProjectCovers(projectId);

  const fileName = `project_${projectId}${ext}`;
  const targetAbs = path.join(getCoversDir(), fileName);

  await fsp.copyFile(sourcePath, targetAbs);

  return {
    ok: true,
    cover: `covers/${fileName}`
  };
});

ipcMain.handle('portfolio:copyDeveloperPhoto', async (event, sourcePath) => {
  if (!sourcePath) {
    return { ok: false };
  }

  const ext = path.extname(sourcePath).toLowerCase() || '.png';
  await ensureStorage();
  await removeExistingDeveloperPhoto();

  const fileName = `developer_profile${ext}`;
  const targetAbs = path.join(getCoversDir(), fileName);

  await fsp.copyFile(sourcePath, targetAbs);

  return {
    ok: true,
    photo: `covers/${fileName}`
  };
});

ipcMain.handle('portfolio:openExportFolder', async () => {
  const exportRootDir = getExportRootDir();

  await fsp.mkdir(exportRootDir, { recursive: true });

  const entries = await fsp.readdir(exportRootDir, { withFileTypes: true }).catch(() => []);
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const latestFolder = folders.length > 0 ? folders[folders.length - 1] : null;
  const targetPath = latestFolder
    ? path.join(exportRootDir, latestFolder)
    : exportRootDir;

  await shell.openPath(targetPath);

  return {
    ok: true,
    path: targetPath
  };
});

ipcMain.handle('dialog:pickImage', async (event, language) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{
      name: translate(DIALOG_TRANSLATIONS, normalizeLanguage(language), 'imageFilterName'),
      extensions: ['png', 'jpg', 'jpeg', 'webp']
    }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('app:quitAfterSave', async () => {
  isQuitting = true;
  app.quit();
  return { ok: true };
});

ipcMain.handle('portfolio:export', async () => {
  try {
    const raw = await loadRawPortfolio();
    const data = normalizePortfolio(raw);
    const exportLanguage = normalizeLanguage(data.settings.language);
    const bilingualMode = Boolean(data.settings.bilingualMode);
    const exportRootDir = getExportRootDir();
    const exportDir = getExportDir();

    await fsp.mkdir(exportRootDir, { recursive: true });
    await fsp.rm(exportDir, { recursive: true, force: true }).catch(() => {});
    await fsp.mkdir(path.join(exportDir, 'covers'), { recursive: true });

    const exportData = bilingualMode
      ? mapPortfolioForBilingual(data)
      : mapPortfolioForSingleLanguage(data, exportLanguage);

    await copyPortfolioAssets(data, exportDir);

    const inlineData = JSON.stringify(exportData).replace(/</g, '\\u003c');
    const exportTranslations = bilingualMode
      ? SITE_TRANSLATIONS
      : { [exportLanguage]: SITE_TRANSLATIONS[exportLanguage] || SITE_TRANSLATIONS[DEFAULT_LANGUAGE] };
    const inlineTranslations = JSON.stringify(exportTranslations).replace(/</g, '\\u003c');

    const siteHtml = buildSiteHtml(exportLanguage, bilingualMode)
      .replace('__PORTFOLIO_DATA_JSON__', inlineData)
      .replace('__PORTFOLIO_TRANSLATIONS_JSON__', inlineTranslations);
    const siteCss = buildSiteCss();
    const siteScript = buildSiteScript();

    const faviconSvgSource = path.join(__dirname, 'favicon.svg');
    const faviconPngSource = path.join(__dirname, 'favicon.png');
    const faviconIcoSource = path.join(__dirname, 'favicon.ico');

    await fsp.copyFile(faviconSvgSource, path.join(exportDir, 'favicon.svg')).catch(() => {});
    await fsp.copyFile(faviconPngSource, path.join(exportDir, 'favicon.png')).catch(() => {});
    await fsp.copyFile(faviconIcoSource, path.join(exportDir, 'favicon.ico')).catch(() => {});

    await fsp.writeFile(path.join(exportDir, 'index.html'), siteHtml, 'utf8');
    await fsp.writeFile(path.join(exportDir, 'styles.css'), siteCss, 'utf8');
    await fsp.writeFile(path.join(exportDir, 'script.js'), siteScript, 'utf8');
    await fsp.writeFile(path.join(exportDir, 'data.json'), JSON.stringify(exportData, null, 2), 'utf8');

    return {
      ok: true,
      path: exportDir,
      message: translate(DIALOG_TRANSLATIONS, exportLanguage, 'exportSuccessMessage', {
        path: exportDir
      })
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      message: translate(DIALOG_TRANSLATIONS, DEFAULT_LANGUAGE, 'exportErrorMessage')
    };
  }
});

app.whenReady().then(async () => {
  await ensureStorage();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
