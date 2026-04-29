const i18n = window.PORTFOLIO_I18N || {};
const APP_TRANSLATIONS = i18n.translations?.app || {};
const DEFAULT_LANGUAGE = i18n.DEFAULT_LANGUAGE || 'ru';

const state = {
  settings: {
    language: DEFAULT_LANGUAGE,
    bilingualMode: false
  },
  themes: [],
  activeThemeId: null,
  projectSearch: '',
  editingProjectId: null,
  themeModalMode: 'create',
  developerProfile: {
    name: '',
    nameRu: '',
    nameEn: '',
    bio: '',
    bioRu: '',
    bioEn: '',
    photo: '',
    photoUrl: ''
  },
  selectedDeveloperPhotoSourcePath: '',
  selectedDeveloperPhotoPreviewUrl: '',
  themeDraft: createEmptyThemeDraft(),
  projectDraft: createEmptyProjectDraft(),
  selectedCoverSourcePath: '',
  selectedCoverPreviewUrl: ''
};

const els = {
  appTitle: document.getElementById('appTitle'),
  themesList: document.getElementById('themesList'),
  currentThemeTitle: document.getElementById('currentThemeTitle'),
  currentThemeSubtitle: document.getElementById('currentThemeSubtitle'),
  projectsContainer: document.getElementById('projectsContainer'),
  addThemeBtn: document.getElementById('addThemeBtn'),
  addProjectBtn: document.getElementById('addProjectBtn'),
  renameThemeBtn: document.getElementById('renameThemeBtn'),
  deleteThemeBtn: document.getElementById('deleteThemeBtn'),
  exportBtn: document.getElementById('exportBtn'),
  openExportFolderBtn: document.getElementById('openExportFolderBtn'),
  bilingualModeToggle: document.getElementById('bilingualModeToggle'),
  bilingualModeLabel: document.getElementById('bilingualModeLabel'),
  bilingualModeHint: document.getElementById('bilingualModeHint'),
  searchInput: document.getElementById('searchInput'),
  themeCount: document.getElementById('themeCount'),
  projectCount: document.getElementById('projectCount'),
  themeCountLabel: document.getElementById('themeCountLabel'),
  projectCountLabel: document.getElementById('projectCountLabel'),
  footerHint: document.getElementById('footerHint'),
  uiLanguageRuBtn: document.getElementById('uiLanguageRuBtn'),
  uiLanguageEnBtn: document.getElementById('uiLanguageEnBtn'),
  themeModal: document.getElementById('themeModal'),
  themeModalTitle: document.getElementById('themeModalTitle'),
  themeModalDescription: document.getElementById('themeModalDescription'),
  themeNameInput: document.getElementById('themeNameInput'),
  themeAltNameInput: document.getElementById('themeAltNameInput'),
  themeNameLabel: document.getElementById('themeNameLabel'),
  themeAltNameLabel: document.getElementById('themeAltNameLabel'),
  themeCurrentLanguageLabel: document.getElementById('themeCurrentLanguageLabel'),
  themeAltLanguageLabel: document.getElementById('themeAltLanguageLabel'),
  themeAltFields: document.getElementById('themeAltFields'),
  saveThemeBtn: document.getElementById('saveThemeBtn'),
  projectModal: document.getElementById('projectModal'),
  projectModalTitle: document.getElementById('projectModalTitle'),
  projectModalDescription: document.getElementById('projectModalDescription'),
  projectTitle: document.getElementById('projectTitle'),
  projectAltTitle: document.getElementById('projectAltTitle'),
  projectDescription: document.getElementById('projectDescription'),
  projectAltDescription: document.getElementById('projectAltDescription'),
  projectAdditional: document.getElementById('projectAdditional'),
  projectAltAdditional: document.getElementById('projectAltAdditional'),
  projectLink: document.getElementById('projectLink'),
  projectTitleLabel: document.getElementById('projectTitleLabel'),
  projectAltTitleLabel: document.getElementById('projectAltTitleLabel'),
  projectDescriptionLabel: document.getElementById('projectDescriptionLabel'),
  projectAltDescriptionLabel: document.getElementById('projectAltDescriptionLabel'),
  projectAdditionalLabel: document.getElementById('projectAdditionalLabel'),
  projectAltAdditionalLabel: document.getElementById('projectAltAdditionalLabel'),
  projectLinkLabel: document.getElementById('projectLinkLabel'),
  projectCurrentLanguageLabel: document.getElementById('projectCurrentLanguageLabel'),
  projectAltLanguageLabel: document.getElementById('projectAltLanguageLabel'),
  projectAltFields: document.getElementById('projectAltFields'),
  projectCoverLabel: document.getElementById('projectCoverLabel'),
  pickCoverBtn: document.getElementById('pickCoverBtn'),
  coverFileName: document.getElementById('coverFileName'),
  coverPreview: document.getElementById('coverPreview'),
  coverHint: document.getElementById('coverHint'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  clearProjectFormBtn: document.getElementById('clearProjectFormBtn'),
  toast: document.getElementById('toast'),
  developerNameInput: document.getElementById('developerNameInput'),
  developerAltNameInput: document.getElementById('developerAltNameInput'),
  developerBioInput: document.getElementById('developerBioInput'),
  developerAltBioInput: document.getElementById('developerAltBioInput'),
  developerNameLabel: document.getElementById('developerNameLabel'),
  developerAltNameLabel: document.getElementById('developerAltNameLabel'),
  developerBioLabel: document.getElementById('developerBioLabel'),
  developerAltBioLabel: document.getElementById('developerAltBioLabel'),
  developerCurrentLanguageLabel: document.getElementById('developerCurrentLanguageLabel'),
  developerAltLanguageLabel: document.getElementById('developerAltLanguageLabel'),
  developerAltFields: document.getElementById('developerAltFields'),
  developerPhotoPreview: document.getElementById('developerPhotoPreview'),
  developerPhotoFileName: document.getElementById('developerPhotoFileName'),
  pickDeveloperPhotoBtn: document.getElementById('pickDeveloperPhotoBtn'),
  saveDeveloperProfileBtn: document.getElementById('saveDeveloperProfileBtn')
};

function createEmptyThemeDraft() {
  return {
    nameRu: '',
    nameEn: ''
  };
}

function createEmptyProjectDraft() {
  return {
    id: null,
    titleRu: '',
    titleEn: '',
    descriptionRu: '',
    descriptionEn: '',
    additionalRu: '',
    additionalEn: '',
    link: '',
    cover: '',
    coverUrl: '',
    createdAt: '',
    updatedAt: ''
  };
}

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function interpolate(message, values = {}) {
  return String(message).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function t(key, values) {
  const dictionary = APP_TRANSLATIONS[state.settings.language] || APP_TRANSLATIONS[DEFAULT_LANGUAGE] || {};
  return interpolate(dictionary[key] ?? key, values);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => els.toast.classList.remove('show'), 2400);
}

function getActiveTheme() {
  return state.themes.find((theme) => theme.id === state.activeThemeId) || null;
}

function normalizeUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function getLanguageSuffix(language) {
  return language === 'en' ? 'En' : 'Ru';
}

function getAlternateLanguage(language = state.settings.language) {
  return language === 'ru' ? 'en' : 'ru';
}

function getLocalizedPropertyName(base, language) {
  return `${base}${getLanguageSuffix(language)}`;
}

function getLocalizedValue(entity, base, language = state.settings.language) {
  const primaryKey = getLocalizedPropertyName(base, language);
  const alternateKey = getLocalizedPropertyName(base, getAlternateLanguage(language));

  return String(
    entity?.[primaryKey]
    || entity?.[base]
    || entity?.[alternateKey]
    || ''
  ).trim();
}

function setLocalizedValue(entity, base, language, value) {
  entity[getLocalizedPropertyName(base, language)] = value;
}

function getPreferredValue(entity, base, preferredLanguage = state.settings.language) {
  return getLocalizedValue(entity, base, preferredLanguage) || getLocalizedValue(entity, base, getAlternateLanguage(preferredLanguage));
}

function getLanguageName(language) {
  return t(language === 'ru' ? 'languageNameRu' : 'languageNameEn');
}

function formatLocalizedLabel(baseLabel, language) {
  if (!state.settings.bilingualMode) return baseLabel;
  return `${baseLabel} (${language.toUpperCase()})`;
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function setPlaceholder(el, value) {
  if (el) el.placeholder = value;
}

function setLocalizedSectionVisibility() {
  const showAlternate = state.settings.bilingualMode;
  [els.developerAltFields, els.themeAltFields, els.projectAltFields].forEach((section) => {
    section.classList.toggle('is-visible', showAlternate);
  });

  els.bilingualModeToggle.checked = showAlternate;
  els.uiLanguageRuBtn.classList.toggle('is-active', state.settings.language === 'ru');
  els.uiLanguageEnBtn.classList.toggle('is-active', state.settings.language === 'en');
}

function buildThemeDraft(theme = null) {
  return {
    nameRu: String(theme?.nameRu || theme?.name || ''),
    nameEn: String(theme?.nameEn || theme?.name || '')
  };
}

function buildProjectDraft(project = null) {
  return {
    id: project?.id || null,
    titleRu: String(project?.titleRu || project?.title || ''),
    titleEn: String(project?.titleEn || project?.title || ''),
    descriptionRu: String(project?.descriptionRu || project?.description || ''),
    descriptionEn: String(project?.descriptionEn || project?.description || ''),
    additionalRu: String(project?.additionalRu || project?.additional || ''),
    additionalEn: String(project?.additionalEn || project?.additional || ''),
    link: String(project?.link || ''),
    cover: String(project?.cover || ''),
    coverUrl: String(project?.coverUrl || ''),
    createdAt: String(project?.createdAt || ''),
    updatedAt: String(project?.updatedAt || '')
  };
}

function closeAllModals() {
  closeThemeModal();
  closeProjectModal();
}

function closeThemeModal() {
  els.themeModal.classList.remove('open');
  state.themeDraft = createEmptyThemeDraft();
}

function closeProjectModal() {
  els.projectModal.classList.remove('open');
  state.editingProjectId = null;
  state.projectDraft = createEmptyProjectDraft();
  state.selectedCoverSourcePath = '';
  state.selectedCoverPreviewUrl = '';
}

function getProjectPreviewCover() {
  if (state.selectedCoverPreviewUrl) return state.selectedCoverPreviewUrl;
  return state.projectDraft.coverUrl || '';
}

function renderDeveloperProfileForm() {
  const currentLanguage = state.settings.language;
  const alternateLanguage = getAlternateLanguage(currentLanguage);
  const currentName = getLocalizedValue(state.developerProfile, 'name', currentLanguage);
  const alternateName = getLocalizedValue(state.developerProfile, 'name', alternateLanguage);

  setText(els.developerCurrentLanguageLabel, t('currentLanguageSection', { language: getLanguageName(currentLanguage) }));
  setText(els.developerAltLanguageLabel, t('alternateLanguageSection', { language: getLanguageName(alternateLanguage) }));

  setText(els.developerNameLabel, formatLocalizedLabel(t('developerNameLabel'), currentLanguage));
  setText(els.developerAltNameLabel, formatLocalizedLabel(t('developerNameLabel'), alternateLanguage));
  setText(els.developerBioLabel, formatLocalizedLabel(t('developerBioLabel'), currentLanguage));
  setText(els.developerAltBioLabel, formatLocalizedLabel(t('developerBioLabel'), alternateLanguage));

  setPlaceholder(els.developerNameInput, t('developerNamePlaceholder'));
  setPlaceholder(els.developerAltNameInput, t('developerNamePlaceholder'));
  setPlaceholder(els.developerBioInput, t('developerBioPlaceholder'));
  setPlaceholder(els.developerAltBioInput, t('developerBioPlaceholder'));

  els.developerNameInput.value = currentName;
  els.developerAltNameInput.value = alternateName;
  els.developerBioInput.value = getLocalizedValue(state.developerProfile, 'bio', currentLanguage);
  els.developerAltBioInput.value = getLocalizedValue(state.developerProfile, 'bio', alternateLanguage);

  const photoSrc = state.selectedDeveloperPhotoPreviewUrl || state.developerProfile.photoUrl || '';
  if (photoSrc) {
    els.developerPhotoPreview.innerHTML = `<img src="${photoSrc}" alt="${escapeHtml(t('choosePhoto'))}">`;
  } else {
    const fallbackLetter = (currentName || t('developerPhotoPlaceholder')).trim().charAt(0).toUpperCase() || '1';
    els.developerPhotoPreview.innerHTML = `<span>${escapeHtml(fallbackLetter)}</span>`;
  }

  if (state.selectedDeveloperPhotoSourcePath) {
    els.developerPhotoFileName.textContent = state.selectedDeveloperPhotoSourcePath.split(/[\\/]/).pop();
  } else if (state.developerProfile.photo) {
    els.developerPhotoFileName.textContent = state.developerProfile.photo.split(/[\\/]/).pop();
  } else {
    els.developerPhotoFileName.textContent = t('developerPhotoMissing');
  }
}

function renderThemeModalForm() {
  const currentLanguage = state.settings.language;
  const alternateLanguage = getAlternateLanguage(currentLanguage);
  const isEdit = state.themeModalMode === 'edit';

  setText(els.themeModalTitle, t(isEdit ? 'themeModalEditTitle' : 'themeModalCreateTitle'));
  setText(els.themeModalDescription, t('themeModalDescription'));
  setText(els.themeCurrentLanguageLabel, t('currentLanguageSection', { language: getLanguageName(currentLanguage) }));
  setText(els.themeAltLanguageLabel, t('alternateLanguageSection', { language: getLanguageName(alternateLanguage) }));
  setText(els.themeNameLabel, formatLocalizedLabel(t('themeNameLabel'), currentLanguage));
  setText(els.themeAltNameLabel, formatLocalizedLabel(t('themeNameLabel'), alternateLanguage));
  setPlaceholder(els.themeNameInput, t('themeNamePlaceholder'));
  setPlaceholder(els.themeAltNameInput, t('themeNamePlaceholder'));
  setText(els.saveThemeBtn, t(isEdit ? 'saveThemeEdit' : 'saveThemeCreate'));

  els.themeNameInput.value = state.themeDraft[getLocalizedPropertyName('name', currentLanguage)] || '';
  els.themeAltNameInput.value = state.themeDraft[getLocalizedPropertyName('name', alternateLanguage)] || '';
}

function renderProjectModalForm() {
  const currentLanguage = state.settings.language;
  const alternateLanguage = getAlternateLanguage(currentLanguage);
  const isEdit = !!state.editingProjectId;

  setText(els.projectModalTitle, t(isEdit ? 'projectModalEditTitle' : 'projectModalCreateTitle'));
  setText(els.projectModalDescription, t('projectModalDescription'));
  setText(els.projectCurrentLanguageLabel, t('currentLanguageSection', { language: getLanguageName(currentLanguage) }));
  setText(els.projectAltLanguageLabel, t('alternateLanguageSection', { language: getLanguageName(alternateLanguage) }));

  setText(els.projectTitleLabel, formatLocalizedLabel(t('projectTitleLabel'), currentLanguage));
  setText(els.projectAltTitleLabel, formatLocalizedLabel(t('projectTitleLabel'), alternateLanguage));
  setText(els.projectDescriptionLabel, formatLocalizedLabel(t('projectDescriptionLabel'), currentLanguage));
  setText(els.projectAltDescriptionLabel, formatLocalizedLabel(t('projectDescriptionLabel'), alternateLanguage));
  setText(els.projectAdditionalLabel, formatLocalizedLabel(t('projectAdditionalLabel'), currentLanguage));
  setText(els.projectAltAdditionalLabel, formatLocalizedLabel(t('projectAdditionalLabel'), alternateLanguage));
  setText(els.projectLinkLabel, t('projectLinkLabel'));
  setText(els.projectCoverLabel, t('projectCoverLabel'));
  setText(els.pickCoverBtn, t('pickImage'));
  setText(els.coverHint, t('coverHint'));
  setText(els.clearProjectFormBtn, t('clear'));
  setText(els.saveProjectBtn, t(isEdit ? 'saveProjectEdit' : 'saveProjectCreate'));

  setPlaceholder(els.projectTitle, t('projectTitlePlaceholder'));
  setPlaceholder(els.projectAltTitle, t('projectTitlePlaceholder'));
  setPlaceholder(els.projectDescription, t('projectDescriptionPlaceholder'));
  setPlaceholder(els.projectAltDescription, t('projectDescriptionPlaceholder'));
  setPlaceholder(els.projectAdditional, t('projectAdditionalPlaceholder'));
  setPlaceholder(els.projectAltAdditional, t('projectAdditionalPlaceholder'));
  setPlaceholder(els.projectLink, t('projectLinkPlaceholder'));

  els.projectTitle.value = state.projectDraft[getLocalizedPropertyName('title', currentLanguage)] || '';
  els.projectAltTitle.value = state.projectDraft[getLocalizedPropertyName('title', alternateLanguage)] || '';
  els.projectDescription.value = state.projectDraft[getLocalizedPropertyName('description', currentLanguage)] || '';
  els.projectAltDescription.value = state.projectDraft[getLocalizedPropertyName('description', alternateLanguage)] || '';
  els.projectAdditional.value = state.projectDraft[getLocalizedPropertyName('additional', currentLanguage)] || '';
  els.projectAltAdditional.value = state.projectDraft[getLocalizedPropertyName('additional', alternateLanguage)] || '';
  els.projectLink.value = state.projectDraft.link || '';

  const previewCover = getProjectPreviewCover();
  if (previewCover) {
    els.coverPreview.innerHTML = `<img src="${previewCover}" alt="${escapeHtml(t('projectCoverLabel'))}">`;
  } else {
    els.coverPreview.innerHTML = `<span>${escapeHtml(t('coverPreviewPlaceholder'))}</span>`;
  }

  if (state.selectedCoverSourcePath) {
    els.coverFileName.textContent = state.selectedCoverSourcePath.split(/[\\/]/).pop();
  } else if (state.projectDraft.cover) {
    els.coverFileName.textContent = state.projectDraft.cover.split(/[\\/]/).pop();
  } else {
    els.coverFileName.textContent = t('noFileSelected');
  }
}

function applyStaticLocalization() {
  document.documentElement.lang = state.settings.language;
  document.title = t('documentTitle');

  setText(els.appTitle, t('appTitle'));
  setText(els.addThemeBtn, t('createTheme'));
  setText(els.exportBtn, t('exportSite'));
  setText(els.openExportFolderBtn, t('openExportFolder'));
  setText(els.addProjectBtn, t('createProject'));
  setText(els.renameThemeBtn, t('renameTheme'));
  setText(els.deleteThemeBtn, t('deleteTheme'));
  setText(els.themeCountLabel, t('themesCountLabel'));
  setText(els.projectCountLabel, t('projectsCountLabel'));
  setText(els.pickDeveloperPhotoBtn, t('choosePhoto'));
  setText(els.saveDeveloperProfileBtn, t('saveProfile'));
  setText(els.bilingualModeLabel, t('bilingualModeLabel'));
  setText(els.bilingualModeHint, t('bilingualModeHint'));
  setPlaceholder(els.searchInput, t('searchPlaceholder'));
  els.footerHint.innerHTML = t('footerHintHtml');

  document.querySelectorAll('[data-close-theme-modal], [data-close-project-modal]').forEach((button) => {
    button.textContent = t('close');
  });
}

function refreshUI() {
  applyStaticLocalization();
  setLocalizedSectionVisibility();
  renderDeveloperProfileForm();
  renderThemeModalForm();
  renderProjectModalForm();
  renderThemes();
  renderProjects();
}

async function loadData() {
  try {
    const data = await window.api.loadPortfolio();

    state.settings = {
      language: data?.settings?.language === 'en' ? 'en' : DEFAULT_LANGUAGE,
      bilingualMode: Boolean(data?.settings?.bilingualMode)
    };

    state.themes = Array.isArray(data?.themes) ? data.themes : [];
    state.developerProfile = {
      name: data?.developerProfile?.name || '',
      nameRu: data?.developerProfile?.nameRu || data?.developerProfile?.name || '',
      nameEn: data?.developerProfile?.nameEn || data?.developerProfile?.name || '',
      bio: data?.developerProfile?.bio || '',
      bioRu: data?.developerProfile?.bioRu || data?.developerProfile?.bio || '',
      bioEn: data?.developerProfile?.bioEn || data?.developerProfile?.bio || '',
      photo: data?.developerProfile?.photo || '',
      photoUrl: data?.developerProfile?.photoUrl || ''
    };

    state.selectedDeveloperPhotoSourcePath = '';
    state.selectedDeveloperPhotoPreviewUrl = '';

    if (!state.activeThemeId || !state.themes.find((theme) => theme.id === state.activeThemeId)) {
      state.activeThemeId = state.themes[0]?.id || null;
    }

    refreshUI();
  } catch (err) {
    console.error(err);
    showToast(t('dataLoadError'));
  }
}

async function saveData() {
  const preferredLanguage = state.settings.language;
  const serializeProject = (project) => ({
    id: project.id,
    title: getPreferredValue(project, 'title', preferredLanguage),
    titleRu: String(project.titleRu || ''),
    titleEn: String(project.titleEn || ''),
    description: getPreferredValue(project, 'description', preferredLanguage),
    descriptionRu: String(project.descriptionRu || ''),
    descriptionEn: String(project.descriptionEn || ''),
    link: String(project.link || ''),
    additional: getPreferredValue(project, 'additional', preferredLanguage),
    additionalRu: String(project.additionalRu || ''),
    additionalEn: String(project.additionalEn || ''),
    cover: String(project.cover || ''),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  });

  await window.api.savePortfolio({
    settings: {
      language: state.settings.language,
      bilingualMode: state.settings.bilingualMode
    },
    developerProfile: {
      name: getPreferredValue(state.developerProfile, 'name', preferredLanguage),
      nameRu: String(state.developerProfile.nameRu || ''),
      nameEn: String(state.developerProfile.nameEn || ''),
      bio: getPreferredValue(state.developerProfile, 'bio', preferredLanguage),
      bioRu: String(state.developerProfile.bioRu || ''),
      bioEn: String(state.developerProfile.bioEn || ''),
      photo: state.developerProfile.photo
    },
    themes: state.themes.map((theme) => ({
      id: theme.id,
      name: getPreferredValue(theme, 'name', preferredLanguage),
      nameRu: String(theme.nameRu || ''),
      nameEn: String(theme.nameEn || ''),
      createdAt: theme.createdAt,
      projects: theme.projects.map(serializeProject)
    }))
  });
}

function setAppLanguage(language) {
  if (!language || state.settings.language === language) return;
  state.settings.language = language === 'en' ? 'en' : 'ru';
  refreshUI();
  saveData().catch((err) => console.error(err));
}

function setActiveTheme(themeId) {
  state.activeThemeId = themeId;
  renderThemes();
  renderProjects();
}

function createTheme(draft) {
  const theme = {
    id: uid(),
    name: getPreferredValue(draft, 'name', state.settings.language),
    nameRu: String(draft.nameRu || '').trim(),
    nameEn: String(draft.nameEn || '').trim(),
    projects: [],
    createdAt: new Date().toISOString()
  };

  state.themes.push(theme);
  state.activeThemeId = theme.id;

  saveData().then(() => {
    refreshUI();
    showToast(t('themeCreated'));
  });
}

function renameTheme(themeId, draft) {
  const theme = state.themes.find((item) => item.id === themeId);
  if (!theme) return;

  theme.nameRu = String(draft.nameRu || '').trim();
  theme.nameEn = String(draft.nameEn || '').trim();
  theme.name = getPreferredValue(theme, 'name', state.settings.language);

  saveData().then(() => {
    refreshUI();
    showToast(t('themeRenamed'));
  });
}

async function deleteTheme(themeId) {
  const theme = state.themes.find((item) => item.id === themeId);
  if (!theme) return;

  const ok = await window.api.confirmDelete({
    type: t('themeCardType'),
    name: getLocalizedValue(theme, 'name') || t('themeNameLabel'),
    language: state.settings.language
  });

  if (!ok) {
    requestAnimationFrame(() => els.addThemeBtn.focus());
    return;
  }

  state.themes = state.themes.filter((item) => item.id !== themeId);
  if (state.activeThemeId === themeId) {
    state.activeThemeId = state.themes[0]?.id || null;
  }

  await saveData();
  refreshUI();
  showToast(t('themeDeleted'));

  requestAnimationFrame(() => {
    const target = els.addProjectBtn.disabled ? els.addThemeBtn : els.addProjectBtn;
    target.focus();
  });
}

async function deleteProject(projectId) {
  const theme = getActiveTheme();
  if (!theme) return;

  const project = theme.projects.find((item) => item.id === projectId);
  if (!project) return;

  const ok = await window.api.confirmDelete({
    type: t('projectCardType'),
    name: getLocalizedValue(project, 'title') || t('projectTitleLabel'),
    language: state.settings.language
  });

  if (!ok) {
    requestAnimationFrame(() => els.addProjectBtn.focus());
    return;
  }

  theme.projects = theme.projects.filter((item) => item.id !== projectId);

  await saveData();
  refreshUI();
  showToast(t('projectDeleted'));

  requestAnimationFrame(() => els.addProjectBtn.focus());
}

function editProject(projectId) {
  const theme = getActiveTheme();
  if (!theme) return;

  const project = theme.projects.find((item) => item.id === projectId);
  if (!project) return;

  openProjectModal('edit', project);
}

function getFilteredProjects(theme) {
  const query = state.projectSearch.trim().toLowerCase();
  if (!query) return theme.projects;

  return theme.projects.filter((project) => {
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

function renderThemes() {
  els.themesList.innerHTML = '';
  els.themeCount.textContent = String(state.themes.length);

  if (state.themes.length === 0) {
    els.themesList.innerHTML = `
      <div class="empty" style="min-height:auto;padding:18px;border-radius:18px">
        <h3>${escapeHtml(t('emptyThemesTitle'))}</h3>
        <p>${escapeHtml(t('emptyThemesDescription'))}</p>
      </div>
    `;
    return;
  }

  state.themes.forEach((theme) => {
    const item = document.createElement('div');
    item.className = `theme-item${theme.id === state.activeThemeId ? ' active' : ''}`;
    item.innerHTML = `
      <div class="theme-name">
        <strong title="${escapeHtml(getLocalizedValue(theme, 'name') || t('themeNameLabel'))}">${escapeHtml(getLocalizedValue(theme, 'name') || t('themeNameLabel'))}</strong>
        <span>${theme.projects.length} ${escapeHtml(t('projectsShortLabel'))}</span>
      </div>
      <div class="theme-meta">#${theme.projects.length}</div>
    `;
    item.addEventListener('click', () => setActiveTheme(theme.id));
    els.themesList.appendChild(item);
  });
}

function renderProjects() {
  const theme = getActiveTheme();
  els.projectCount.textContent = theme ? String(theme.projects.length) : '0';

  const hasTheme = Boolean(theme);
  els.addProjectBtn.disabled = !hasTheme;
  els.renameThemeBtn.disabled = !hasTheme;
  els.deleteThemeBtn.disabled = !hasTheme;
  els.searchInput.disabled = !hasTheme;

  if (!hasTheme) {
    els.currentThemeTitle.textContent = t('chooseTheme');
    els.currentThemeSubtitle.textContent = t('chooseThemeSubtitle');
    els.projectsContainer.innerHTML = `
      <div class="empty">
        <h3>${escapeHtml(t('emptyNoSelectionTitle'))}</h3>
        <p>${escapeHtml(t('emptyNoSelectionDescription'))}</p>
        <button class="btn primary" id="emptyCreateThemeBtn">${escapeHtml(t('createTheme'))}</button>
      </div>
    `;
    const button = document.getElementById('emptyCreateThemeBtn');
    if (button) button.addEventListener('click', () => openThemeModal('create'));
    return;
  }

  els.currentThemeTitle.textContent = getLocalizedValue(theme, 'name') || t('themeNameLabel');
  els.currentThemeSubtitle.textContent = t('currentThemeSubtitle', { count: theme.projects.length });

  const projects = getFilteredProjects(theme);

  if (projects.length === 0) {
    els.projectsContainer.innerHTML = `
      <div class="empty">
        <h3>${escapeHtml(state.projectSearch.trim() ? t('emptySearchTitle') : t('emptyNoProjectsTitle'))}</h3>
        <p>${escapeHtml(state.projectSearch.trim() ? t('emptySearchDescription') : t('emptyNoProjectsDescription'))}</p>
        <button class="btn primary" id="emptyCreateProjectBtn" ${state.projectSearch.trim() ? 'style="display:none"' : ''}>${escapeHtml(t('createProject'))}</button>
      </div>
    `;
    const button = document.getElementById('emptyCreateProjectBtn');
    if (button) button.addEventListener('click', () => openProjectModal('create'));
    return;
  }

  els.projectsContainer.innerHTML = '';

  projects
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .forEach((project) => {
      const card = document.createElement('article');
      card.className = 'card';

      const coverSource = project.coverUrl || '';
      const localizedTitle = getLocalizedValue(project, 'title') || t('projectTitleLabel');
      const localizedDescription = getLocalizedValue(project, 'description');
      const localizedAdditional = getLocalizedValue(project, 'additional');

      const coverHtml = coverSource
        ? `<img src="${coverSource}" alt="${escapeHtml(localizedTitle)}">`
        : `<div class="fallback">${escapeHtml((localizedTitle || 'P').slice(0, 1).toUpperCase())}</div>`;

      card.innerHTML = `
        <div class="cover">${coverHtml}</div>
        <div class="card-body">
          <div class="card-title">
            <h3>${escapeHtml(localizedTitle)}</h3>
            <div class="menu">
              <button class="btn small" data-action="edit">${escapeHtml(t('editProject'))}</button>
              <button class="btn small danger" data-action="delete">${escapeHtml(t('deleteProject'))}</button>
            </div>
          </div>

          ${localizedDescription ? `<div class="desc">${escapeHtml(localizedDescription)}</div>` : ''}
          ${localizedAdditional ? `<div class="pill">${escapeHtml(`${t('projectAdditionalLabel')}: ${localizedAdditional}`)}</div>` : ''}

          <div class="card-links">
            ${project.link ? `<button class="link-btn" data-link="${escapeHtml(normalizeUrl(project.link))}">${escapeHtml(t('linkButton'))}</button>` : ''}
            <span class="pill">${escapeHtml(t('projectCreatedOn', {
              date: new Date(project.createdAt).toLocaleDateString(state.settings.language === 'ru' ? 'ru-RU' : 'en-US')
            }))}</span>
          </div>
        </div>
      `;

      const linkBtn = card.querySelector('[data-link]');
      if (linkBtn) {
        linkBtn.addEventListener('click', () => {
          window.api.openExternal(linkBtn.dataset.link);
        });
      }

      card.querySelector('[data-action="edit"]').addEventListener('click', () => editProject(project.id));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProject(project.id));
      els.projectsContainer.appendChild(card);
    });
}

function openThemeModal(mode = 'create') {
  closeAllModals();
  state.themeModalMode = mode;
  state.themeDraft = buildThemeDraft(mode === 'edit' ? getActiveTheme() : null);
  els.themeModal.classList.add('open');
  renderThemeModalForm();

  requestAnimationFrame(() => {
    els.themeNameInput.focus();
  });
}

function openProjectModal(mode = 'create', project = null) {
  closeAllModals();

  state.editingProjectId = project?.id || null;
  state.projectDraft = buildProjectDraft(project);
  state.selectedCoverSourcePath = '';
  state.selectedCoverPreviewUrl = '';

  els.projectModal.classList.add('open');
  renderProjectModalForm();

  requestAnimationFrame(() => {
    els.projectTitle.focus();
  });
}

async function handleCoverSelection() {
  const filePath = await window.api.pickImage(state.settings.language);
  if (!filePath) return;

  state.selectedCoverSourcePath = filePath;
  state.selectedCoverPreviewUrl = encodeURI(`file:///${filePath.replace(/\\/g, '/')}`);
  renderProjectModalForm();
}

async function saveProject(options = {}) {
  const theme = getActiveTheme();
  if (!theme) {
    if (!options.silent) showToast(t('createThemeFirst'));
    return false;
  }

  const currentLanguage = state.settings.language;
  const currentTitle = getLocalizedValue(state.projectDraft, 'title', currentLanguage);
  const fallbackTitle = getLocalizedValue(state.projectDraft, 'title', getAlternateLanguage(currentLanguage));
  const title = currentTitle || (options.allowFallbackTitle ? fallbackTitle : '');

  if (!title) {
    if (!options.silent) {
      showToast(t('projectTitleRequired'));
      els.projectTitle.focus();
    }
    return false;
  }

  const now = new Date().toISOString();
  const existing = state.editingProjectId
    ? theme.projects.find((project) => project.id === state.editingProjectId)
    : null;

  const project = existing || {
    id: uid(),
    createdAt: now,
    cover: ''
  };

  project.titleRu = String(state.projectDraft.titleRu || '').trim();
  project.titleEn = String(state.projectDraft.titleEn || '').trim();
  project.descriptionRu = String(state.projectDraft.descriptionRu || '').trim();
  project.descriptionEn = String(state.projectDraft.descriptionEn || '').trim();
  project.additionalRu = String(state.projectDraft.additionalRu || '').trim();
  project.additionalEn = String(state.projectDraft.additionalEn || '').trim();
  project.title = getPreferredValue(project, 'title', currentLanguage);
  project.description = getPreferredValue(project, 'description', currentLanguage);
  project.additional = getPreferredValue(project, 'additional', currentLanguage);
  project.link = normalizeUrl(state.projectDraft.link);
  project.updatedAt = now;

  try {
    if (state.selectedCoverSourcePath) {
      const result = await window.api.copyCover({
        sourcePath: state.selectedCoverSourcePath,
        projectId: project.id
      });

      if (result?.ok && result.cover) {
        project.cover = result.cover;
        project.coverUrl = '';
      }
    }
  } catch (err) {
    console.error(err);
    if (!options.silent) showToast(t('coverSavedWarning'));
  }

  if (!existing) {
    theme.projects.push(project);
  } else {
    Object.assign(existing, project);
  }

  await saveData();
  await loadData();

  if (!options.silent) {
    showToast(existing ? t('projectUpdated') : t('projectCreated'));
  }

  closeProjectModal();
  renderProjectModalForm();
  return true;
}

async function flushCurrentStateToDisk() {
  if (state.selectedDeveloperPhotoSourcePath) {
    const result = await window.api.copyDeveloperPhoto(state.selectedDeveloperPhotoSourcePath);
    if (result?.ok && result.photo) {
      state.developerProfile.photo = result.photo;
      state.developerProfile.photoUrl = '';
      state.selectedDeveloperPhotoSourcePath = '';
      state.selectedDeveloperPhotoPreviewUrl = '';
    }
  }

  const projectModalOpen = els.projectModal.classList.contains('open');
  const projectDirty = [
    state.projectDraft.titleRu,
    state.projectDraft.titleEn,
    state.projectDraft.descriptionRu,
    state.projectDraft.descriptionEn,
    state.projectDraft.additionalRu,
    state.projectDraft.additionalEn,
    state.projectDraft.link,
    state.selectedCoverSourcePath
  ].some((value) => String(value || '').trim() !== '');

  if (projectModalOpen && projectDirty) {
    const savedProject = await saveProject({ silent: true, allowFallbackTitle: true });
    if (savedProject) return;
  }

  await saveData();
}

els.uiLanguageRuBtn.addEventListener('click', () => setAppLanguage('ru'));
els.uiLanguageEnBtn.addEventListener('click', () => setAppLanguage('en'));

els.bilingualModeToggle.addEventListener('change', async (event) => {
  state.settings.bilingualMode = Boolean(event.target.checked);
  refreshUI();
  await saveData();
});

els.addThemeBtn.addEventListener('click', () => openThemeModal('create'));
els.addProjectBtn.addEventListener('click', () => openProjectModal('create'));
els.renameThemeBtn.addEventListener('click', () => {
  if (getActiveTheme()) openThemeModal('edit');
});
els.deleteThemeBtn.addEventListener('click', () => {
  const theme = getActiveTheme();
  if (theme) deleteTheme(theme.id);
});

els.exportBtn.addEventListener('click', async () => {
  try {
    await flushCurrentStateToDisk();
    const result = await window.api.exportSite();
    if (!result?.ok) {
      showToast(t('exportError'));
      return;
    }

    showToast(t('exportSuccess'));
  } catch (err) {
    console.error(err);
    showToast(t('exportError'));
  }
});

els.openExportFolderBtn.addEventListener('click', async () => {
  try {
    const result = await window.api.openExportFolder();
    showToast(result?.ok ? t('openFolderSuccess') : t('openFolderNotFound'));
  } catch (err) {
    console.error(err);
    showToast(t('openFolderError'));
  }
});

els.developerNameInput.addEventListener('input', (event) => {
  setLocalizedValue(state.developerProfile, 'name', state.settings.language, event.target.value);
});

els.developerAltNameInput.addEventListener('input', (event) => {
  setLocalizedValue(state.developerProfile, 'name', getAlternateLanguage(), event.target.value);
});

els.developerBioInput.addEventListener('input', (event) => {
  setLocalizedValue(state.developerProfile, 'bio', state.settings.language, event.target.value);
});

els.developerAltBioInput.addEventListener('input', (event) => {
  setLocalizedValue(state.developerProfile, 'bio', getAlternateLanguage(), event.target.value);
});

els.pickDeveloperPhotoBtn.addEventListener('click', async () => {
  try {
    const filePath = await window.api.pickImage(state.settings.language);
    if (!filePath) return;

    state.selectedDeveloperPhotoSourcePath = filePath;
    state.selectedDeveloperPhotoPreviewUrl = encodeURI(`file:///${filePath.replace(/\\/g, '/')}`);
    renderDeveloperProfileForm();
    showToast(t('photoSelected'));
  } catch (err) {
    console.error(err);
    showToast(t('photoSelectError'));
  }
});

els.saveDeveloperProfileBtn.addEventListener('click', async () => {
  try {
    await flushCurrentStateToDisk();
    await loadData();
    showToast(t('profileSaved'));
  } catch (err) {
    console.error(err);
    showToast(t('profileSaveError'));
  }
});

els.themeNameInput.addEventListener('input', (event) => {
  setLocalizedValue(state.themeDraft, 'name', state.settings.language, event.target.value);
});

els.themeAltNameInput.addEventListener('input', (event) => {
  setLocalizedValue(state.themeDraft, 'name', getAlternateLanguage(), event.target.value);
});

els.saveThemeBtn.addEventListener('click', () => {
  const currentValue = getLocalizedValue(state.themeDraft, 'name', state.settings.language);
  if (!currentValue) {
    showToast(t('themeNameRequired'));
    els.themeNameInput.focus();
    return;
  }

  if (state.themeModalMode === 'edit') {
    const theme = getActiveTheme();
    if (theme) renameTheme(theme.id, state.themeDraft);
  } else {
    createTheme(state.themeDraft);
  }

  closeThemeModal();
  renderThemeModalForm();
});

els.projectTitle.addEventListener('input', (event) => {
  setLocalizedValue(state.projectDraft, 'title', state.settings.language, event.target.value);
});

els.projectAltTitle.addEventListener('input', (event) => {
  setLocalizedValue(state.projectDraft, 'title', getAlternateLanguage(), event.target.value);
});

els.projectDescription.addEventListener('input', (event) => {
  setLocalizedValue(state.projectDraft, 'description', state.settings.language, event.target.value);
});

els.projectAltDescription.addEventListener('input', (event) => {
  setLocalizedValue(state.projectDraft, 'description', getAlternateLanguage(), event.target.value);
});

els.projectAdditional.addEventListener('input', (event) => {
  setLocalizedValue(state.projectDraft, 'additional', state.settings.language, event.target.value);
});

els.projectAltAdditional.addEventListener('input', (event) => {
  setLocalizedValue(state.projectDraft, 'additional', getAlternateLanguage(), event.target.value);
});

els.projectLink.addEventListener('input', (event) => {
  state.projectDraft.link = event.target.value;
});

els.saveProjectBtn.addEventListener('click', () => saveProject());

els.clearProjectFormBtn.addEventListener('click', () => {
  state.editingProjectId = null;
  state.projectDraft = createEmptyProjectDraft();
  state.selectedCoverSourcePath = '';
  state.selectedCoverPreviewUrl = '';
  renderProjectModalForm();
});

els.pickCoverBtn.addEventListener('click', async () => {
  try {
    await handleCoverSelection();
    showToast(t('coverSelected'));
  } catch (err) {
    console.error(err);
    showToast(t('coverSelectError'));
  }
});

document.querySelectorAll('[data-close-theme-modal]').forEach((button) => {
  button.addEventListener('click', closeThemeModal);
});

document.querySelectorAll('[data-close-project-modal]').forEach((button) => {
  button.addEventListener('click', closeProjectModal);
});

els.searchInput.addEventListener('input', (event) => {
  state.projectSearch = event.target.value;
  renderProjects();
});

[els.themeModal, els.projectModal].forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      if (modal === els.themeModal) closeThemeModal();
      if (modal === els.projectModal) closeProjectModal();
      renderThemeModalForm();
      renderProjectModalForm();
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeThemeModal();
    closeProjectModal();
    renderThemeModalForm();
    renderProjectModalForm();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (!els.searchInput.disabled) els.searchInput.focus();
  }
});

loadData();

window.api.onBeforeClose(async () => {
  try {
    await flushCurrentStateToDisk();
    await window.api.quitAfterSave();
  } catch (err) {
    console.error(err);
    await window.api.quitAfterSave();
  }
});
