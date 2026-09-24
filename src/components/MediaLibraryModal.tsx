import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { processAndCompressImage } from '../utils/imageCompressor';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Search,
  Trash2,
  AlertCircle,
  FolderOpen,
  Sparkles,
} from 'lucide-react';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  selectedUrl?: string;
  categoryFilter?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  selectedUrl,
  categoryFilter,
}) => {
  const { mediaLibrary, addMediaItem, deleteMediaItem, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>(categoryFilter || 'All');
  const [tempSelected, setTempSelected] = useState<string>(selectedUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle direct file uploads from gallery
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      let lastUploadedUrl = '';
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const compressed = await processAndCompressImage(file, 1200, 1200, 0.85);
        const item = addMediaItem({
          url: compressed.dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          sizeKb: compressed.sizeKb,
          category: filterCat !== 'All' ? filterCat : 'Uploads',
        });
        lastUploadedUrl = item.url;
      }

      showToast(`${files.length} image(s) uploaded and added to Media Library!`);
      if (lastUploadedUrl) {
        setTempSelected(lastUploadedUrl);
      }
      setActiveTab('browse');
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process images from gallery.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const categoriesList = ['All', ...Array.from(new Set(mediaLibrary.map((m) => m.category || 'General')))];

  const filteredMedia = mediaLibrary.filter((item) => {
    if (filterCat !== 'All' && item.category !== filterCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q));
  });

  const handleConfirmSelect = () => {
    if (tempSelected) {
      onSelectImage(tempSelected);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Media Gallery & Device Upload
              </h3>
              <p className="text-xs text-slate-500">
                Pick an existing photo or directly upload pictures from your device gallery.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer flex items-center gap-2 transition ${
                activeTab === 'browse'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Browse Media Library ({mediaLibrary.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer flex items-center gap-2 transition ${
                activeTab === 'upload'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload from Gallery / Device</span>
            </button>
          </div>

          {/* Quick upload button always accessible */}
          {activeTab === 'browse' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload from Gallery</span>
              <span className="sm:hidden">Upload</span>
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {uploadError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {activeTab === 'browse' ? (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search gallery images..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-500 whitespace-nowrap">Filter:</span>
                  <select
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid of Images */}
              {filteredMedia.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-8">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No images found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload photos directly from your phone or device gallery to start.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image from Gallery</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredMedia.map((item) => {
                    const isSelected = tempSelected === item.url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setTempSelected(item.url)}
                        className={`group relative rounded-xl border-2 overflow-hidden bg-white cursor-pointer transition-all duration-150 flex flex-col ${
                          isSelected
                            ? 'border-amber-600 ring-2 ring-amber-500/30 shadow-md scale-[1.02]'
                            : 'border-slate-200 hover:border-amber-300 hover:shadow-xs'
                        }`}
                      >
                        {/* Image Preview */}
                        <div className="aspect-square w-full bg-slate-100 overflow-hidden relative">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                          {item.sizeKb && (
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/70 text-white font-mono text-[9px]">
                              {item.sizeKb} KB
                            </span>
                          )}
                        </div>

                        {/* Title & Actions */}
                        <div className="p-2 flex items-center justify-between text-xs bg-white border-t border-slate-100">
                          <span
                            className="font-medium text-slate-800 truncate text-[11px] flex-1 mr-1"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remove "${item.name}" from library?`)) {
                                deleteMediaItem(item.id);
                                if (tempSelected === item.url) setTempSelected('');
                              }
                            }}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded transition opacity-0 group-hover:opacity-100"
                            title="Delete from Media Library"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Upload Tab */
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl bg-amber-50/40 hover:bg-amber-50/80 p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[260px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 stroke-[1.75]" />
                </div>

                <h4 className="font-bold text-slate-900 text-base mb-1">
                  Choose photo directly from your device gallery
                </h4>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  Click here to browse your phone camera roll, computer files, or drag and drop any image file.
                  Automatic high-quality web compression is applied.
                </p>

                <button
                  type="button"
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>{isUploading ? 'Compressing & Adding...' : 'Select from Device / Gallery'}</span>
                </button>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Supported formats: JPG, PNG, WEBP, HEIC. Uploaded images are preserved in your browser's persistent storage.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate max-w-full">
            {tempSelected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-700">Selected:</span>
                <span className="truncate max-w-xs font-mono text-[11px] text-slate-600">
                  {tempSelected}
                </span>
              </>
            ) : (
              <span>No image currently selected</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelect}
              disabled={!tempSelected}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5 transition"
            >
              <Check className="w-4 h-4" />
              <span>Use Selected Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
