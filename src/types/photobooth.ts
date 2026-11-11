// src/types/photobooth.ts

export interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
}

export type PhotoboothStep = 'capture' | 'review' | 'frame';

