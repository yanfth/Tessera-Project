// src/app/page.tsx
'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { FRAME_TEMPLATES, FrameTemplate } from '@/config/frameConfig';
import { CapturedPhoto, PhotoboothStep } from '@/types/photobooth';
import StepProgressBar from '@/components/StepProgressBar';
import CameraCaptureStep from '@/components/CameraCaptureStep';
import PhotoReviewStep from '@/components/PhotoReviewStep';
import FrameSelectionStep from '@/components/FrameSelectionStep';

export default function HexaCanvasBooth() {
  // Master Flow Step
  const [step, setStep] = useState<PhotoboothStep>('capture');
  const [retakeSlotIndex, setRetakeSlotIndex] = useState<number | null>(null);

  // Master Photos State (6 Slots)
  const [photos, setPhotos] = useState<(CapturedPhoto | null)[]>(Array(6).fill(null));

  // Frame Customization States
  const [selectedTemplate, setSelectedTemplate] = useState<FrameTemplate>(FRAME_TEMPLATES[0]);
  const [customOverlayUrl, setCustomOverlayUrl] = useState<string | null>(null);
  const [frameDescription, setFrameDescription] = useState<string>('SIX-TILE ARCHIVE SYSTEM');

  // Cloud Upload States (Google Drive)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [driveFolderLink, setDriveFolderLink] = useState<string | null>(null);

  // Upload 6 Foto Mentah ke Backend Google Drive API
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
        if (result?.isPlaceholder) {
          setUploadStatus('idle');
          setUploadMessage('Cloud backup nonaktif (kredensial Google Drive di .env.local masih template).');
          return;
        }
        throw new Error(result.error || 'Gagal mengunggah ke Google Drive');
      }

      setUploadStatus('success');
      setUploadMessage('6 Foto mentah berhasil disimpan di Google Drive!');
      if (result.folderLink) {
        setDriveFolderLink(result.folderLink);
      }
    } catch (error: unknown) {
      console.warn('Google Drive Upload Status:', error);
      setUploadStatus('error');
      setUploadMessage(
        error instanceof Error ? error.message : 'Terjadi kesalahan saat upload ke Google Drive.'
      );
    }
  };

  // 1. Handler Setelah Selesai Sesi 6 Foto Kamera -> Pindah ke Halaman Review
  const handleCaptureComplete = (capturedPhotos: CapturedPhoto[]) => {
    setPhotos(capturedPhotos);
    setRetakeSlotIndex(null);
    setStep('review');

    // Trigger upload background ke Drive
    uploadRawPhotosToDrive(capturedPhotos);
  };

  // 2. Handler Saat User Mengklik "Foto Ulang" pada Slot Tertentu di Halaman Review
  const handleTriggerRetakeSingleSlot = (slotIndex: number) => {
    setRetakeSlotIndex(slotIndex);
    setStep('capture');
  };

  // 3. Handler Setelah 1 Foto Pengganti Selesai Dijepret di Kamera
  const handleSingleCaptureComplete = (slotIndex: number, newPhoto: CapturedPhoto) => {
    const updated = photos.map((p, idx) => (idx === slotIndex ? newPhoto : p));
    setPhotos(updated);
    setRetakeSlotIndex(null);
    setStep('review');

    // Sinkronkan ulang jika semua slot lengkap
    if (updated.every((p) => p !== null)) {
      uploadRawPhotosToDrive(updated);
    }
  };

  // 4. Handler Batal Foto Ulang (Kembali ke Review)
  const handleCancelRetake = () => {
    setRetakeSlotIndex(null);
    setStep('review');
  };

  // 5. Handler Replace Foto Dari File Lokal (Tanpa Foto Ulang)
  const handleReplacePhoto = (slotIndex: number, newPhoto: CapturedPhoto) => {
    const updated = photos.map((p, idx) => (idx === slotIndex ? newPhoto : p));
    setPhotos(updated);

    // Jika ke-6 foto sudah terisi, sinkronkan ulang ke Drive
    if (updated.every((p) => p !== null)) {
      uploadRawPhotosToDrive(updated);
    }
  };

  // 6. Handler Upload Custom Frame PNG Transparan
  const handleCustomFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomOverlayUrl(url);
  };

  // 7. Handler Mulai Sesi Baru / Reset Total
  const handleStartNewSession = () => {
    setPhotos(Array(6).fill(null));
    setRetakeSlotIndex(null);
    setUploadStatus('idle');
    setUploadMessage('');
    setDriveFolderLink(null);
    setStep('capture');
  };

  const completedCount = photos.filter((p) => p !== null).length;
  const has6Photos = completedCount === 6;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8">
      {/* Global Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between pb-6 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              HEXACANVAS STUDIO
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              6-Tile Instant Frame Compositor & Automated Cloud Archiver
            </p>
          </div>
        </div>

        {/* Status Indikator Step Aktif */}
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>
            {step === 'capture' &&
              (retakeSlotIndex !== null
                ? `Mode Foto Ulang: Slot #${retakeSlotIndex + 1}`
                : 'Langkah 1: Ambil Foto')}
            {step === 'review' && 'Langkah 2: Review & Foto Ulang'}
            {step === 'frame' && 'Langkah 3: Pemilihan Frame'}
          </span>
        </div>
      </header>

      {/* Progress Bar Indikator Alur */}
      <StepProgressBar
        currentStep={step}
        onStepClick={(targetStep) => {
          setRetakeSlotIndex(null);
          setStep(targetStep);
        }}
        canNavigateToReview={has6Photos}
        canNavigateToFrame={has6Photos}
      />

      {/* Content Berdasarkan Step Saat Ini */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {step === 'capture' && (
          <CameraCaptureStep
            onCaptureComplete={handleCaptureComplete}
            existingPhotos={photos}
            retakeSlotIndex={retakeSlotIndex}
            onSingleCaptureComplete={handleSingleCaptureComplete}
            onCancelRetake={handleCancelRetake}
          />
        )}

        {step === 'review' && (
          <PhotoReviewStep
            photos={photos}
            onReplacePhoto={handleReplacePhoto}
            onRetakeSingleSlot={handleTriggerRetakeSingleSlot}
            onContinueToFrame={() => setStep('frame')}
            onRetakeAll={() => {
              setRetakeSlotIndex(null);
              setStep('capture');
            }}
          />
        )}

        {step === 'frame' && (
          <FrameSelectionStep
            photos={photos}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={(tpl) => {
              setCustomOverlayUrl(null);
              setSelectedTemplate(tpl);
            }}
            customOverlayUrl={customOverlayUrl}
            onUploadCustomOverlay={handleCustomFrameUpload}
            frameDescription={frameDescription}
            onChangeFrameDescription={setFrameDescription}
            uploadStatus={uploadStatus}
            uploadMessage={uploadMessage}
            driveFolderLink={driveFolderLink}
            onBackToReview={() => setStep('review')}
            onStartNewSession={handleStartNewSession}
          />
        )}
      </div>

      {/* Global Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-8 mt-12 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>HexaCanvas Photobooth System • 4R High-Resolution 1200×1800 px Output</p>
      </footer>
    </main>
  );
}
