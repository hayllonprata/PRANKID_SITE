const heroScroll = document.querySelector(".hero-scroll");
const hero = document.querySelector(".hero");
const video = document.querySelector(".hero__video");
const canvas = document.querySelector(".hero__canvas");
const ctx = canvas.getContext("2d", { alpha: false });

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Mac") && "ontouchend" in document);

const useCanvas = isIOS;

video.muted = true;
video.playsInline = true;
video.setAttribute("playsinline", "");
video.setAttribute("webkit-playsinline", "");
document.body.classList.add(useCanvas ? "use-canvas" : "use-video");

let duration = 0;
let isReady = false;
let isActivated = !useCanvas;

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getMaxScroll() {
  return Math.max(heroScroll.offsetHeight - getViewportHeight(), 1);
}

function getScrollProgress() {
  return Math.min(Math.max(window.scrollY / getMaxScroll(), 0), 1);
}

function getTargetTime() {
  if (!duration) return 0;
  return getScrollProgress() * duration;
}

function resizeCanvas() {
  if (!useCanvas) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = hero.clientWidth;
  const height = hero.clientHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCoverFrame() {
  if (!useCanvas) return;

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
}

function scrubToScroll() {
  if (!isReady || !isActivated) return;

  const target = getTargetTime();

  if (Math.abs(video.currentTime - target) > 0.001) {
    video.currentTime = target;
  }

  if (useCanvas) {
    drawCoverFrame();
  }
}

function updateHeroVisibility() {
  if (window.scrollY >= getMaxScroll() - 2) {
    hero.classList.add("is-hidden");
  } else {
    hero.classList.remove("is-hidden");
  }
}

function tick() {
  scrubToScroll();
  updateHeroVisibility();
  requestAnimationFrame(tick);
}

async function activateVideo() {
  if (isActivated) return;

  try {
    await video.play();

    if (useCanvas) {
      video.playbackRate = 0;
    } else {
      video.pause();
    }

    isActivated = true;
    scrubToScroll();
  } catch {
    isActivated = false;
  }
}

function onVideoReady() {
  if (!video.duration || !isFinite(video.duration)) return;

  duration = video.duration;
  isReady = video.readyState >= 2;

  if (!useCanvas) {
    video.pause();
    isActivated = true;
  }

  resizeCanvas();
  scrubToScroll();
}

video.addEventListener("loadedmetadata", onVideoReady);
video.addEventListener("loadeddata", onVideoReady);
video.addEventListener("canplay", onVideoReady);

if (useCanvas) {
  video.addEventListener("seeked", drawCoverFrame);
}

document.addEventListener("touchstart", activateVideo, { passive: true });
document.addEventListener("click", activateVideo);

window.addEventListener(
  "scroll",
  () => {
    if (useCanvas && !isActivated) activateVideo();
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  resizeCanvas();
  scrubToScroll();
}, { passive: true });

window.visualViewport?.addEventListener("resize", () => {
  resizeCanvas();
  scrubToScroll();
}, { passive: true });

video.load();
resizeCanvas();
requestAnimationFrame(tick);
