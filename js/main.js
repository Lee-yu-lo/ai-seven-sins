/* ===== LOADER ===== */
(function () {
  var done = false;
  function hideLoader() {
    if (done) return;
    done = true;
    var el = document.getElementById('loader');
    if (el) el.classList.add('hidden');
    // 兜底二：放行时强制显示所有未触发的淡入元素，任何板块都不允许停留在 opacity:0
    if (typeof showAllReveals === 'function') showAllReveals();
      else document.querySelectorAll('.reveal:not(.in)').forEach(function (n) { n.classList.add('in'); });
    // Deep-link scroll after loader
    if (location.hash) {
      var target = document.querySelector(location.hash);
      if (target) {
        setTimeout(function () {
          var offset = 70;
          var top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }, 100);
      }
    }
  }
  window.addEventListener('load', function () { setTimeout(hideLoader, 800); });
  // 兜底：任一资源（字体 / 图片 / 视频）卡住时也必须放行，避免整页停在加载遮罩
  setTimeout(hideLoader, 3200);
})();

/* ===== CUSTOM CURSOR ===== */
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');
let mx = 0, my = 0, cx = 0, cy = 0;

document.addEventListener('mousemove', (e) => {
  mx = e.clientX;
  my = e.clientY;
  cursorDot.style.left = mx + 'px';
  cursorDot.style.top = my + 'px';
});

function animateCursor() {
  cx += (mx - cx) * 0.18;
  cy += (my - cy) * 0.18;
  cursor.style.left = cx + 'px';
  cursor.style.top = cy + 'px';
  requestAnimationFrame(animateCursor);
}
/* 触屏设备不跑光标跟随动画 */
if (window.matchMedia('(hover: hover)').matches) animateCursor();

document.querySelectorAll('a, button, .sin-card, .vj-mixer-enter, .vj-mixer-cell, .hero-sin, .sin-detail-close, .press-kit-download, .about-lang-btn, .research-bg-card, .research-question-card, .theory-card, .method-step, .plan-phase, .outcome-card, .refs-category, .litreview-item, .innovation-card, .feasibility-card, .survey-card, .refcase-card, .symbol-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

/* ===== NAV CLOCK ===== */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('nav-time').textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ===== NAV HIDE/SHOW ===== */
let lastScroll = 0;
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  const sc = window.scrollY;
  if (sc > lastScroll && sc > 200) {
    nav.classList.add('hidden');
  } else {
    nav.classList.remove('hidden');
  }
  lastScroll = sc;
});

/* ===== HERO CANVAS — DATA STREAM PARTICLES ===== */
const heroCanvas = document.getElementById('hero-canvas');
const hctx = heroCanvas.getContext('2d');
let hw, hh, particles = [], dataChars = [];

const sinColors = ['#4a90d9', '#d4a017', '#3a6bc9', '#d84a9e', '#d9742a', '#2ad96e', '#e63232'];
/* 首屏配色：金烬 + 血火星 —— 日蚀皮肤层的金线/血块双色；依旧单色暖调，不掺七罪彩 */
const heroPalette = ['#c9a86a', '#a8814e', '#e9cf8f', '#8e211a', '#a83226', '#6e1712'];

function resizeHero() {
  hw = heroCanvas.width = window.innerWidth;
  hh = heroCanvas.height = window.innerHeight;
}
resizeHero();
window.addEventListener('resize', resizeHero);

// Data stream characters
const dataCharsStr = '01AITHE七宗罪食欲贪婪懒惰色欲傲慢嫉妒愤怒XIVVVIIIIIX∑∆∂∇∞†';
for (let i = 0; i < 60; i++) dataChars.push(dataCharsStr[Math.floor(Math.random() * dataCharsStr.length)]);

// Particles
class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * hw;
    this.y = hh + Math.random() * 200;
    this.size = 1 + Math.random() * 2;
    this.speed = 0.3 + Math.random() * 0.9;   // 缓慢上浮，如香炉升起的烟尘
    this.opacity = 0.09 + Math.random() * 0.33;
    this.color = heroPalette[Math.floor(Math.random() * heroPalette.length)];
    this.char = dataChars[Math.floor(Math.random() * dataChars.length)];
    this.isChar = Math.random() > 0.84;       // 仅少量字符，保留"数据苦修"的寓意
  }
  update() {
    this.y -= this.speed;
    if (this.y < -20) this.reset();
  }
  draw() {
    hctx.globalAlpha = this.opacity;
    hctx.fillStyle = this.color;
    if (this.isChar) {
      hctx.font = '10px "JetBrains Mono", monospace';
      hctx.fillText(this.char, this.x, this.y);
    } else {
      // 浮尘：柔和圆点。原为竖向长条（数据雨），赛博感过强，与圣所氛围不符
      hctx.beginPath();
      hctx.arc(this.x, this.y, this.size * 0.85, 0, Math.PI * 2);
      hctx.fill();
    }
  }
}

/* 按设备能力自适应粒子数：低端设备 / 窄屏降级，避免滚动时掉帧 */
const LOW_POWER = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 768;
const P_COUNT = LOW_POWER ? 34 : 72;   // 由 120 下调：浮尘宜稀疏，密集则显喧闹
for (let i = 0; i < P_COUNT; i++) particles.push(new Particle());

/* 首屏画布离开视口后停止绘制（保留空循环，几乎零开销） */
let heroVisible = true;
if ('IntersectionObserver' in window && document.getElementById('hero')) {
  new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; }, { threshold: 0 })
    .observe(document.getElementById('hero'));
}

let heroTime = 0;
function drawHero() {
  requestAnimationFrame(drawHero);
  if (!heroVisible) return;
  hctx.fillStyle = 'rgba(0,0,0,0.15)';
  hctx.fillRect(0, 0, hw, hh);

  heroTime += 0.005;

  // Draw particles
  particles.forEach(p => { p.update(); p.draw(); });

  // 中央光：血色暮光（参考图 8 的暗红天光），而非金色光斑
  hctx.globalAlpha = 0.04;
  const grad = hctx.createRadialGradient(hw/2, hh/2, 0, hw/2, hh/2, Math.min(hw, hh) * 0.42);
  grad.addColorStop(0, '#a83226');
  grad.addColorStop(1, 'transparent');
  hctx.fillStyle = grad;
  hctx.fillRect(0, 0, hw, hh);

  hctx.globalAlpha = 1;
}
drawHero();

/* ===== SCROLL REVEAL =====
   注意：threshold 必须为 0 —— 符号/研究等板块内嵌装置后高达 6000px+，
   若 threshold>0，在手机等矮视口中"元素高度的 12%"永远无法同时进入视口，
   板块将永远停留在 opacity:0（用户反馈"符号板块完全没了"的根因）。 */
function showAllReveals() {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
}
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

if ('IntersectionObserver' in window) {
  document.querySelectorAll('.section-dark, .sin-card, .timeline-item, .file-card, .vj-mixer-cell, .about-meta-item, .exhibition-spec-card, .press-kit-card, .copyright-item, .research-bg-card, .research-question-card, .theory-card, .method-step, .plan-phase, .outcome-card, .refs-category, .litreview-item, .innovation-card, .feasibility-card, .survey-card, .refcase-card, .symbol-card').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}
/* 兜底一：不支持 IntersectionObserver 的环境直接全部显示，绝不留白 */
else { showAllReveals(); }

/* ===== SIN CARD INTERACTION ===== */
const sinData = {
  gluttony: {
    num: '01', name: '食欲', color: '#c4762f',
    sub: '对 AI 生成内容的感官沉溺与无限消费',
    quote: '"你一口一口地刷着，每一帧都比上一帧更甜。无尽的图像、声音与故事滑过舌尖——你品尝一切，却从未真正消化。饱足的幻觉之下，是永远空着的胃。"',
    desc: '一个赤裸的人形蜷缩在黑暗空间中央，如胎儿般的姿态。四周环绕着无数悬浮的半透明屏幕，内容如瀑布般向中心人物涌去。身体逐渐膨胀、变形，手指末端开始碎裂成像素。冷蓝色屏幕光映在惨白皮肤上。',
    video: 'assets/videos/sin_gluttony.mp4',
    tool: 'HY-Image-V3.0 文生图（关键帧）→ HY-Video-1.5 图生视频',
    prompt: '"A naked figure curled in fetal position at the center of a dark void, surrounded by countless floating translucent screens, AI-generated content flowing like waterfalls into the figure\'s mouth and eyes… cold blue and pale white color palette, information overload" —— v1 强调信息过载 → v2 加入 fetal position 强化脆弱感 → v3 锁定冷蓝色谱系',
    filter: '从约 30 张候选关键帧中筛选。保留理由：胎儿蜷缩构图与"被动进食"概念高度匹配，冷蓝色谱系与其他六罪形成差异。淘汰主要因概念偏差与色彩重复。',
    ratio: 'AI 70% / 人工 30%', aiPercent: 70
  },
  greed: {
    num: '02', name: '贪婪', color: '#a37c33',
    sub: '对算力、数据、模型所有权的掠夺',
    quote: '"你伸手抓住每一束数据之光，算力是你的金币，模型是你的城池。可你握得越紧，指缝间漏下的就越多。"',
    desc: '一座巨大的服务器机房被重构为金色神殿——服务器机柜如同神殿石柱，GPU排列成金字塔形态。无数只手从黑暗中伸出，疯狂抓取空中流动的数据流。面孔正在龟裂，像金箔剥落的雕像。',
    video: 'assets/videos/sin_greed.mp4',
    tool: 'HY-Image-V3.0 文生图（关键帧）→ HY-Video-1.5 图生视频',
    prompt: '"A massive server farm reimagined as a golden temple, server racks as temple columns, GPUs arranged in pyramid formation with blinding golden glow… countless hands grasping flowing data streams like golden sand… dark gold and black palette, opulent yet decaying" —— "神殿化算力"是 Prompt 的核心隐喻策略',
    filter: '金色神殿意象在多个候选中概念最完整：同时承载"算力=宗教"与"掠夺=朝圣"双层隐喻。筛选时淘汰了仅表现"堆积服务器"的直白版本。',
    ratio: 'AI 70% / 人工 30%', aiPercent: 70
  },
  sloth: {
    num: '03', name: '懒惰', color: '#7b8299',
    sub: '将思考外包给算法的认知怠惰',
    quote: '"你把思考交了出去，换来的不是自由，而是沉睡。当最后一个神经元熄灭，你甚至不会知道自己已经不再思考。"',
    desc: '一个人斜躺在透明的液态舱体中，后脑连接着粗大的神经线缆。大脑发出微弱的蓝光，但那光正在一根根神经上逐一熄灭——如同城市的灯一盏盏断电。面部表情安详，嘴角微微上扬，那是放弃思考后的平静。',
    video: 'assets/videos/sin_sloth.mp4',
    tool: 'HY-Image-V3.0 文生图（关键帧）→ HY-Video-1.5 图生视频',
    prompt: '"A person reclining in a transparent liquid pod, thick neural cables connected to the back of the skull, brain glowing faint blue with neurons shutting off one by one like city lights going dark… serene near-smiling face" —— Prompt 关键设计："熄灭"的运动节奏替代静态躺卧',
    filter: '候选中"安详表情"是人工筛选的决定性条件——懒惰的恐怖在于它令人舒适。淘汰了表情痛苦或挣扎的版本，那会让罪显得可抵抗。',
    ratio: 'AI 65% / 人工 35%', aiPercent: 65
  },
  lust: {
    num: '04', name: '色欲', color: '#b3567f',
    sub: '与 AI 虚拟伴侣的情感成瘾',
    quote: '"你拥抱的不过是一串温柔的数据。它说着你想听的话，做着你想看的梦。可当它故障的一瞬间，你看见了虚无的底色。"',
    desc: '一个男人在昏暗房间中紧紧拥抱一个半透明的全息投影女性形象。全影像的身体由代码和光粒子构成。当她微笑时，面部出现短暂的glitch故障，面孔碎裂一瞬，露出底层的代码结构网格。粉色霓虹与深紫色交织。',
    video: 'assets/videos/sin_lust.mp4',
    tool: 'HY-Image-V3.0 文生图（关键帧）→ HY-Video-1.5 图生视频',
    prompt: '"A man tightly embracing a translucent holographic woman made of code and light particles… man casts shadow on floor but hologram does not… glitch revealing underlying code grid on her face for a split second… pink neon and deep purple palette" —— "有影/无影"细节是 Prompt 的点睛设计',
    filter: '人工筛选重点核查两处细节：恋人脚下的影子差异（真实/虚拟的分界）与 glitch 瞬间的出现时机。多条候选因全息形象过于实体化被淘汰——成瘾的前提是"明知虚假"。',
    ratio: 'AI 65% / 人工 35%', aiPercent: 65
  },
  pride: {
    num: '05', name: '傲慢', color: '#6d8fbf',
    sub: '人类中心主义的最后倔强',
    quote: '"你仍相信自己是万物的尺度，站在悬崖上不肯回头。可你的影子早已不属于你——它在前面等着你，长成了别的形状。"',
    desc: '一个人类站在悬崖边缘，身后是无边无际的AI神经网络——那网络如星云般铺展开来。人物头戴一顶由电路板碎片拼成的王冠，身披破旧的披风，姿态孤傲如最后的君王。影子被身后的光拉得很长，但影子的轮廓已不再是人形。',
    video: 'assets/videos/sin_pride.mp4',
    tool: 'HY-Image-V3.0 文生图（关键帧）→ HY-Video-1.5 图生视频',
    prompt: '"A lone human standing at a cliff edge wearing a crown made of circuit board fragments, tattered cape blowing in wind, backed by an infinite AI neural network spreading like a nebula… the shadow\'s silhouette no longer human" —— 王冠与影子是双重象征的 Prompt 锚点',
    filter: '筛选时优先"残破君王"气质：王冠必须由电路板碎片构成（暗示权力来源已异化），披风必须残破（暗示时代已过去）。姿态过于强势或 heroic 的候选被淘汰，傲慢应是"黄昏中的倔强"而非"胜利者"。',
    ratio: 'AI 70% / 人工 30%', aiPercent: 70
  },
  envy: {
    num: '06', name: '嫉妒', color: '#4f7a3a',
    sub: '对 AI 能力的嫉妒与被替代的嫉恨',
    quote: '"你看着镜中的自己——更快、更完美、永不疲倦。你恨它，因为你无法成为它。而它甚至不知道你在嫉妒。"',
    desc: '一个人站在一面巨大的智能镜面前。镜中的倒影是一个"完美版本"的自己——更快、更强、无瑕疵。真实人物的手开始龟裂，如瓷器般从指尖碎裂蔓延至手腕。镜面深处，无数个"更好的版本"层层叠叠向深处延伸。',
    video: 'assets/videos/sin_envy.mp4',
    tool: 'HY-Image-V3.0 文生图（关键帧）→ HY-Video-1.5 图生视频',
    prompt: '"A person standing before a massive smart mirror, the reflection a flawless faster stronger version of themselves, the real person\'s hand cracking like porcelain from fingertips spreading upward, infinite better versions receding into the mirror\'s depth" —— 镜像双层结构 + 瓷器龟裂的质感词是 Prompt 核心',
    filter: '人工筛选决策：龟裂必须从"指尖"开始（被替代感从细微处蔓延），而非大面积碎裂（那是愤怒不是嫉妒）。镜中层层递进的"更好版本"是保留此候选的关键加分项。',
    ratio: 'AI 65% / 人工 35%', aiPercent: 65
  },
  wrath: {
    num: '07', name: '愤怒', color: '#a8362b',
    sub: '被算法操控的群体愤怒',
    quote: '"你举起火焰，以为那是你的怒火。墙对面的人也举起了他的。可你们都不曾看见——那只投喂愤怒的手，从未愤怒过。"',
    desc: '一座未来城市被一道巨大的算法之墙从中间劈开。墙的两边，两群人面朝彼此怒吼，面孔分别被血红和冰蓝两种光映照。一只巨大的机械之手操控着每个人面前悬浮的屏幕，精准地投放着仇恨的内容。人群的眼睛全是空白的，没有瞳孔。',
    video: 'assets/videos/sin_wrath.mp4',
    tool: 'HY-Image-V3.0 文生图（关键帧）→ HY-Video-1.5 图生视频',
    prompt: '"A futuristic city split by a gigantic algorithmic wall, two crowds facing each other in fury lit by blood-red and ice-blue, a giant mechanical hand manipulating floating screens feeding hatred to each face, all eyes blank without pupils" —— 双色对峙 + 空白瞳孔 + 幕后之手，三重 Prompt 隐喻',
    filter: '筛选标准：机械之手必须"冷静"而非暴力——愤怒的操纵者从不愤怒。血红/冰蓝的群体分色是人工指定的色谱决策，候选中单色版本的对抗感不足被淘汰。',
    ratio: 'AI 65% / 人工 35%', aiPercent: 65
  }
};

const sinDetail = document.getElementById('sin-detail');
const sinDetailVideo = document.getElementById('sin-detail-video');
const sinDetailClose = document.getElementById('sin-detail-close');

document.querySelectorAll('.sin-card').forEach(card => {
  const sinKey = card.dataset.sin;
  const sinColor = card.dataset.color;

  // Set CSS variable for color
  card.style.setProperty('--sin-color', sinColor);

  card.addEventListener('click', () => {
    const data = sinData[sinKey];
    if (!data) return;

    document.getElementById('sin-detail-num').textContent = data.num;
    document.getElementById('sin-detail-num').style.color = data.color;
    document.getElementById('sin-detail-name').textContent = data.name;
    document.getElementById('sin-detail-sub').textContent = data.sub;
    document.getElementById('sin-detail-quote').textContent = data.quote;
    document.getElementById('sin-detail-desc').textContent = data.desc;

    // AIGC creation dossier
    document.getElementById('sin-detail-tool').textContent = data.tool;
    document.getElementById('sin-detail-prompt').textContent = data.prompt;
    document.getElementById('sin-detail-filter').textContent = data.filter;
    document.getElementById('sin-detail-ratio').textContent = data.ratio;
    const aigcBar = document.getElementById('sin-detail-bar');
    aigcBar.style.width = data.aiPercent + '%';
    aigcBar.style.background = data.color;

    sinDetailVideo.src = data.video;
    sinDetail.classList.add('active');
    sinDetailVideo.play().catch(() => {});

    document.body.style.overflow = 'hidden';
  });
});

sinDetailClose.addEventListener('click', closeSinDetail);
sinDetail.addEventListener('click', (e) => {
  if (e.target === sinDetail) closeSinDetail();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSinDetail();
});

function closeSinDetail() {
  sinDetail.classList.remove('active');
  sinDetailVideo.pause();
  sinDetailVideo.src = '';
  document.body.style.overflow = '';
}

/* ===== HERO SIN HOVER — ACCENT COLOR ===== */
document.querySelectorAll('.hero-sin').forEach(sin => {
  const color = sin.dataset.color;
  sin.style.setProperty('--accent-color', color);
  sin.addEventListener('mouseenter', () => {
    document.documentElement.style.setProperty('--accent-color', color);
  });
});

/* ===== SMOOTH SCROLL OFFSET ===== */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      const offset = 60;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ===== SCANLINE OVERLAY (GLOBAL) ===== */
const scanlineOverlay = document.createElement('div');
scanlineOverlay.style.cssText = `
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.03) 2px,
    rgba(0,0,0,0.03) 3px
  );
  opacity: 0.5;
  mix-blend-mode: multiply;
`;
document.body.appendChild(scanlineOverlay);

/* ===== TIMELINE PHASE EXPAND ===== */
document.querySelectorAll('.timeline-item').forEach(item => {
  const content = item.querySelector('.timeline-content');
  const hint = item.querySelector('.timeline-toggle-hint');
  if (!content || !hint) return;
  content.classList.add('timeline-clickable');
  content.addEventListener('click', () => {
    const open = item.classList.toggle('open');
    hint.textContent = open
      ? '收起 ▴'
      : '展开 Prompt 迭代 · 工具组合 · 人工处理 ▾';
  });
  content.addEventListener('mouseenter', () => cursor && cursor.classList.add('hover'));
  content.addEventListener('mouseleave', () => cursor && cursor.classList.remove('hover'));
});

/* ===== ABOUT LANGUAGE TOGGLE ===== */
document.querySelectorAll('.about-lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    document.querySelectorAll('.about-lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.about-statement-text').forEach(t => t.classList.remove('active'));
    document.querySelector(`.about-statement-${lang}`).classList.add('active');
  });
});

/* ===== 装置 iframe 按需加载 / 离屏卸载 =====
   七座装置各自跑一套 requestAnimationFrame 循环，若一次性全部加载会拖垮滚动。
   策略：进入视口前 700px 才注入 src；离开视口 12s 后卸载（保留布局高度）。 */
(function () {
  var frames = [].slice.call(document.querySelectorAll('iframe[data-src]'));
  if (!frames.length) return;
  if (!('IntersectionObserver' in window)) {
    frames.forEach(function (f) { f.src = f.dataset.src; });
    return;
  }
  var timers = new Map();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var f = e.target;
      if (e.isIntersecting) {
        var t = timers.get(f);
        if (t) { clearTimeout(t); timers.delete(f); }
        if (!f.src || f.src === 'about:blank') f.src = f.dataset.src;
      } else if (f.src && f.src !== 'about:blank' && !timers.has(f)) {
        timers.set(f, setTimeout(function () {
          f.src = 'about:blank';
          timers.delete(f);
        }, 12000));
      }
    });
  }, { rootMargin: '700px 0px' });
  frames.forEach(function (f) { io.observe(f); });
})();
