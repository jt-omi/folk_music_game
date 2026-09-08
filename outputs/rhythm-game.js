(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  class EthnicRhythmGame {
    constructor(options = {}) {
      this.levelUrl = options.levelUrl || 'rhythm-levels.json';
      this.levels = [];
      this.level = null;
      this.container = null;
      this.audioContext = null;
      this.audioBuffer = null;
      this.hitBuffers = [];
      this.source = null;
      this.gain = null;
      this.phase = 'idle';
      this.clicks = [];
      this.playStartAudioTime = 0;
      this.playStartPerfTime = 0;
      this.segmentStartMs = 0;
      this.segmentEndMs = 0;
      this.raf = 0;
      this.cueIndex = 0;
      this.callbacks = {};
      this.boundKeyHandler = event => this.handleKey(event);
    }

    async init(containerSelector = '#rhythmGameOverlay') {
      this.container = typeof containerSelector === 'string' ? $(containerSelector) : containerSelector;
      if (!this.container) return;
      this.bindUi();
      await this.loadLevels();
    }

    async loadLevels() {
      try {
        const response = await fetch(this.levelUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        this.levels = await response.json();
      } catch (error) {
        console.warn('[rhythm-game] rhythm-levels.json 加载失败', error);
        this.levels = [];
      }
    }

    bindUi() {
      $('#rgClose', this.container)?.addEventListener('click', () => this.close());
      $('#rgExit', this.container)?.addEventListener('click', () => this.close());
      $('#rgListen', this.container)?.addEventListener('click', () => this.playMode('listen'));
      $('#rgPractice', this.container)?.addEventListener('click', () => this.nextPracticeStep());
      $('#rgHitButton', this.container)?.addEventListener('pointerdown', event => {
        event.preventDefault();
        this.registerHit('button');
      });
      $('#rgInstrumentPad', this.container)?.addEventListener('pointerdown', event => {
        if (event.target.closest('button')) return;
        event.preventDefault();
        this.registerHit('instrument');
      });
      $('#rgListenAgain', this.container)?.addEventListener('click', () => this.playMode('listen'));
      $('#rgRetry', this.container)?.addEventListener('click', () => this.resetChallenge());
      $('#rgContinue', this.container)?.addEventListener('click', () => this.continueStory());
      this.container.addEventListener('click', event => {
        if (event.target === this.container) this.close();
      });
    }

    async open(levelId, callbacks = {}) {
      this.callbacks = callbacks;
      if (!this.levels.length) await this.loadLevels();
      this.level = this.levels.find(item => item.id === levelId) || this.levels[0];
      if (!this.level || !this.container) return;
      this.resetRuntime();
      this.renderLevel();
      this.container.classList.add('rg-show');
      document.addEventListener('keydown', this.boundKeyHandler);
      await this.prepareAudio();
    }

    close() {
      this.stopAudio();
      this.container?.classList.remove('rg-show');
      document.removeEventListener('keydown', this.boundKeyHandler);
      this.callbacks.onClose?.();
    }

    continueStory() {
      this.stopAudio();
      this.container?.classList.remove('rg-show');
      document.removeEventListener('keydown', this.boundKeyHandler);
      this.callbacks.onContinue?.(this.lastResult || null);
    }

    resetRuntime() {
      this.stopAudio();
      this.phase = 'idle';
      this.clicks = [];
      this.lastResult = null;
      this.cueIndex = 0;
    }

    resetChallenge() {
      this.resetRuntime();
      this.renderLevel();
      this.setStatus('重新开始：可以先完整聆听，也可以直接进入练习。');
    }

    renderLevel() {
      const level = this.level;
      $('#rgEthnicGroup', this.container).textContent = level.ethnicGroup || '民族音乐';
      $('#rgPieceTitle', this.container).textContent = level.pieceTitle || '节奏挑战';
      $('#rgInstrument', this.container).textContent = level.instrument || '代表性乐器';
      $('#rgMeter', this.container).textContent = (level.timeSignature || '4/4') + ' · ' + (level.bpm || '--') + ' BPM';
      $('#rgDescription', this.container).textContent = level.description || '听一听，再跟着拍。';
      $('#rgInstrumentImage', this.container).src = level.instrumentImage || '';
      $('#rgInstrumentImage', this.container).alt = (level.instrument || '乐器') + '图片';
      $('#rgProgressBar', this.container).style.width = '0%';
      $('#rgResult', this.container).classList.remove('rg-show');
      $('#rgPractice', this.container).textContent = '开始练习';
      $('#rgPractice', this.container).disabled = false;
      this.renderBeatHints();
      this.setStatus('第一步：先点“完整聆听”，感受音乐的速度和强弱。');
    }

    renderBeatHints(activeIndex = -1) {
      const [beatsText] = String(this.level.timeSignature || '4/4').split('/');
      const beats = Math.max(1, Number(beatsText) || 4);
      const box = $('#rgBeats', this.container);
      box.style.gridTemplateColumns = 'repeat(' + beats + ', minmax(0, 1fr))';
      box.innerHTML = Array.from({ length: beats }, (_, index) => {
        const strong = index === 0;
        const label = strong ? '强拍' : (beats === 4 && index === 2 ? '次强' : '弱拍');
        return '<div class="rg-beat ' + (strong ? 'rg-strong ' : '') + (index === activeIndex ? 'rg-active' : '') + '"><strong>' + (index + 1) + '</strong><small>' + label + '</small></div>';
      }).join('');
    }

    async ensureAudioContext() {
      if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      return this.audioContext;
    }

    async fetchBuffer(url) {
      const audio = await this.ensureAudioContext();
      const response = await fetch(url);
      if (!response.ok) throw new Error(url + ' HTTP ' + response.status);
      const arrayBuffer = await response.arrayBuffer();
      return await audio.decodeAudioData(arrayBuffer);
    }

    async prepareAudio() {
      this.setStatus('正在准备本地音频……');
      try {
        this.audioBuffer = await this.fetchBuffer(this.level.audio);
        this.hitBuffers = [];
        for (const url of this.level.hitSounds || []) {
          try { this.hitBuffers.push(await this.fetchBuffer(url)); } catch (error) { console.warn('[rhythm-game] hit sound load failed', error); }
        }
        this.setStatus('音频准备好了。可以开始完整聆听。');
      } catch (error) {
        console.warn('[rhythm-game] audio load failed', error);
        this.audioBuffer = null;
        this.setStatus('音频加载失败，但页面不会卡住。请检查 rhythm-levels.json 里的 audio 路径。', true);
      }
    }

    playGeneratedHit() {
      this.ensureAudioContext().then(audio => {
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(720, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      });
    }

    playHitSound() {
      this.flashInstrument();
      if (!this.hitBuffers.length || !this.audioContext) return this.playGeneratedHit();
      const source = this.audioContext.createBufferSource();
      const gain = this.audioContext.createGain();
      source.buffer = this.hitBuffers[0];
      gain.gain.value = 0.18;
      source.connect(gain);
      gain.connect(this.audioContext.destination);
      source.start();
      source.stop(this.audioContext.currentTime + 0.14);
    }

    async playMode(mode) {
      if (!this.audioBuffer) {
        this.setStatus('暂时不能播放：音频没有加载成功。', true);
        return;
      }
      await this.ensureAudioContext();
      this.stopAudio();
      this.phase = mode;
      this.clicks = mode === 'listen' || mode === 'basic' ? this.clicks : [];
      this.segmentStartMs = Math.max(0, Number(this.level.startTime || 0) * 1000);
      this.segmentEndMs = Math.max(this.segmentStartMs + 1000, Number(this.level.endTime || this.audioBuffer.duration) * 1000);
      const offset = this.segmentStartMs / 1000;
      const duration = Math.min(this.audioBuffer.duration - offset, (this.segmentEndMs - this.segmentStartMs) / 1000);
      this.source = this.audioContext.createBufferSource();
      this.gain = this.audioContext.createGain();
      this.source.buffer = this.audioBuffer;
      this.gain.gain.value = mode === 'demo' ? 0.2 : 0.55;
      this.source.connect(this.gain);
      this.gain.connect(this.audioContext.destination);
      this.playStartAudioTime = this.audioContext.currentTime;
      this.playStartPerfTime = performance.now();
      this.cueIndex = 0;
      this.source.onended = () => this.handlePlaybackEnded(mode);
      this.source.start(0, offset, duration);
      this.animateProgress(mode);
      const text = {
        listen: '完整聆听中：这一次只听，不需要点击。',
        basic: '基础节拍练习：看强拍、弱拍提示，跟着稳定点。',
        follow: '跟随音乐挑战：点击乐器、按钮或按空格键。',
        demo: 'NPC 正在示范特色节奏，请先观察。',
        mimic: '特色节奏模仿：现在轮到你独立完成。'
      }[mode] || '节奏挑战中。';
      this.setStatus(text);
    }

    nextPracticeStep() {
      if (this.phase === 'idle' || this.phase === 'listen' || this.phase === 'listened') {
        $('#rgPractice', this.container).textContent = '跟随音乐';
        this.playMode('basic');
      } else if (this.phase === 'basic' || this.phase === 'basicDone') {
        $('#rgPractice', this.container).textContent = '特色模仿';
        this.playMode('follow');
      } else if (this.phase === 'followDone') {
        $('#rgPractice', this.container).textContent = '我来模仿';
        this.playMode('demo');
      } else if (this.phase === 'demoDone') {
        $('#rgPractice', this.container).disabled = true;
        this.playMode('mimic');
      }
    }

    handlePlaybackEnded(mode) {
      cancelAnimationFrame(this.raf);
      $('#rgProgressBar', this.container).style.width = '100%';
      if (mode === 'listen') {
        this.phase = 'listened';
        this.setStatus('聆听完成。现在可以进入基础节拍练习。');
      } else if (mode === 'basic') {
        this.phase = 'basicDone';
        this.setStatus('基础节拍练习完成。下一步：跟随音乐点击。');
      } else if (mode === 'follow') {
        this.phase = 'followDone';
        this.showResult('follow');
      } else if (mode === 'demo') {
        this.phase = 'demoDone';
        this.setStatus('NPC 示范完成。点击“我来模仿”，自己试一次。');
      } else if (mode === 'mimic') {
        this.phase = 'mimicDone';
        this.showResult('mimic');
      }
    }

    animateProgress(mode) {
      const total = Math.max(1, this.segmentEndMs - this.segmentStartMs);
      const bpm = Number(this.level.bpm || 90);
      const beatMs = 60000 / bpm;
      const beats = Math.max(1, Number(String(this.level.timeSignature || '4/4').split('/')[0]) || 4);
      const tick = () => {
        const elapsed = performance.now() - this.playStartPerfTime;
        $('#rgProgressBar', this.container).style.width = Math.min(100, elapsed / total * 100) + '%';
        if (mode === 'basic' || mode === 'listen') {
          const beatIndex = Math.floor(elapsed / beatMs) % beats;
          this.renderBeatHints(beatIndex);
        }
        if ((mode === 'follow' || mode === 'demo' || mode === 'mimic') && this.level.showCue !== false) {
          const next = this.level.targetTimes?.[this.cueIndex];
          if (typeof next === 'number' && elapsed >= next - 120) {
            this.flashCue();
            this.cueIndex += 1;
          }
        }
        if (elapsed < total + 80 && this.source) this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    registerHit(inputType) {
      if (!['follow', 'mimic', 'basic'].includes(this.phase)) return;
      const timeMs = Math.round(performance.now() - this.playStartPerfTime);
      this.clicks.push({ timeMs, inputType });
      this.playHitSound();
      if (this.phase === 'basic') this.setStatus('点击时间：' + timeMs + ' ms。练习阶段不计分。');
    }

    evaluateClicks() {
      const targets = Array.isArray(this.level.targetTimes) ? this.level.targetTimes : [];
      const used = new Set();
      const results = [];
      let extra = 0;
      for (const click of this.clicks) {
        let bestIndex = -1;
        let bestDelta = Infinity;
        targets.forEach((target, index) => {
          if (used.has(index)) return;
          const delta = Math.abs(click.timeMs - target);
          if (delta < bestDelta) { bestDelta = delta; bestIndex = index; }
        });
        if (bestIndex >= 0 && bestDelta <= Number(this.level.acceptableTolerance || 220)) {
          used.add(bestIndex);
          let grade = 'acceptable';
          if (bestDelta <= Number(this.level.perfectTolerance || 70)) grade = 'perfect';
          else if (bestDelta <= Number(this.level.goodTolerance || 130)) grade = 'good';
          results.push({ grade, delta: bestDelta });
        } else {
          extra += 1;
        }
      }
      const counts = { perfect: 0, good: 0, acceptable: 0, miss: Math.max(0, targets.length - used.size), extra };
      results.forEach(item => counts[item.grade] += 1);
      const matched = results.length;
      const avgError = matched ? Math.round(results.reduce((sum, item) => sum + item.delta, 0) / matched) : 999;
      const stability = Math.max(0, Math.round(100 - avgError / Math.max(1, Number(this.level.acceptableTolerance || 220)) * 100));
      const title = matched >= targets.length * .8 && stability >= 70 ? '节奏小达人' : matched >= targets.length * .55 ? '稳定演奏者' : '勇敢体验者';
      return { counts, matched, total: targets.length, stability, title };
    }

    showResult(mode) {
      this.lastResult = this.evaluateClicks();
      const r = this.lastResult;
      $('#rgResultTitle', this.container).textContent = r.title;
      $('#rgPerfect', this.container).textContent = r.counts.perfect;
      $('#rgGood', this.container).textContent = r.counts.good;
      $('#rgAcceptable', this.container).textContent = r.counts.acceptable;
      $('#rgMiss', this.container).textContent = r.counts.miss;
      $('#rgExtra', this.container).textContent = r.counts.extra;
      $('#rgStability', this.container).textContent = r.stability + '%';
      $('#rgResultText', this.container).textContent = (this.level.cultureFeedback || '你完成了一次节奏体验。') + ' 本次记录了 ' + this.clicks.length + ' 次点击。';
      $('#rgResult', this.container).classList.add('rg-show');
      this.setStatus(mode === 'mimic' ? '特色节奏模仿完成。' : '跟随音乐挑战完成，可以看结果啦。');
    }

    stopAudio() {
      cancelAnimationFrame(this.raf);
      if (this.source) {
        try { this.source.stop(); } catch (_) {}
        this.source.disconnect();
      }
      if (this.gain) this.gain.disconnect();
      this.source = null;
      this.gain = null;
    }

    flashInstrument() {
      const pad = $('#rgInstrumentPad', this.container);
      const button = $('#rgHitButton', this.container);
      pad?.classList.remove('rg-hit');
      button?.classList.remove('rg-hit');
      void pad?.offsetWidth;
      pad?.classList.add('rg-hit');
      button?.classList.add('rg-hit');
      setTimeout(() => { pad?.classList.remove('rg-hit'); button?.classList.remove('rg-hit'); }, 180);
    }

    flashCue() {
      const cue = $('#rgCue', this.container);
      cue?.classList.remove('rg-cue');
      void cue?.offsetWidth;
      cue?.classList.add('rg-cue');
    }

    setStatus(message, isError = false) {
      const box = $('#rgStatus', this.container);
      if (!box) return;
      box.textContent = message;
      box.classList.toggle('rg-error', !!isError);
    }

    handleKey(event) {
      if (!this.container?.classList.contains('rg-show')) return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || event.repeat) return;
      if (event.code === 'Space') {
        event.preventDefault();
        this.registerHit('space');
      }
      if (event.key === 'Escape') this.close();
    }
  }

  window.EthnicRhythmGame = new EthnicRhythmGame();
  document.addEventListener('DOMContentLoaded', () => window.EthnicRhythmGame.init('#rhythmGameOverlay'));
})();
