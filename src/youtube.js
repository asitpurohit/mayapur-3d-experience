// Playlist of YouTube tracks - the player will randomly pick from this list
export const TRACK_URLS = [
  'https://www.youtube.com/watch?v=3r7jcs5A9wY',      // HG Vishvambar Prabhu - Hare Krishna Mantra
  'https://www.youtube.com/watch?v=XHluPUeB8wU',      // Srila Prabhupada - Mahamantra Chanting
  'https://www.youtube.com/watch?v=bID-2YaBwPo',      // Iskcon Mayapur Kirtan 4
  'https://youtu.be/LeRXtDFtp7Y?si=0lJvo3Ek3eAfGlde', // Srila Prabhupada - Hare Krishna Kirtan
  'https://youtu.be/umN5muYdaSk?si=xqcxjPVslF0gPPGC', // Jai Sri Krsna
  'https://youtu.be/K9OjsTUZj0g?si=dQCOltzCdWnlNyiR', // Sachi Kumar Das - Hare Krishna Kirtan 10
];

const IFRAME_API_URL = 'https://www.youtube.com/iframe_api';

// Extract 11-character video ID from any YouTube URL format or raw ID
export function extractVideoId(urlOrId) {
  if (!urlOrId) return '';
  const str = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : str;
}

export function createYouTubeMusic(tracks = TRACK_URLS) {
  const pillElement = document.getElementById('music-pill');

  const videoIds = tracks.map(extractVideoId).filter(Boolean);
  let currentTrackIndex = Math.floor(Math.random() * (videoIds.length || 1));
  let currentVideoId = videoIds[currentTrackIndex] || '3r7jcs5A9wY';

  let player = null;
  let playerReady = false;
  let startRequested = false;
  let isPlaying = false;

  function pickNextTrackId() {
    if (videoIds.length <= 1) return videoIds[0] || currentVideoId;
    let nextIndex = currentTrackIndex;
    while (nextIndex === currentTrackIndex && videoIds.length > 1) {
      nextIndex = Math.floor(Math.random() * videoIds.length);
    }
    currentTrackIndex = nextIndex;
    currentVideoId = videoIds[currentTrackIndex];
    return currentVideoId;
  }

  const updatePill = (playing) => {
    if (!pillElement) return;
    if (playing) {
      pillElement.textContent = '🔊 Kirtan';
      pillElement.classList.add('playing');
      pillElement.setAttribute('title', 'Playing Kirtan · Tap to pause · Tap ⏭ Next to change track');
    } else {
      pillElement.textContent = '🔈 Kirtan (Paused)';
      pillElement.classList.remove('playing');
      pillElement.setAttribute('title', 'Kirtan paused · Tap to play · Tap ⏭ Next to change track');
    }
  };

  function initPlayer() {
    if (player || !window.YT || !window.YT.Player) return;

    try {
      player = new window.YT.Player('youtube-player', {
        width: '200',
        height: '200',
        videoId: currentVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          loop: videoIds.length <= 1 ? 1 : 0,
          playlist: videoIds.length <= 1 ? currentVideoId : undefined,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin || window.location.host,
        },
        events: {
          onReady: () => {
            playerReady = true;
            if (startRequested && !isPlaying) {
              requestPlayback();
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              isPlaying = true;
              startRequested = false;
              updatePill(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              isPlaying = false;
              updatePill(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              // Automatically pick another random track when finished
              skip();
            }
          },
          onError: (err) => {
            console.warn('[youtube] Background audio error:', err);
            // If a track errors or is restricted, auto-skip to another random track
            if (videoIds.length > 1) {
              skip();
            }
          },
        },
      });
    } catch (e) {
      console.warn('[youtube] Failed to initialize YT.Player:', e);
    }
  }

  // Load the YouTube Iframe API script if not already present
  if (window.YT && window.YT.Player) {
    initPlayer();
  } else {
    const existing = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof existing === 'function') existing();
      initPlayer();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = IFRAME_API_URL;
      tag.async = true;
      document.head.appendChild(tag);
    }
  }

  function play() {
    startRequested = true;
    if (!player || !playerReady) {
      return;
    }
    requestPlayback();
  }

  function pause() {
    try {
      if (player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
        isPlaying = false;
        updatePill(false);
      }
    } catch (e) {
      console.warn('[youtube] Pause error:', e);
    }
  }

  const SOOTHING_VOLUME = 28; // Serene ambient level, leaving 72% dynamic headroom for SFX
  let currentVolume = SOOTHING_VOLUME;

  function setVolume(v) {
    currentVolume = Math.max(0, Math.min(100, Math.round(v)));
    if (player && typeof player.setVolume === 'function') {
      player.setVolume(currentVolume);
    }
  }

  function getVolume() {
    return currentVolume;
  }

  function applyVolume(targetVol = currentVolume, { fade = true } = {}) {
    if (!player || typeof player.setVolume !== 'function') return;
    if (typeof player.unMute === 'function') player.unMute();

    if (!fade) {
      player.setVolume(targetVol);
      return;
    }

    // Soft fade-in so kirtan eases in serenely without startling the devotee
    let v = 6;
    player.setVolume(v);
    const step = Math.max(1, (targetVol - v) / 8);
    const timer = setInterval(() => {
      v += step;
      if (v >= targetVol) {
        v = targetVol;
        clearInterval(timer);
      }
      if (player && typeof player.setVolume === 'function') {
        player.setVolume(Math.round(v));
      }
    }, 120);
  }

  function toggle() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function skip() {
    const nextId = pickNextTrackId();
    if (player && typeof player.loadVideoById === 'function') {
      try {
        if (typeof player.unMute === 'function') player.unMute();
        player.loadVideoById(nextId);
        applyVolume(currentVolume, { fade: true });
        player.playVideo();
        isPlaying = true;
        updatePill(true);
      } catch (e) {
        console.warn('[youtube] Error skipping to next track:', e);
      }
    }
  }

  function requestPlayback() {
    try {
      if (player && typeof player.playVideo === 'function') {
        applyVolume(currentVolume, { fade: true });
        player.playVideo();
      }
    } catch (error) {
      console.warn('[youtube] Playback request error:', error);
    }
  }

  const nextBtn = document.getElementById('music-next-btn');

  function bindTouchClick(el, onAction) {
    if (!el) return;
    let lastTime = 0;
    const trigger = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastTime < 300) return;
      lastTime = now;
      onAction();
    };
    el.addEventListener('click', trigger);
    el.addEventListener('touchend', trigger);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  if (pillElement) {
    bindTouchClick(pillElement, toggle);
    pillElement.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      skip();
    });
  }

  if (nextBtn) {
    bindTouchClick(nextBtn, () => {
      skip();
    });
  }

  return { play, pause, toggle, skip, setVolume, getVolume, pickNextTrackId };
}
