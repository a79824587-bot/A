import React, { useState, useEffect, useRef } from 'react';

// --- 📦 設定データ ---
const AUDIO_CONFIG = {
  bgm: [
    { id: 'bgm1', name: 'オープニング', url: 'https://www.image2url.com/r2/default/audio/1788536523911-2d9053df-d220-4a32-ad62-5286ef96eb20.m4a' },
    { id: 'bgm2', name: '戦闘BGM', url: 'https://www.image2url.com/r2/default/audio/1788515804416-2898e0c9-ea52-4764-bc99-9e87761a8ec8.mp3' },
  ],
  seRows: [
    [
      { id: 'se1', name: '風魔法', url: 'https://www.springin.org/wp-content/uploads/2022/06/強風1.mp3' },
      { id: 'se2', name: 'ゴゴゴ', url: 'https://www.springin.org/wp-content/uploads/2022/06/%E5%9C%B0%E9%9F%BF%E3%81%8D2%E7%9F%AD.mp3' },
      { id: 'se3', name: '武装解除', url: 'https://www.springin.org/wp-content/uploads/2022/06/%E5%8F%8E%E6%9D%9F.mp3' },
    ],
    [
      { id: 'se4', name: '失敗', url: 'https://www.image2url.com/r2/default/audio/1788534694363-3cb9a8c1-9ba2-49f4-8d4f-73fa8762483c.mp3' },
      { id: 'se5', name: 'かっこいい', url: 'https://www.image2url.com/r2/default/audio/1788536716329-8d78dc52-78cf-4e5d-ad04-c27ab1a63efd.mp3' },
      { id: 'se6', name: '通常魔法', url: 'https://www.image2url.com/r2/default/audio/1788536897978-6940d0d2-0029-4bb9-aa8e-7a1c40aa0e36.mp3' },
    ],
    [
      { id: 'se7', name: '打撃', url: 'https://www.image2url.com/r2/default/audio/1788569726361-4abd1e0e-ff72-4f72-955a-8d90f07fa531.mp3' },
      { id: 'se8', name: '早そうな音', url: 'https://www.image2url.com/r2/default/audio/1788570940613-8e6a2aff-53bc-455d-b19b-173c89f28a38.mp3' },
      { id: 'se9', name: '合成', url: 'https://www.image2url.com/r2/default/audio/1788570758124-8e710291-2ece-4062-b023-f032ce730558.mp3' },
    ],
  ]
};

// --- URL整形ヘルパー ---
const formatUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("Https://")) return "https://" + url.slice(8);
  return url;
};

// --- 🎧 ノイズ防止用フェードアウト処理 ---
const fadeOutAndStop = (audio, targetVolume) => {
  if (!audio) return null;
  const startVolume = audio.volume;
  const steps = 5; 
  const intervalTime = 10; 
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    const newVolume = Math.max(0, startVolume * (1 - currentStep / steps));
    if (audio) audio.volume = newVolume;
    
    if (currentStep >= steps) {
      clearInterval(interval);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = targetVolume; 
      }
    }
  }, intervalTime);
  return interval;
};

// --- 🎵 BGM用フック ---
const useAudioPlayer = (initialUrl, isLoop = true) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const cleanUrl = formatUrl(initialUrl);
  const defaultVolume = 0.5;

  useEffect(() => {
    const audio = new Audio();
    audio.loop = isLoop;
    audio.preload = "auto";
    audio.volume = defaultVolume;
    // URLの存在確認だけを行う（GoogleのダミーURLチェックを削除）
    if (cleanUrl && cleanUrl.trim() !== '') {
      audio.src = cleanUrl;
    }
    audioRef.current = audio;
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [cleanUrl, isLoop]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (isPlaying) {
      setIsPlaying(false);
      fadeIntervalRef.current = fadeOutAndStop(audio, defaultVolume);
    } else {
      audio.volume = defaultVolume;
      audio.currentTime = 0;
      audio.play().then(() => setIsPlaying(true)).catch(e => {
        console.error("BGM再生エラー:", e);
        setIsPlaying(false);
      });
    }
  };
  return { isPlaying, togglePlay };
};

// --- 🔊 効果音用フック (独立再生・干渉防止・ループ対応版) ---
const useSeTogglePlayer = (initialUrl) => {
  const [playState, setPlayState] = useState('IDLE'); 
  const cleanUrl = formatUrl(initialUrl);
  
  const activeAudioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const defaultVolume = 0.7; 

  useEffect(() => {
    // URLの存在確認だけを行う
    if (!cleanUrl || cleanUrl.trim() === '') return;
    
    const audio = new Audio(cleanUrl);
    audio.preload = "auto";
    audio.volume = defaultVolume;
    
    const handleEnded = () => setPlayState('IDLE');
    audio.addEventListener('ended', handleEnded);
    activeAudioRef.current = audio;

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, [cleanUrl]);

  useEffect(() => {
    const handleStopAll = () => {
      const audio = activeAudioRef.current;
      if (audio && !audio.paused) {
        setPlayState('IDLE');
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = fadeOutAndStop(audio, defaultVolume);
      }
    };
    window.addEventListener('stop-all-se', handleStopAll);
    return () => window.removeEventListener('stop-all-se', handleStopAll);
  }, []);

  const play = () => {
    const audio = activeAudioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    audio.loop = false;
    audio.volume = defaultVolume;
    audio.currentTime = 0;
    
    // 状態を即座に更新してUIをレスポンシブに
    setPlayState('SINGLE');
    audio.play().catch(e => {
      console.error("SE再生エラー:", e);
      setPlayState('IDLE');
    });
  };

  const stop = () => {
    const audio = activeAudioRef.current;
    if (!audio) return;
    
    setPlayState('IDLE');
    
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    fadeIntervalRef.current = fadeOutAndStop(audio, defaultVolume);
  };

  const setLoop = (e) => {
    if(e) e.stopPropagation();
    const audio = activeAudioRef.current;
    if (audio) {
      audio.loop = true;
      setPlayState('LOOP');
      
      if (audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(e => console.error("ループ再開エラー:", e));
      }
    }
  };

  return { playState, play, stop, setLoop };
};

const stopAllSe = () => {
  window.dispatchEvent(new Event('stop-all-se'));
};

// --- コンポーネント群 ---
const BgmTrack = ({ defaultName = "曲名〜", url }) => {
  const { isPlaying, togglePlay } = useAudioPlayer(url, true);
  const cleanUrl = formatUrl(url);
  // URLが存在すればOKとする
  const hasAudio = Boolean(cleanUrl && cleanUrl.trim() !== '');

  return (
    <div className={`w-full max-w-[200px] rounded-2xl border p-3.5 transition-all duration-300 backdrop-blur-md relative overflow-hidden ${
      isPlaying 
        ? 'bg-slate-900/90 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.25)]' 
        : 'bg-slate-900/40 border-slate-800 shadow-lg hover:border-slate-700'
    }`}>
      {isPlaying && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 animate-pulse" />
      )}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold tracking-wider text-slate-300 truncate">{defaultName}</span>
        <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-ping' : 'bg-slate-700'}`} />
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex gap-1 items-end h-7 px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800">
          <span className={`w-1 rounded-sm bg-amber-400 transition-all ${isPlaying ? 'h-full animate-[pulse_0.4s_infinite_100ms]' : 'h-1.5 bg-slate-800'}`} />
          <span className={`w-1 rounded-sm bg-amber-400 transition-all ${isPlaying ? 'h-3/4 animate-[pulse_0.4s_infinite_200ms]' : 'h-1.5 bg-slate-800'}`} />
          <span className={`w-1 rounded-sm bg-amber-400 transition-all ${isPlaying ? 'h-full animate-[pulse_0.4s_infinite_300ms]' : 'h-1.5 bg-slate-800'}`} />
        </div>
        <button 
          onClick={togglePlay} 
          disabled={!hasAudio}
          className={`flex-1 h-9 rounded-xl font-black text-xs tracking-widest transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 select-none touch-manipulation ${
            isPlaying 
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300' 
              : hasAudio 
                ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-amber-400 hover:border-amber-500/50' 
                : 'bg-slate-950 border border-slate-800 text-slate-700 opacity-40 cursor-not-allowed'
          }`}
        >
          {isPlaying ? (
            <><span className="w-2 h-2 bg-slate-950 rounded-xs" /><span>STOP</span></>
          ) : (
            <><span className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-current ml-0.5" /><span>PLAY</span></>
          )}
        </button>
      </div>
    </div>
  );
};

const SePad = ({ id, defaultName = "名称", url }) => {
  const { playState, play, stop, setLoop } = useSeTogglePlayer(url);
  const cleanUrl = formatUrl(url);
  // URLが存在すればOKとする
  const hasAudio = Boolean(cleanUrl && cleanUrl.trim() !== '');
  const isPlaying = playState !== 'IDLE';

  return (
    <div className="flex flex-col items-center w-full max-w-[140px]">
      <div className={`text-[11px] mb-1.5 px-3 py-0.5 truncate w-20 text-center block font-bold border rounded-full transition-all duration-100 ${
        isPlaying 
          ? playState === 'LOOP'
            ? 'text-fuchsia-300 border-fuchsia-400 bg-fuchsia-900/80 shadow-[0_0_12px_rgba(217,70,239,0.6)] animate-pulse'
            : 'text-red-300 border-red-400 bg-red-900/80 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse'
          : 'text-red-400 border-red-500/80 bg-red-950/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
      }`}>
        <span className="truncate block" title={defaultName}>{defaultName}</span>
      </div>
      
      <div className="w-full h-11 sm:h-12 relative flex">
        {playState === 'IDLE' && (
          <button 
            onClick={() => { if(hasAudio) play(); }}
            disabled={!hasAudio}
            className={`w-full h-full rounded-xl border font-bold text-xs transition-all duration-75 flex items-center justify-center gap-1.5 relative overflow-hidden active:scale-90 select-none touch-manipulation ${
              hasAudio 
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-red-500/60 hover:text-red-400 shadow-[0_4px_12px_rgba(0,0,0,0.5)]' 
                : 'bg-slate-950/60 border-slate-900 text-slate-700 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="tracking-wider">流す</span>
            {hasAudio && <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />}
          </button>
        )}

        {playState === 'SINGLE' && (
          <div className="w-full h-full flex gap-0.5 animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={stop}
              className="flex-1 h-full rounded-l-xl border border-red-400/80 bg-red-600 text-white font-bold text-[10px] sm:text-[11px] shadow-[0_0_15px_rgba(239,68,68,0.6)] active:bg-red-700 transition-colors select-none touch-manipulation"
            >
              止める
            </button>
            <button 
              onClick={setLoop}
              className="flex-[1.2] h-full rounded-r-xl border border-fuchsia-400/80 bg-fuchsia-600 text-white font-bold text-[10px] sm:text-[11px] shadow-[0_0_15px_rgba(217,70,239,0.6)] active:bg-fuchsia-700 transition-colors flex items-center justify-center select-none touch-manipulation"
            >
              連続再生
            </button>
          </div>
        )}

        {playState === 'LOOP' && (
          <button 
            onClick={stop}
            className="w-full h-full rounded-xl border border-fuchsia-400 bg-fuchsia-700 text-white font-bold text-xs shadow-[0_0_20px_rgba(217,70,239,0.8)] flex items-center justify-center gap-1.5 active:scale-90 transition-all animate-pulse select-none touch-manipulation"
          >
            <span className="w-2.5 h-2.5 border-2 border-white rounded-full animate-spin border-t-transparent" />
            <span className="tracking-wider">止める</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-start pt-2 sm:pt-4 md:pt-6 p-2 sm:p-4 md:p-6 font-sans text-slate-100 selection:bg-red-500 selection:text-white select-none touch-manipulation">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(245,158,11,0.12),transparent_55%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(239,68,68,0.12),transparent_55%)] pointer-events-none" />

      <div className="border border-slate-800/80 rounded-[2rem] sm:rounded-[2.5rem] p-3.5 sm:p-5 md:p-6 max-w-2xl w-full bg-slate-900/80 backdrop-blur-xl relative shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        
        <div className="relative mb-3 flex flex-col items-center">
          <div className="flex items-center gap-2 px-3 py-0.5 rounded-full border border-amber-500/30 bg-amber-950/30 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[9px] font-black tracking-[0.25em] text-amber-300 uppercase">
              AUDIO CONTROL STATION / SYSTEM ACTIVE
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3.5 items-center">
          
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex items-center gap-2 mb-1 pl-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <h2 className="text-sm sm:text-base font-extrabold tracking-widest text-slate-200 uppercase">BGM</h2>
            </div>
            <div className="flex flex-row justify-center gap-3.5 sm:gap-6 w-full">
              {AUDIO_CONFIG.bgm.map((bgm) => (
                <BgmTrack key={bgm.id} defaultName={bgm.name} url={bgm.url} />
              ))}
            </div>
          </div>

          <div className="w-full flex flex-col relative mt-0.5">
            <div className="w-full flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <h2 className="text-sm sm:text-base font-extrabold tracking-widest text-slate-200 uppercase">効果音</h2>
              </div>
              <button
                onClick={stopAllSe}
                className="text-[10px] font-bold px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800/80 hover:border-red-500 text-red-300 rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-sm cursor-pointer select-none touch-manipulation"
              >
                <span>■</span><span>全SE停止</span>
              </button>
            </div>
            
            <div className="relative p-3 sm:p-3.5 rounded-3xl bg-slate-950/60 border border-slate-800/80 shadow-inner">
              {AUDIO_CONFIG.seRows.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 relative z-10 justify-items-center">
                    {row.map((se) => (
                      <SePad key={se.id} id={se.id} defaultName={se.name} url={se.url} />
                    ))}
                  </div>
                  {rowIndex < AUDIO_CONFIG.seRows.length - 1 && (
                    <div className="border-b border-dashed border-slate-800/80 my-2.5 sm:my-3 relative z-10" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
