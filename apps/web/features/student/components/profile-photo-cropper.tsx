"use client";

import { useEffect, useRef, useState } from "react";

interface ProfilePhotoCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  currentAvatarUrl?: string;
}

export function ProfilePhotoCropper({
  isOpen,
  onClose,
  onCropComplete,
}: ProfilePhotoCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = () => {
    setImageSrc(null);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    onClose();
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setImageSrc(src);
        setZoom(1);
        setPanX(0);
        setPanY(0);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Draw image to preview canvas
  useEffect(() => {
    if (!imageSrc || !imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // Save context
    ctx.save();

    // Circular clipping mask
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, size, size);

    // Draw scaled and translated image
    const img = imgRef.current;
    const baseScale = Math.max(size / img.width, size / img.height);
    const scale = baseScale * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const drawX = (size - drawWidth) / 2 + panX;
    const drawY = (size - drawHeight) / 2 + panY;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    ctx.restore();

    // Draw circular border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = "#115e59"; // teal-800
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [imageSrc, zoom, panX, panY]);

  // Handle Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Export cropped 300x300 image
  const handleApplyCrop = () => {
    if (!imageSrc || !imgRef.current) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 320;
    exportCanvas.height = 320;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const size = exportCanvas.width;
    // Circular crop
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const img = imgRef.current;
    const baseScale = Math.max(size / img.width, size / img.height);
    const scale = baseScale * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const drawX = (size - drawWidth) / 2 + panX * (size / 260);
    const drawY = (size - drawHeight) / 2 + panY * (size / 260);

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    const croppedDataUrl = exportCanvas.toDataURL("image/jpeg", 0.9);
    onCropComplete(croppedDataUrl);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Adjust Profile Photo
            </h3>
            <p className="text-xs text-slate-500">
              Crop and center your photo for your student profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Upload or Canvas Area */}
        <div className="flex flex-col items-center justify-center">
          {!imageSrc ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition p-4 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mb-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-800">
                Click to upload photo
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                JPG, PNG, WebP up to 5MB
              </span>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center">
              <div
                className="relative cursor-move select-none touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  width={260}
                  height={260}
                  className="rounded-full shadow-md bg-slate-100"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                Click and drag to position image
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Zoom Controls if Image Loaded */}
        {imageSrc && (
          <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold">Zoom</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-teal-800 cursor-pointer"
            />
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-teal-800 hover:text-teal-900 underline"
              >
                Choose different photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanX(0);
                  setPanY(0);
                  setZoom(1);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                Reset alignment
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!imageSrc}
            className="rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Apply Photo
          </button>
        </div>
      </div>
    </div>
  );
}
