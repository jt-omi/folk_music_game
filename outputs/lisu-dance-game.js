(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const level = window.banjiuDanceLevel || {};
  const state = {
    overlay: null, root: null, page: 'intro', round: 0, audio: null, audioReady: false, silent: false,
    timers: [], raf: 0, playing: false, startPerf: 0, duration: 12, hits: [], matched: new Set(),
    joined: 0, actionIndex: 0, actionRound: 0, actionStats: { right: 0, wrong: 0, miss: 0, streak: 0 },
    formationIndex: 0, phraseIndex: 0, formationStats: { right: 0, wrong: 0, phrase: 0 },
    actionAccepting: false, formationActive: false, warned: new Set(),
    paused: false, pausedMs: 0, playbackMode: '', playbackOnDone: null,
    actionTargets: [], actionMatched: new Set(), actionPromptIndex: 0
  };

  function safe(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function addTimer(id) { state.timers.push(id); return id; }
  function clearTimers() { state.timers.forEach(clearTimeout); state.timers = []; cancelAnimationFrame(state.raf); state.raf = 0; }
  function setStatus(text) {
    const el = $('#lisuDanceStatus', state.root);
    if (!el) return;
    if (text && typeof text === 'object') {
      el.textContent = '跟着提示继续体验。';
      return;
    }
    el.textContent = String(text || '');
  }
  function fileMissingText(kind) {
    return {
      audio: '斑鸠吃水舞音乐素材待补充',
      video: '斑鸠吃水舞完整视频待补充',
      instrument: '葫芦笙图片待补充'
    }[kind] || '素材待补充';
  }
  function stopAudio() {
    if (state.audio) {
      state.audio.pause();
      state.audio.currentTime = 0;
    }
    state.playing = false;
    state.paused = false;
    state.pausedMs = 0;
    clearTimers();
    updatePauseButtons(false);
  }
  function updatePauseButtons(paused) {
    ['#lisuPause', '#lisuPauseTop'].forEach(selector => {
      const btn = $(selector, state.root);
      if (!btn) return;
      btn.textContent = paused ? '继续' : (selector === '#lisuPauseTop' ? 'Ⅱ' : '暂停');
      btn.setAttribute('aria-label', paused ? '继续播放' : '暂停音乐');
    });
  }
  function schedulePlaybackEnd() {
    const elapsed = currentMs() / 1000;
    const remain = Math.max(0.05, state.duration - elapsed);
    addTimer(setTimeout(finishPlayback, remain * 1000));
  }
  function finishPlayback() {
    if (!state.playing && !state.paused) return;
    const onDone = state.playbackOnDone;
    state.playing = false;
    state.paused = false;
    state.playbackOnDone = null;
    if (state.audio) {
      state.audio.pause();
      try { state.audio.currentTime = Number(level.startTime) || 0; } catch (error) {}
    }
    clearTimers();
    updatePauseButtons(false);
    if (onDone) onDone();
  }
  function togglePausePlayback() {
    if (!state.playing && !state.paused) return;
    if (state.playing) {
      state.pausedMs = currentMs();
      if (state.audio && !state.silent) state.audio.pause();
      state.playing = false;
      state.paused = true;
      clearTimers();
      updatePauseButtons(true);
      const msg = $('#lisuBeatMessage', state.root) || $('#lisuActionHint', state.root) || $('#lisuFormationHint', state.root);
      if (msg) msg.textContent = '已暂停，点击“继续”可以接着体验。';
      return;
    }
    state.playing = true;
    state.paused = false;
    state.startPerf = performance.now() - state.pausedMs;
    if (state.audio && !state.silent) {
      try { state.audio.currentTime = state.pausedMs / 1000; } catch (error) {}
      state.audio.play().catch(() => {
        state.silent = true;
        setStatus('当前为无声流程演示。' + fileMissingText('audio'));
      });
    }
    updatePauseButtons(false);
    runProgress();
    schedulePlaybackEnd();
    if (state.page === 'beat-listen' && $('#lisuTap', state.root) && !$('#lisuTap', state.root).disabled) {
      scheduleBeatPulsesFrom(state.pausedMs / 1000);
    }
    if (state.page === 'action' && state.actionAccepting) {
      scheduleActionPromptsFrom(state.pausedMs / 1000);
    }
  }
  function stopOuterBgm() {
    if (typeof window.stopDialogueBgm === 'function') {
      window.stopDialogueBgm();
    }
  }
  function resumeOuterBgm() {
    if (typeof window.resumeDialogueBgmFromActiveTask === 'function') {
      window.resumeDialogueBgmFromActiveTask();
    }
  }
  function close({ map = false } = {}) {
    stopAudio();
    if (state.overlay) state.overlay.classList.remove('show');
    if (map) document.querySelector('#chapterOverlay')?.classList.remove('show');
    else resumeOuterBgm();
  }
  function shell(content) {
    state.root.innerHTML = `
      <div class="lisu-dance-head">
        <div><span class="lisu-dance-tag">傈僳族 · 音乐舞蹈体验</span><h2>${safe(level.title || '笙起斑鸠舞')}</h2><p>${safe(level.subtitle || '')}</p></div>
        <button class="lisu-dance-close" type="button" aria-label="关闭">×</button>
      </div>
      ${content}
      <p class="lisu-notice" id="lisuDanceStatus">${safe(level.simplifyNotice || '')}</p>
    `;
    $('.lisu-dance-close', state.root).addEventListener('click', () => close());
  }
  function instrumentBox() {
    return `<div class="lisu-instrument-box"><div>🎼<br>${fileMissingText('instrument')}<br><small>正式图片路径：${safe(level.assets?.hulusheng || '')}</small></div></div>`;
  }
  function framePath(type, action, index = 0) {
    const actionKeys = String(action || 'idle').split(/\s+/).filter(Boolean);
    if (type === 'leader') {
      const frames = level.assets?.leader?.frames || {};
      const matchedAction = actionKeys.find(key => frames[key]);
      return frames[matchedAction] || frames.playing || level.assets?.leader?.sheet || '';
    }
    const frames = level.assets?.dancer?.frames || [];
    const actionFrames = level.assets?.dancer?.actionFrames || {};
    const matchedAction = actionKeys.find(key => actionFrames[key]);
    const choices = actionFrames[matchedAction] || actionFrames.idle || frames.map((_, i) => i);
    const picked = choices[index % Math.max(1, choices.length)] ?? index;
    return frames[picked] || frames[index % Math.max(1, frames.length)] || level.assets?.dancer?.sheet || '';
  }
  function leaderPlaceholder(cls = 'playing') {
    return `<div class="lisu-person leader joined ${safe(cls)}" style="--x:50%;--y:50%;--scale:1"><img class="lisu-character-img" src="${safe(framePath('leader', cls))}" alt="葫芦笙领舞者"><span class="label">领舞者</span></div>`;
  }
  function dancerHtml(i, pos, joined = true, action = 'idle') {
    const dir = pos.direction === 'left' ? ' face-left' : '';
    return `<div class="lisu-person dancer ${joined ? 'joined' : ''} ${safe(action)}${dir}" data-dancer="${i}" style="--x:${pos.x}%;--y:${pos.y}%"><img class="lisu-character-img" src="${safe(framePath('dancer', action, i))}" alt="${joined ? '傈僳族舞者' : '等待加入的舞者'}"><span class="label">${joined ? '舞者' : '等待加入'}</span></div>`;
  }
  function roundInfo(title) {
    if (/第一/.test(title)) return { n: 1, label: '第1轮 / 共3轮', type: 'beat' };
    if (/第二/.test(title)) return { n: 2, label: '第2轮 / 共3轮', type: 'action' };
    if (/第三/.test(title)) return { n: 3, label: '第3轮 / 共3轮', type: 'formation' };
    return { n: 0, label: '体验完成', type: 'final' };
  }
  function leftPanelHtml(type) {
    if (type === 'beat') return '';
    if (type === 'formation') return `<aside class="lisu-left-panel lisu-formation-panel" aria-label="队形进程"><h4>队形进程</h4><ol><li class="done">分散</li><li>靠拢</li><li>换向</li><li>集体队形</li></ol></aside>`;
    return `<aside class="lisu-left-panel lisu-tip-panel" aria-label="动作提示"><h4>动作提示</h4><div class="mini-flow">强拍换动作<br>弱拍保持动作</div></aside>`;
  }
  function scorePanelHtml(type) {
    if (type === 'action') return `<aside class="lisu-score-panel"><h4>动作完成</h4><p>已完成动作 <b id="lisuMetricA">${state.actionIndex || 0}</b></p><p>连续正确 <b id="lisuMetricB">${state.actionStats?.right || 0}</b></p><p>轻微偏差 <b id="lisuMetricC">${state.actionStats?.wrong || 0}</b></p><div class="npc-note">做得真棒！跟着节奏，动作越来越准啦！</div></aside>`;
    if (type === 'formation') return `<aside class="lisu-score-panel"><h4>队形变化</h4><p>完成乐句 <b id="lisuMetricA">${state.formationStats?.phrase || 0}</b></p><p>成功换队形 <b id="lisuMetricB">${state.formationIndex || 0}</b></p><p>节拍稳定度 <b id="lisuMetricC">${state.formationStats?.right || 0}</b></p><div class="npc-note">跟上音乐变化，大家就会一起变换队形！</div></aside>`;
    return `<aside class="lisu-score-panel"><h4>本轮表现</h4><p>⭐ 准确拍 <b id="lisuMetricA">${state.matched?.size || 0}</b></p><p>🌼 接近拍 <b id="lisuMetricB">0</b></p><p>✕ 漏拍 <b id="lisuMetricC">0</b></p><div class="npc-note">先听一遍葫芦笙，再跟着节拍轻轻踏步吧！</div></aside>`;
  }
  function stage(title, subtitle, controls = '', opts = {}) {
    const formation = level.formations?.[opts.formation || 'scattered'] || [];
    const bg = level.assets?.background || '';
    const info = roundInfo(title);
    const roundTip = level.culture?.roundTips?.[info.type] || subtitle || '';
    return `
      <div class="lisu-stage lisu-stage-${safe(info.type)}" style="--lisu-bg:url('${safe(bg)}')">
        <div class="lisu-stream"></div><div class="lisu-house"></div><div class="lisu-hill"></div>
        <div class="lisu-stage-top">
          <div class="lisu-music-plaque"><b>代表性音乐：</b><span>${safe(level.musicTitle || '傈僳族葫芦笙舞曲')}</span></div>
          <div class="lisu-stage-title"><h3>《${safe(level.title || '笙起斑鸠舞')}》</h3><p>${safe(title)}</p></div>
          <div class="lisu-round-tools"><span class="lisu-status-pill">${safe(info.label)}</span><button class="lisu-mini-pause" id="lisuPauseTop" type="button" aria-label="暂停音乐">Ⅱ</button></div>
        </div>
        ${roundTip ? `<div class="lisu-culture-bubble">${safe(roundTip)}</div>` : ''}
        ${leftPanelHtml(info.type)}
        ${scorePanelHtml(info.type)}
        <div class="lisu-dancers" id="lisuDanceField">
          ${leaderPlaceholder(opts.leaderAction || 'playing')}
          ${formation.map((pos, i) => dancerHtml(i, pos, i < (opts.joined ?? state.joined), opts.dancerAction || 'idle')).join('')}
        </div>
        ${controls}
      </div>
    `;
  }
  function renderIntro() {
    state.page = 'intro';
    const culture = level.culture || {};
    const highlights = Array.isArray(culture.highlights) ? culture.highlights : [];
    const keywords = Array.isArray(culture.keywords) ? culture.keywords : [];
    shell(`
      <article class="lisu-card lisu-culture-intro">
        <div class="lisu-intro-grid">
          <figure class="lisu-culture-photo">
            <img src="${safe(culture.image || '')}" alt="新山傈僳族斑鸠吃水舞参考图片">
            <figcaption>葫芦笙领舞，大家随节拍同行</figcaption>
          </figure>
          <div class="lisu-culture-copy">
            <div class="lisu-culture-title">
              <span>傈僳族 · 非遗舞蹈</span>
              <h3>${safe(culture.introTitle || '新山傈僳族斑鸠吃水舞')}</h3>
            </div>
            <p class="lisu-culture-lead">${safe(culture.introLead || '葫芦笙响起后，领舞者会带领大家一起打跳。请先听音乐，再跟着节拍完成动作，让越来越多的舞伴加入队伍。')}</p>
            <div class="lisu-culture-keywords">
              ${keywords.map(word => `<span>${safe(word)}</span>`).join('')}
            </div>
            <div class="lisu-culture-points">
              ${highlights.map(item => `<section><b>${safe(item.title)}</b><p>${safe(item.text)}</p></section>`).join('')}
            </div>
            <p class="lisu-heritage">${safe(culture.heritage || '')}</p>
            <p class="lisu-notice">${safe(level.simplifyNotice)}</p>
            <div class="lisu-goals">
              <div class="lisu-goal">听葫芦笙，找稳定节拍</div>
              <div class="lisu-goal">做跟步、饮水和展翅</div>
              <div class="lisu-goal">体验集体队形变化</div>
            </div>
            <div class="lisu-controls"><button class="lisu-btn primary" id="lisuStartDance">开始体验</button><button class="lisu-btn secondary" id="lisuBackStory">返回剧情</button></div>
          </div>
        </div>
      </article>
    `);
    $('#lisuStartDance', state.root).addEventListener('click', () => renderBeatListen());
    $('#lisuBackStory', state.root).addEventListener('click', () => close());
  }
  function renderBeatListen(message = '第一遍只完整聆听，先不用点击。') {
    state.page = 'beat-listen';
    state.hits = []; state.matched = new Set(); state.joined = 0;
    shell(`
      ${stage('第一轮：听笙找拍', '先听葫芦笙，再跟着节拍踏一踏。', `
        <div class="lisu-input-panel">
          <div class="lisu-beat-panel"><b>节拍圆点</b><div class="lisu-beats" id="lisuBeats">${beatDots()}</div><div class="lisu-progress"><span id="lisuProgress"></span></div><p id="lisuBeatMessage">${safe(message)}</p></div>
          <button class="lisu-tap" id="lisuTap" type="button" disabled>踏一踏</button>
        </div>
      `, { joined: 0, pill: '等待加入：6人' })}
      <div class="lisu-controls"><button class="lisu-btn primary" id="lisuListen">播放音乐</button><button class="lisu-btn green" id="lisuPractice" disabled>开始踏拍</button><button class="lisu-btn secondary" id="lisuPause">暂停</button><button class="lisu-btn secondary" id="lisuExit">返回剧情</button></div>
    `);
    bindRoundCommon();
    $('#lisuListen').addEventListener('click', event => {
      const listenBtn = event.currentTarget;
      listenBtn.disabled = true;
      listenBtn.textContent = '聆听中...';
      $('#lisuBeatMessage').textContent = '正在播放第一遍，请先听一听葫芦笙的节拍。';
      startPlayback({ mode: 'listen', onDone: () => {
        $('#lisuPractice').disabled = false;
        listenBtn.disabled = false;
        listenBtn.textContent = '再听一次';
        $('#lisuBeatMessage').textContent = '你听到葫芦笙的声音了吗？接下来跟着节拍踏一踏吧！';
      }});
    });
    $('#lisuPractice').addEventListener('click', startBeatPractice);
  }
  function beatDots() {
    const count = getBeatSlotsCount();
    return Array.from({ length: count }).map((_, i) => {
      const strength = getBeatStrength(i);
      return `<span class="lisu-beat ${safe(strength)}" data-beat-slot="${i}" data-label="${safe(getBeatLabel(i))}"></span>`;
    }).join('');
  }
  function bindRoundCommon() {
    $('#lisuPause', state.root)?.addEventListener('click', togglePausePlayback);
    $('#lisuPauseTop', state.root)?.addEventListener('click', togglePausePlayback);
    $('#lisuExit', state.root)?.addEventListener('click', () => close());
  }
  function updateMetrics(a, b, c) {
    const one = $('#lisuMetricA', state.root);
    const two = $('#lisuMetricB', state.root);
    const three = $('#lisuMetricC', state.root);
    if (one) one.textContent = String(a);
    if (two) two.textContent = String(b);
    if (three) three.textContent = String(c);
  }
  function getBeatTimes() {
    return (Array.isArray(level.targetTimes) && level.targetTimes.length ? level.targetTimes : (level.beatTimes || []))
      .map(Number)
      .filter(Number.isFinite);
  }
  function getBeatSlotsCount() {
    return parseInt(String(level.timeSignature || '4/4').split('/')[0], 10) || 4;
  }
  function getBeatStrength(index) {
    const strength = Array.isArray(level.beatStrengths) ? level.beatStrengths[index] : '';
    return strength || (index % 2 === 0 ? 'strong' : 'weak');
  }
  function getBeatLabel(index) {
    const label = Array.isArray(level.beatLabels) ? level.beatLabels[index] : '';
    return label || (getBeatStrength(index) === 'strong' ? '强' : '弱');
  }
  function getPracticeDuration() {
    const beats = getBeatTimes();
    const lastBeat = beats.length ? Math.max(...beats) : 11.25;
    return Number(level.endTime) || lastBeat + 1.2;
  }
  function loadAudio(src) {
    return new Promise(resolve => {
      stopAudio();
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = .72;
      audio.onerror = () => {
        if (!state.warned.has(src)) state.warned.add(src);
        state.silent = true;
        resolve(null);
      };
      audio.oncanplaythrough = () => resolve(audio);
      audio.load();
      addTimer(setTimeout(() => resolve(audio.readyState ? audio : null), 900));
    });
  }
  async function startPlayback({ mode, onDone }) {
    stopOuterBgm();
    stopAudio();
    const src = mode === 'listen' ? (level.mainAudio || level.practiceAudio || level.instrumentPreview) : (level.practiceAudio || level.mainAudio);
    state.audio = await loadAudio(src);
    state.silent = !state.audio;
    state.playbackMode = mode;
    state.playbackOnDone = onDone || null;
    state.duration = mode === 'listen' ? 15 : getPracticeDuration();
    state.startPerf = performance.now();
    state.playing = true;
    state.paused = false;
    state.pausedMs = 0;
    updatePauseButtons(false);
    if (state.silent) setStatus('当前为无声流程演示。' + fileMissingText('audio'));
    else {
      if (Number.isFinite(Number(level.startTime))) state.audio.currentTime = Number(level.startTime) || 0;
      state.audio.play().catch(() => { state.silent = true; setStatus('当前为无声流程演示。' + fileMissingText('audio')); });
    }
    runProgress();
    if (state.audio && !state.silent) state.audio.onended = finishPlayback;
    schedulePlaybackEnd();
  }
  function runProgress() {
    const total = state.audio && !state.silent ? Math.max(1, state.audio.duration || state.duration) : state.duration;
    const now = state.audio && !state.silent ? state.audio.currentTime : (performance.now() - state.startPerf) / 1000;
    const bar = $('#lisuProgress', state.root);
    if (bar) bar.style.width = Math.min(100, now / total * 100) + '%';
    if (state.playing) state.raf = requestAnimationFrame(runProgress);
  }
  async function startBeatPractice() {
    state.hits = []; state.matched = new Set(); state.joined = 0;
    $('#lisuTap').disabled = false;
    await startPlayback({ mode: 'practice', onDone: finishBeatPractice });
    scheduleBeatPulsesFrom(0);
  }
  function scheduleBeatPulsesFrom(fromSec) {
    getBeatTimes().forEach((sec, index) => {
      if (sec <= fromSec + 0.02) return;
      addTimer(setTimeout(() => pulseBeat(index), (sec - fromSec) * 1000));
    });
  }
  function pulseBeat(index) {
    const count = getBeatSlotsCount();
    const dot = $(`.lisu-beat[data-beat-slot="${index % count}"]`, state.root);
    if (dot) {
      const strength = getBeatStrength(index);
      dot.classList.toggle('strong', strength === 'strong');
      dot.classList.toggle('weak', strength !== 'strong');
      dot.dataset.label = getBeatLabel(index);
      dot.classList.add('active');
      addTimer(setTimeout(() => dot.classList.remove('active'), 260));
    }
  }
  function tapBeat(event) {
    if (event) event.preventDefault();
    if (state.page !== 'beat-listen' || !state.playing) return;
    const ms = currentMs();
    state.hits.push(ms);
    $('#lisuTap')?.classList.add('hit');
    addTimer(setTimeout(() => $('#lisuTap')?.classList.remove('hit'), 120));
    const beatTimes = getBeatTimes();
    const matched = matchTarget(ms, beatTimes.map(v => v * 1000), state.matched);
    if (matched >= 0) {
      state.matched.add(matched);
      const newJoined = Math.min(6, Math.floor(state.matched.size / (level.joinEveryHits || 2)));
      if (newJoined > state.joined) {
        state.joined = newJoined;
        updateDancers('gather', state.joined);
        $('#lisuBeatMessage').textContent = '有新的舞伴加入啦！';
      }
    }
    const passedTargets = beatTimes.filter(sec => sec * 1000 <= ms).length;
    updateMetrics(state.matched.size, Math.max(0, state.hits.length - state.matched.size), Math.max(0, passedTargets - state.matched.size));
  }
  function currentMs() {
    return state.audio && !state.silent ? state.audio.currentTime * 1000 : performance.now() - state.startPerf;
  }
  function matchTarget(ms, targets, matchedSet) {
    let best = -1, diff = Infinity;
    targets.forEach((target, i) => {
      if (matchedSet.has(i)) return;
      const d = Math.abs(ms - target);
      if (d < diff) { diff = d; best = i; }
    });
    return diff <= (level.tolerance?.acceptable || 400) ? best : -1;
  }
  function finishBeatPractice() {
    const targets = getBeatTimes();
    const right = state.matched.size;
    const miss = Math.max(0, targets.length - right);
    const extra = Math.max(0, state.hits.length - right);
    shell(`
      <article class="lisu-card">
        <h3>第一轮完成</h3>
        <div class="lisu-result-grid"><span>跟上节拍<b>${right}</b></span><span>漏拍<b>${miss}</b></span><span>多拍<b>${extra}</b></span><span>加入舞伴<b>${state.joined}</b></span></div>
        <p>${right >= targets.length * .6 ? '你已经听到了葫芦笙的节拍！大家已经跟着你一起跳起来了！' : '再听一次，找一找强拍出现的位置。'}</p>
        <div class="lisu-controls"><button class="lisu-btn primary" id="lisuGoAction">进入第二轮</button><button class="lisu-btn secondary" id="lisuRetryBeat">再听一次</button><button class="lisu-btn secondary" id="lisuExit">返回剧情</button></div>
      </article>
    `);
    $('#lisuGoAction').addEventListener('click', renderActionRound);
    $('#lisuRetryBeat').addEventListener('click', () => renderBeatListen());
    $('#lisuExit').addEventListener('click', () => close());
  }
  function updateDancers(formationName, joined, action = 'idle') {
    const field = $('#lisuDanceField', state.root);
    if (!field) return;
    const formation = level.formations?.[formationName] || level.formations?.scattered || [];
    field.innerHTML = leaderPlaceholder('playing') + formation.map((pos, i) => dancerHtml(i, pos, i < joined, action)).join('');
  }
  function renderActionRound() {
    state.page = 'action';
    state.actionRound = 0; state.actionStats = { right: 0, wrong: 0, miss: 0, streak: 0 };
    state.actionAccepting = false;
    shell(`
      ${stage('第二轮：跟笙学跳', '动作只在强拍切换，弱拍保持上一动作；以跟步和饮水为主。', `
        <div class="lisu-input-panel">
          <div class="lisu-action-panel"><div class="lisu-sequence" id="lisuSequence"></div><div class="lisu-action-hint" id="lisuActionHint">可以先看领舞者演示，也可以直接点击“开始模仿”。动作只在强拍切换，弱拍继续保持。</div><div class="lisu-action-buttons">${actionButtons(false)}</div><div class="lisu-progress"><span id="lisuProgress"></span></div></div>
        </div>
      `, { joined: 6, formation: 'gather', pill: '教学化简化动作' })}
      <p class="lisu-notice">${safe(level.simplifyNotice)}</p>
      <div class="lisu-controls"><button class="lisu-btn primary" id="lisuDemo">领舞者演示</button><button class="lisu-btn green" id="lisuStartActions">开始模仿</button><button class="lisu-btn secondary" id="lisuExit">返回剧情</button></div>
    `);
    renderSequence('full', 0);
    $('#lisuPauseTop', state.root)?.addEventListener('click', togglePausePlayback);
    $('.lisu-action-buttons', state.root)?.addEventListener('click', event => {
      const btn = event.target.closest('.lisu-action');
      if (btn) inputAction(btn.dataset.action);
    });
    $('#lisuSequence', state.root)?.addEventListener('click', event => {
      const btn = event.target.closest('[data-seq-action]');
      if (btn) inputAction(btn.dataset.seqAction);
    });
    $('#lisuDemo').addEventListener('click', demoActions);
    $('#lisuStartActions').addEventListener('click', () => startActionChallenge(0));
    $('#lisuExit').addEventListener('click', () => close());
  }
  function actionButtons(disabled) {
    return `<button class="lisu-action" data-action="step" ${disabled ? 'disabled' : ''}>跟步<br><small>A/D 或 ←/→</small></button><button class="lisu-action" data-action="drink" ${disabled ? 'disabled' : ''}>饮水<br><small>S 或 ↓</small></button><button class="lisu-action" data-action="wing" ${disabled ? 'disabled' : ''}>展翅<br><small>空格</small></button><button class="lisu-action" data-action="turn" ${disabled ? 'disabled' : ''}>转向<br><small>T</small></button>`;
  }
  function renderSequence(mode, index) {
    const seq = level.actionSequence || [];
    const box = $('#lisuSequence', state.root);
    if (!box) return;
    if (mode === 'stream') {
      const targets = state.actionTargets || [];
      const start = Math.max(0, index || 0);
      const visible = targets.slice(start, start + 4);
      box.innerHTML = visible.map((item, offset) => {
        const label = safe(level.actionLabels?.[item.action] || item.action);
        const beatLabel = safe(item.label || '');
        return `<button type="button" class="lisu-step-chip ${offset === 0 ? 'next' : ''}" data-seq-action="${safe(item.action)}">${label}<small>${beatLabel}</small></button>`;
      }).join('') || '<span class="lisu-step-chip">跟着音乐自由做动作</span>';
      return;
    }
    if (mode === 'minimal') { box.innerHTML = '<span class="lisu-step-chip">听音乐和记忆完成动作</span>'; return; }
    box.innerHTML = seq.map((a, i) => {
      const hidden = mode === 'next' && i !== index;
      const label = hidden ? '？' : safe(level.actionLabels?.[a] || a);
      const data = hidden ? '' : ` data-seq-action="${safe(a)}"`;
      return `<button type="button" class="lisu-step-chip ${i < index ? 'done' : i === index ? 'next' : ''}"${data}>${label}</button>`;
    }).join('');
  }
  function demoActions() {
    const seq = level.actionSequence || [];
    state.actionAccepting = false;
    $('#lisuDemo').disabled = true;
    $('#lisuStartActions').disabled = true;
    const hint = $('#lisuActionHint', state.root);
    if (hint) hint.textContent = '领舞者正在演示动作顺序，请看清楚每一个发光动作。';
    seq.forEach((a, i) => addTimer(setTimeout(() => {
      highlightAction(a);
      animatePeople(actionToClass(a));
      renderSequence('full', i);
    }, i * 650)));
    addTimer(setTimeout(() => {
      $('#lisuStartActions').disabled = false;
      $('#lisuStartActions').textContent = '开始模仿';
      renderSequence('full', 0);
      if (hint) hint.textContent = '演示结束，现在点击“开始模仿”。注意：动作只在强拍时切换。';
      setStatus('演示结束，点击“开始模仿”。');
    }, seq.length * 650 + 200));
  }
  async function startActionChallenge(round) {
    clearTimers();
    state.actionRound = round; state.actionIndex = 0;
    state.actionStats = { right: 0, wrong: 0, miss: 0, streak: 0 };
    state.actionTargets = buildRandomActionTargets();
    state.actionMatched = new Set();
    state.actionPromptIndex = 0;
    state.actionAccepting = true;
    await startPlayback({ mode: 'practice', onDone: finishActionRound });
    renderSequence('stream', 0);
    const startBtn = $('#lisuStartActions', state.root);
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = '正在模仿';
      startBtn.classList.add('is-running');
    }
    const demoBtn = $('#lisuDemo', state.root);
    if (demoBtn) demoBtn.disabled = true;
    const hint = $('#lisuActionHint', state.root);
    if (hint) hint.textContent = '开始！动作会跟着强弱拍随机亮起，请按亮起的按钮，也可以用键盘操作。';
    updateMetrics(0, 0, 0);
    scheduleActionPromptsFrom(0);
    showActionPrompt(0);
  }
  function buildRandomActionTargets() {
    const baseActions = ['step', 'drink'];
    const specialActions = ['wing', 'turn'];
    let currentAction = 'step';
    return getBeatTimes().map((time, index) => {
      const group = Math.floor(index / 4);
      const slot = index % 4;
      const strength = getBeatStrength(index);
      const isChangeBeat = strength === 'strong' || index === 0;
      if (isChangeBeat) {
        currentAction = slot === 2
          ? specialActions[group % specialActions.length]
          : baseActions[group % baseActions.length];
      }
      return {
        time,
        action: currentAction,
        strength,
        label: getBeatLabel(index),
        change: isChangeBeat
      };
    });
  }
  function scheduleActionPromptsFrom(fromSec) {
    (state.actionTargets || []).forEach((target, index) => {
      if (target.time <= fromSec + 0.02) return;
      if (!target.change) return;
      const lead = target.strength === 'strong' ? 0.32 : 0.24;
      addTimer(setTimeout(() => showActionPrompt(index), Math.max(0, (target.time - lead - fromSec) * 1000)));
    });
  }
  function showActionPrompt(index) {
    if (state.page !== 'action' || !state.actionAccepting) return;
    const target = state.actionTargets?.[index];
    if (!target) return;
    state.actionPromptIndex = index;
    state.actionIndex = index;
    renderSequence('stream', index);
    setActionPrompt(target.action);
    const hint = $('#lisuActionHint', state.root);
    if (hint) {
      const label = level.actionLabels?.[target.action] || target.action;
      hint.textContent = `第 ${index + 1} 拍（${target.label || '拍'}）：动作切换为“${label}”，弱拍保持这个动作。`;
    }
  }
  function setActionPrompt(action) {
    $$('.lisu-action', state.root).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === action);
      btn.classList.remove('wrong');
    });
  }
  function inputAction(action) {
    if (state.page !== 'action') return;
    if (!state.actionAccepting) {
      startActionChallenge(state.actionRound || 0);
      return;
    }
    const matchedIndex = matchActionTarget(action);
    const ok = matchedIndex >= 0;
    highlightAction(action, !ok);
    animatePeople(actionToClass(action));
    addTimer(setTimeout(() => {
      const current = state.actionTargets?.[state.actionPromptIndex]?.action;
      if (state.page === 'action' && state.actionAccepting && current) setActionPrompt(current);
    }, 330));
    const hint = $('#lisuActionHint', state.root);
    if (ok) {
      state.actionMatched.add(matchedIndex);
      state.actionStats.right++;
      state.actionStats.streak++;
      state.actionIndex = Math.max(state.actionIndex, matchedIndex + 1);
      if (hint) hint.textContent = `动作跟上啦！连续正确 ${state.actionStats.streak} 次。`;
    } else {
      state.actionStats.wrong++;
      state.actionStats.streak = 0;
      if (hint) hint.textContent = '这一下和当前节拍动作有点远，再看亮起的按钮试试。';
    }
    const passed = (state.actionTargets || []).filter(item => item.time * 1000 <= currentMs()).length;
    state.actionStats.miss = Math.max(0, passed - state.actionMatched.size);
    updateMetrics(state.actionMatched.size, state.actionStats.streak, state.actionStats.wrong);
  }
  function matchActionTarget(action) {
    const now = currentMs();
    const tolerance = level.tolerance?.acceptable || 620;
    let best = -1;
    let diff = Infinity;
    (state.actionTargets || []).forEach((target, index) => {
      if (state.actionMatched.has(index)) return;
      if (target.action !== action) return;
      const d = Math.abs(now - target.time * 1000);
      if (d < diff) { diff = d; best = index; }
    });
    return diff <= tolerance ? best : -1;
  }
  function highlightAction(action, wrong = false) {
    $$('.lisu-action', state.root).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === action && !wrong);
      btn.classList.toggle('wrong', btn.dataset.action === action && wrong);
      addTimer(setTimeout(() => btn.classList.remove('active', 'wrong'), 300));
    });
  }
  function actionToClass(action) {
    if (action === 'step') return state.actionStats.right % 2 ? 'stepRight' : 'stepLeft';
    return action;
  }
  function animatePeople(cls) {
    $$('.lisu-person', state.root).forEach(p => {
      const type = p.classList.contains('leader') ? 'leader' : 'dancer';
      const index = Number(p.dataset.dancer || 0);
      const img = $('.lisu-character-img', p);
      const nextFrame = framePath(type, cls, index);
      if (img && nextFrame) img.src = nextFrame;
      p.classList.remove('stepLeft', 'stepRight', 'drink', 'wing', 'turn');
      p.classList.add(cls);
      addTimer(setTimeout(() => {
        p.classList.remove(cls);
        const idleFrame = framePath(type, type === 'leader' ? 'playing' : 'idle', index);
        if (img && idleFrame) img.src = idleFrame;
      }, 520));
    });
  }
  function finishActionRound() {
    state.actionAccepting = false;
    stopAudio();
    const total = state.actionTargets?.length || 0;
    const miss = Math.max(0, total - (state.actionMatched?.size || 0));
    shell(`
      <article class="lisu-card"><h3>第二轮完成</h3>
      <div class="lisu-result-grid"><span>正确动作<b>${state.actionMatched?.size || 0}</b></span><span>轻微偏差<b>${state.actionStats.wrong}</b></span><span>漏做动作<b>${miss}</b></span><span>评价<b>快乐小舞者</b></span></div>
      <p>饮水动作完成得很自然！接下来让队形跟着笙声一起变化。</p>
      <div class="lisu-controls"><button class="lisu-btn primary" id="lisuGoFormation">进入第三轮</button><button class="lisu-btn secondary" id="lisuRetryAction">重新练动作</button><button class="lisu-btn secondary" id="lisuExit">返回剧情</button></div></article>
    `);
    $('#lisuGoFormation').addEventListener('click', renderFormationRound);
    $('#lisuRetryAction').addEventListener('click', renderActionRound);
    $('#lisuExit').addEventListener('click', () => close());
  }
  function renderFormationRound() {
    state.page = 'formation'; state.formationIndex = 0; state.phraseIndex = 0; state.formationStats = { right: 0, wrong: 0, phrase: 0 };
    state.formationActive = false;
    shell(`
      ${stage('第三轮：笙声带我变队形', '跟随节拍完成动作，舞者会从分散到靠拢，再形成集体队形。', `
        <div class="lisu-input-panel"><div class="lisu-action-panel"><div class="lisu-sequence" id="lisuSequence"></div><div class="lisu-action-hint" id="lisuFormationHint">点击“开始变队形”后，再按顺序完成动作。</div><div class="lisu-action-buttons">${actionButtons(false)}</div></div></div>
      `, { joined: 6, formation: 'scattered', pill: '教学化互动队形' })}
      <p class="lisu-notice">${safe(level.formationNotice)}</p>
      <div class="lisu-controls"><button class="lisu-btn primary" id="lisuStartFormation">开始变队形</button><button class="lisu-btn secondary" id="lisuExit">返回剧情</button></div>
    `);
    renderFormationSequence();
    $('#lisuPauseTop', state.root)?.addEventListener('click', togglePausePlayback);
    $('#lisuStartFormation').addEventListener('click', startFormationChallenge);
    $('.lisu-action-buttons', state.root)?.addEventListener('click', event => {
      const btn = event.target.closest('.lisu-action');
      if (btn) inputFormation(btn.dataset.action);
    });
    $('#lisuSequence', state.root)?.addEventListener('click', event => {
      const chip = event.target.closest('[data-seq-action]');
      if (chip) inputFormation(chip.dataset.seqAction);
    });
    $('#lisuExit').addEventListener('click', () => close());
  }
  function startFormationChallenge() {
    state.formationActive = true;
    startPlayback({ mode: 'practice' });
    const btn = $('#lisuStartFormation', state.root);
    if (btn) {
      btn.textContent = '变队形进行中';
      btn.classList.add('is-running');
      btn.disabled = true;
    }
    const hint = $('#lisuFormationHint', state.root);
    if (hint) hint.textContent = '开始啦！请按亮起的顺序完成：跟步 → 跟步 → 饮水 → 展翅 → 转向。';
    setStatus('第三轮开始：可以点击上方顺序提示，也可以点击下方动作按钮。');
    renderFormationSequence();
    highlightExpectedFormationAction();
  }
  function renderFormationSequence() {
    const seq = level.phraseSequence || [];
    const box = $('#lisuSequence', state.root);
    if (!box) return;
    box.innerHTML = seq.map((a, i) => `<button type="button" class="lisu-step-chip ${i < state.phraseIndex ? 'done' : i === state.phraseIndex ? 'next' : ''}" data-seq-action="${safe(a)}">${safe(level.actionLabels?.[a] || a)}</button>`).join('');
    updateFormationPanel();
  }
  function updateFormationPanel() {
    $$('.lisu-formation-panel li', state.root).forEach((item, index) => {
      item.classList.toggle('done', index < state.formationIndex);
      item.classList.toggle('current', index === state.formationIndex);
    });
  }
  function highlightExpectedFormationAction() {
    const seq = level.phraseSequence || [];
    const expected = seq[state.phraseIndex];
    $$('.lisu-action', state.root).forEach(btn => {
      btn.classList.toggle('active', state.formationActive && btn.dataset.action === expected);
      btn.classList.remove('wrong');
    });
  }
  function inputFormation(action) {
    if (state.page !== 'formation') return;
    if (!state.formationActive) {
      startFormationChallenge();
      return;
    }
    const seq = level.phraseSequence || [];
    const expected = seq[state.phraseIndex];
    const ok = action === expected || (expected === 'step' && action === 'step');
    highlightAction(action, !ok);
    animatePeople(actionToClass(action));
    const hint = $('#lisuFormationHint', state.root);
    if (ok) {
      state.formationStats.right++;
      state.phraseIndex++;
      if (hint) hint.textContent = '动作正确！继续跟着亮起的提示完成下一步。';
    } else {
      state.formationStats.wrong++;
      if (hint) hint.textContent = `再试试：这一步应该是“${safe(level.actionLabels?.[expected] || expected)}”。`;
    }
    updateMetrics(state.formationStats.phrase, state.formationIndex, state.formationStats.right);
    if (action === 'drink') updateDancers(level.formationStages[state.formationIndex] || 'gather', 6, 'drink');
    if (action === 'wing') updateDancers(level.formationStages[state.formationIndex] || 'gather', 6, 'wing');
    if (action === 'turn') updateDancers('turnToStream', 6, 'turn');
    renderFormationSequence();
    if (state.phraseIndex >= seq.length) {
      state.phraseIndex = 0;
      state.formationStats.phrase++;
      state.formationIndex = Math.min((level.formationStages || []).length - 1, state.formationIndex + 1);
      updateMetrics(state.formationStats.phrase, state.formationIndex, state.formationStats.right);
      updateDancers(level.formationStages[state.formationIndex] || 'semicircle', 6, 'idle');
      renderFormationSequence();
      const stageName = ['分散', '靠拢', '换向', '集体队形'][state.formationIndex] || '集体队形';
      if (hint) hint.textContent = `完成一个乐句！队形进入“${stageName}”，继续下一组。`;
      if (state.formationStats.phrase >= 3) addTimer(setTimeout(renderFinale, 800));
    }
    highlightExpectedFormationAction();
  }
  function renderFinale() {
    state.page = 'final';
    stopAudio();
    shell(`
      ${stage('斑鸠吃水舞体验完成！', '全部舞者形成集体队形。', '', { joined: 6, formation: 'semicircle', leaderAction: 'playing celebrate', dancerAction: 'celebrate', pill: '葫芦笙小领舞' })}
      <article class="lisu-card">
        <div class="lisu-badge">🏅</div>
        <h3>获得称号：葫芦笙小领舞</h3>
        <p>你听到了葫芦笙的节拍，完成了跟步、饮水和展翅动作，还和大家一起体验了斑鸠吃水舞的集体队形变化。</p>
        <div class="lisu-controls"><button class="lisu-btn primary" id="lisuWatchVideo">观看完整舞蹈</button><button class="lisu-btn secondary" id="lisuRetryAll">再次挑战</button><button class="lisu-btn green" id="lisuContinue">继续剧情</button><button class="lisu-btn secondary" id="lisuMap">返回地图</button></div>
      </article>
    `);
    $('#lisuWatchVideo').addEventListener('click', showVideo);
    $('#lisuRetryAll').addEventListener('click', renderIntro);
    $('#lisuContinue').addEventListener('click', () => close());
    $('#lisuMap').addEventListener('click', () => close({ map: true }));
  }
  function showVideo() {
    const box = $('#lisuDanceVideoBox');
    const video = $('#lisuDanceVideo');
    const msg = $('#lisuDanceVideoMsg');
    if (!box || !video || !msg) return;
    box.classList.add('show');
    video.src = level.fullVideo || '';
    msg.textContent = '';
    video.onerror = () => { video.removeAttribute('src'); msg.textContent = fileMissingText('video'); };
    video.play?.().catch(() => { msg.textContent = fileMissingText('video'); });
  }
  function handleKey(event) {
    if (!state.overlay?.classList.contains('show')) return;
    if (event.key === 'Escape') return close();
    if (state.page === 'beat-listen' && event.code === 'Space') tapBeat(event);
    if (state.page === 'action' || state.page === 'formation') {
      if (event.code === 'Space') inputActionOrFormation('wing', event);
      if (event.key === 's' || event.key === 'S' || event.key === 'ArrowDown') inputActionOrFormation('drink', event);
      if (event.key === 'a' || event.key === 'A' || event.key === 'd' || event.key === 'D' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') inputActionOrFormation('step', event);
      if (event.key === 't' || event.key === 'T') inputActionOrFormation('turn', event);
    }
  }
  function inputActionOrFormation(action, event) {
    event.preventDefault();
    if (state.page === 'action') inputAction(action);
    else inputFormation(action);
  }
  function open() {
    state.overlay = $('#lisuDanceOverlay');
    state.root = $('#lisuDanceRoot');
    if (!state.overlay || !state.root) return;
    stopAudio();
    stopOuterBgm();
    state.overlay.classList.add('show');
    renderIntro();
  }
  function bind() {
    $('#openLisuDanceButton')?.addEventListener('click', open);
    $('#lisuDanceVideoClose')?.addEventListener('click', () => { $('#lisuDanceVideoBox')?.classList.remove('show'); const v = $('#lisuDanceVideo'); if (v) { v.pause(); v.removeAttribute('src'); } });
    document.addEventListener('keydown', handleKey);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.overlay?.classList.contains('show')) stopAudio(); });
    $('#lisuDanceOverlay')?.addEventListener('click', event => {
      if (!event.target.closest('#lisuDanceOverlay')) return;
      if (!state.overlay?.classList.contains('show')) return;
      stopOuterBgm();
      event.stopPropagation();
    });
    document.addEventListener('pointerdown', event => {
      if (event.target.closest('#lisuTap')) tapBeat(event);
    });
  }
  document.addEventListener('DOMContentLoaded', bind);
  window.LisuDanceGame = { open, close };
})();
