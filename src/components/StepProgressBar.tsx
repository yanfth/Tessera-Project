// src/components/StepProgressBar.tsx
'use client';

import React from 'react';
import { Camera, Image as ImageIcon, Layers, Check } from 'lucide-react';
import { PhotoboothStep } from '@/types/photobooth';

interface StepProgressBarProps {
  currentStep: PhotoboothStep;
  onStepClick?: (step: PhotoboothStep) => void;
  canNavigateToReview: boolean;
  canNavigateToFrame: boolean;
}

const STEPS: { key: PhotoboothStep; label: string; icon: React.ElementType }[] = [
  { key: 'capture', label: '1. Ambil 6 Foto', icon: Camera },
  { key: 'review', label: '2. Review & Ganti Foto', icon: ImageIcon },
  { key: 'frame', label: '3. Pemilihan Frame', icon: Layers },
];

export default function StepProgressBar({
  currentStep,
  onStepClick,
  canNavigateToReview,
  canNavigateToFrame,
}: StepProgressBarProps) {
  const getStepIndex = (step: PhotoboothStep) => {
    switch (step) {
      case 'capture':
        return 0;
      case 'review':
        return 1;
      case 'frame':
        return 2;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  const isStepAccessible = (step: PhotoboothStep) => {
    if (step === 'capture') return true;
    if (step === 'review') return canNavigateToReview;
    if (step === 'frame') return canNavigateToFrame;
    return false;
  };

  return (
    <nav className="max-w-2xl mx-auto mb-8 px-4" aria-label="Progress">
      <ol className="flex items-center justify-between w-full">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isClickable = isStepAccessible(step.key);

          return (
            <li key={step.key} className="flex-1 relative flex items-center">
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={`absolute left-0 right-1/2 top-1/2 -translate-y-1/2 h-0.5 -z-10 transition-colors duration-300 ${
                    idx <= currentIndex ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                  style={{ right: '50%', left: '-50%' }}
                />
              )}

              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(step.key)}
                className={`group mx-auto flex flex-col items-center gap-2 focus:outline-none transition ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                    isCompleted
                      ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-md shadow-sky-500/20'
                      : isCurrent
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 ring-4 ring-sky-500/20'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                </div>

                <span
                  className={`text-xs font-semibold whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'text-sky-400'
                      : isCompleted
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

