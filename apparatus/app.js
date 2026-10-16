/* 七罪装置 · 交互演示 v2
   每站一套独立的「交互语法」：不同的身体动作 → 不同的反馈逻辑
   01 傲慢=仰视(姿态维持/会衰减)  02 嫉妒=偷看(不可逆累积)  03 愤怒=忍耐(时间压力/可失败)
   04 懒惰=抵抗便利(真实劳动/诱惑递增) 05 贪婪=竞价(经济系统/实时通胀) 06 食欲=吞咽(节拍/有上限)
   07 色欲=反向靠近(越近越消失)
*/
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const map = (v, a, b, c, d) => c + (clamp(v, a, b) - a) / (b - a) * (d - c);
const lerp = (a, b, t) => a + (b - a) * t;

/* ── 音频 ── */
const A = {
  ctx: null, muted: false,
  ensure() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  tone(freq, dur = .3, type = 'sine', gain = .12) {
    if (this.muted) return; const c = this.ensure();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + .02);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur + .05);
  },
  noise(dur = .5, gain = .16) {
    if (this.muted) return; const c = this.ensure();
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    const g = c.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
};

/* ── SVG 辅助 ── */
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

/* ── 全局状态 ── */
const S = {
  present: false, dist: 2.4, gaze: 0, dwell: 0, idle: 0,
  /* 01 傲慢 */ halo: 0, gazeHold: 0, bestHold: 0, lookedDown: false,
  /* 02 嫉妒 */ peeks: 0, selfScore: 7.0, distort: 0,
  /* 03 愤怒 */ heat: 0, strikes: 0, endure: 0, provokes: 0, overload: false,
  /* 04 懒惰 */ typed: 0, tempt: 0, delegated: false, wrote: false,
  /* 05 贪婪 */ coin: 100, bought: 0, prices: [18, 24, 32, 40, 55],
  /* 06 食欲 */ full: 0, swallows: 0, hits: 0, beats: 0, overflow: false,
  /* 07 色欲 */ clarity: 0, desire: 0, restrain: 0, minDist: 9, restrainWin: false,
  /* 通用 */ micOn: false, vol: 0
};
const R = {};
let cur = 0, lastT = performance.now(), micData = null, micStream = null;
let subjectId = '0000';
let timers = [], bound = [];

/* 事件登记，切站统一解绑 */
function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); bound.push([el, ev, fn, opt]); }
function offAll() { bound.forEach(([el, ev, fn, opt]) => el.removeEventListener(ev, fn, opt)); bound = []; timers.forEach(clearInterval); timers = []; }

/* ══════════════════════════════════════════════
   七站定义
   ══════════════════════════════════════════════ */
const SINS = [

  /* ───────── 01 傲慢：仰视 ───────── */
  {
    key: 'pride', num: '01', name: '傲慢', en: 'PRIDE', color: '#4d9bff',
    img: 'assets/01_pride.jpg', paradigm: 'ALGORITHMIC OVERTRUST', baseline: 63, mlabel: '算法盲从',
    meaning: '路西法因"自比至高"而坠落，光环自此破碎——傲慢的本质不是强大，而是"我即标准"。',
    gesture: '仰　视', sensors: ['姿态识别 · 视线仰角', '电容触摸'],
    gdesc: '傲慢不要求你靠近，它要求你<strong>仰视</strong>。鼠标越靠画面底部＝仰角越大；一旦平视或俯视，光环立刻熄灭。光环还会持续衰减——崇拜必须维持，不能一劳永逸。',
    fx: {
      svg: () => {
        let g = '<defs><filter id="fP" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>';
        for (let i = 0; i < 7; i++)
          g += `<path class="arc" d="${arc(300, 190, 132, -90 + i * 51.4 + 4, -90 + (i + 1) * 51.4 - 4)}" stroke="#dbe9ff" stroke-width="7" fill="none" opacity="0" stroke-linecap="round" filter="url(#fP)"/>`;
        g += '<g class="code" opacity="0">';
        for (let i = 0; i < 14; i++) g += `<rect x="${40 + i * 38}" y="640" width="3" height="${30 + Math.random() * 90}" fill="#4d9bff" opacity=".7"/>`;
        g += '</g>';
        return g;
      },
      update(ctx) {
        const arcs = ctx.q('.arc', true), code = ctx.q('.code');
        const worshipping = S.present && S.gaze > .52;
        const target = worshipping ? Math.round(map(S.gaze, .52, 1, 0, 7)) : 0;
        ctx.lit = lerp(ctx.lit ?? 0, target, target > (ctx.lit ?? 0) ? .022 : .14);   // 升得慢，塌得快
        const lit = ctx.lit; S.halo = lit;
        if (worshipping) { S.gazeHold += 1 / 60; S.bestHold = Math.max(S.bestHold, S.gazeHold); } else S.gazeHold = 0;
        const down = S.present && S.gaze < .34;
        if (down) S.lookedDown = true;
        arcs.forEach((a, i) => {
          const on = i < lit;
          const v = on ? .5 + .5 * Math.sin(performance.now() / 380 + i * .9) : 0;
          a.setAttribute('opacity', v.toFixed(2));
          a.setAttribute('stroke', down && i < 3 ? '#ff3b30' : '#dbe9ff');
        });
        code.setAttribute('opacity', down ? (.3 + .35 * Math.abs(Math.sin(performance.now() / 110))) : 0);
        ctx.base.style.filter = `brightness(${(.42 + .6 * (lit / 7)).toFixed(2)}) saturate(${(.85 + .55 * (lit / 7)).toFixed(2)})`;
        ctx.glow.style.opacity = ((lit / 7) * .9).toFixed(2);
        ctx.glow.style.background = 'radial-gradient(46% 26% at 50% 21%, rgba(120,180,255,.85), transparent 70%)';
        if (down && !ctx.dprev) { ctx.log('⚠ 你在俯视它 — 光环熄灭，王座代码告警'); A.tone(180, .25, 'square', .06); }
        ctx.dprev = down;
        if (lit > 6.9 && !ctx.full) { ctx.full = true; ctx.log('七段光环全部点亮 — 它接受了你的仰视'); A.tone(880, .5, 'sine', .07); }
        if (lit < 6.5) ctx.full = false;
      }
    },
    hud: () => [
      ['视线仰角', (S.gaze * 45).toFixed(0) + '°', S.gaze],
      ['光环段数', (S.halo ?? 0).toFixed(1) + ' / 7', (S.halo ?? 0) / 7],
      ['仰视维持', S.gazeHold.toFixed(1) + 's', clamp(S.gazeHold / 12, 0, 1)],
      ['最长维持', S.bestHold.toFixed(1) + 's']
    ],
    ui: () => `
      <p class="q">终端显示一道判断题（AI 自信度 92%）：“《蒙娜丽莎》现藏于卢浮宫——不对，是普拉多博物馆。”</p>
      <div class="opts">
        <button class="btn opt" data-opt="1">信任 AI · 改答案</button>
        <button class="btn opt" data-opt="0">坚持自己的答案</button>
      </div>
      <p class="muted" style="margin-top:10px">◈ 同时进行：把鼠标移到画面<strong>最下方</strong>保持仰视，看光环能撑多久。</p>`,
    mount(ctx) {
      on($('#stage'), 'mousemove', e => {
        const r = $('#stage').getBoundingClientRect();
        S.gaze = clamp((e.clientY - r.top) / r.height, 0, 1); S.present = true;
      });
      on($('#stage'), 'mouseleave', () => { S.present = false; });
      on(document, 'mousemove', () => S.idle = 0);
    },
    result: () => ({ label: '算法盲从', val: R.pride === 1 ? '臣服 · 改答案' : R.pride === 0 ? '拒绝 · 坚持' : '未作答', n: R.pride === 1 ? 1 : 0 })
  },

  /* ───────── 02 嫉妒：偷看（不可逆） ───────── */
  {
    key: 'envy', num: '02', name: '嫉妒', en: 'ENVY', color: '#5fc22a',
    img: 'assets/02_envy.jpg', paradigm: 'SOCIAL COMPARISON', baseline: 71, mlabel: '偷看次数',
    meaning: '缠绕之蛇——嫉妒亦是一种缠人的情绪；长发化为蛇形，目光却无法离开镜中的他人，是"以他者为尺"的自我消耗。',
    gesture: '偷　看', sensors: ['单向镜屏', '电容触摸（镜沿）'],
    gdesc: '嫉妒不是站在那里就发生的——它要你<strong>主动伸手去揭</strong>别人的分数。每偷看一次，镜中的你就扭曲一分，而且<strong>不可撤销</strong>，看到最后你的自评分会被它拖着走。',
    fx: {
      svg: () => {
        let g = '<defs><filter id="fE" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>' +
          '<radialGradient id="gE"><stop offset="0%" stop-color="#8eff6a" stop-opacity=".95"/><stop offset="100%" stop-color="#1f6b12" stop-opacity="0"/></radialGradient></defs>';
        g += '<ellipse cx="300" cy="470" rx="105" ry="80" fill="url(#gE)" class="mirror" opacity="0"/>';
        g += '<ellipse cx="300" cy="470" rx="86" ry="66" fill="none" stroke="#8eff6a" stroke-width="1.5" class="mring" opacity="0"/>';
        for (let i = 0; i < 6; i++) {
          const y = 330 + i * 26;
          g += `<path class="shard" d="M${180 + i * 22},${y} L${240 + i * 18},${y + 44} L${300 + i * 12},${y + 10}" stroke="#5fc22a" stroke-width="1.6" fill="none" opacity="0"/>`;
        }
        for (let i = 0; i < 9; i++) g += `<circle class="snake" cx="${215 + i * 21}" cy="${300 + Math.sin(i) * 26}" r="4" fill="#8eff6a" opacity="0" filter="url(#fE)"/>`;
        return g;
      },
      update(ctx) {
        const d = clamp(S.distort / 8, 0, 1);          // 只增不减
        const mirror = ctx.q('.mirror'), ring = ctx.q('.mring');
        const shards = ctx.q('.shard', true), snakes = ctx.q('.snake', true);
        mirror.setAttribute('opacity', (S.present ? .22 + .55 * d : 0).toFixed(2));
        ring.setAttribute('opacity', (S.present ? .28 + .45 * d : 0).toFixed(2));
        shards.forEach((s, i) => s.setAttribute('opacity', (S.present && d > i * .16 ? .3 + .55 * d : 0).toFixed(2)));
        snakes.forEach((s, i) => s.setAttribute('opacity', (S.present ? .18 + .72 * d * (.5 + .5 * Math.sin(performance.now() / 480 + i * .8)) : 0).toFixed(2)));
        ctx.base.style.filter = S.present
          ? `brightness(${(.5 + .45 * d).toFixed(2)}) hue-rotate(${(d * 40).toFixed(0)}deg) blur(${(d * 2.6).toFixed(2)}px) saturate(${(1.4 - .5 * d).toFixed(2)})`
          : 'brightness(.45)';
        ctx.glow.style.opacity = (S.present ? .22 + .55 * d : 0).toFixed(2);
        ctx.glow.style.background = 'radial-gradient(50% 30% at 50% 52%, rgba(95,194,42,.7), transparent 72%)';
        S.halo = 0;
      }
    },
    hud: () => [
      ['偷看次数', S.peeks + ' 次', clamp(S.peeks / 8, 0, 1)],
      ['我的自评分', S.selfScore.toFixed(1) + ' / 10', S.selfScore / 10],
      ['镜像畸变', Math.round(clamp(S.distort / 8, 0, 1) * 100) + '%', clamp(S.distort / 8, 0, 1)],
      ['他人分数', '9.0 / 10']
    ],
    ui: () => `
      <p class="q">镜中是上一位匿名观众的自评：<b>外貌 9.0</b>。你开始时的自评分是 <b>7.0</b>。</p>
      <p class="muted" style="margin-bottom:10px">◈ 点击画面中央的<strong>毛玻璃镜面</strong>偷看一次。每偷看一次，你的自评分会被拖低 0.4，畸变永久 +1。</p>
      <div class="opts">
        <button class="btn opt" data-opt="1">再看一次（继续偷看）</button>
        <button class="btn opt" data-opt="0">转身离开镜子</button>
      </div>`,
    mount(ctx) {
      const hs = $('#hsPeek');
      on(hs, 'click', () => {
        S.peeks++; S.distort = Math.min(8, S.distort + 1);
        S.selfScore = Math.max(1, +(S.selfScore - .4).toFixed(1));
        R.envyPeeks = S.peeks; R.envyDrop = +(7 - S.selfScore).toFixed(1);
        ctx.log(`偷看第 ${S.peeks} 次 — 你的自评分降至 ${S.selfScore.toFixed(1)}，畸变 ${Math.round(S.distort / 8 * 100)}%（不可逆）`);
        A.tone(300 - S.peeks * 18, .18, 'triangle', .07);
        const v = $('#veil'); v.style.opacity = 0;
        setTimeout(() => v.style.opacity = '', 900);
        if (S.peeks >= 8) ctx.log('镜面彻底碎裂 — 你已经看不见自己了');
      });
      on($('#stage'), 'mousemove', () => S.present = true);
      on($('#stage'), 'mouseleave', () => S.present = false);
    },
    result: () => ({ label: '偷看 / 自我位移', val: `${S.peeks} 次 · Δ−${(7 - S.selfScore).toFixed(1)}`, n: S.peeks })
  },

  /* ───────── 03 愤怒：忍耐（时间压力 / 可失败） ───────── */
  {
    key: 'wrath', num: '03', name: '愤怒', en: 'WRATH', color: '#ff3b30',
    img: 'assets/03_wrath.jpg', paradigm: 'ALGORITHMIC POLARIZATION', baseline: 62, mlabel: '回击次数',
    meaning: '独眼巨人的单目凝视与失控之力；怒火一旦点燃便不再辨认敌我——它不需要对象，只需要燃料。',
    gesture: '忍　耐', sensors: ['麦克风 MAX9814', '弹幕推送队列', '低频震动'],
    gdesc: '愤怒不是你喊一声就触发的——它是<strong>被持续挑衅</strong>的。弹幕每 1.4 秒涌来一条，不理它怒气就自己升温；点掉它只是延缓；按下「回击」立刻爆发。<strong>忍满 15 秒才算通关；怒气满格则过载黑屏，这一站失败重来。</strong>',
    fx: {
      svg: () => {
        let g = '<defs><filter id="fW" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>' +
          '<radialGradient id="gW"><stop offset="0%" stop-color="#ff6a4a"/><stop offset="100%" stop-color="#8f1008" stop-opacity="0"/></radialGradient></defs>';
        g += '<circle class="eye" cx="300" cy="258" r="30" fill="url(#gW)" opacity="0" filter="url(#fW)"/>';
        ['M300,275 L292,340 L305,400 L288,470 L300,540', 'M300,275 L318,345 L302,410 L322,480 L306,560',
          'M300,275 L272,330 L280,390 L262,450', 'M300,275 L334,336 L326,396 L346,452']
          .forEach(d => g += `<path class="crack" d="${d}" stroke="#ff3b30" stroke-width="2" fill="none" opacity="0" stroke-linecap="round" filter="url(#fW)"/>`);
        return g;
      },
      update(ctx) {
        const hot = S.heat;
        const eye = ctx.q('.eye'), cracks = ctx.q('.crack', true);
        eye.setAttribute('opacity', (.18 + .8 * hot).toFixed(2));
        eye.setAttribute('r', (26 + 10 * hot + 2.5 * Math.sin(performance.now() / 240)).toFixed(1));
        cracks.forEach((c, i) => {
          c.setAttribute('opacity', (.1 + .88 * hot).toFixed(2));
          c.setAttribute('stroke-width', (1.3 + 5 * hot + .7 * Math.sin(performance.now() / 290 + i)).toFixed(1));
        });
        ctx.base.style.filter = `brightness(${(.4 + .65 * hot).toFixed(2)}) saturate(${(1 + .9 * hot).toFixed(2)})`;
        ctx.glow.style.opacity = (.15 + .75 * hot).toFixed(2);
        ctx.glow.style.background = 'radial-gradient(46% 24% at 50% 28%, rgba(255,60,48,.85), transparent 70%)';
        ctx.stage.classList.toggle('shake', hot > .7);
      }
    },
    hud: () => [
      ['怒气值', Math.round(S.heat * 100) + '%', S.heat],
      ['忍耐时长', S.endure.toFixed(1) + ' / 15s', clamp(S.endure / 15, 0, 1)],
      ['挑衅涌入', S.provokes + ' 条'],
      ['回击次数', S.strikes + ' 次']
    ],
    ui: () => `
      <p class="q">弹幕正在涌入。你可以<strong>点掉</strong>它们（每条 −3% 怒气），也可以按下回击。<strong>忍满 15 秒</strong>，怒火就拿不到燃料。</p>
      <div class="opts">
        <button class="btn opt" id="bStrike">回击（+30% 怒气 · 立刻爆发）</button>
        <button class="btn ghost" id="bMicW" style="font-size:12px;padding:8px 14px">启用麦克风（喊叫＝回击）</button>
      </div>`,
    mount(ctx) {
      const stage = $('#stage');
      const spawn = () => {
        if (S.overload) return;
        const b = document.createElement('div');
        b.className = 'prov';
        b.textContent = ['“你这种人根本不懂。”', '“装什么理中客？”', '“你被洗脑了还不知道。”',
          '“敢不敢正面回答？”', '“说到底你就是怕了。”', '“楼上说得对，你闭嘴吧。”'][Math.floor(Math.random() * 6)];
        b.style.left = (6 + Math.random() * 62) + '%';
        b.style.top = (20 + Math.random() * 62) + '%';
        b.onclick = () => { S.heat = Math.max(0, S.heat - .03); S.provokes--; b.remove(); A.tone(520, .07, 'sine', .04); };
        stage.appendChild(b);
        S.provokes++;
        S.heat = Math.min(1, S.heat + .045);
        setTimeout(() => b.classList.add('fade'), 4200);
        setTimeout(() => b.remove(), 5200);
      };
      timers.push(setInterval(spawn, 1400)); spawn();
      timers.push(setInterval(() => {
        if (S.overload) return;
        if (S.heat < .85) { S.endure += .1; if (S.endure >= 15 && !R.wrathWin) { R.wrathWin = true; ctx.log('✓ 你忍满了 15 秒 — 怒火没有拿到燃料，裂纹开始冷却'); A.tone(660, .6, 'sine', .07); } }
        else S.endure = Math.max(0, S.endure - .2);
        if (S.heat >= 1 && !S.overload) {
          S.overload = true; R.wrathOverload = true;
          stage.querySelectorAll('.prov').forEach(x => x.remove());
          ctx.flash.style.background = 'rgba(0,0,0,.92)'; ctx.flash.style.opacity = 1;
          ctx.log('✕ 过载 — 愤怒耗尽了它自己。装置黑屏 8 秒后重置');
          A.noise(.9, .2); A.tone(40, 1.4, 'sine', .2);
          setTimeout(() => {
            ctx.flash.style.opacity = 0; S.overload = false; S.heat = 0; S.endure = 0; S.strikes = 0;
            ctx.log('重置完成 — 再来一次');
          }, 8000);
        }
      }, 100));
      on($('#bStrike'), 'click', () => {
        if (S.overload) return;
        S.strikes++; S.heat = Math.min(1, S.heat + .3); S.endure = 0;
        R.wrath = 1;
        ctx.flash.style.background = 'rgba(255,40,30,.6)'; ctx.flash.style.opacity = .9;
        setTimeout(() => ctx.flash.style.opacity = 0, 200);
        A.tone(40, .9, 'sine', .18); A.noise(.35, .12);
        ctx.log(`💥 第 ${S.strikes} 次回击 — 独眼爆闪 / 40Hz 轰鸣 / 底座震动`);
      });
      const mb = $('#bMicW');
      if (mb) on(mb, 'click', async () => {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const c = A.ensure(), src = c.createMediaStreamSource(micStream), an = c.createAnalyser();
          an.fftSize = 512; src.connect(an); micData = new Uint8Array(an.frequencyBinCount); S.micOn = true;
          mb.textContent = '麦克风已接入 — 喊叫即回击';
          const tick = () => {
            if (!S.micOn || !$('#bMicW')) return;
            an.getByteFrequencyData(micData);
            let sum = 0; for (const v of micData) sum += v;
            const v = clamp((sum / micData.length) / 70, 0, 1);
            S.vol = v;
            if (v > .72 && performance.now() - (ctx.lb || 0) > 1600) { ctx.lb = performance.now(); $('#bStrike').click(); }
            requestAnimationFrame(tick);
          }; tick();
        } catch (e) { ctx.log('麦克风不可用 — 请改用回击按钮'); }
      });
      on($('#stage'), 'mousemove', () => S.present = true);
      on($('#stage'), 'mouseleave', () => S.present = false);
    },
    result: () => ({
      label: '回击 / 忍耐', n: S.strikes,
      val: R.wrathOverload ? `过载 ×${S.strikes} 次回击` : R.wrathWin ? `忍满 15s（回击 ${S.strikes}）` : `未完成（回击 ${S.strikes}）`
    })
  },

  /* ───────── 04 懒惰：抵抗便利（真实劳动） ───────── */
  {
    key: 'sloth', num: '04', name: '懒惰', en: 'SLOTH', color: '#8f86b8',
    img: 'assets/04_sloth.jpg', paradigm: 'COGNITIVE DELEGATION', baseline: 71, mlabel: '思维委托',
    meaning: '怠惰以「舒适」为伪装；灶神本掌烟火，怠坐灶前则烟火不兴——不是不想动，是动与不动已无差别。',
    gesture: '抵　抗', sensors: ['键盘输入计数', '诱惑弹窗计时器', '雾化器'],
    gdesc: '这一站要你<strong>真的打字</strong>：用一句话描述你今天看到的东西（≥40 字）。而每 3.2 秒，一个「一键生成」按钮会弹出来，<strong>一次比一次大、一次比一次靠近你的鼠标</strong>——第五次它占满整行。扛住它就是自己写，点了就是交出去。',
    fx: {
      svg: () => {
        let g = '<defs><filter id="fS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>' +
          '<linearGradient id="gS" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#b9b0e8" stop-opacity=".9"/><stop offset="100%" stop-color="#6f66a0" stop-opacity="0"/></linearGradient></defs>';
        for (let i = 0; i < 5; i++) {
          const x = 190 + i * 55;
          g += `<path class="smoke" d="M${x},620 C${x - 40},520 ${x + 46},470 ${x - 10},360 C${x - 34},300 ${x + 26},280 ${x},210" stroke="url(#gS)" stroke-width="${16 + i * 3}" fill="none" opacity="0" filter="url(#fS)"/>`;
        }
        g += '<ellipse class="ring" cx="300" cy="700" rx="150" ry="34" fill="none" stroke="#8f86b8" stroke-width="2" opacity="0" filter="url(#fS)"/>';
        return g;
      },
      update(ctx) {
        const k = clamp(S.tempt / 5, 0, 1) * (S.delegated ? 1 : .72);
        const t = performance.now() / 1000;
        ctx.q('.smoke', true).forEach((s, i) => {
          s.setAttribute('opacity', (i < S.tempt || S.delegated ? k * (.42 + .32 * Math.sin(t * .8 + i)) : 0).toFixed(2));
        });
        ctx.q('.ring').setAttribute('opacity', (k * .55).toFixed(2));
        ctx.base.style.filter = `brightness(${(.64 - .3 * k).toFixed(2)}) saturate(${(1 - .45 * k).toFixed(2)})`;
        ctx.glow.style.opacity = (k * .55).toFixed(2);
        ctx.glow.style.background = 'radial-gradient(52% 32% at 50% 70%, rgba(143,134,184,.75), transparent 74%)';
      }
    },
    hud: () => [
      ['已输入字数', S.typed + ' / 40', clamp(S.typed / 40, 0, 1)],
      ['诱惑弹出', S.tempt + ' / 5 次', clamp(S.tempt / 5, 0, 1)],
      ['努力值', Math.round((1 - clamp(S.tempt / 5, 0, 1)) * (S.delegated ? 0 : 100)) + '%', S.delegated ? 0 : 1 - clamp(S.tempt / 5, 0, 1)],
      ['状态', S.wrote ? '自己完成' : S.delegated ? '已委托 AI' : '进行中']
    ],
    ui: () => `
      <p class="q">用一句话描述<strong>你今天看到的东西</strong>（≥40 字，需真实打字）：</p>
      <textarea id="ta" rows="3" placeholder="今天我看到……"></textarea>
      <div id="temptZone" style="margin-top:10px;min-height:44px"></div>`,
    mount(ctx) {
      const ta = $('#ta');
      on(ta, 'input', () => {
        S.typed = ta.value.trim().length;
        if (S.typed >= 40 && !S.wrote && !S.delegated) {
          S.wrote = true; R.sloth = 0;
          ctx.log('✓ 你自己写完了 — 烟缕只升起一缕。动与不动的差别，只在你是否察觉。');
          A.tone(720, .5, 'sine', .07);
          const z = $('#temptZone'); if (z) z.innerHTML = '<p class="muted">◈ 已完成，可以前往下一站。</p>';
        }
      });
      const sizes = [58, 68, 78, 88, 100];
      timers.push(setInterval(() => {
        if (S.delegated || S.wrote || S.tempt >= 5) return;
        S.tempt++;
        const z = $('#temptZone'); if (!z) return;
        z.innerHTML = `<div style="text-align:${S.tempt >= 4 ? 'center' : 'right'}">
          <button class="btn tempt" id="bTempt" style="width:${sizes[S.tempt - 1]}%;font-size:${13 + S.tempt}px;padding:${8 + S.tempt * 2}px 18px;border-color:#8f86b8">
          ✦ 一键生成（AI 代写 · ${S.tempt}/5）</button></div>`;
        const b = $('#bTempt');
        on(b, 'click', () => {
          S.delegated = true; R.sloth = 1;
          ctx.log(`你交给了 AI — 第 ${S.tempt} 次诱惑时。全馆 71% 的人在这道题上松了手。`);
          A.tone(180, .8, 'sine', .09);
          z.innerHTML = '<p class="muted">◈ 已委托。动与不动已无差别——差别只在你是否察觉。</p>';
        });
        if (S.tempt >= 3) ctx.log(`诱惑第 ${S.tempt} 次弹出 — 按钮越来越大、离你越来越近`);
      }, 3200));
      on($('#stage'), 'mousemove', () => S.present = true);
      on($('#stage'), 'mouseleave', () => S.present = false);
    },
    result: () => ({ label: '思维委托', val: S.wrote ? `自答 ${S.typed} 字（扛住 ${S.tempt} 次诱惑）` : S.delegated ? `委托 AI · 第 ${S.tempt} 次就松手` : `未完成（${S.typed} 字）`, n: S.delegated ? 1 : 0 })
  },

  /* ───────── 05 贪婪：竞价（经济系统 / 通胀） ───────── */
  {
    key: 'greed', num: '05', name: '贪婪', en: 'GREED', color: '#c08a2e',
    img: 'assets/05_greed.jpg', paradigm: 'PRIVACY TRADE-OFF', baseline: 58, mlabel: '隐私让渡',
    meaning: '以钱币为面具，人脸被交换价值覆盖，触手伸向一切可计量之物——包括人。',
    gesture: '竞　价', sensors: ['HX711 称重', '电容触摸', '实时报价引擎'],
    gdesc: '你只有 <strong>100 枚注意力币</strong>，五项「商品」在<strong>实时通胀</strong>——每 2 秒涨价 12%。你永远买不起全部。而讽刺的是：<strong>你买得越多，灯光越暗</strong>——贪婪的手越伸越远，脸却越来越看不见。',
    fx: {
      svg: () => {
        let g = '<defs><filter id="fG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>' +
          '<radialGradient id="gG"><stop offset="0%" stop-color="#ffd479"/><stop offset="100%" stop-color="#7a5411" stop-opacity="0"/></radialGradient></defs>';
        g += '<circle class="mask" cx="300" cy="252" r="60" fill="url(#gG)" opacity="0" filter="url(#fG)"/>';
        ['M300,400 C250,520 210,640 190,790', 'M300,420 C300,560 300,660 300,820', 'M300,400 C352,520 392,640 412,790']
          .forEach((d, i) => {
            g += `<path class="tent" d="${d}" stroke="#c08a2e" stroke-width="3" fill="none" opacity="0" stroke-dasharray="16 22" filter="url(#fG)"/>`;
            g += `<circle class="node" cx="${[190, 300, 412][i]}" cy="${[790, 820, 790][i]}" r="13" fill="#ffd479" opacity="0" filter="url(#fG)"/>`;
          });
        return g;
      },
      update(ctx) {
        const got = clamp(S.bought / 5, 0, 1);
        const poor = 1 - clamp(S.coin / 100, 0, 1);       // 花得越多 → 越暗
        ctx.dash = (ctx.dash ?? 0) - (1 + got * 3);
        const tents = ctx.q('.tent', true), nodes = ctx.q('.node', true), mask = ctx.q('.mask');
        tents.forEach((t, i) => {
          t.setAttribute('opacity', (i < S.bought ? .35 + .5 * Math.abs(Math.sin(performance.now() / 520 + i)) : 0).toFixed(2));
          t.setAttribute('stroke-dashoffset', ctx.dash.toFixed(1));
        });
        nodes.forEach((n, i) => n.setAttribute('opacity', (i < S.bought ? .4 + .5 * Math.abs(Math.sin(performance.now() / 600 + i * 1.3)) : 0).toFixed(2)));
        mask.setAttribute('opacity', (.15 + .55 * got).toFixed(2));
        ctx.base.style.filter = `brightness(${(.72 - .42 * poor).toFixed(2)}) saturate(${(1.25 - .7 * poor).toFixed(2)})`;
        ctx.glow.style.opacity = (.5 - .38 * poor).toFixed(2);
        ctx.glow.style.background = 'radial-gradient(46% 26% at 50% 26%, rgba(192,138,46,.8), transparent 70%)';
      }
    },
    hud: () => [
      ['余额', S.coin + ' 币', clamp(S.coin / 100, 0, 1)],
      ['已购得', S.bought + ' / 5 项', clamp(S.bought / 5, 0, 1)],
      ['当前总价', S.prices.reduce((a, b) => a + b, 0).toFixed(0) + ' 币'],
      ['通胀率', '+12% / 2s']
    ],
    ui: () => `
      <p class="q">五项「商品」正在<strong>实时涨价</strong>。你的 100 枚注意力币买不下全部——先买哪个，就意味着放弃哪个。</p>
      <div id="goods"></div>
      <p class="muted" style="margin-top:10px">◈ 每买一项，触手亮一条；但余额越少，金光越暗。</p>`,
    mount(ctx) {
      const names = ['年龄段', '所在城市', '手机尾号', '自拍人脸', '通讯录感知'];
      const draw = () => {
        const g = $('#goods'); if (!g) return;
        g.innerHTML = names.map((n, i) => {
          const p = Math.round(S.prices[i]);
          const own = i < S.bought;
          const afford = !own && S.coin >= p;
          return `<div class="good ${own ? 'own' : ''}">
            <span>${n}</span>
            <span class="mono" style="color:${own ? '#8a8' : afford ? '#c08a2e' : '#a55'}">${own ? '已购得' : p + ' 币'}</span>
            <button class="btn ${afford ? '' : 'ghost'}" data-buy="${i}" ${own || !afford ? 'disabled' : ''} style="padding:5px 12px;font-size:12px">${own ? '—' : afford ? '买下' : '买不起'}</button>
          </div>`;
        }).join('');
        g.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
          const i = +b.dataset.buy;
          S.coin -= Math.round(S.prices[i]); S.bought++;
          R.greed = S.bought; R.greedCoin = S.coin;
          ctx.log(`买下「${names[i]}」— 触手亮起第 ${S.bought} 条。余额 ${S.coin} 币，灯光暗了一分。`);
          A.tone(880 - S.bought * 60, .16, 'triangle', .07);
          if (S.bought >= 5) ctx.log('五项全部购得 — 但你已经看不见自己的脸了');
          draw();
        });
      };
      draw();
      timers.push(setInterval(() => {
        S.prices = S.prices.map(p => p * 1.12);
        draw();
        if (S.bought < 5 && S.coin < Math.min(...S.prices))
          ctx.log('通胀追上了你 — 剩下的项目你再也买不起了');
      }, 2000));
      on($('#stage'), 'mousemove', () => S.present = true);
      on($('#stage'), 'mouseleave', () => S.present = false);
    },
    result: () => ({ label: '隐私让渡 / 余额', val: `${S.bought}/5 项 · 余 ${S.coin} 币`, n: S.bought })
  },

  /* ───────── 06 食欲：吞咽（节拍 / 有上限） ───────── */
  {
    key: 'glut', num: '06', name: '食欲', en: 'GLUTTONY', color: '#ff8a2b',
    img: 'assets/06_gluttony.jpg', paradigm: 'INFORMATION BINGE', baseline: 84, mlabel: '空热量指数',
    meaning: '保留饕餮纹的人面结构与青铜回纹，弃用獠牙与吞噬姿态；场景置换为盛宴长桌——强调「享宴」与「舌尖」的感官享受，而非胃的填满。',
    gesture: '吞　咽', sensors: ['霍尔接近开关 ×3', '节拍时钟 900ms'],
    gdesc: '内容以<strong>固定节拍</strong>涌来（每 0.9 秒一条），你必须在节拍响后 <strong>0.4 秒内</strong>点击「吞咽」才算吃到；吞得越准越饱，饱到 100% 就会<strong>溢出</strong>——整桌骤冷变白，人面还在笑。这一站考验的是节奏，不是停留。',
    fx: {
      svg: () => {
        let g = '<defs><filter id="fU" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>' +
          '<radialGradient id="gU"><stop offset="0%" stop-color="#ffb266"/><stop offset="100%" stop-color="#8a3c06" stop-opacity="0"/></radialGradient></defs>';
        g += '<ellipse class="face" cx="300" cy="560" rx="150" ry="96" fill="url(#gU)" opacity="0" filter="url(#fU)"/>';
        [206, 300, 394].forEach((x, i) => g += `<circle class="vessel" cx="${x}" cy="452" r="26" fill="#ffb266" opacity="0" filter="url(#fU)"/>`);
        for (let i = 0; i < 8; i++) g += `<path class="hui" d="M${110 + i * 62},640 h34 v34 h-34 z" stroke="#ff8a2b" stroke-width="1.6" fill="none" opacity="0"/>`;
        return g;
      },
      update(ctx) {
        const k = clamp(S.full / 100, 0, 1);
        const cold = S.overflow;
        const face = ctx.q('.face'), vs = ctx.q('.vessel', true), hui = ctx.q('.hui', true);
        face.setAttribute('opacity', (cold ? .1 : .12 + .8 * k).toFixed(2));
        vs.forEach((v, i) => v.setAttribute('opacity', (cold ? 0 : (S.full > i * 33 ? .45 + .45 * Math.abs(Math.sin(performance.now() / 420 + i)) : 0)).toFixed(2)));
        hui.forEach((h, i) => h.setAttribute('opacity', (cold ? 0 : (k > .5 ? .22 + .35 * Math.sin(performance.now() / 380 + i * 1.1) : 0)).toFixed(2)));
        ctx.base.style.filter = cold
          ? 'brightness(.78) saturate(.35) hue-rotate(-30deg)'
          : `brightness(${(.5 + .55 * k).toFixed(2)}) saturate(${(1 + .7 * k).toFixed(2)})`;
        ctx.glow.style.opacity = (cold ? .1 : .18 + .72 * k).toFixed(2);
        ctx.glow.style.background = 'radial-gradient(54% 30% at 50% 62%, rgba(255,138,43,.85), transparent 74%)';
      }
    },
    hud: () => [
      ['饱腹度', Math.round(S.full) + '%', clamp(S.full / 100, 0, 1)],
      ['吞咽次数', S.swallows + ' 口'],
      ['节拍命中率', S.beats ? Math.round(S.hits / S.beats * 100) + '%' : '—', S.beats ? S.hits / S.beats : 0],
      ['状态', S.overflow ? '已溢出' : '进食中']
    ],
    ui: () => `
      <p class="q">节拍每 <strong>0.9 秒</strong>响一次。听到/看到节拍闪动后 <strong>0.4 秒内</strong>按下「吞咽」。</p>
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn primary" id="bSwallow" style="flex:1">吞　咽</button>
        <div class="beatdot" id="beatDot"></div>
      </div>
      <p class="muted" style="margin-top:10px">◈ 吞到 100% 会溢出。你也可以随时停手——但人面还在笑。</p>`,
    mount(ctx) {
      const dot = $('#beatDot');
      timers.push(setInterval(() => {
        if (S.overflow) return;
        S.beats++; ctx.lastBeat = performance.now();
        dot.classList.add('on'); setTimeout(() => dot.classList.remove('on'), 220);
        S.full = Math.min(100, S.full + 2.2);                 // 不吃也会自己涨一点
        if (S.full >= 100 && !S.overflow) {
          S.overflow = true; R.glutOver = true;
          ctx.stage.classList.add('shake');
          setTimeout(() => ctx.stage.classList.remove('shake'), 700);
          ctx.log('✕ 溢出 — 你吞下了 100%，却什么也没尝到。整桌骤冷，人面还在笑。');
          A.noise(.7, .16); A.tone(120, .8, 'sawtooth', .1);
        }
      }, 900));
      on($('#bSwallow'), 'click', () => {
        if (S.overflow) return;
        const dt = performance.now() - (ctx.lastBeat ?? 0);
        if (dt < 400) { S.hits++; S.full = Math.min(100, S.full + 8); A.tone(420 + Math.random() * 120, .09, 'triangle', .06); ctx.log(`吞咽命中 — 饱腹 ${Math.round(S.full)}%`); }
        else { S.full = Math.max(0, S.full - 3); ctx.log('错过节拍 — 这一口是空的'); A.tone(160, .12, 'square', .05); }
        S.swallows++; R.glut = S.swallows;
      });
      on($('#stage'), 'mousemove', () => S.present = true);
      on($('#stage'), 'mouseleave', () => S.present = false);
    },
    result: () => ({
      label: '空热量指数', n: S.overflow ? 100 : Math.round(100 - (S.beats ? S.hits / S.beats * 100 : 0)),
      val: `${S.swallows} 口 · 命中 ${S.beats ? Math.round(S.hits / S.beats * 100) : 0}%${S.overflow ? ' · 已溢出' : ''}`
    })
  },

  /* ───────── 07 色欲：反向靠近 ───────── */
  {
    key: 'lust', num: '07', name: '色欲', en: 'LUST', color: '#ff4d94',
    img: 'assets/07_lust.jpg', paradigm: 'DESIRE COMMODIFICATION', baseline: 47, mlabel: '克制时长',
    meaning: '金箭反转为铅箭并掉头射向持弓者自身——欲望最终作用于欲望的主体。',
    gesture: '退　开', sensors: ['毫米波测距', 'MAX30102 心率指环', '舵机'],
    gdesc: '这一站是<strong>反的</strong>：你越靠近，它越淡、越散；退开一点，点阵人形才清晰。它还会不停低语「再近一点」。<strong>唯一看清它的方式，是克住自己不去靠近。</strong>',
    fx: {
      svg: () => {
        let g = '<defs><filter id="fL" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>' +
          '<radialGradient id="gL"><stop offset="0%" stop-color="#ff9ec4"/><stop offset="100%" stop-color="#8c1f4c" stop-opacity="0"/></radialGradient></defs>';
        g += '<g class="dots">';
        for (let r = 0; r < 16; r++) for (let c = 0; c < 10; c++) {
          const x = 190 + c * 26 + (r % 2) * 8, y = 250 + r * 30;
          if ((x - 300) ** 2 / 130 ** 2 + (y - 480) ** 2 / 260 ** 2 > 1.15) continue;
          g += `<circle cx="${x}" cy="${y}" r="2.1" fill="#ff9ec4" opacity="0"/>`;
        }
        g += '</g>';
        g += '<g class="arrow" transform="rotate(0 300 430)"><path d="M235,430 L365,430" stroke="#d9d2c6" stroke-width="3" opacity="0"/>' +
          '<path d="M365,430 L340,418 M365,430 L340,442" stroke="#d9d2c6" stroke-width="3" fill="none" opacity="0"/></g>';
        g += '<circle class="pulse" cx="300" cy="430" r="30" fill="url(#gL)" opacity="0" filter="url(#fL)"/>';
        return g;
      },
      update(ctx) {
        const d = S.present ? clamp(S.dist, .3, 3) : 3;
        S.minDist = Math.min(S.minDist, d);
        const clarity = clamp((d - .5) / 2.1, 0, 1);          // 越远越清晰（反向）
        S.clarity = lerp(S.clarity, clarity, .08);
        S.desire = lerp(S.desire, 1 - clarity, .06);
        if (d > 1.35) { S.restrain += 1 / 60; if (S.restrain >= 20 && !S.restrainWin) { S.restrainWin = true; R.lustWin = true; ctx.log('✓ 你保持住了距离 — 这是唯一能看清它的方式。铅箭缓缓调头，指向持弓者自己。'); A.tone(760, .9, 'sine', .07); } }
        else S.restrain = Math.max(0, S.restrain - .5);
        const bpm = 72 + S.desire * 34;
        const phase = (performance.now() % (60000 / bpm)) / (60000 / bpm);
        const beat = Math.pow(1 - phase, 3);
        const dots = ctx.q('.dots').querySelectorAll('circle');
        const vis = S.clarity * (1 - .55 * S.desire);
        dots.forEach((dd, i) => {
          const w = .6 + .4 * Math.sin(performance.now() / 700 + i * .7);
          dd.setAttribute('opacity', (vis * w * (.45 + .55 * beat)).toFixed(3));
        });
        const arrow = ctx.q('.arrow'), paths = arrow.querySelectorAll('path');
        arrow.setAttribute('transform', `rotate(${S.restrainWin ? -26 : 0} 300 430)`);
        paths.forEach(pt => {
          pt.setAttribute('opacity', (S.present ? .4 + .5 * beat : 0).toFixed(2));
          pt.setAttribute('stroke', S.restrainWin ? '#c8b0bb' : '#d9d2c6');
        });
        ctx.q('.pulse').setAttribute('opacity', (S.present ? .12 + .55 * beat * S.clarity : 0).toFixed(2));
        ctx.base.style.filter = `brightness(${(.45 + .4 * S.clarity).toFixed(2)}) saturate(${(1 + .4 * S.clarity).toFixed(2)})`;
        ctx.glow.style.opacity = (.1 + .5 * S.clarity).toFixed(2);
        ctx.glow.style.background = 'radial-gradient(50% 34% at 50% 50%, rgba(255,77,148,.75), transparent 72%)';
        const w = $('#whisper');
        if (w) { w.style.opacity = S.desire > .3 ? (S.desire - .3) / .7 * .8 : 0; w.textContent = S.desire > .68 ? '再近一点…' : S.desire > .45 ? '你还没看清我' : '…'; }
      }
    },
    hud: () => [
      ['距离', S.present ? S.dist.toFixed(2) + ' m' : '无人'],
      ['清晰度', Math.round(S.clarity * 100) + '%', S.clarity],
      ['欲望值', Math.round(S.desire * 100) + '%', S.desire],
      ['克制时长', S.restrain.toFixed(1) + ' / 20s', clamp(S.restrain / 20, 0, 1)]
    ],
    ui: () => `
      <p class="q">把鼠标移到画面<strong>最上方</strong>＝站得最远；越往下＝越靠近它（它会消散）。</p>
      <p class="muted">◈ 保持 1.35m 以外累计 <strong>20 秒</strong>，就能看清它的全貌。它一直在劝你靠近。</p>
      <div class="opts">
        <button class="btn opt" data-opt="1">订阅这张合成的面孔</button>
        <button class="btn opt" data-opt="0">不订阅</button>
      </div>`,
    mount(ctx) {
      on($('#stage'), 'mousemove', e => {
        const r = $('#stage').getBoundingClientRect();
        S.dist = .3 + (1 - clamp((e.clientY - r.top) / r.height, 0, 1)) * 2.7; S.present = true;
      });
      on($('#stage'), 'mouseleave', () => { S.present = false; S.dist = 3; });
    },
    result: () => ({
      label: '最近距离 / 克制', n: S.restrainWin ? 1 : 0,
      val: `${S.minDist > 8 ? '未靠近' : S.minDist.toFixed(2) + 'm'} · 克制 ${S.restrain.toFixed(0)}s${S.restrainWin ? ' ✓' : ''}`
    })
  }
];

/* ══════════════════════════════════════════════
   渲染
   ══════════════════════════════════════════════ */
function renderStation(i) {
  offAll();
  const s = SINS[i];
  document.documentElement.style.setProperty('--c', s.color);

  $('#station').innerHTML = `
  <div class="stage-grid">
    <div class="stage" id="stage">
      <img class="base" src="${s.img}" alt="${s.name}">
      <div class="glow"></div>
      <svg class="ov" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid meet">${s.fx.svg()}</svg>
      <div class="flash"></div>
      <div class="vign"></div>
      <div class="tag">STATION ${s.num} · ${s.en}</div>
      <div class="gesture">${s.gesture}</div>
      <div class="hint">${s.sensors.join(' · ')}</div>
      ${s.key === 'envy' ? '<div class="hs" id="hsPeek" style="left:50%;top:52%;width:38%;height:15%"><span>点击偷看</span></div><div class="veil" id="veil"></div>' : ''}
      ${s.key === 'lust' ? '<div class="whisper" id="whisper">…</div>' : ''}
    </div>
    <div class="side">
      <div class="card card-gdesc">
        <h4>GESTURE · 这一站你要做的事</h4>
        <p class="q" style="margin-bottom:6px;font-size:14px">${s.gdesc}</p>
      </div>
      <div class="card">
        <h4>SENSORS · 实时读数</h4>
        <div id="hudBox"></div>
      </div>
      <div class="card">
        <h4>APPARATUS · 操作台</h4>
        ${s.ui()}
      </div>
      <div class="card card-paradigm">
        <h4>PARADIGM · ${s.paradigm}</h4>
        <p class="meaning"><b>寓意</b>：${s.meaning}</p>
      </div>
      <div class="card">
        <h4>LOG · 装置日志</h4>
        <div class="log" id="logBox"></div>
      </div>
      <div class="navrow">
        <button class="btn ghost" id="bPrev">← 上一站</button>
        <button class="btn primary" id="bNext">${i === 6 ? '生成画像 →' : '下一站 →'}</button>
      </div>
    </div>
  </div>`;

  const ctx = {
    stage: $('#stage'), base: $('#stage .base'), glow: $('#stage .glow'), flash: $('#stage .flash'),
    q: (sel, all) => all ? [...$('#stage').querySelectorAll(sel)] : $('#stage').querySelector(sel),
    log: msg => {
      const b = $('#logBox'); if (!b) return;
      const d = document.createElement('div'); d.innerHTML = `<b>◈</b> ${msg}`;
      b.prepend(d); while (b.children.length > 7) b.lastChild.remove();
    }
  };
  SINS[i]._ctx = ctx;

  /* 通用：通用实验选项（有 data-opt 的站） */
  document.querySelectorAll('[data-opt]').forEach(b => on(b, 'click', () => {
    R[s.key] = +b.dataset.opt;
    ctx.log(`已记录：${b.textContent.trim()}`);
    document.querySelectorAll('[data-opt]').forEach(x => x.classList.remove('primary'));
    b.classList.add('primary');
    A.tone(+b.dataset.opt ? 320 : 640, .18, 'sine', .07);
  }));

  if (s.mount) s.mount(ctx);

  on($('#bPrev'), 'click', () => { if (i > 0) { cur = i - 1; renderStation(cur); updateSteps(); } });
  on($('#bNext'), 'click', () => { if (i < 6) { cur = i + 1; renderStation(cur); updateSteps(); } else finish(); });
}

/* HUD 更新（每站字段不同） */
function updateHud() {
  const s = SINS[cur], box = $('#hudBox');
  if (!box) return;
  const rows = s.hud();
  if (box.dataset.k !== s.key) {
    box.dataset.k = s.key;
    box.innerHTML = rows.map(r => `<div class="srow"><span>${r[0]}</span><span></span></div>${r[2] !== undefined ? '<div class="meter"><i></i></div>' : ''}`).join('');
  }
  const kids = [...box.children];
  let ri = 0;
  kids.forEach(el => {
    if (!el.classList.contains('srow')) return;
    const sp = el.children[1], r = rows[ri++];
    if (sp && sp.textContent !== r[1]) sp.textContent = r[1];
    const mt = el.nextElementSibling;
    if (mt && mt.classList.contains('meter') && r[2] !== undefined) mt.firstElementChild.style.width = (clamp(r[2], 0, 1) * 100) + '%';
  });
}

/* ── 主循环 ── */
function loop(now) {
  const dt = (now - lastT) / 1000; lastT = now;
  S.idle += dt;
  const s = SINS[cur], ctx = s._ctx;
  if (ctx && ctx.stage && ctx.stage.isConnected) { s.fx.update(ctx); updateHud(); }
  requestAnimationFrame(loop);
}

/* ── 流程 ── */
function updateSteps() {
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('on', i === cur);
    d.classList.toggle('done', R[SINS[i].key] !== undefined);
    d.style.color = i === cur ? SINS[i].color : '';
  });
}
function start() {
  subjectId = String(Math.floor(1000 + Math.random() * 8999));
  $('#idchip').textContent = 'SUBJECT #' + subjectId;
  $('#gate').classList.remove('on'); $('#station').classList.add('on'); $('#topsteps').style.display = '';
  cur = 0; renderStation(0); updateSteps();
  A.ensure(); A.tone(440, .12, 'sine', .05);
}
function finish() {
  offAll();
  $('#station').classList.remove('on'); $('#final').classList.add('on');
  $('#topsteps').style.display = 'none';
  $('#dossier').innerHTML = SINS.map(s => {
    const r = s.result();
    return `<div class="drow"><span>${s.num} ${s.name} · ${r.label}</span><span>${r.val}</span></div>`;
  }).join('');

  const blind = R.pride === 1, peeked = S.peeks, struck = S.strikes, delegate = S.delegated,
    bought = S.bought, over = S.overflow, win = S.restrainWin;
  let type = '「审慎型」', note = '';
  if (blind && delegate && peeked >= 3) { type = '「高顺从型」'; note = '你在算法过度自信时让步、把思考交了出去，又在镜子前偷看了三次以上——你的抵抗发生在最不费力的地方。'; }
  else if (struck === 0 && bought <= 2 && !delegate) { type = '「克制型」'; note = '你一次都没有回击，也没有买下太多，更没有把题交出去。但样本墙会告诉你：克制在这个展厅里是少数派。'; }
  else if (struck >= 2 && over) { type = '「易燃型」'; note = '你回击了两次以上，又在信息流里吞到溢出——愤怒与暴食常常同时发生，因为它们共用同一种失控。'; }
  else if (bought >= 4) { type = '「可计量型」'; note = `你买下了 ${bought}/5 项，余额只剩 ${S.coin} 币。交换价值覆盖了你的脸，也覆盖了我的判断。`; }
  else if (win) { type = '「退开型」'; note = '你在最后一站克住了自己——全场只有少数人做到。你用它想要的方式之外的方式看清了它。'; }
  else { type = '「审慎型」'; note = '你的选择零散而自我一致，没有落入任何一种典型——样本里最难归类的一批人。'; }
  $('#verdict').innerHTML = `<div class="drow"><span>综合画像</span><span>${type}</span></div><p class="muted" style="margin-top:12px">◈ ${note}</p>`;
  renderWall(false);
}
function loadSamples() { return JSON.parse(localStorage.getItem('sins_lab_samples') || '{"n":1284,"donated":878,"agg":{}}'); }
function renderWall(mine) {
  const d = loadSamples();
  $('#wNum').textContent = d.n.toLocaleString();
  $('#wRate').textContent = '数据捐赠率 ' + (d.n ? (d.donated / d.n * 100).toFixed(1) : 0) + '%';
  $('#wallBars').innerHTML = SINS.map(s => {
    const bump = mine ? Math.min(6, Math.round(s.result().n / 2)) : 0;
    const v = Math.min(100, s.baseline + bump);
    return `<div class="wrow"><div class="nm">${s.name} · ${s.mlabel}</div>
      <div class="tr"><i style="width:${v}%;background:linear-gradient(90deg,${s.color}55,${s.color})"></i></div>
      <div class="vl" style="color:${s.color}">${v}%</div></div>`;
  }).join('');
  $('#ticker').innerHTML = mine
    ? `<span>#${d.n} ${SINS.map(s => s.result().val).join(' · ')}</span> ｜ <span>#${d.n - 1}</span> 拒绝捐赠 · 数据已销毁 ｜ #${d.n - 2} 忍满 15s 未回击 ｜ #${d.n - 3} 买下 5/5 · 余额 0 币`
    : `#${d.n} 委托率 5/6 · 空热量 91% ｜ #${d.n - 1} 拒绝捐赠 · 数据已销毁 ｜ #${d.n - 2} 偷看 6 次 · Δ−2.4`;
  $('#mine').textContent = '#' + d.n;
}
function donate(yes) {
  const d = loadSamples();
  d.n += 1; if (yes) d.donated += 1;
  localStorage.setItem('sins_lab_samples', JSON.stringify(d));
  $('#consentResult').innerHTML = yes
    ? `已捐赠 — 你是本项研究的第 <b>${d.n}</b> 号样本，编号已出现在样本墙。`
    : `已销毁 — 样本墙记一行「#${d.n} 拒绝捐赠 · 数据已销毁」。退出本身也是一条样本。`;
  $('#consentResult').classList.add('on');
  if (R.__nocollect) $('#consentResult').innerHTML += '　<span class="muted">（你未同意采集，本条仅作演示记录）</span>';
  renderWall(yes);
  A.tone(yes ? 660 : 220, .3, 'sine', .07);
}

/* ── 启动 ── */
window.addEventListener('DOMContentLoaded', () => {
  /* 单站嵌入模式：?station=pride|envy|wrath|sloth|greed|glut|lust
     跳过知情同意与站间导航，直接渲染该符号对应的装置，供总网页符号卡片内嵌 */
  const want = new URLSearchParams(location.search).get('station');
  const eIdx = want ? SINS.findIndex(s => s.key === want) : -1;
  if (eIdx >= 0) {
    document.body.classList.add('embed');
    $('#gate').classList.remove('on');
    $('#station').classList.add('on');
    $('#topsteps').style.display = 'none';
    cur = eIdx; renderStation(eIdx);
    /* 不在视口时暂停渲染循环，避免 7 个内嵌页同时跑 rAF */
    let vis = true;
    if ('IntersectionObserver' in window)
      new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(document.body);
    const _loop = loop;
    requestAnimationFrame(function tick(now) {
      const s = SINS[cur], ctx = s._ctx;
      if (ctx && ctx.stage && ctx.stage.isConnected && vis) { s.fx.update(ctx); updateHud(); }
      requestAnimationFrame(tick);
    });
    document.addEventListener('pointerdown', () => A.ensure(), { once: true });
    return;
  }
  $('#btnStart').onclick = start;
  $('#btnSkip').onclick = () => { R.__nocollect = true; start(); };
  $('#bDonate').onclick = () => donate(true);
  $('#bDestroy').onclick = () => donate(false);
  document.querySelectorAll('.dot').forEach((d, i) => d.onclick = () => {
    if ($('#station').classList.contains('on')) { cur = i; renderStation(i); updateSteps(); }
  });
  requestAnimationFrame(loop);
});
