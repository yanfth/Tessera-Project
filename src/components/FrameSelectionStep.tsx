// src/components/FrameSelectionStep.tsx
'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Upload,
  ArrowLeft,
  Sparkles,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { FRAME_TEMPLATES, FrameTemplate } from '@/config/frameConfig';
import { CapturedPhoto } from '@/types/photobooth';

interface FrameSelectionStepProps {
  photos: (CapturedPhoto | null)[];
  selectedTemplate: FrameTemplate;
  onSelectTemplate: (tpl: FrameTemplate) => void;
  customOverlayUrl: string | null;
  onUploadCustomOverlay: (e: React.ChangeEvent<HTMLInputElement>) => void;
  frameDescription: string;
  onChangeFrameDescription: (val: string) => void;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadMessage: string;
  driveFolderLink: string | null;
  onBackToReview: () => void;
  onStartNewSession: () => void;
}

export default function FrameSelectionStep({
  photos,
  selectedTemplate,
  onSelectTemplate,
  customOverlayUrl,
  onUploadCustomOverlay,
  frameDescription,
  onChangeFrameDescription,
  uploadStatus,
  uploadMessage,
  driveFolderLink,
  onBackToReview,
  onStartNewSession,
}: FrameSelectionStepProps) {
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper Menggambar Object-Fit Cover di HTML5 Canvas
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

  // Render Canvas Komposit (1200 x 1800 px)
  const renderCompositeCanvas = useCallback(async () => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { canvasWidth, canvasHeight, bgColor, accentColor, textColor, slots, overlayPngUrl } =
      selectedTemplate;

    // Reset & Background Dasar
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

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

    // Gambar Custom PNG Overlay jika ada
    const activeOverlay = customOverlayUrl || overlayPngUrl;
    if (activeOverlay) {
      try {
        const overlayImg = await loadImage(activeOverlay);
        ctx.drawImage(overlayImg, 0, 0, canvasWidth, canvasHeight);
      } catch (e) {
        console.warn('Overlay PNG tidak ditemukan, menggunakan desain tipografi bawaan.', e);
      }
    } else {
      // Frame Bawaan Tipografi
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 12;
      ctx.strokeRect(24, 24, canvasWidth - 48, canvasHeight - 48);

      // Header (Deskripsi Singkat Kustom User di Bagian Atas Frame)
      const topText = frameDescription.trim()
        ? `• ${frameDescription.trim()} •`
        : '• TESSERA ARCHIVE SYSTEM •';
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(topText, canvasWidth / 2, 78);

      // Footer Judul Acara (Paten / Tidak Bisa Diganti)
      ctx.fillStyle = textColor;
      ctx.font = '900 58px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TESSERA PROJECT', canvasWidth / 2, 1480);

      // Footer Subjudul (Paten / Tidak Bisa Diganti)
      ctx.fillStyle = accentColor;
      ctx.font = '600 28px sans-serif';
      ctx.fillText('Official Tessera Archive • 2026', canvasWidth / 2, 1535);

      // Timestamp
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.5;
      ctx.font = '500 22px monospace';
      ctx.fillText(new Date().toLocaleString('id-ID'), canvasWidth / 2, 1720);
      ctx.globalAlpha = 1.0;
    }
  }, [photos, selectedTemplate, customOverlayUrl, frameDescription]);

  useEffect(() => {
    renderCompositeCanvas();
  }, [renderCompositeCanvas]);

  // Unduh Hasil Frame Gabungan (.JPG)
  const downloadCompositeFrame = () => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = `HexaCanvas_Frame_${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto">
      {/* Header Halaman Frame */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kustomisasi Frame Siap Cetak</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Pilih Frame & Download
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Pilih tema frame yang cocok atau gunakan desain PNG Anda sendiri, lalu simpan hasil cetak 4R berkualitas tinggi.
          </p>
        </div>

        {/* Tombol Navigasi Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToReview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Review Foto</span>
          </button>

          <button
            type="button"
            onClick={onStartNewSession}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold text-slate-300 hover:text-rose-400 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sesi Baru</span>
          </button>
        </div>
      </div>

      {/* Grid Utama: Kiri Preview Canvas, Kanan Pengaturan Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Canvas Preview 1200x1800 (5 Kolom) */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-xs font-bold text-slate-300">Preview Komposit 4R</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-sky-400 font-semibold">
              1200 × 1800 px
            </span>
          </div>

          <div className="w-full max-w-[360px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
            <canvas
              ref={compositeCanvasRef}
              width={1200}
              height={1800}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Tombol Download Besar di Bawah Canvas */}
          <button
            type="button"
            onClick={downloadCompositeFrame}
            className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer text-sm"
          >
            <Download className="w-5 h-5" />
            <span>Download Hasil Frame (.JPG)</span>
          </button>
        </div>

        {/* Kolom Kanan: Pengaturan Template, Teks & Status Cloud (7 Kolom) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Card 1: Pilihan Tema Frame Bawaan */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Pilih Tema Frame Bawaan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FRAME_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelectTemplate(tpl)}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border transition text-left flex flex-col gap-1 cursor-pointer ${
                    selectedTemplate.id === tpl.id && !customOverlayUrl
                      ? 'border-sky-400 bg-sky-500/10 text-sky-300 ring-2 ring-sky-400/20 shadow-md'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm text-white font-bold">{tpl.name}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: tpl.bgColor }}
                    />
                    <span>{tpl.id}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Upload Custom Frame PNG */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Atau Gunakan Desain Frame PNG Sendiri
            </label>
            <label className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-xl border border-dashed border-slate-700 hover:border-sky-400 bg-slate-950 text-xs font-bold text-slate-300 hover:text-sky-300 cursor-pointer transition">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>
                {customOverlayUrl ? 'Ganti File Desain PNG Overlay' : 'Upload PNG Transparan (1200 x 1800 px)'}
              </span>
              <input
                type="file"
                accept="image/png"
                onChange={onUploadCustomOverlay}
                className="hidden"
              />
            </label>
            {customOverlayUrl && (
              <p className="text-[11px] text-emerald-400 font-medium">
                ✓ Desain frame kustom Anda sedang aktif pada canvas preview.
              </p>
            )}
          </div>

          {/* Card 3: Kustomisasi Deskripsi Singkat di Atas Frame */}
          {!customOverlayUrl && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Kustomisasi Tipografi Frame
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {frameDescription.length}/50 karakter
                </span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Deskripsi Singkat (Tampil di Bagian Atas Frame)
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={frameDescription}
                  onChange={(e) => onChangeFrameDescription(e.target.value)}
                  placeholder="Contoh: Malam Keakraban • Besties Forever"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Deskripsi ini akan ditampilkan di bagian atas foto. Tulisan bagian bawah frame (
                  <span className="text-slate-300 font-semibold">TESSERA PROJECT</span> &{' '}
                  <span className="text-slate-300 font-semibold">Official Tessera Archive • 2026</span>
                  ) dikunci secara permanen.
                </p>
              </div>
            </div>
          )}

          {/* Card 4: Status Cloud Backup Google Drive */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              {uploadStatus === 'idle' && <CloudUpload className="w-5 h-5 text-slate-400" />}
              {uploadStatus === 'uploading' && (
                <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
              )}
              {uploadStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {uploadStatus === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Cloud Archive (Google Drive)
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {uploadStatus === 'idle'
                    ? 'Foto mentah akan diarsipkan ke Google Drive secara otomatis...'
                    : uploadMessage}
                </p>
              </div>
            </div>

            {driveFolderLink && (
              <a
                href={driveFolderLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold whitespace-nowrap transition"
              >
                Buka Folder Drive ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

