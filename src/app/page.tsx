// src/app/page.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FRAME_TEMPLATES, FrameTemplate } from '@/config/frameConfig';
import {
  Camera,
  CameraOff,
  Download,
  RefreshCw,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  FlipHorizontal,
  Sparkles,
  Upload,
} from 'lucide-react';

interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
}

export default function HexaCanvasBooth() {
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera & Capture States
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [photos, setPhotos] = useState<(CapturedPhoto | null)[]>(Array(6).fill(null));
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(3);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  // Frame Customization States
  const [selectedTemplate, setSelectedTemplate] = useState<FrameTemplate>(FRAME_TEMPLATES[0]);
  const [customOverlayUrl, setCustomOverlayUrl] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('HEXACANVAS STUDIO');
  const [eventSubtitle, setEventSubtitle] = useState<string>('OFFICIAL EVENT ARCHIVE • 2026');

  // Cloud Upload States
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [driveFolderLink, setDriveFolderLink] = useState<string | null>(null);

  // Helper untuk Meminta Stream Kamera ke Browser
  const requestMediaStream = useCallback(async (): Promise<MediaStream> => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      throw new Error('NOT_SUPPORTED');
    }

    try {
      // Coba resolusi ideal 1080p terlebih dahulu
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
        audio: false,
      });
    } catch {
      // Fallback jika webcam tidak mendukung constraint 1080p
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }
  }, []);

  const handleCameraError = useCallback((err: unknown) => {
    console.error('Gagal mengakses kamera:', err);
    setHasCamera(false);
    const errorObj = err as { name?: string; message?: string };
    if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
      setCameraError(
        'Izin kamera ditolak. Klik ikon gembok (🔒) atau kamera di address bar browser Anda, ubah izin Kamera menjadi "Allow", lalu klik Coba Lagi.'
      );
    } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
      setCameraError(
        'Perangkat webcam tidak ditemukan. Pastikan webcam tercolok dan terpasang dengan benar di komputer.'
      );
    } else if (errorObj?.name === 'NotReadableError' || errorObj?.name === 'TrackStartError') {
      setCameraError(
        'Kamera sedang digunakan aplikasi lain (misal Zoom, Meet, OBS, Discord, atau tab browser lain). Tutup aplikasi tersebut lalu coba lagi.'
      );
    } else if (errorObj?.message === 'NOT_SUPPORTED') {
      setCameraError(
        'Fitur WebRTC kamera diblokir. Pastikan membuka website melalui http://localhost:3000 (bukan via IP LAN HTTP tanpa HTTPS).'
      );
    } else {
      setCameraError(errorObj?.message || 'Gagal mengakses webcam perangkat Anda.');
    }
  }, []);

  // 1. Inisialisasi Kamera Saat Komponen Dimuat
  useEffect(() => {
    let active = true;

    requestMediaStream()
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((e) => console.warn('Autoplay dicegah oleh browser:', e));
          };
        }
        setHasCamera(true);
        setCameraError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        handleCameraError(err);
      });

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [requestMediaStream, handleCameraError]);

  // Tombol Manual Retry Kamera dari UI
  const handleManualRetryCamera = async () => {
    setIsInitializingCamera(true);
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const mediaStream = await requestMediaStream();
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Autoplay dicegah oleh browser:', e));
        };
      }
      setHasCamera(true);
      setCameraError(null);
    } catch (err: unknown) {
      handleCameraError(err);
    } finally {
      setIsInitializingCamera(false);
    }
  };

  // 2. Fungsi Menggambar Object-Fit: Cover di HTML5 Canvas (Agar Foto Tidak Gepeng)
  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const imgRatio = img.width / img.height;
    const slotRatio = w / h;
    let sx = 0,
      sy = 0,
      sw = img.width,
      sh = img.height;

    if (imgRatio > slotRatio) {
      sw = img.height * slotRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / slotRatio;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  // 3. Fungsi Render Gabungan 6 Foto + Frame di Canvas Utama (1200x1800)
  const renderCompositeCanvas = useCallback(async () => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { canvasWidth, canvasHeight, bgColor, accentColor, textColor, slots, overlayPngUrl } =
      selectedTemplate;

    // Reset & Gambar Background Dasar
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Helper Load Image
    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    // Gambar 6 Slot Foto
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const photo = photos[i];

      if (photo) {
        try {
          const img = await loadImage(photo.dataUrl);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 16);
          ctx.clip();
          drawImageCover(ctx, img, slot.x, slot.y, slot.width, slot.height);
          ctx.restore();
        } catch (e) {
          console.error(`Gagal memuat gambar slot ${i + 1}`, e);
        }
      } else {
        // Placeholder jika slot belum terisi foto
        ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.beginPath();
        ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`SLOT #${slot.id}`, slot.x + slot.width / 2, slot.y + slot.height / 2 + 14);
      }
    }

    // Jika Ada File Custom Overlay PNG (Dari Upload User atau dari Config)
    const activeOverlay = customOverlayUrl || overlayPngUrl;
    if (activeOverlay) {
      try {
        const overlayImg = await loadImage(activeOverlay);
        ctx.drawImage(overlayImg, 0, 0, canvasWidth, canvasHeight);
      } catch (e) {
        console.warn('Overlay PNG tidak ditemukan, menggunakan desain tipografi bawaan.', e);
      }
    } else {
      // Desain Frame Bawaan (Border & Tipografi Footer)
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 12;
      ctx.strokeRect(24, 24, canvasWidth - 48, canvasHeight - 48);

      // Header Kecil
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('• SIX-TILE ARCHIVE SYSTEM •', canvasWidth / 2, 75);

      // Footer Judul Acara
      ctx.fillStyle = textColor;
      ctx.font = '900 58px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(eventTitle.toUpperCase(), canvasWidth / 2, 1480);

      // Footer Subjudul
      ctx.fillStyle = accentColor;
      ctx.font = '600 28px sans-serif';
      ctx.fillText(eventSubtitle, canvasWidth / 2, 1535);

      // Garis Dekoratif & Timestamp
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.5;
      ctx.font = '500 22px monospace';
      ctx.fillText(new Date().toLocaleString('id-ID'), canvasWidth / 2, 1720);
      ctx.globalAlpha = 1.0;
    }
  }, [photos, selectedTemplate, customOverlayUrl, eventTitle, eventSubtitle]);

  // Render ulang Canvas setiap kali foto atau template berubah
  useEffect(() => {
    renderCompositeCanvas();
  }, [renderCompositeCanvas]);

  // 4. Fungsi Menangkap 1 Frame Mentah dari Video Kamera
  const captureSingleFrame = (): Promise<CapturedPhoto> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) return reject('Elemen video tidak ditemukan.');

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth || 1280;
      tempCanvas.height = video.videoHeight || 720;
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) return reject('Gagal membuat context 2D.');

      if (isMirrored) {
        ctx.translate(tempCanvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.92);
      tempCanvas.toBlob(
        (blob) => {
          if (!blob) return reject('Gagal membuat Blob foto.');
          resolve({ blob, dataUrl });
        },
        'image/jpeg',
        0.92
      );
    });
  };

  // Helper Delay & Countdown
  const runCountdown = async (seconds: number) => {
    for (let s = seconds; s > 0; s--) {
      setCountdown(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 220);
  };

  // 5. Fungsi Upload Paralel 6 Foto Mentah ke Backend Google Drive API
  const uploadRawPhotosToDrive = async (completedPhotos: (CapturedPhoto | null)[]) => {
    const validPhotos = completedPhotos.filter((p): p is CapturedPhoto => p !== null);
    if (validPhotos.length < 6) return;

    setUploadStatus('uploading');
    setUploadMessage('Mengunggah 6 foto mentah ke Google Drive...');
    setDriveFolderLink(null);

    try {
      const formData = new FormData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      formData.append('sessionName', `HexaSession_${timestamp}`);
      validPhotos.forEach((photo, index) => {
        formData.append('photos', photo.blob, `raw_slot_${index + 1}.jpg`);
      });

      const response = await fetch('/api/upload-drive', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal mengunggah ke Google Drive');
      }

      setUploadStatus('success');
      setUploadMessage(`6 Foto mentah berhasil disimpan di Google Drive!`);
      if (result.folderLink) {
        setDriveFolderLink(result.folderLink);
      }
    } catch (error: unknown) {
      console.error(error);
      setUploadStatus('error');
      setUploadMessage(
        error instanceof Error ? error.message : 'Terjadi kesalahan saat upload ke Google Drive.'
      );
    }
  };

  // 6. Mulai Sesi 6 Foto Otomatis Beruntun
  const startFullSession = async () => {
    if (isCapturing || !hasCamera) return;
    setIsCapturing(true);
    setUploadStatus('idle');

    setPhotos(Array(6).fill(null));
    const capturedSessionPhotos: (CapturedPhoto | null)[] = Array(6).fill(null);

    for (let i = 0; i < 6; i++) {
      setActiveSlot(i);
      await runCountdown(timerSeconds);

      try {
        const captured = await captureSingleFrame();
        capturedSessionPhotos[i] = captured;
        setPhotos((prev) => prev.map((p, idx) => (idx === i ? captured : p)));
      } catch (err) {
        console.error(`Gagal mengambil foto ke-${i + 1}:`, err);
      }

      // Jeda singkat antar foto agar pengguna siap ganti gaya
      if (i < 5) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    setActiveSlot(null);
    setIsCapturing(false);

    // Trigger Auto-Upload 6 Foto Mentah ke Google Drive di Background
    uploadRawPhotosToDrive(capturedSessionPhotos);
  };

  // 7. Retake (Foto Ulang) Satu Slot Tertentu
  const retakeSingleSlot = async (slotIndex: number) => {
    if (isCapturing || !hasCamera) return;
    setIsCapturing(true);
    setActiveSlot(slotIndex);

    await runCountdown(timerSeconds);

    try {
      const captured = await captureSingleFrame();
      const updated = photos.map((p, idx) => (idx === slotIndex ? captured : p));
      setPhotos(updated);

      // Jika ke-6 slot sudah lengkap, sinkronkan ulang ke Drive
      if (updated.every((p) => p !== null)) {
        uploadRawPhotosToDrive(updated);
      }
    } catch (err) {
      console.error(`Gagal retake slot ${slotIndex + 1}:`, err);
    }
    setActiveSlot(null);
    setIsCapturing(false);
  };

  // 8. Unduh Hasil Frame Gabungan Secara Instan (Client-Side)
  const downloadCompositeFrame = () => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = `HexaCanvas_Frame_${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  // Handler Upload Custom PNG Frame dari Lokal
  const handleCustomFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomOverlayUrl(url);
  };

  const completedCount = photos.filter((p) => p !== null).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">HEXACANVAS STUDIO</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            6-Tile Instant Frame Compositor & Automated Google Drive Raw Archiver
          </p>
        </div>

        {/* Pengaturan Timer & Cermin */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            {[2, 3, 5].map((sec) => (
              <button
                key={sec}
                onClick={() => setTimerSeconds(sec)}
                disabled={isCapturing}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  timerSeconds === sec
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec}s Timer
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium transition"
          >
            <FlipHorizontal className="w-4 h-4 text-sky-400" />
            {isMirrored ? 'Mirror: ON' : 'Mirror: OFF'}
          </button>
        </div>
      </header>

      {/* Grid Utama: Kiri Kamera & Slot, Kanan Preview Frame & Download */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* KOLOM KIRI (7 Kolom): Live Camera & 6 Thumbnail Slot */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Layar Kamera */}
          <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />

            {/* Efek Flash Putih Saat Jepret */}
            {flashEffect && <div className="absolute inset-0 bg-white z-30 animate-ping" />}

            {/* Overlay jika Kamera Belum Terdeteksi atau Izin Ditolak */}
            {!hasCamera && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
                  <CameraOff className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">Kamera Belum Aktif</h3>
                <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                  {cameraError || 'Menghubungkan ke webcam perangkat Anda...'}
                </p>
                <button
                  onClick={handleManualRetryCamera}
                  disabled={isInitializingCamera}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInitializingCamera ? 'animate-spin' : ''}`} />
                  {isInitializingCamera ? 'Menghubungkan...' : 'Izinkan & Coba Lagi'}
                </button>
              </div>
            )}

            {/* Overlay Countdown */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center z-20">
                <span className="text-xs uppercase tracking-widest text-sky-400 font-semibold mb-2">
                  Mengambil Foto Slot #{(activeSlot ?? 0) + 1}
                </span>
                <span className="text-8xl font-black text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}

            {/* Indikator Status Kamera */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasCamera ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{hasCamera ? 'Kamera Aktif' : 'Kamera Tidak Terdeteksi'}</span>
            </div>

            <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs font-semibold text-sky-400">
              {completedCount} / 6 Foto Terkumpul
            </div>
          </div>

          {/* Tombol Aksi Utama Capture */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={startFullSession}
              disabled={isCapturing || !hasCamera}
              className="flex-1 flex items-center justify-center gap-3 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-4 px-6 rounded-xl shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              {isCapturing
                ? `Sedang Mengambil Foto #${(activeSlot ?? 0) + 1}...`
                : 'Mulai Sesi 6 Foto Otomatis'}
            </button>

            <button
              onClick={() => {
                setPhotos(Array(6).fill(null));
                setUploadStatus('idle');
              }}
              disabled={isCapturing || completedCount === 0}
              className="px-5 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-sm font-semibold transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Daftar 6 Slot Foto (Klik untuk Retake Individual) */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">
                6 Slot Foto Mentah (Klik slot mana saja untuk Foto Ulang / Retake)
              </h2>
              <span className="text-xs text-slate-500">Rasio Slot 4:3</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => retakeSingleSlot(idx)}
                  disabled={isCapturing || !hasCamera}
                  className={`group relative aspect-4/3 rounded-xl overflow-hidden border transition ${
                    activeSlot === idx
                      ? 'border-sky-400 ring-2 ring-sky-400/40'
                      : 'border-slate-800 hover:border-sky-500/60'
                  } bg-slate-950`}
                >
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.dataUrl}
                        alt={`Slot ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition text-[11px] font-semibold text-sky-300">
                        <RefreshCw className="w-4 h-4 mb-1" />
                        Retake #{idx + 1}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs font-bold">
                      #{idx + 1}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Status Auto-Upload Google Drive */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {uploadStatus === 'idle' && <CloudUpload className="w-5 h-5 text-slate-400" />}
              {uploadStatus === 'uploading' && (
                <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
              )}
              {uploadStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {uploadStatus === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Status Cloud Backup (Google Drive)
                </p>
                <p className="text-sm font-medium text-slate-200 mt-0.5">
                  {uploadStatus === 'idle'
                    ? 'Menunggu 6 foto selesai diambil untuk diunggah otomatis...'
                    : uploadMessage}
                </p>
              </div>
            </div>

            {driveFolderLink && (
              <a
                href={driveFolderLink}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold whitespace-nowrap transition"
              >
                Buka Folder Drive ↗
              </a>
            )}
          </div>
        </section>

        {/* KOLOM KANAN (5 Kolom): Live Preview Frame 6-Slot & Tombol Download */}
        <aside className="lg:col-span-5 flex flex-col gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Hasil Frame (1200 x 1800 px)</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Siap Cetak 4R
            </span>
          </div>

          {/* Canvas Preview */}
          <div className="w-full max-w-[340px] mx-auto aspect-2/3 rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
            <canvas
              ref={compositeCanvasRef}
              width={1200}
              height={1800}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Kustomisasi Tema Frame & Teks */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Pilih Tema Frame Bawaan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {FRAME_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setCustomOverlayUrl(null);
                      setSelectedTemplate(tpl);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                      selectedTemplate.id === tpl.id && !customOverlayUrl
                        ? 'border-sky-400 bg-sky-500/10 text-sky-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Opsi Upload Desain Frame PNG Sendiri */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Atau Gunakan File Desain Frame (.PNG Transparan)
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-dashed border-slate-700 hover:border-sky-400 bg-slate-900/60 text-xs font-medium text-slate-300 cursor-pointer transition">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>{customOverlayUrl ? 'Ganti File PNG Overlay' : 'Upload PNG (1200x1800px)'}</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleCustomFrameUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Input Judul Acara */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Judul Frame</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Sub-judul / Tanggal</label>
                <input
                  type="text"
                  value={eventSubtitle}
                  onChange={(e) => setEventSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Tombol Download Langsung */}
          <button
            onClick={downloadCompositeFrame}
            disabled={completedCount === 0}
            className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-4 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Download className="w-5 h-5" />
            Download Hasil Frame Sekarang (.JPG)
          </button>
        </aside>
      </div>
    </main>
  );
}