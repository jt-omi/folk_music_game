(function () {
  'use strict';

  const CONFIG_URL = 'lipuo-music-level.json';
  const FALLBACK_CONFIG = {
    gameTitle: '古乐寻声·五器合奏',
    pieceTitle: '《方山谣》',
    fullAudio: 'assets/audio/lipuo/tanjing-yueqin-sanxian.m4a',
    rhythmClip: 'assets/audio/lipuo/tanjing-yueqin-sanxian.m4a',
    fallbackAudio: 'assets/bgm-lipu.mp3',
    badgeTitle: '谈经古乐小乐师',
    completionTitle: '古乐重新响起',
    completionText: '竹笛、三弦、月琴、响篾和树叶拥有不同的音色。它们共同出现时，让谈经古乐的声音更加丰富。',
    instruments: [
      { id: 'zhudi', name: '竹笛', role: '吹奏 · 旋律', image: 'assets/dizi.jpg', audio: 'assets/audio/lipuo/instruments/zhudi.mp3', maxDuration: 10 },
      { id: 'sanxian', name: '三弦', role: '弹拨 · 低音', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Sanxian%2C_Tengwangge_%28Prince_of_Teng_Pavilion%29_%2831167793750%29.jpg/960px-Sanxian%2C_Tengwangge_%28Prince_of_Teng_Pavilion%29_%2831167793750%29.jpg', audio: 'assets/audio/lipuo/instruments/sanxian.m4a', maxDuration: 10 },
      { id: 'yueqin', name: '月琴', role: '弹拨 · 中音填充', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Yi_musical_instrument_%28yueqin%29_-_Yunnan_Provincial_Museum-_DSC02056.JPG/960px-Yi_musical_instrument_%28yueqin%29_-_Yunnan_Provincial_Museum-_DSC02056.JPG', audio: 'assets/audio/lipuo/instruments/yueqin.m4a', maxDuration: 10 },
      { id: 'xiangmie', name: '响篾', role: '铜制簧片 · 口腔共鸣', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/5_Leaf_Kouxian.jpg/960px-5_Leaf_Kouxian.jpg', audio: 'assets/audio/lipuo/instruments/xiangmie.mp3', maxDuration: 10 },
      { id: 'shuye', name: '树叶', role: '自然材料 · 用于伴奏', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Aaron_Burden_2015-07-28_%28Unsplash%29.jpg/960px-Aaron_Burden_2015-07-28_%28Unsplash%29.jpg', audio: 'assets/audio/lipuo/instruments/shuye.m4a', maxDuration: 10 }
    ],
    listeningClips: [
      { questionAudio: 'assets/audio/lipuo/questions/question-1.m4a', options: ['竹笛', '月琴', '三弦'], correctAnswers: ['竹笛', '月琴', '三弦'], feedback: '这段可以听到竹笛、月琴和三弦的声音线索。' },
      { questionAudio: 'assets/audio/lipuo/questions/question-2.m4a', options: ['月琴', '三弦', '树叶'], correctAnswers: ['月琴', '三弦'], feedback: '这段主要听辨月琴和三弦的弹拨声音。' }
    ],
    rhythm: {
      bpm: 80,
      timeSignature: '4/4',
      targetTimes: [0.222,0.654,1.175,1.668,2.259,2.777,3.346,3.969,4.61,5.257,5.88,6.509,7.127,7.699,8.308,8.921,9.601,10.211,10.791,11.396,11.924,12.546,13.14,13.675,14.269,14.879,15.436,16.06,16.609,17.183,17.739,18.32,18.863,19.435,20.03,20.634,21.177,21.696,22.294,22.929,23.389,23.982,24.558,25.096,25.602,26.194,26.762,27.34,27.938,28.535,29.093,29.712,30.307,30.886,31.465,31.975,32.573,33.144,33.716,34.291,34.86,35.406,35.967,36.579,37.133,37.71,38.272,38.875,39.45,40.029,40.601,41.125,41.667,42.221,42.746],
      perfectTolerance: 180,
      goodTolerance: 320,
      acceptableTolerance: 480,
      endTime: 43,
      note: '作者实拍 4/4 节拍：75 个真实目标拍点，正式界面按 4 个一组显示。'
    }
  };

  const state = {
    config: null,
    overlay: null,
    root: null,
    audio: null,
    audioContext: null,
    timers: [],
    rafId: 0,
    heard: new Set(),
    questionIndex: 0,
    questionPlayed: false,
    attempts: 0,
    rhythmRound: 0,
    rhythmActive: false,
    rhythmStart: 0,
    hits: [],
    matchedTargets: new Set(),
    liveStats: { perfect: 0, good: 0, acceptable: 0, miss: 0, extra: 0 },
    finished: false
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function safeText(value, fallback = '') {
    return String(value || fallback).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
  }

  function ensureAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!state.audioContext) state.audioContext = new AudioCtx();
    if (state.audioContext.state === 'suspended') state.audioContext.resume().catch(() => {});
    return state.audioContext;
  }

  function blip(freq = 520, duration = 0.09, gainValue = 0.045) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function addTimer(id) {
    state.timers.push(id);
    return id;
  }

  function clearAllTimers() {
    state.timers.forEach((id) => clearTimeout(id));
    state.timers = [];
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }

  function stopAudio() {
    if (!state.audio) return;
    try {
      state.audio.pause();
      state.audio.removeAttribute('src');
      state.audio.load();
    } catch (error) {
      console.warn('停止古乐音频时出现提示：', error);
    }
    state.audio = null;
  }

  function stopAll() {
    clearAllTimers();
    stopAudio();
    state.rhythmActive = false;
  }

  function pausePageBgm() {
    if (typeof window.stopDialogueBgm === 'function') {
      window.stopDialogueBgm();
    }
  }


  function setStatus(message, warning = false) {
    const el = $('.lipuo-status', state.root);
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('warn', !!warning);
  }

  function playGeneratedDemo(label, ms = 850) {
    setStatus(label || '音频素材正在准备中，先用提示音继续体验。', true);
    blip(480, 0.12, 0.05);
    addTimer(setTimeout(() => blip(620, 0.12, 0.045), 220));
    addTimer(setTimeout(() => blip(540, 0.12, 0.04), 440));
    return new Promise((resolve) => addTimer(setTimeout(resolve, ms)));
  }

  function playAudio(src, options = {}) {
    stopAudio();
    const fallback = options.fallback || state.config?.fallbackAudio;
    if (!src) return playGeneratedDemo('音频素材正在准备中，先用提示音继续体验。');
    return new Promise((resolve) => {
      const audio = new Audio(src);
      state.audio = audio;
      audio.preload = 'auto';
      audio.volume = typeof options.volume === 'number' ? options.volume : 0.56;
      let settled = false;
      let maxTimer = 0;
      const done = () => {
        if (settled) return;
        settled = true;
        if (maxTimer) clearTimeout(maxTimer);
        if (typeof options.onended === 'function') options.onended();
        resolve({ ok: true, fallback: false });
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        if (fallback && fallback !== src) {
          setStatus('正式音频素材正在准备中，当前使用本地演示音频完成流程。', true);
          playAudio(fallback, { volume: options.volume, fallback: '', onended: options.onended }).then(resolve);
        } else {
          playGeneratedDemo('音频素材正在准备中，先用提示音继续体验。').then(() => {
            if (typeof options.onended === 'function') options.onended();
            resolve({ ok: false, fallback: true });
          });
        }
      };
      audio.addEventListener('ended', done, { once: true });
      audio.addEventListener('error', fail, { once: true });
      audio.play().then(() => {
        if (options.maxDuration) {
          maxTimer = setTimeout(() => {
            try { audio.pause(); } catch (error) {}
            done();
          }, Math.max(0.5, Number(options.maxDuration)) * 1000);
        }
      }).catch(fail);
    });
  }

  async function loadConfig() {
    if (state.config) return state.config;
    try {
      const response = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('配置文件无法读取');
      state.config = await response.json();
    } catch (error) {
      console.warn('古乐寻声配置读取失败，使用内置演示配置：', error);
      state.config = FALLBACK_CONFIG;
    }
    state.config.instruments = state.config.instruments || FALLBACK_CONFIG.instruments;
    state.config.listeningClips = state.config.listeningClips || FALLBACK_CONFIG.listeningClips;
    state.config.rhythm = state.config.rhythm || FALLBACK_CONFIG.rhythm;
    return state.config;
  }

  function baseShell(content) {
    const cfg = state.config || FALLBACK_CONFIG;
    state.root.innerHTML = `
      <div class="lipuo-game-head">
        <div>
          <span class="lipuo-game-tag">俚濮彝族 · 音乐互动</span>
          <h2>${safeText(cfg.gameTitle, '古乐寻声·五器合奏')}</h2>
          <p>${safeText(cfg.pieceTitle, '谈经古乐代表性曲目')}</p>
        </div>
        <button class="lipuo-game-close" type="button" aria-label="退出古乐寻声">×</button>
      </div>
      ${content}
      <p class="lipuo-status" role="status">准备好了就开始听吧。</p>
    `;
    $('.lipuo-game-close', state.root).addEventListener('click', close);
  }

  function renderInstrumentGrid({ selectable = false, lit = false } = {}) {
    const roleMap = { zhudi: '吹奏 · 旋律', sanxian: '弹拨 · 低音', yueqin: '弹拨 · 中音填充', xiangmie: '铜制簧片 · 口腔共鸣', shuye: '自然材料 · 用于伴奏' };
    return `<div class="lipuo-instrument-grid">
      ${(state.config.instruments || []).map((item) => `
        <button class="instrument-card lipuo-instrument ${state.heard.has(item.id) ? 'heard' : ''} ${lit ? 'lit' : ''}" type="button" data-instrument-id="${safeText(item.id)}" ${selectable ? '' : ''}>
          <img src="${safeText(item.image)}" alt="${safeText(item.name)}">
          <span>${safeText(item.name)}</span>
          <small>${safeText(item.role || roleMap[item.id] || '')}</small>
        </button>
      `).join('')}
    </div>`;
  }

  function renderReview() {
    state.heard = new Set();
    baseShell(`
      <article class="lipuo-card">
        <h3>第一环节：五音初识</h3>
        <p>先点一点五件乐器，复习它们各自的声音。五种都试听过后，就能进入“古乐寻声”。</p>
        ${renderInstrumentGrid()}
        <div class="lipuo-controls">
          <button class="lipuo-btn primary" id="lipuoGoListen" type="button" disabled>进入古乐寻声</button>
          <button class="lipuo-btn secondary" id="lipuoExit" type="button">退出挑战</button>
        </div>
      </article>
    `);
    $$('.lipuo-instrument', state.root).forEach((button) => {
      button.addEventListener('click', () => {
        const item = state.config.instruments.find((i) => i.id === button.dataset.instrumentId);
        if (!item) return;
        $$('.lipuo-instrument', state.root).forEach((el) => el.classList.remove('active'));
        button.classList.add('active', 'heard');
        state.heard.add(item.id);
        setStatus('正在试听：' + item.name);
        playAudio(item.audio, { fallback: '', volume: 0.5, maxDuration: item.maxDuration || 10 }).then(() => button.classList.remove('active'));
        const go = $('#lipuoGoListen', state.root);
        if (go && state.heard.size >= state.config.instruments.length) go.disabled = false;
      });
    });
    $('#lipuoGoListen', state.root).addEventListener('click', () => {
      stopAudio();
      renderListening(0);
    });
    $('#lipuoExit', state.root).addEventListener('click', close);
  }

  function renderListening(index) {
    state.questionIndex = index;
    state.questionPlayed = false;
    state.attempts = 0;
    const question = state.config.listeningClips[index];
    if (!question) return renderRhythmIntro();
    baseShell(`
      <article class="lipuo-card">
        <h3>第二环节：古乐寻声 ${index + 1} / ${state.config.listeningClips.length}</h3>
        <p>先播放音乐，再从图片里选择这段声音中更突出的乐器。</p>
        <div class="lipuo-question-box">
          <button class="lipuo-btn primary" id="lipuoPlayQuestion" type="button">播放音乐</button>
          <div class="lipuo-option-grid">
            ${(question.options || []).map((name) => {
              const ins = state.config.instruments.find((i) => i.name === name) || {};
              return `<button class="lipuo-option" type="button" data-answer="${safeText(name)}" disabled>
                ${ins.image ? `<img src="${safeText(ins.image)}" alt="${safeText(name)}">` : ''}
                <span>${safeText(name)}</span>
              </button>`;
            }).join('')}
          </div>
          <button class="lipuo-btn primary" id="lipuoSubmitAnswer" type="button" disabled>提交选择</button>
        </div>
        <div class="lipuo-controls">
          <button class="lipuo-btn secondary" id="lipuoBackReview" type="button">返回试听</button>
          <button class="lipuo-btn secondary" id="lipuoExit" type="button">退出挑战</button>
        </div>
      </article>
    `);
    $('#lipuoPlayQuestion', state.root).addEventListener('click', () => {
      state.questionPlayed = true;
      $$('.lipuo-option', state.root).forEach((button) => { button.disabled = false; });
      $('#lipuoSubmitAnswer', state.root).disabled = false;
      setStatus('请仔细听，再选择你听到更突出的乐器。');
      playAudio(question.questionAudio, { fallback: state.config.fallbackAudio, volume: 0.54 });
    });
    $$('.lipuo-option', state.root).forEach((button) => {
      button.addEventListener('click', () => {
        if (!state.questionPlayed) return;
        button.classList.toggle('selected');
      });
    });
    $('#lipuoSubmitAnswer', state.root).addEventListener('click', () => answerListening(question));
    $('#lipuoBackReview', state.root).addEventListener('click', () => {
      stopAudio();
      renderReview();
    });
    $('#lipuoExit', state.root).addEventListener('click', close);
  }

  function answerListening(question) {
    if (!state.questionPlayed) {
      setStatus('先播放音乐，再选择答案。', true);
      return;
    }
    stopAudio();
    state.attempts += 1;
    const selectedAnswers = $$('.lipuo-option.selected', state.root).map((button) => button.dataset.answer);
    if (!selectedAnswers.length) {
      state.attempts -= 1;
      setStatus('请至少选择一个乐器，再提交答案。', true);
      return;
    }
    const acceptedAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers : [question.correctAnswer];
    const hasAllCorrect = acceptedAnswers.every((answer) => selectedAnswers.includes(answer));
    const hasNoExtra = selectedAnswers.every((answer) => acceptedAnswers.includes(answer));
    const right = hasAllCorrect && hasNoExtra;
    $$('.lipuo-option', state.root).forEach((button) => {
      if (selectedAnswers.includes(button.dataset.answer)) button.classList.add(right ? 'correct' : 'try-again');
    });
    if (right) {
      setStatus('听得很准！我们进入下一段。');
      blip(720, 0.12, 0.05);
      addTimer(setTimeout(() => renderListening(state.questionIndex + 1), 900));
      return;
    }
    if (state.attempts >= 2) {
      setStatus('这一段先记下来：' + (question.feedback || '之后可以换正式音频继续调整答案。'));
      addTimer(setTimeout(() => renderListening(state.questionIndex + 1), 1500));
      return;
    }
    setStatus(question.feedback || '再听一次，找找声音最明显的乐器。', true);
    state.questionPlayed = false;
    $('#lipuoSubmitAnswer', state.root).disabled = true;
    $$('.lipuo-option', state.root).forEach((el) => { el.disabled = true; el.classList.remove('selected'); });
  }

  function renderRhythmOrbit() {
    const instruments = state.config.instruments || [];
    return `<div class="lipuo-rhythm-orbit" aria-label="五件乐器">
      ${instruments.map((item, index) => `
        <button class="lipuo-orbit-instrument lipuo-orbit-${index + 1} lipuo-instrument" type="button" data-instrument-id="${safeText(item.id)}">
          <img src="${safeText(item.image)}" alt="${safeText(item.name)}">
          <span>${safeText(item.name)}</span>
        </button>
      `).join('')}
    </div>`;
  }

  function getBeatPattern(index) {
    const signature = String(state.config.rhythm?.timeSignature || '4/4');
    const count = Math.max(1, parseInt(signature.split('/')[0], 10) || 4);
    const pos = index % count;
    if (count === 4) {
      if (pos === 0) return { className: 'primary', label: '强' };
      if (pos === 2) return { className: 'secondary-strong', label: '次强' };
      return { className: 'weak', label: '弱' };
    }
    if (count === 3) return pos === 0 ? { className: 'primary', label: '强' } : { className: 'weak', label: '弱' };
    if (count === 2) return pos === 0 ? { className: 'primary', label: '强' } : { className: 'weak', label: '弱' };
    return pos === 0 ? { className: 'primary', label: '强' } : { className: 'weak', label: '弱' };
  }

  function renderTargetBeatTrack(rhythm) {
    const targets = rhythm.targetTimes || [];
    const count = Math.max(1, parseInt(String(rhythm.timeSignature || '4/4').split('/')[0], 10) || 4);
    return targets.map((_, index) => {
      const beat = getBeatPattern(index % count);
      const barClass = index % count === 0 ? 'bar-start' : '';
      return `<span class="lipuo-beat ${safeText(beat.className)} ${barClass}" data-target-index="${index}" title="第 ${index + 1} 拍"></span>`;
    }).join('');
  }

  function renderRhythmStage({ mode = 'intro', round = 1, message = '', result = null } = {}) {
    const rhythm = state.config.rhythm || {};
    const targetCount = (rhythm.targetTimes || []).length;
    const beatCount = Math.max(1, parseInt(String(rhythm.timeSignature || '4/4').split('/')[0], 10) || 4);
    const cueText = round === 1 ? '跟随谈经古乐的节拍，一起来拍一拍吧！' : '这次少一点提示，自己寻找稳定节拍。';
    const stats = result || { perfect: 0, good: 0, acceptable: 0, miss: 0, extra: 0, stability: 0, title: '准备开始' };
    const isIntro = mode === 'intro';
    const isResult = mode === 'result';
    const liveStats = isResult ? stats : (state.liveStats || { perfect: 0, good: 0, acceptable: 0, miss: 0, extra: 0 });
    const centerButton = isIntro
      ? '<button class="lipuo-big-tap lipuo-ready-tap" id="lipuoRoundOne" type="button"><span>开始</span><small>第1轮</small></button>'
      : isResult
        ? '<button class="lipuo-big-tap lipuo-finished-tap" type="button" disabled><span>完成</span><small>看表现</small></button>'
        : '<button class="lipuo-big-tap" id="lipuoTapButton" type="button"><span>拍一拍</span><small>点击 / 空格键</small></button>';
    const bottomButtons = isResult
      ? `${round === 1 ? '<button class="lipuo-arcade-btn lipuo-blue" id="lipuoRoundTwo" type="button">第二轮</button>' : '<button class="lipuo-arcade-btn lipuo-green" id="lipuoFinale" type="button">点亮五器</button>'}
          <button class="lipuo-arcade-btn lipuo-blue" id="lipuoRetryRound" type="button">再来一次</button>
          <button class="lipuo-arcade-btn lipuo-orange" id="lipuoExit" type="button">返回剧情</button>`
      : isIntro
        ? '<button class="lipuo-arcade-btn lipuo-green" id="lipuoRoundOneBottom" type="button">播放音乐</button><button class="lipuo-arcade-btn lipuo-blue" id="lipuoPreviewRhythm" type="button">看节拍</button><button class="lipuo-arcade-btn lipuo-orange" id="lipuoExit" type="button">返回剧情</button>'
        : '<button class="lipuo-arcade-btn lipuo-green lipuo-arcade-muted" type="button" disabled>音乐播放中</button><button class="lipuo-arcade-btn lipuo-blue" id="lipuoRetryRound" type="button">再听一次</button><button class="lipuo-arcade-btn lipuo-orange" id="lipuoStopRhythm" type="button">返回剧情</button>';
    return `
      <article class="lipuo-card lipuo-rhythm-card lipuo-rhythm-stage ${isIntro ? 'is-ready' : ''} ${isResult ? 'is-result' : ''}">
        <div class="lipuo-rhythm-border lipuo-border-top"></div>
        <div class="lipuo-rhythm-border lipuo-border-bottom"></div>
        <div class="lipuo-rhythm-corner corner-left-top"></div>
        <div class="lipuo-rhythm-corner corner-right-top"></div>
        <div class="lipuo-rhythm-corner corner-left-bottom"></div>
        <div class="lipuo-rhythm-corner corner-right-bottom"></div>

        <div class="lipuo-rhythm-piece-card">
          <b>谈经古乐代表性曲</b>
          <span>目：${safeText(state.config.pieceTitle || '《方山谣》')}</span>
        </div>
        <div class="lipuo-rhythm-title">
          <h3>古乐寻声 · 五器合奏</h3>
          <p>跟随谈经古乐的节拍，一起来拍一拍吧！</p>
        </div>
        <button class="lipuo-rhythm-pause" id="${isIntro ? 'lipuoExitTop' : 'lipuoStopRhythmTop'}" type="button" aria-label="暂停或返回">Ⅱ</button>
        <div class="lipuo-rhythm-vertical">谈<br>经<br>古<br>乐</div>

        <div class="lipuo-countdown lipuo-rhythm-count ${isResult ? 'lipuo-result-comment' : ''}" id="lipuoCountdown">
          ${safeText(message || (isIntro ? '准备' : isResult ? stats.title : '准备开始'))}
        </div>

        <section class="lipuo-rhythm-playfield" aria-label="古乐共拍拍击区">
          ${renderRhythmOrbit()}
          ${centerButton}
          <div class="lipuo-music-notes" aria-hidden="true">♪ ♫ ♪ ♩</div>
        </section>
        <div class="lipuo-rhythm-guide-rail" aria-hidden="true">
          <span class="lipuo-guide-line lipuo-guide-left"></span>
          <span class="lipuo-guide-line lipuo-guide-center"></span>
          <span class="lipuo-guide-line lipuo-guide-right"></span>
        </div>

        <aside class="lipuo-rhythm-side" aria-label="本轮表现">
          <h4>本轮表现</h4>
          <div class="lipuo-score-row"><span>准确拍：</span><b id="lipuoLiveAccurate">${isResult ? stats.perfect + stats.good : liveStats.perfect + liveStats.good}</b></div>
          <div class="lipuo-score-row"><span>接近拍：</span><b id="lipuoLiveClose">${isResult ? stats.acceptable : liveStats.acceptable}</b></div>
          <div class="lipuo-score-row"><span>漏拍：</span><b id="lipuoLiveMiss">${isResult ? stats.miss : liveStats.miss}</b></div>
          <div class="lipuo-score-divider"></div>
          <p class="lipuo-rhythm-encourage">${safeText(isResult ? stats.title : cueText)}</p>
        </aside>

        <div class="lipuo-beat-panel">
          <b>节拍提示</b>
          <div class="lipuo-beat-row lipuo-target-track" aria-label="节拍提示">
            ${renderTargetBeatTrack(rhythm)}
          </div>
          <div class="lipuo-live-feedback" id="lipuoLiveFeedback">实时反馈：准备开始，拍击后这里会显示准不准。</div>
        </div>
        <div class="lipuo-progress" aria-label="音乐播放进度"><span id="lipuoProgressBar"></span></div>
        <div class="lipuo-rhythm-actions">${bottomButtons}</div>
      </article>
    `;
  }

  function renderRhythmIntro() {
    baseShell(renderRhythmStage({ mode: 'intro', round: 1, message: '3 2 1' }));
    $('#lipuoRoundOne', state.root).addEventListener('click', () => startRhythmRound(1));
    $('#lipuoRoundOneBottom', state.root).addEventListener('click', () => startRhythmRound(1));
    $('#lipuoPreviewRhythm', state.root).addEventListener('click', () => {
      $$('.lipuo-beat', state.root).forEach((beat, index) => {
        addTimer(setTimeout(() => {
          beat.classList.add('active');
          addTimer(setTimeout(() => beat.classList.remove('active'), 240));
        }, index * 220));
      });
    });
    $('#lipuoExit', state.root).addEventListener('click', close);
    $('#lipuoExitTop', state.root).addEventListener('click', close);
  }

  function renderRhythmRound(round, message = '') {
    baseShell(renderRhythmStage({ mode: 'round', round, message: message || '准备开始' }));
    $('#lipuoTapButton', state.root).addEventListener('pointerdown', recordBeat);
    $$('.lipuo-instrument', state.root).forEach((button) => button.addEventListener('pointerdown', recordBeat));
    const stopRound = () => {
      stopAll();
      renderRhythmIntro();
    };
    $('#lipuoStopRhythm', state.root).addEventListener('click', stopRound);
    $('#lipuoStopRhythmTop', state.root).addEventListener('click', stopRound);
    $('#lipuoRetryRound', state.root).addEventListener('click', () => startRhythmRound(round));
  }

  function startRhythmRound(round) {
    stopAll();
    state.rhythmRound = round;
    state.hits = [];
    state.matchedTargets = new Set();
    state.liveStats = { perfect: 0, good: 0, acceptable: 0, miss: 0, extra: 0 };
    renderRhythmRound(round);
    requestAnimationFrame(() => centerTargetBeat(0, false));
    countdown(3, () => {
      const countdownEl = $('#lipuoCountdown', state.root);
      if (countdownEl) {
        countdownEl.textContent = '';
        countdownEl.classList.add('is-hidden-after-countdown');
      }
      state.rhythmActive = true;
      state.rhythmStart = performance.now();
      scheduleCues(round);
      updateProgress();
      addTimer(setTimeout(() => finishRhythmRound(round), getRhythmDurationMs() + 500));
      playAudio(state.config.rhythmClip, {
        fallback: state.config.fallbackAudio,
        volume: 0.48,
        onended: () => setStatus('音乐播放结束，节拍挑战会按标注的 43 秒完成。')
      });
    });
  }


  function getRhythmDurationMs() {
    const rhythm = state.config.rhythm || {};
    const targets = rhythm.targetTimes || [];
    const lastTarget = Math.max(...targets, 0);
    const endTime = Number(rhythm.endTime || 0);
    return Math.max(endTime || 0, lastTarget + 0.5, 1) * 1000;
  }

  function countdown(num, done) {
    const el = $('#lipuoCountdown', state.root);
    if (!el) return done();
    if (num <= 0) return done();
    el.textContent = String(num);
    blip(360 + num * 80, 0.08, 0.035);
    addTimer(setTimeout(() => countdown(num - 1, done), 1000));
  }

  function scheduleCues(round) {
    const targets = state.config.rhythm.targetTimes || [];
    targets.forEach((sec, index) => {
      addTimer(setTimeout(() => pulseBeat(index), Math.max(0, sec * 1000)));
    });
  }

  function pulseBeat(index) {
    const beat = $(`[data-target-index="${index}"]`, state.root);
    const stage = $('.lipuo-rhythm-stage', state.root);
    if (beat) {
      beat.classList.add('active', 'cue');
      if (stage) {
        stage.classList.add('is-beat-cue');
        addTimer(setTimeout(() => stage.classList.remove('is-beat-cue'), 260));
      }
      centerTargetBeat(index, true);
      addTimer(setTimeout(() => beat.classList.remove('active', 'cue'), 320));
    }
    if (index % 4 === 0) blip(680, 0.05, 0.026);
    else if (index % 4 === 2) blip(600, 0.045, 0.02);
  }

  function centerTargetBeat(index, smooth = true) {
    const track = $('.lipuo-target-track', state.root);
    const beat = $(`[data-target-index="${index}"]`, state.root);
    if (!track || !beat) return;
    const targetLeft = beat.offsetLeft - (track.clientWidth / 2) + (beat.offsetWidth / 2);
    track.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function updateProgress() {
    if (!state.rhythmActive) return;
    const total = getRhythmDurationMs();
    const elapsed = performance.now() - state.rhythmStart;
    const bar = $('#lipuoProgressBar', state.root);
    if (bar) bar.style.width = Math.min(100, (elapsed / total) * 100) + '%';
    markLiveMisses(elapsed);
    state.rafId = requestAnimationFrame(updateProgress);
  }

  function recordBeat(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!state.rhythmActive) return;
    const time = performance.now() - state.rhythmStart;
    state.hits.push(time);
    blip(760, 0.055, 0.025);
    const tap = $('#lipuoTapButton', state.root);
    if (tap) {
      tap.classList.add('hit');
      addTimer(setTimeout(() => tap.classList.remove('hit'), 120));
    }
    const stage = $('.lipuo-rhythm-stage', state.root);
    if (stage) {
      stage.classList.add('is-player-hit');
      addTimer(setTimeout(() => stage.classList.remove('is-player-hit'), 180));
    }
    const instrument = event?.target?.closest?.('.lipuo-instrument');
    if (instrument) {
      instrument.classList.add('active');
      addTimer(setTimeout(() => instrument.classList.remove('active'), 180));
    }
    const match = matchLiveTarget(time);
    updateLiveFeedback(match, time);
  }

  function matchLiveTarget(time) {
    const rhythm = state.config.rhythm || {};
    const targets = (rhythm.targetTimes || []).map((sec) => sec * 1000);
    let bestIndex = -1;
    let bestDiff = Infinity;
    targets.forEach((target, index) => {
      if (state.matchedTargets.has(index)) return;
      const diff = Math.abs(time - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });
    if (bestIndex < 0 || bestDiff > (rhythm.acceptableTolerance || 480)) {
      state.liveStats.extra += 1;
      updateLiveStats();
      return { grade: 'extra', label: '多拍', diff: bestDiff, index: -1 };
    }
    state.matchedTargets.add(bestIndex);
    const el = $(`[data-target-index="${bestIndex}"]`, state.root);
    let grade = 'acceptable';
    let label = '接近';
    if (bestDiff <= (rhythm.perfectTolerance || 180)) { grade = 'perfect'; label = '准确'; state.liveStats.perfect += 1; }
    else if (bestDiff <= (rhythm.goodTolerance || 320)) { grade = 'good'; label = '较准'; state.liveStats.good += 1; }
    else { state.liveStats.acceptable += 1; }
    if (el) {
      el.classList.remove('missed');
      el.classList.add('matched', 'hit-' + grade);
      el.dataset.feedback = label;
      centerTargetBeat(bestIndex, true);
    }
    updateLiveStats();
    return { grade, label, diff: bestDiff, index: bestIndex };
  }

  function markLiveMisses(elapsed) {
    const rhythm = state.config.rhythm || {};
    const tolerance = rhythm.acceptableTolerance || 480;
    let miss = 0;
    (rhythm.targetTimes || []).forEach((sec, index) => {
      const passed = sec * 1000 + tolerance < elapsed;
      if (!passed || state.matchedTargets.has(index)) return;
      miss += 1;
      const el = $(`[data-target-index="${index}"]`, state.root);
      if (el) el.classList.add('missed');
    });
    if (miss !== state.liveStats.miss) {
      state.liveStats.miss = miss;
      updateLiveStats();
    }
  }

  function updateLiveStats() {
    const accurate = $('#lipuoLiveAccurate', state.root);
    const close = $('#lipuoLiveClose', state.root);
    const miss = $('#lipuoLiveMiss', state.root);
    if (accurate) accurate.textContent = String((state.liveStats.perfect || 0) + (state.liveStats.good || 0));
    if (close) close.textContent = String(state.liveStats.acceptable || 0);
    if (miss) miss.textContent = String(state.liveStats.miss || 0);
  }

  function updateLiveFeedback(match, time) {
    const box = $('#lipuoLiveFeedback', state.root);
    if (!box || !match) return;
    box.className = 'lipuo-live-feedback ' + match.grade;
    if (match.grade === 'extra') {
      box.textContent = '实时反馈：这一拍没有贴近目标点，算作多拍。';
      return;
    }
    const sec = (time / 1000).toFixed(2);
    box.textContent = `实时反馈：第 ${match.index + 1} 拍 ${match.label}，偏差约 ${Math.round(match.diff)} ms（${sec}s）。`;
  }

  function finishRhythmRound(round) {
    if (!state.rhythmActive) return;
    state.rhythmActive = false;
    stopAudio();
    clearAllTimers();
    const result = evaluateRhythm();
    renderRhythmResult(round, result);
  }

  function evaluateRhythm() {
    const rhythm = state.config.rhythm;
    const targets = (rhythm.targetTimes || []).map((sec) => sec * 1000);
    const matchedHits = new Set();
    const matchedTargets = new Set();
    const stats = { perfect: 0, good: 0, acceptable: 0, miss: 0, extra: 0, averageOffset: 0 };
    let offsetTotal = 0;

    state.hits.forEach((hit, hitIndex) => {
      let bestIndex = -1;
      let bestDiff = Infinity;
      targets.forEach((target, targetIndex) => {
        if (matchedTargets.has(targetIndex)) return;
        const diff = Math.abs(hit - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = targetIndex;
        }
      });
      if (bestIndex < 0 || bestDiff > rhythm.acceptableTolerance) return;
      matchedHits.add(hitIndex);
      matchedTargets.add(bestIndex);
      offsetTotal += bestDiff;
      if (bestDiff <= rhythm.perfectTolerance) stats.perfect += 1;
      else if (bestDiff <= rhythm.goodTolerance) stats.good += 1;
      else stats.acceptable += 1;
    });

    stats.miss = Math.max(0, targets.length - matchedTargets.size);
    stats.extra = Math.max(0, state.hits.length - matchedHits.size);
    const matched = matchedTargets.size || 1;
    stats.averageOffset = Math.round(offsetTotal / matched);
    stats.stability = Math.max(0, Math.round((matchedTargets.size / Math.max(1, targets.length)) * 100 - stats.extra * 4));
    stats.title = stats.stability >= 85 ? '节拍非常稳定' : stats.stability >= 60 ? '已经跟上了大部分节拍' : (state.hits.length ? '再听一次强拍的位置会更好' : '你已经勇敢完成了第一次古乐共拍');
    return stats;
  }

  function renderRhythmResult(round, result) {
    baseShell(renderRhythmStage({ mode: 'result', round, result, message: '本轮完成' }));
    const next = round === 1 ? $('#lipuoRoundTwo', state.root) : $('#lipuoFinale', state.root);
    if (next) next.addEventListener('click', () => (round === 1 ? startRhythmRound(2) : renderFinale()));
    $('#lipuoRetryRound', state.root).addEventListener('click', () => startRhythmRound(round));
    $('#lipuoExit', state.root).addEventListener('click', close);
    const top = $('#lipuoStopRhythmTop', state.root);
    if (top) top.addEventListener('click', close);
  }

  function renderFinale() {
    stopAll();
    const instruments = state.config.instruments || [];
    baseShell(`
      <article class="lipuo-finale-scene" aria-label="古乐重新响起通关弹窗">
        <div class="lipuo-finale-backdrop" aria-hidden="true"></div>
        <section class="lipuo-finale-modal" role="dialog" aria-modal="true" aria-labelledby="lipuoFinaleTitle">
          <div class="lipuo-finale-ribbon">谈经古乐小乐师</div>
          <h3 id="lipuoFinaleTitle">${safeText(state.config.completionTitle || '古乐重新响起')}</h3>
          <p class="lipuo-finale-subtitle">五件乐器重新加入合奏，听——古乐又响起来了！</p>
          <div class="lipuo-finale-instruments" aria-label="五件乐器逐个点亮">
            ${instruments.map((item, index) => `
              <button class="lipuo-finale-instrument" type="button" data-final-instrument="${safeText(item.id)}" style="--i:${index}">
                <span class="lipuo-finale-glow" aria-hidden="true"></span>
                <img src="${safeText(item.image)}" alt="${safeText(item.name)}">
                <b>${safeText(item.name)}</b>
                <small>${safeText(item.role || '')}</small>
              </button>
            `).join('')}
          </div>
          <p class="lipuo-finale-text">${safeText(state.config.completionText || FALLBACK_CONFIG.completionText)}</p>
          <div class="lipuo-badge-title">🏅 ${safeText(state.config.badgeTitle || '谈经古乐小乐师')}</div>
          <div class="lipuo-controls lipuo-finale-controls">
            <button class="lipuo-btn secondary" id="lipuoPlayFull" type="button">再次欣赏</button>
            <button class="lipuo-btn secondary" id="lipuoRestart" type="button">重新挑战</button>
            <button class="lipuo-btn primary" id="lipuoContinue" type="button">继续剧情</button>
          </div>
        </section>
      </article>
    `);
    $$('.lipuo-finale-instrument', state.root).forEach((button, index) => {
      addTimer(setTimeout(() => {
        button.classList.add('is-visible');
        blip(420 + index * 55, 0.06, 0.026);
      }, 180 + 320 * index));
      addTimer(setTimeout(() => {
        button.classList.add('is-lit');
        blip(620 + index * 70, 0.11, 0.04);
      }, 340 + 320 * index));
    });
    addTimer(setTimeout(() => {
      playAudio(state.config.fullAudio, { fallback: state.config.fallbackAudio, volume: 0.5 });
    }, 520 + instruments.length * 320));
    $('#lipuoPlayFull', state.root).addEventListener('click', () => playAudio(state.config.fullAudio, { fallback: state.config.fallbackAudio, volume: 0.5 }));
    $('#lipuoRestart', state.root).addEventListener('click', renderReview);
    $('#lipuoContinue', state.root).addEventListener('click', close);
  }

  function handleKeydown(event) {
    if (!state.overlay || !state.overlay.classList.contains('show')) return;
    if (event.code === 'Space') recordBeat(event);
    if (event.key === 'Escape') close();
  }

  async function open() {
    state.overlay = $('#lipuoEnsembleOverlay');
    state.root = $('#lipuoEnsembleRoot');
    if (!state.overlay || !state.root) {
      console.warn('古乐寻声容器不存在。');
      return;
    }
    await loadConfig();
    stopAll();
    pausePageBgm();
    state.overlay.classList.add('show');
    state.overlay.setAttribute('aria-hidden', 'false');
    ensureAudioContext();
    renderReview();
  }

  function close() {
    stopAll();
    if (state.overlay) {
      state.overlay.classList.remove('show');
      state.overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function bind() {
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.overlay?.classList.contains('show')) {
        stopAll();
        setStatus('页面切换后已安全停止音乐，请重新开始当前环节。', true);
      }
    });
    const openButton = $('#openLipuoEnsembleButton');
    if (openButton) openButton.addEventListener('click', open);
  }

  document.addEventListener('DOMContentLoaded', bind);
  window.LipuoEnsembleGame = { open, close, stopAll };
})();
