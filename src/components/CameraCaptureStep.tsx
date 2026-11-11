// src/components/CameraCaptureStep.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Timer,
  RefreshCw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { CapturedPhoto } from '@/types/photobooth';

interface CameraCaptureStepProps {
  onCaptureComplete: (photos: CapturedPhoto[]) => void;
  existingPhotos?: (CapturedPhoto | null)[];
  retakeSlotIndex?: number | null;
  onSingleCaptureComplete?: (slotIndex: number, photo: CapturedPhoto) => void;
  onCancelRetake?: () => void;
}

export default function CameraCaptureStep({
  onCaptureComplete,
  existingPhotos,
  retakeSlotIndex,
  onSingleCaptureComplete,
  onCancelRetake,
}: CameraCaptureStepProps) {
  const isRetakeMode = retakeSlotIndex !== null && retakeSlotIndex !== undefined;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // States
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [timerSeconds, setTimerSeconds] = useState<number>(3);

  // Capture session states
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [tempCapturedCount, setTempCapturedCount] = useState<number>(0);

  // 1. Helper Permintaan Stream Kamera
  const requestMediaStream = useCallback(async (): Promise<MediaStream> => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      throw new Error('NOT_SUPPORTED');
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
        audio: false,
      });
    } catch {
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

  // 2. Inisialisasi Kamera Saat Komponen Mount
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

  // 3. Menangkap 1 Frame Mentah dari Video Kamera
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

      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
      tempCanvas.toBlob(
        (blob) => {
          if (!blob) return reject('Gagal membuat Blob foto.');
          resolve({ blob, dataUrl });
        },
        'image/jpeg',
        0.95
      );
    });
  };

  // Helper Countdown
  const runCountdown = async (seconds: number) => {
    for (let s = seconds; s > 0; s--) {
      setCountdown(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 220);
  };

  // 4. Mulai Sesi 6 Foto Otomatis Beruntun
  const handleStartCaptureSession = async () => {
    if (isCapturing || !hasCamera) return;

    setIsCapturing(true);
    setTempCapturedCount(0);
    const sessionPhotos: CapturedPhoto[] = [];

    for (let i = 0; i < 6; i++) {
      setActiveSlot(i);
      await runCountdown(timerSeconds);

      try {
        const captured = await captureSingleFrame();
        sessionPhotos.push(captured);
        setTempCapturedCount(sessionPhotos.length);
      } catch (err) {
        console.error(`Gagal mengambil foto ke-${i + 1}:`, err);
      }

      // Jeda antar jepretan agar pengguna siap berganti gaya
      if (i < 5) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    setActiveSlot(null);
    setIsCapturing(false);

    // Jika ke-6 foto berhasil diambil, langsung pindah ke halaman review!
    if (sessionPhotos.length === 6) {
      onCaptureComplete(sessionPhotos);
    }
  };

  // 5. Mode Foto Ulang 1 Foto Khusus untuk Slot Tertentu
  const handleStartSingleCapture = async () => {
    if (isCapturing || !hasCamera || retakeSlotIndex === null || retakeSlotIndex === undefined) return;

    setIsCapturing(true);
    setActiveSlot(retakeSlotIndex);

    await runCountdown(timerSeconds);

    try {
      const captured = await captureSingleFrame();
      onSingleCaptureComplete?.(retakeSlotIndex, captured);
    } catch (err) {
      console.error(`Gagal mengambil foto ulang slot ${retakeSlotIndex + 1}:`, err);
    } finally {
      setActiveSlot(null);
      setIsCapturing(false);
    }
  };

  const existingCount = existingPhotos?.filter((p) => p !== null).length ?? 0;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Header Info */}
      <div className="text-center mb-6">
        {isRetakeMode ? (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Mode Foto Ulang Slot #{retakeSlotIndex + 1}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Ambil 1 Foto Pengganti
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Kamera akan mengambil **1 kali jepretan** untuk langsung menggantikan foto di Slot #{retakeSlotIndex + 1}.
            </p>
            {onCancelRetake && (
              <button
                type="button"
                onClick={onCancelRetake}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal & Kembali ke Review</span>
              </button>
            )}
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sesi Photobooth 6 Pose</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Bersiap untuk 6 Foto Otomatis
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Atur timer yang nyaman, posisikan gaya terbaik Anda, lalu tekan tombol lingkaran shutter di bawah.
            </p>
          </>
        )}
      </div>

      {/* Main Camera Viewfinder (Preview Kamera Utama) */}
      <div className="relative w-full aspect-video md:aspect-[16/10] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl ring-1 ring-white/10">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Efek Flash Putih Saat Jepret */}
        {flashEffect && <div className="absolute inset-0 bg-white z-40 animate-ping" />}

        {/* Overlay jika Kamera Belum Terdeteksi atau Izin Ditolak */}
        {!hasCamera && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
              <CameraOff className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Kamera Belum Aktif</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
              {cameraError || 'Menghubungkan ke webcam perangkat Anda...'}
            </p>
            <button
              type="button"
              onClick={handleManualRetryCamera}
              disabled={isInitializingCamera}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isInitializingCamera ? 'animate-spin' : ''}`} />
              {isInitializingCamera ? 'Menghubungkan...' : 'Izinkan & Coba Lagi'}
            </button>
          </div>
        )}

        {/* Overlay Countdown Besar Saat Sesi Berlangsung */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center z-30">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-3 ${
                isRetakeMode
                  ? 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                  : 'bg-sky-500/20 border-sky-400/30 text-sky-300'
              }`}
            >
              <Camera className="w-3.5 h-3.5 animate-pulse" />
              <span>
                {isRetakeMode
                  ? `Mengambil Foto Ulang Slot #${(retakeSlotIndex ?? 0) + 1}`
                  : `Mengambil Pose #${(activeSlot ?? 0) + 1} dari 6`}
              </span>
            </div>
            <span className="text-9xl font-black text-white drop-shadow-2xl animate-pulse">
              {countdown}
            </span>
          </div>
        )}

        {/* Status Kamera & Slot Badge (Pojok Kiri Atas) */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs z-20">
          <span
            className={`w-2 h-2 rounded-full ${
              hasCamera ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="font-medium text-slate-300">
            {hasCamera ? 'Kamera Live' : 'Kamera Mati'}
          </span>
        </div>

        {/* Progress Pose Badge Saat Jepret (Pojok Kanan Atas) */}
        {isRetakeMode ? (
          <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-amber-500/30 z-20">
            Foto Ulang #{ (retakeSlotIndex ?? 0) + 1 }
          </div>
        ) : isCapturing ? (
          <div className="absolute top-4 right-4 bg-sky-500 text-slate-950 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-sky-500/30 z-20 animate-pulse">
            Foto {tempCapturedCount} / 6
          </div>
        ) : null}
      </div>

      {/* CONTROL DECK: Tepat di Bawah Preview Kamera */}
      <div className="w-full mt-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 md:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* MENU KIRI: Pilihan Timer */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-sky-400" />
              Pilih Timer
            </span>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              {[2, 3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTimerSeconds(sec)}
                  disabled={isCapturing}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    timerSeconds === sec
                      ? isRetakeMode
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sec}d
                </button>
              ))}
            </div>
          </div>

          {/* TENGAH: TOMBOL LINGKARAN SHUTTER */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={isRetakeMode ? handleStartSingleCapture : handleStartCaptureSession}
              disabled={isCapturing || !hasCamera}
              aria-label={
                isRetakeMode
                  ? `Jepret Foto Ulang Slot #${(retakeSlotIndex ?? 0) + 1}`
                  : 'Ambil 6 Foto'
              }
              className={`group relative flex items-center justify-center w-20 h-20 md:w-22 md:h-22 rounded-full border-4 transition-all duration-200 cursor-pointer ${
                isCapturing
                  ? 'border-sky-400/50 scale-95 opacity-80 cursor-not-allowed'
                  : !hasCamera
                  ? 'border-slate-700 opacity-50 cursor-not-allowed'
                  : isRetakeMode
                  ? 'border-amber-400 hover:border-amber-300 hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20'
                  : 'border-sky-400 hover:border-sky-300 hover:scale-105 active:scale-95 shadow-xl shadow-sky-500/20'
              } bg-slate-950/40 p-1.5`}
            >
              {/* Inner Circle Shutter */}
              <div
                className={`w-full h-full rounded-full transition-all duration-200 flex items-center justify-center ${
                  isCapturing
                    ? 'bg-rose-500 animate-pulse'
                    : isRetakeMode
                    ? 'bg-amber-300 group-hover:bg-amber-200 shadow-inner'
                    : 'bg-white group-hover:bg-sky-100 shadow-inner'
                }`}
              >
                {isCapturing ? (
                  <span className="text-white text-xs font-black">
                    {isRetakeMode ? '1' : `${(activeSlot ?? 0) + 1}/6`}
                  </span>
                ) : (
                  <Camera className="w-7 h-7 text-slate-900 group-hover:scale-110 transition-transform" />
                )}
              </div>
            </button>
            <span className="text-xs font-bold text-slate-300">
              {isCapturing
                ? isRetakeMode
                  ? `Mengambil Pose #${(retakeSlotIndex ?? 0) + 1}...`
                  : `Mengambil Pose ${(activeSlot ?? 0) + 1}...`
                : isRetakeMode
                ? `Jepret 1 Foto Slot #${(retakeSlotIndex ?? 0) + 1}`
                : 'Mulai 6 Foto Otomatis'}
            </span>
          </div>

          {/* MENU KANAN: Mirroring / Flip Camera */}
          <div className="flex flex-col items-center sm:items-end gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FlipHorizontal className="w-3.5 h-3.5 text-sky-400" />
              Orientasi Layar
            </span>
            <button
              type="button"
              onClick={() => setIsMirrored(!isMirrored)}
              disabled={isCapturing}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${
                isMirrored
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FlipHorizontal className="w-4 h-4" />
              <span>{isMirrored ? 'Cermin: ON' : 'Cermin: OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shortcut jika sudah ada foto sebelumnya */}
      {existingCount === 6 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              const validPhotos = existingPhotos?.filter(
                (p): p is CapturedPhoto => p !== null
              );
              if (validPhotos && validPhotos.length === 6) {
                onCaptureComplete(validPhotos);
              }
            }}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-4 transition"
          >
            Lihat kembali 6 foto sesi sebelumnya →
          </button>
        </div>
      )}
    </div>
  );
}

