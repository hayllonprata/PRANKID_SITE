const heroScroll = document.querySelector(".hero-scroll");
const video = document.querySelector(".hero__video");

video.muted = true;
video.playsInline = true;
video.setAttribute("playsinline", "");
video.setAttribute("webkit-playsinline", "");

let duration = 0;
let ticking = false;
let isReady = false;
let isActivated = false;

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getScrollProgress() {
  const scrollRange = heroScroll.offsetHeight - getViewportHeight();
  if (scrollRange <= 0) return 0;

  const scrolled = -heroScroll.getBoundingClientRect().top;
  return Math.min(Math.max(scrolled / scrollRange, 0), 1);
}

function seekTo(time) {
  if (!isReady || !duration) return;

  const target = Math.min(Math.max(time, 0), duration - 0.05);

  if (Math.abs(video.currentTime - target) < 0.03) return;

  if (typeof video.fastSeek === "function") {
    video.fastSeek(target);
  } else {
    video.currentTime = target;
  }
}

function scrubVideo() {
  seekTo(getScrollProgress() * duration);
  ticking = false;
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(scrubVideo);
  }
}

async function activateVideo() {
  if (isActivated) return;
  isActivated = true;

  try {
    await video.play();
    video.pause();
    scrubVideo();
  } catch {
    /* iOS pode bloquear até haver interação — tentamos de novo no próximo toque */
    isActivated = false;
  }
}

function onVideoReady() {
  if (!video.duration || !isFinite(video.duration)) return;

  duration = video.duration;
  isReady = video.readyState >= 2;
  video.pause();
  scrubVideo();
}

video.addEventListener("loadedmetadata", onVideoReady);
video.addEventListener("loadeddata", onVideoReady);
video.addEventListener("canplay", onVideoReady);

document.addEventListener("touchstart", activateVideo, { passive: true });
document.addEventListener("click", activateVideo);

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("touchmove", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });

window.visualViewport?.addEventListener("scroll", onScroll, { passive: true });
window.visualViewport?.addEventListener("resize", onScroll, { passive: true });

video.load();
