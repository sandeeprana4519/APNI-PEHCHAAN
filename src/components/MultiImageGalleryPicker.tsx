import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { processAndCompressImage } from '../utils/imageCompressor';
import { MediaLibraryModal } from './MediaLibraryModal';
import {
  Upload,
  Plus,
  Trash2,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

interface MultiImageGalleryPickerProps {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
  categoryContext?: string;
}

export const MultiImageGalleryPicker: React.FC<MultiImageGalleryPickerProps> = ({
  label,
  images,
  onChange,
  categoryContext,
}) => {
  const { addMediaItem, showToast } = useApp();
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct multiple file selection from device gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const result = await processAndCompressImage(file, 1200, 1200, 0.85);

        addMediaItem({
          url: result.dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          sizeKb: result.sizeKb,
          category: categoryContext || 'Products',
        });
        newUrls.push(result.dataUrl);
      }

      onChange([...images, ...newUrls]);
      showToast(`${newUrls.length} gallery image(s) added directly from gallery!`);
    } catch (err: any) {
      alert(err?.message || 'Error uploading gallery photos.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} ({images.length})
        </label>
        <span className="text-[11px] text-slate-400">
          Additional product view angles & detail shots
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        {/* Gallery Thumbnails List */}
        <div className="flex flex-wrap gap-2.5">
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              className="group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 shadow-2xs bg-white"
            >
              <img
                src={imgUrl}
                alt={`Gallery ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://placehold.co/200x200/f1f5f9/94a3b8?text=Error';
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute inset-0 bg-rose-950/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4 text-rose-300" />
              </button>
            </div>
          ))}

          {/* Add More from Device Gallery */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white hover:bg-amber-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-amber-700 cursor-pointer transition shrink-0"
            title="Upload photo from device gallery"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="text-[9px] font-semibold mt-0.5">Gallery</span>
          </button>

          {/* Add from Media Library */}
          <button
            type="button"
            onClick={() => setIsMediaModalOpen(true)}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white hover:bg-amber-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-amber-700 cursor-pointer transition shrink-0"
            title="Pick from Media Library"
          >
            <FolderOpen className="w-4 h-4 text-amber-600" />
            <span className="text-[9px] font-semibold mt-0.5">Library</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          Upload multiple photos directly from your phone/desktop gallery. Buyers can view these in the product detail gallery.
        </p>
      </div>

      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={(url) => {
          onChange([...images, url]);
          showToast('Image added to product gallery.');
        }}
        categoryFilter={categoryContext}
      />
    </div>
  );
};
