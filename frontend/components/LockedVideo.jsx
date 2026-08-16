'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { isDirectVideo, getEmbedUrl } from '@/lib/video';

// Video oxirigacha ko'rilishini majburlaydi: oldinga surib bo'lmaydi, oxiriga
// yetganда (>=98% yoki tugaganда) `onComplete` chaqiriladi. play/pause + ovoz mumkin.
// Video ilgari ko'rilgan bo'lsa ham SHU qulflangan rejim qoladi (erkin surish yo'q) —
// lekin ostidagi materiallar allaqachon ochiq bo'ladi (learn page videoGate=false).
// `done=true` bo'lsa onComplete o'tkazilmaydi (qayta belgilash/yangilash shart emas).
const DONE_THRESHOLD = 0.98;

function ytId(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function fmt(t) {
  if (!t || !isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LockedVideo({ videoUrl, onComplete }) {
  const yt = ytId(videoUrl);
  const direct = isDirectVideo(videoUrl);

  if (yt) return <YouTubeLocked videoId={yt} onComplete={onComplete} />;
  if (direct) return <DirectLocked src={videoUrl} onComplete={onComplete} />;

  // Boshqa embed (masalan Vimeo) — qulf qo'llab-quvvatlanmaydi, oddiy ko'rsatamiz
  return (
    <div className="overflow-hidden rounded-2xl bg-black">
      <iframe
        src={getEmbedUrl(videoUrl)}
        title="Dars videosi"
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// Umumiy boshqaruv paneli (surib bo'lmaydigan progress + play/pause + ovoz)
function Controls({ playing, onToggle, muted, onMute, volume, onVolume, current, duration }) {
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  return (
    <div className="flex items-center gap-3 bg-scrim px-3 py-2.5 text-white">
      <button onClick={onToggle} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25">
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>

      {/* Surib bo'lmaydigan progress (ko'rsatkich, interaktiv emas) */}
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/20" title="Oldinga surib bo'lmaydi">
        <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
      </div>

      <span className="shrink-0 text-xs tabular-nums text-white/80">{fmt(current)} / {fmt(duration)}</span>

      <button onClick={onMute} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/15">
        {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
      <input
        type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
        onChange={(e) => onVolume(Number(e.target.value))}
        className="h-1 w-16 shrink-0 cursor-pointer accent-indigo-400"
        title="Ovoz balandligi"
      />
    </div>
  );
}

function Hint() {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
      <Lock size={13} /> Videoni oxirigacha ko'ring — keyin matn, PDF va test ochiladi. Oldinga surib bo'lmaydi.
    </p>
  );
}

// ---------- To'g'ridan-to'g'ri (mp4/webm) qulflangan pleer ----------
function DirectLocked({ src, onComplete }) {
  const ref = useRef(null);
  const maxRef = useRef(0);
  const doneRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete?.();
  }, [onComplete]);

  const onTime = () => {
    const v = ref.current; if (!v) return;
    const t = v.currentTime;
    if (t <= maxRef.current + 1.2) maxRef.current = Math.max(maxRef.current, t);
    setCurrent(t);
    if (v.duration && t / v.duration >= DONE_THRESHOLD) finish();
  };
  const onSeeking = () => {
    const v = ref.current; if (!v) return;
    // Oldinga sakrashni bloklaymiz — eng ko'p ko'rilgan nuqtaga qaytaramiz
    if (v.currentTime > maxRef.current + 1.2) v.currentTime = maxRef.current;
  };

  const toggle = () => {
    const v = ref.current; if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };
  const setVol = (val) => {
    const v = ref.current; if (!v) return;
    v.muted = val === 0; v.volume = val; setVolume(val); setMuted(val === 0);
  };
  const toggleMute = () => { const v = ref.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={ref}
          src={src}
          className="aspect-video w-full"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={onTime}
          onSeeking={onSeeking}
          onEnded={finish}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
        <Controls
          playing={playing} onToggle={toggle}
          muted={muted} onMute={toggleMute}
          volume={volume} onVolume={setVol}
          current={current} duration={duration}
        />
      </div>
      <Hint />
    </div>
  );
}

// ---------- YouTube IFrame API qulflangan pleer ----------
let ytApiPromise = null;
function loadYTApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) return resolve(window.YT);
    if (!document.getElementById('yt-iframe-api')) {
      const s = document.createElement('script');
      s.id = 'yt-iframe-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (typeof prev === 'function') prev(); resolve(window.YT); };
    const iv = setInterval(() => {
      if (window.YT && window.YT.Player) { clearInterval(iv); resolve(window.YT); }
    }, 120);
  });
  return ytApiPromise;
}

function YouTubeLocked({ videoId, onComplete }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const maxRef = useRef(0);
  const doneRef = useRef(false);
  const pollRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    let destroyed = false;
    loadYTApi().then((YT) => {
      if (destroyed || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          controls: 0, disablekb: 1, modestbranding: 1, rel: 0,
          playsinline: 1, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            setReady(true);
            setDuration(e.target.getDuration() || 0);
            setVolume((e.target.getVolume?.() ?? 100) / 100);
            pollRef.current = setInterval(() => {
              const p = playerRef.current; if (!p || !p.getCurrentTime) return;
              const t = p.getCurrentTime() || 0;
              const d = p.getDuration() || 0;
              if (d && !duration) setDuration(d);
              // Oldinga sakrashni bloklaymiz
              if (t > maxRef.current + 1.4) {
                p.seekTo(maxRef.current, true);
              } else {
                maxRef.current = Math.max(maxRef.current, t);
                setCurrent(t);
              }
              if (d && t / d >= DONE_THRESHOLD) finish();
            }, 400);
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) setPlaying(true);
            else if (e.data === S.PAUSED || e.data === S.BUFFERING) setPlaying(false);
            else if (e.data === S.ENDED) { setPlaying(false); finish(); }
          },
        },
      });
    });
    return () => {
      destroyed = true;
      if (pollRef.current) clearInterval(pollRef.current);
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const toggle = () => {
    const p = playerRef.current; if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  };
  const setVol = (val) => {
    const p = playerRef.current; if (!p) return;
    p.setVolume(Math.round(val * 100));
    if (val === 0) p.mute(); else p.unMute();
    setVolume(val); setMuted(val === 0);
  };
  const toggleMute = () => {
    const p = playerRef.current; if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-black">
        {/* YouTube iframe shu div ichida yaratiladi */}
        <div className="aspect-video w-full">
          <div ref={hostRef} className="h-full w-full" />
        </div>
        {/* Iframe ustiga shaffof qatlam — YouTube ustiga bosib to'xtatish/sakrashни oldini oladi */}
        <div className="absolute inset-0 bottom-[46px] cursor-pointer" onClick={toggle} aria-hidden="true" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}
        <Controls
          playing={playing} onToggle={toggle}
          muted={muted} onMute={toggleMute}
          volume={volume} onVolume={setVol}
          current={current} duration={duration}
        />
      </div>
      <Hint />
    </div>
  );
}
