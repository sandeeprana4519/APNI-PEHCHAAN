import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { processAndCompressImage } from '../utils/imageCompressor';
import { MediaLibraryModal } from './MediaLibraryModal';
import {
  Upload,
  Image as ImageIcon,
  FolderOpen,
  Link as LinkIcon,
  X,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface MediaImagePickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  helpText?: string;
  categoryContext?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto';
  placeholderText?: string;
}

export const MediaImagePicker: React.FC<MediaImagePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  helpText = 'Upload directly from your device gallery, choose from media library, or paste a URL.',
  categoryContext,
  aspectRatio = 'square',
  placeholderText = 'No image selected yet',
}) => {
  const { addMediaItem, showToast } = useApp();
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct file selection from device gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadSuccess(false);

    try {
      const result = await processAndCompressImage(file, 1200, 1200, 0.85);

      // Add to media library so it is saved and reusable
      addMediaItem({
        url: result.dataUrl,
        name: file.name.replace(/\.[^/.]+$/, ''),
        sizeKb: result.sizeKb,
        category: categoryContext || 'Products',
      });

      onChange(result.dataUrl);
      setUploadSuccess(true);
      showToast(`Image "${file.name}" uploaded directly from gallery!`);

      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: any) {
      alert(err?.message || 'Error reading image from device gallery.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsProcessing(true);
    try {
      const result = await processAndCompressImage(file, 1200, 1200, 0.85);
      addMediaItem({
        url: result.dataUrl,
        name: file.name.replace(/\.[^/.]+$/, ''),
        sizeKb: result.sizeKb,
        category: categoryContext || 'Products',
      });
      onChange(result.dataUrl);
      showToast(`Image dropped and loaded from gallery!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to process dropped image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isDataUrl = value && value.startsWith('data:image');

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square max-w-[140px]'
      : aspectRatio === 'wide'
      ? 'aspect-21/9 max-w-sm'
      : aspectRatio === 'video'
      ? 'aspect-video max-w-xs'
      : 'h-28 w-28';

  return (
    <div className="space-y-2">
      {/* Label and Top Actions */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-slate-500 hover:text-amber-700 flex items-center gap-1 cursor-pointer hover:underline"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? 'Hide URL link' : 'Paste web link (URL)'}</span>
          </button>
        </div>
      </div>

      {/* Hidden Native File Input (Direct Device Gallery Access) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Image Preview & Upload Controls Card */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`p-3.5 rounded-xl border transition-all ${
          value
            ? 'bg-slate-50 border-slate-200'
            : 'bg-amber-50/40 border-dashed border-amber-300 hover:border-amber-400'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Image Thumbnail Preview or Empty Placeholder */}
          {value ? (
            <div className={`relative shrink-0 rounded-lg overflow-hidden border border-slate-300 shadow-xs bg-white ${aspectClass}`}>
              <img
                src={value}
                alt="Product preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://placehold.co/400x400/f1f5f9/94a3b8?text=Image+Load+Error';
                }}
              />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white shadow-xs cursor-pointer transition"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 hover:border-amber-400 cursor-pointer shrink-0 transition"
            >
              <Upload className="w-6 h-6 stroke-[1.5] mb-1" />
              <span className="text-[10px] font-medium">Add Photo</span>
            </div>
          )}

          {/* Action Buttons & Status */}
          <div className="flex-1 space-y-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              {/* DIRECT GALLERY UPLOAD BUTTON */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition"
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>
                  {isProcessing
                    ? 'Processing Image...'
                    : value
                    ? 'Upload New from Gallery'
                    : 'Upload from Gallery / Device'}
                </span>
              </button>

              {/* BROWSE MEDIA LIBRARY BUTTON */}
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Choose from Media Gallery</span>
              </button>
            </div>

            {/* Status and feedback message */}
            <div className="flex flex-wrap items-center gap-2">
              {uploadSuccess && (
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Added directly from gallery!</span>
                </div>
              )}

              {isDataUrl ? (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                  Device Gallery Photo (Web-Optimized)
                </span>
              ) : value ? (
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs block" title={value}>
                  {value}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  {placeholderText}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Web Link / URL Input */}
        {showUrlInput && (
          <div className="mt-3 pt-3 border-t border-slate-200/80">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Direct Image URL (External link or CDN)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://images.unsplash.com/... or https://m.media-amazon.com/..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-amber-500 outline-none font-mono"
              />
              {value && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {helpText && <p className="text-[11px] text-slate-400">{helpText}</p>}

      {/* WordPress-style Media Library Modal */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={(url) => {
          onChange(url);
          showToast('Image selected from Media Gallery.');
        }}
        selectedUrl={value}
        categoryFilter={categoryContext}
      />
    </div>
  );
};
