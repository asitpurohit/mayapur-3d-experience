const ARTIST_URI = 'spotify:artist:6dbKrCa9fXf25VkrIFnwsk';
const IFRAME_API_URL = 'https://open.spotify.com/embed/iframe-api/v1';

export function createSpotifyMusic() {
  const embedElement = document.getElementById('spotify-embed');
  const statusElement = document.getElementById('spotify-status');
  const widgetElement = document.getElementById('spotify-widget');
  let controller = null;
  let controllerReady = false;
  let startRequested = false;
  let isPlaying = false;

  const setStatus = (message) => {
    if (statusElement) statusElement.textContent = message;
  };

  if (!embedElement) return { play() {} };

  window.onSpotifyIframeApiReady = (iframeApi) => {
    iframeApi.createController(
      embedElement,
      { uri: ARTIST_URI, width: '100%', height: '152' },
      (embedController) => {
        controller = embedController;
        setStatus('Press Begin to play music');

        controller.addListener('ready', () => {
          controllerReady = true;
          setStatus('Press Begin to play music');
          if (startRequested && !isPlaying) requestPlayback();
        });

        controller.addListener('playback_started', () => {
          isPlaying = true;
          startRequested = false;
          widgetElement?.classList.add('spotify-widget--hidden');
          setStatus('Music is playing');
        });

        controller.addListener('playback_update', (event) => {
          isPlaying = !event.data.isPaused;
          setStatus(isPlaying ? 'Music is playing' : 'Music paused');
        });
      },
    );
  };

  const script = document.createElement('script');
  script.src = IFRAME_API_URL;
  script.async = true;
  script.onerror = () => setStatus('Spotify could not load. Use Open Spotify or the player controls.');
  document.head.append(script);

  function play() {
    startRequested = true;
    if (!controller) {
      setStatus('Spotify is loading. Use the player controls if music does not start.');
      return;
    }

    requestPlayback(!controllerReady);
  }

  function requestPlayback(fromBeginClick = false) {
    try {
      controller.play();
      if (controllerReady || !fromBeginClick) startRequested = false;
      setStatus('Starting music…');
      window.setTimeout(() => {
        if (!isPlaying && statusElement?.textContent === 'Starting music…') {
          setStatus('If music did not start, press play in the Spotify player.');
        }
      }, 4000);
    } catch (error) {
      console.warn('[spotify] Could not start embedded playback:', error);
      setStatus('Press play in the Spotify player to start music.');
    }
  }

  return { play };
}
