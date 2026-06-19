const heroScroll = document.querySelector(".hero-scroll");
const hero = document.querySelector(".hero");
const video = document.querySelector(".hero__video");
const canvas = document.querySelector(".hero__canvas");
const ctx = canvas.getContext("2d", { alpha: false });

video.muted = true;
video.playsInline = true;
video.setAttribute("playsinline", "");
video.setAttribute("webkit-playsinline", "");

let duration = 0;
let isReady = false;
let isActivated = false;
let isSeeking = false;
let targetTime = 0;
let lastDrawnTime = -1;
let ticking = false;
let seekFallbackTimer = null;

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getMaxScroll() {
  return Math.max(heroScroll.offsetHeight - getViewportHeight(), 1);
}

function getScrollProgress() {
  return Math.min(Math.max(window.scrollY / getMaxScroll(), 0), 1);
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = hero.clientWidth;
  const height = hero.clientHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (isReady) {
    drawCoverFrame();
  }
}

function drawCoverFrame() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const cw = hero.clientWidth;
  const ch = hero.clientHeight;
  const videoAspect = vw / vh;
  const canvasAspect = cw / ch;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoAspect > canvasAspect) {
    sw = vh * canvasAspect;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / canvasAspect;
    sy = (vh - sh) / 2;
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  lastDrawnTime = video.currentTime;
}

function queueSeek(time) {
  if (!isReady || !duration) return;

  targetTime = Math.min(Math.max(time, 0), duration - 0.04);

  if (Math.abs(lastDrawnTime - targetTime) < 0.03) return;
  if (isSeeking) return;

  if (Math.abs(video.currentTime - targetTime) < 0.03) {
    drawCoverFrame();
    return;
  }

  isSeeking = true;
  clearTimeout(seekFallbackTimer);

  seekFallbackTimer = setTimeout(() => {
    isSeeking = false;
    drawCoverFrame();
    if (Math.abs(lastDrawnTime - targetTime) > 0.05) {
      queueSeek(targetTime);
    }
  }, 150);

  if (typeof video.fastSeek === "function") {
    video.fastSeek(targetTime);
  } else {
    video.currentTime = targetTime;
  }
}

function updateFrame() {
  updateHeroVisibility();
  queueSeek(getScrollProgress() * duration);
  ticking = false;
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(updateFrame);
  }
}

function updateHeroVisibility() {
  if (window.scrollY >= getMaxScroll() - 2) {
    hero.classList.add("is-hidden");
  } else {
    hero.classList.remove("is-hidden");
  }
}

async function activateVideo() {
  if (isActivated) return;

  try {
    await video.play();
    video.pause();
    isActivated = true;
    queueSeek(getScrollProgress() * duration);
  } catch {
    isActivated = false;
  }
}

function onVideoReady() {
  if (!video.duration || !isFinite(video.duration)) return;

  duration = video.duration;
  isReady = video.readyState >= 2;
  video.pause();
  resizeCanvas();
  queueSeek(0);
}

video.addEventListener("loadedmetadata", onVideoReady);
video.addEventListener("loadeddata", onVideoReady);
video.addEventListener("canplay", onVideoReady);

video.addEventListener("seeked", () => {
  clearTimeout(seekFallbackTimer);
  isSeeking = false;
  drawCoverFrame();

  if (Math.abs(video.currentTime - targetTime) > 0.05) {
    queueSeek(targetTime);
  }
});

document.addEventListener("touchstart", activateVideo, { passive: true });
document.addEventListener("touchmove", activateVideo, { passive: true });
document.addEventListener("click", activateVideo);

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("touchmove", onScroll, { passive: true });
window.addEventListener("resize", () => {
  resizeCanvas();
  onScroll();
}, { passive: true });

window.visualViewport?.addEventListener("scroll", onScroll, { passive: true });
window.visualViewport?.addEventListener("resize", () => {
  resizeCanvas();
  onScroll();
}, { passive: true });

video.load();
resizeCanvas();
onScroll();
