// src/components/PhotoReviewStep.tsx
'use client';

import React, { useRef, useState } from 'react';
import {
  Upload,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  X,
  Maximize2,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { CapturedPhoto } from '@/types/photobooth';

interface PhotoReviewStepProps {
  photos: (CapturedPhoto | null)[];
  onReplacePhoto: (slotIndex: number, newPhoto: CapturedPhoto) => void;
  onRetakeSingleSlot: (slotIndex: number) => void;
  onContinueToFrame: () => void;
  onRetakeAll: () => void;
}

export default function PhotoReviewStep({
  photos,
  onReplacePhoto,
  onRetakeSingleSlot,
  onContinueToFrame,
  onRetakeAll,
}: PhotoReviewStepProps) {
  // Input ref per slot untuk upload file manual
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [previewModalIndex, setPreviewModalIndex] = useState<number | null>(null);

  // Handler saat user memilih file gambar dari komputernya
  const handleFileChange = (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newCapturedPhoto: CapturedPhoto = {
        blob: file,
        dataUrl,
      };
      onReplacePhoto(slotIndex, newCapturedPhoto);
    };
    reader.readAsDataURL(file);

    // Reset value input agar file yang sama bisa dipilih ulang jika diperlukan
    e.target.value = '';
  };

  const completedCount = photos.filter((p) => p !== null).length;
  const isAllFilled = completedCount === 6;

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto">
      {/* Header Halaman Review */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>6 Foto Siap Ditinjau</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Review & Foto Ulang Per Slot
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Periksa ke-6 foto Anda di bawah ini. Anda dapat mengklik **Foto Ulang** pada slot mana saja untuk mengambil foto pengganti (hanya 1 kali jepret), atau mengunggah file.
          </p>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetakeAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Foto Ulang Kamera</span>
          </button>

          <button
            type="button"
            onClick={onContinueToFrame}
            disabled={!isAllFilled}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <span>Lanjut ke Pemilihan Frame</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid 6 Foto Khusus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3 shadow-xl hover:border-slate-700 transition-all duration-200"
          >
            {/* Header Slot */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Slot Foto #{idx + 1}
              </span>
              <span className="text-[11px] font-medium text-slate-500">Rasio 4:3</span>
            </div>

            {/* Thumbnail Foto */}
            <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80">
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.dataUrl}
                    alt={`Pose slot ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />

                  {/* Tombol Preview Fullscreen */}
                  <button
                    type="button"
                    onClick={() => setPreviewModalIndex(idx)}
                    title="Perbesar Foto"
                    className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-slate-950/70 hover:bg-slate-900 border border-white/10 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span className="text-xs font-semibold">Slot Kosong</span>
                </div>
              )}
            </div>

            {/* Input File Tersembunyi */}
            <input
              type="file"
              accept="image/*"
              ref={(el) => {
                fileInputRefs.current[idx] = el;
              }}
              onChange={(e) => handleFileChange(idx, e)}
              className="hidden"
            />

            {/* Tombol Foto Ulang Slot Ini */}
            <div className="flex flex-col gap-1.5 w-full">
              <button
                type="button"
                onClick={() => onRetakeSingleSlot(idx)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400 text-xs font-bold text-sky-300 hover:text-white transition cursor-pointer shadow-sm shadow-sky-500/10"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Foto Ulang</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRefs.current[idx]?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>atau upload dari perangkat</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="mt-10 p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Semua Foto Sudah Siap?</h4>
            <p className="text-xs text-slate-400">
              Langkah selanjutnya adalah memilih tema frame, mengatur teks acara, dan mengunduh hasil akhir.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinueToFrame}
          disabled={!isAllFilled}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-black text-sm transition cursor-pointer shadow-lg shadow-sky-500/20"
        >
          <span>Lanjut ke Pemilihan Frame</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Preview Perbesar Foto */}
      {previewModalIndex !== null && photos[previewModalIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white">
                Detail Foto Slot #{previewModalIndex + 1}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewModalIndex(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-4/3 rounded-xl overflow-hidden bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[previewModalIndex]?.dataUrl}
                alt={`Detail Slot ${previewModalIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  onRetakeSingleSlot(previewModalIndex);
                  setPreviewModalIndex(null);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Foto Ulang Slot Ini</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalIndex(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

