// src/config/frameConfig.ts

export interface SlotPosition {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameTemplate {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  bgColor: string;
  accentColor: string;
  textColor: string;
  overlayPngUrl?: string; // Isi dengan path '/frames/template-1.png' jika punya desain PNG transparan
  slots: SlotPosition[];
}

// Koordinat baku 6 slot (Grid 2 Kolom x 3 Baris)
export const SIX_SLOTS_LAYOUT: SlotPosition[] = [
  { id: 1, x: 60,  y: 120, width: 510, height: 380 }, // Baris 1 - Kiri
  { id: 2, x: 630, y: 120, width: 510, height: 380 }, // Baris 1 - Kanan
  { id: 3, x: 60,  y: 540, width: 510, height: 380 }, // Baris 2 - Kiri
  { id: 4, x: 630, y: 540, width: 510, height: 380 }, // Baris 2 - Kanan
  { id: 5, x: 60,  y: 960, width: 510, height: 380 }, // Baris 3 - Kiri
  { id: 6, x: 630, y: 960, width: 510, height: 380 }, // Baris 3 - Kanan
];

export const FRAME_TEMPLATES: FrameTemplate[] = [
  {
    id: 'minimal-dark',
    name: 'Obsidian Dark',
    canvasWidth: 1200,
    canvasHeight: 1800,
    bgColor: '#0f172a',
    accentColor: '#38bdf8',
    textColor: '#f8fafc',
    // overlayPngUrl: '/frames/template-1.png', // Hapus komentar jika ingin memakai file PNG dari folder public/frames/
    slots: SIX_SLOTS_LAYOUT,
  },
  {
    id: 'clean-white',
    name: 'Gallery White',
    canvasWidth: 1200,
    canvasHeight: 1800,
    bgColor: '#ffffff',
    accentColor: '#1e293b',
    textColor: '#0f172a',
    slots: SIX_SLOTS_LAYOUT,
  },
  {
    id: 'retro-warm',
    name: 'Warm Ivory',
    canvasWidth: 1200,
    canvasHeight: 1800,
    bgColor: '#fef3c7',
    accentColor: '#d97706',
    textColor: '#78350f',
    slots: SIX_SLOTS_LAYOUT,
  },
];