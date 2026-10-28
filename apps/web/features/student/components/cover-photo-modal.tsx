"use client";

import { useRef, useState } from "react";

interface CoverPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCover: (coverUrl: string | undefined) => void;
  currentCoverUrl?: string;
}

const PRESET_BANNERS = [
  {
    id: "teal-mesh",
    label: "Deep Teal (Default)",
    value: "linear-gradient(135deg, #042f2e 0%, #115e59 50%, #0f172a 100%)",
    previewClass: "bg-gradient-to-r from-teal-950 via-teal-800 to-slate-900",
  },
  {
    id: "midnight-grid",
    label: "Midnight Slate",
    value: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)",
    previewClass: "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800",
  },
  {
    id: "emerald-glow",
    label: "Emerald Glow",
    value: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #022c22 100%)",
    previewClass: "bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-950",
  },
  {
    id: "ocean-indigo",
    label: "Ocean Indigo",
    value: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 50%, #0f766e 100%)",
    previewClass: "bg-gradient-to-r from-indigo-950 via-blue-900 to-teal-700",
  },
] as const;

export function CoverPhotoModal({
  isOpen,
  onClose,
  onApplyCover,
  currentCoverUrl,
}: CoverPhotoModalProps) {
  const [selectedCover, setSelectedCover] = useState<string | undefined>(currentCoverUrl);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image (JPEG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setSelectedCover(src);
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    onApplyCover(selectedCover);
    onClose();
  };

  const isCustomImage = selectedCover && selectedCover.startsWith("data:image");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Edit Cover Banner
            </h3>
            <p className="text-xs text-slate-500">
              Personalize the cover photo behind your profile avatar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Live Preview Area */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Banner Preview
          </label>
          <div
            className="relative h-32 w-full rounded-xl overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center"
            style={{
              background: isCustomImage ? `url(${selectedCover}) center/cover no-repeat` : selectedCover || PRESET_BANNERS[0].value,
            }}
          >
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute bottom-2 left-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-2xs backdrop-blur-xs">
              Cover Preview
            </div>
          </div>
        </div>

        {/* Upload Custom Image */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Upload from Computer
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Choose Image File</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Recommended: 1200 × 400px (16:9 or 3:1)
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Preset Palettes */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Or Choose a Designed Preset
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_BANNERS.map((preset) => {
              const isSelected = selectedCover === preset.value;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedCover(preset.value)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition ${
                    isSelected
                      ? "border-teal-800 ring-2 ring-teal-800/20 bg-teal-50/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className={`h-6 w-10 rounded shrink-0 ${preset.previewClass}`} />
                  <span className="text-xs font-medium text-slate-800">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedCover(undefined)}
            className="text-xs text-slate-500 hover:text-rose-600 underline"
          >
            Reset to Default Banner
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition"
            >
              Apply Cover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
