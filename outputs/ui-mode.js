(() => {
  const STORAGE_KEY = 'sichuanMusicUiMode';
  const root = document.documentElement;
  const mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 760px)') : null;

  function getSavedMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'desktop' || saved === 'mobile' ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function getAutoMode() {
    return mobileQuery && mobileQuery.matches ? 'mobile' : 'desktop';
  }

  function applyMode(mode, shouldSave = false) {
    const nextMode = mode === 'mobile' ? 'mobile' : 'desktop';
    root.classList.toggle('ui-mobile', nextMode === 'mobile');
    root.classList.toggle('ui-desktop', nextMode === 'desktop');
    root.dataset.uiMode = nextMode;

    if (document.body) {
      document.body.classList.toggle('ui-mobile', nextMode === 'mobile');
      document.body.classList.toggle('ui-desktop', nextMode === 'desktop');
      document.body.dataset.uiMode = nextMode;
    }

    document.querySelectorAll('[data-ui-mode-button]').forEach(button => {
      const active = button.dataset.uiModeButton === nextMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (shouldSave) {
      try {
        localStorage.setItem(STORAGE_KEY, nextMode);
      } catch (error) {}
    }
  }

  function initUiModeSwitcher() {
    applyMode(getSavedMode() || getAutoMode(), false);

    document.querySelectorAll('[data-ui-mode-button]').forEach(button => {
      button.addEventListener('click', () => {
        applyMode(button.dataset.uiModeButton, true);
      });
    });

    if (mobileQuery) {
      const onScreenChange = () => {
        if (!getSavedMode()) applyMode(getAutoMode(), false);
      };
      if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', onScreenChange);
      } else if (typeof mobileQuery.addListener === 'function') {
        mobileQuery.addListener(onScreenChange);
      }
    }

    initMobileGamebar();
  }

  function getText(selector, fallback = '') {
    return document.querySelector(selector)?.textContent?.trim() || fallback;
  }

  function openMobileSheet(title, html) {
    const overlay = document.querySelector('#mobileSheetOverlay');
    const titleNode = document.querySelector('#mobileSheetTitle');
    const content = document.querySelector('#mobileSheetContent');
    if (!overlay || !titleNode || !content) return;
    titleNode.textContent = title;
    content.innerHTML = html;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.querySelector('#mobileSheetClose')?.focus();
  }

  function closeMobileSheet() {
    const overlay = document.querySelector('#mobileSheetOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function openPlayerSheet() {
    const outfit = document.querySelector('#avatarOutfit');
    const outfitVisible = outfit && outfit.getAttribute('src') && getComputedStyle(outfit).display !== 'none';
    const avatarHtml = outfitVisible
      ? `<img src="${outfit.getAttribute('src')}" alt="当前穿戴服装">`
      : `<span class="student-avatar">${getText('#studentAvatar', '🧑')}</span>`;
    openMobileSheet('我的角色', `
      <div class="mobile-sheet-player">
        <div class="avatar">${avatarHtml}</div>
        <div>
          <h3>${getText('#profileName', '成都小乐')}</h3>
          <p>${getText('.profile .level', '见习音乐旅行者 · Lv.1')}</p>
          <div class="progress"><span style="width:${document.querySelector('#levelProgress')?.style.width || '0%'}"></span></div>
          <p><b>音符币：</b>${getText('#coins', '0')}</p>
          <p><b>文化徽章：</b>${getText('#badges', '0 / 6')}</p>
        </div>
      </div>
    `);
  }

  function openChapterSheet() {
    const note = document.querySelector('.research-note')?.innerHTML || '暂无章节信息';
    openMobileSheet('特色章节', `<div class="mobile-sheet-chapters">${note}</div>`);
  }

  function initMobileGamebar() {
    document.querySelectorAll('[data-mobile-panel]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.mobilePanel === 'player') openPlayerSheet();
        if (button.dataset.mobilePanel === 'chapters') openChapterSheet();
      });
    });

    document.querySelectorAll('[data-mobile-action]').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.mobileAction;
        if (action === 'book') document.querySelector('#bookButton')?.click();
        if (action === 'closet') document.querySelector('#closetButton')?.click();
      });
    });

    document.querySelector('#mobileSheetClose')?.addEventListener('click', closeMobileSheet);
    document.querySelector('#mobileSheetOverlay')?.addEventListener('click', event => {
      if (event.target.id === 'mobileSheetOverlay') closeMobileSheet();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileSheet();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUiModeSwitcher);
  } else {
    initUiModeSwitcher();
  }
})();
