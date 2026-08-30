import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  File, 
  Upload, 
  X, 
  Zap, 
  Cloud, 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Clipboard, 
  Check, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils/cn';

interface OppoFileDockProps {
  onSendP2P: (file: globalThis.File) => void;
  onUploadToVault: (files: globalThis.File[]) => void;
  cloudFilesCount?: number;
}

interface DockItem {
  id: string;
  file: globalThis.File;
  addedAt: string;
  type: string;
  name: string;
  size: number;
}

export default function OppoFileDock({ onSendP2P, onUploadToVault, cloudFilesCount = 0 }: OppoFileDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dockItems, setDockItems] = useState<DockItem[]>([]);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [dockNotification, setDockNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monitor drag-over at the window level for a seamless "drop anywhere" experience
  useEffect(() => {
    let dragCounter = 0;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (dragCounter === 1) {
        setIsGlobalDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsGlobalDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsGlobalDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        addFilesToDock(e.dataTransfer.files);
        // Automatically slide open the file dock so the user sees the dropped item!
        setIsOpen(true);
        triggerNotification(`${e.dataTransfer.files.length} file(s) collected!`);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const triggerNotification = (msg: string) => {
    setDockNotification(msg);
    setTimeout(() => setDockNotification(null), 3000);
  };

  const addFilesToDock = (filesList: FileList | File[]) => {
    const items: DockItem[] = [];
    const filesArray = Array.from(filesList);

    filesArray.forEach((file) => {
      items.push({
        id: 'dock_' + Math.random().toString(36).substr(2, 9),
        file,
        addedAt: new Date().toISOString(),
        type: file.type,
        name: file.name,
        size: file.size,
      });
    });

    setDockItems((prev) => [...items, ...prev]);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToDock(e.target.files);
      setIsOpen(true);
      triggerNotification(`${e.target.files.length} file(s) added!`);
    }
  };

  const createTextFileFromClipping = () => {
    if (!textInput.trim()) return;

    const blob = new Blob([textInput], { type: 'text/plain' });
    const textFile = new globalThis.File([blob], `clipping_${Date.now().toString().slice(-5)}.txt`, {
      type: 'text/plain',
    });

    addFilesToDock([textFile]);
    setTextInput('');
    triggerNotification('Text clipping saved as document!');
  };

  const handleSendP2P = (item: DockItem) => {
    onSendP2P(item.file);
    triggerNotification(`Active sending: ${item.name}`);
  };

  const handleUploadToVault = (item: DockItem) => {
    onUploadToVault([item.file]);
    triggerNotification(`Uploading to Vault...`);
  };

  const handleDownload = (item: DockItem) => {
    const url = URL.createObjectURL(item.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerNotification('Downloading file...');
  };

  const handleRemove = (id: string) => {
    setDockItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    if (confirm('Clear the entire File Dock shelf?')) {
      setDockItems([]);
      triggerNotification('File Dock cleared');
    }
  };

  const uploadAllToCloud = () => {
    if (dockItems.length === 0) return;
    const files = dockItems.map((item) => item.file);
    onUploadToVault(files);
    triggerNotification(`Uploading ${files.length} items to Cloud...`);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-accent" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-400" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-pink-400" />;
    if (type.includes('pdf') || type.includes('text')) return <FileText className="w-5 h-5 text-red-400" />;
    return <File className="w-5 h-5 text-zinc-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* 1. Window Drag & Drop Overlay */}
      <AnimatePresence>
        {isGlobalDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="border-2 border-dashed border-accent/60 bg-accent/5 max-w-lg w-full rounded-[40px] p-12 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-accent/10 border border-accent/20 rounded-[30px] flex items-center justify-center mx-auto text-accent">
                <Upload className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-black uppercase text-white tracking-tight">
                  OPPO FILE DOCK COLLECTOR
                </h2>
                <p className="text-sm text-accent font-semibold uppercase tracking-widest">
                  DROP FILE ANYWHERE TO AUTOMATION DOCK
                </p>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Collect items here to instantly stream Offline P2P or upload to your secure vault anytime!
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Custom Slide-out Oppo Smart Sidebar Handle */}
      <div className="fixed right-0 top-1/3 z-[80]">
        {!isOpen && (
          <motion.button
            onClick={() => setIsOpen(true)}
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            whileHover={{ x: -4 }}
            className="flex items-center gap-2 bg-[#0e0e11]/80 backdrop-blur-xl border border-r-0 border-white/10 pl-2 pr-3 py-6 rounded-l-2xl shadow-xl border-y-white/5 transition-all outline-none cursor-pointer group"
          >
            {/* Sidebar visual pill */}
            <div className="flex flex-col gap-1 items-center">
              <span className="w-1 h-3 rounded-full bg-zinc-600 group-hover:bg-accent transition-colors" />
              <span className="w-1 h-3 rounded-full bg-zinc-600 group-hover:bg-accent transition-colors" />
            </div>
            
            <div className="flex flex-col items-center">
              <Layers className="w-4 h-4 text-zinc-400 group-hover:text-accent group-hover:scale-110 transition-all mb-1" />
              <p className="text-[8px] font-black uppercase text-zinc-400 tracking-[0.2em] [writing-mode:vertical-lr] select-none">
                File Dock
              </p>
            </div>

            {/* Notification Badge */}
            {dockItems.length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-[20px] bg-accent text-black font-black text-[9px] rounded-full flex items-center justify-center shadow-lg animate-pulse border border-black px-1">
                {dockItems.length}
              </span>
            )}
          </motion.button>
        )}
      </div>

      {/* 3. OPPO File Dock Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Sidebar Dark Layer Back */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-[#000] z-[85]"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm sm:max-w-md bg-[#09090b]/90 backdrop-blur-3xl border-l border-white/5 z-[90] flex flex-col justify-between shadow-2xl overflow-hidden"
            >
              {/* Background ambient accents */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

              {/* Sidebar Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between relative z-10 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-accent">
                      ColorOS Smart Sidebar
                    </span>
                  </div>
                  <h3 className="text-lg font-display font-black text-white tracking-tight uppercase flex items-center gap-2">
                    <Layers className="w-5 h-5 text-accent shrink-0" />
                    OPPO FILE DOCK
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {dockItems.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-zinc-500 transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 border border-transparent hover:border-red-500/10"
                      title="Clear shelf"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline text-[9px] font-black">Clear</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-95 border border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Toast Notification internally */}
              <AnimatePresence>
                {dockNotification && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mx-6 mt-4 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-2 relative z-20 shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-accent animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent">{dockNotification}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrollable Shelf Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
                
                {/* Text Note clipping box */}
                <div className="bg-white/2 border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      Instant Clipboard Snippet
                    </span>
                  </div>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Koi text note ya copy code paste karke file banayein..."
                    className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-xs text-zinc-300 placeholder-zinc-700 min-h-[70px] focus:outline-none focus:border-accent resize-none transition-all font-sans"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        createTextFileFromClipping();
                      }
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={createTextFileFromClipping}
                      disabled={!textInput.trim()}
                      className="px-4 py-2 bg-white hover:bg-zinc-200 text-black disabled:bg-zinc-800 disabled:text-zinc-650 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      <Check className="w-3 h-3" />
                      Save Clipping
                    </button>
                  </div>
                </div>

                {/* Drop Area inside sidebar for clicking */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/10 hover:border-accent/30 bg-white/2 hover:bg-accent/2 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 group"
                >
                  <input 
                    type="file" 
                    multiple
                    ref={fileInputRef} 
                    onChange={handleManualUpload} 
                    className="hidden" 
                  />
                  <div className="w-10 h-10 bg-white/5 border border-white/10 group-hover:bg-accent group-hover:text-black rounded-xl flex items-center justify-center mx-auto text-zinc-400 transition-all">
                    <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Drag Files Here or Browse</p>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Multi-files drop support</p>
                  </div>
                </div>

                {/* Collected Shelf Content List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                      Collected Shelf Files ({dockItems.length})
                    </span>
                    {dockItems.length > 0 && (
                      <span className="text-[9px] text-accent font-bold uppercase tracking-widest animate-pulse">
                        Shelf Active
                      </span>
                    )}
                  </div>

                  {dockItems.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 space-y-3 bg-[#111115]/30 border border-white/5 rounded-2xl p-6">
                      <Layers className="w-7 h-7 mx-auto text-zinc-600 animate-pulse" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">File Dock is empty</p>
                      <p className="text-[9px] text-zinc-500 leading-relaxed uppercase tracking-widest max-w-[200px] mx-auto font-medium">
                        Files ko screen ke upar drag and drop karein ya manually upload karein shelf me add karne ke liye!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dockItems.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-black/60 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all space-y-4 relative group"
                        >
                          {/* File Description Row */}
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                                {getFileIcon(item.type)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[200px]">
                                  {item.name}
                                </p>
                                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                                  {formatSize(item.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemove(item.id)}
                              className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-zinc-600 transition-all active:scale-95 border border-transparent hover:border-red-500/10 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick File Image Previews if applicable */}
                          {item.type.startsWith('image/') && (
                            <div className="w-full h-24 overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
                              <img 
                                src={URL.createObjectURL(item.file)} 
                                alt={item.name} 
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                            </div>
                          )}

                          {/* OPPO Universal Drop Action row */}
                          <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                            <button
                              onClick={() => handleSendP2P(item)}
                              className="py-2.5 bg-accent text-black font-black uppercase text-[8px] tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                              title="Direct Offline P2P share"
                            >
                              <Zap className="w-3 h-3 fill-black text-black shrink-0" />
                              P2P
                            </button>
                            <button
                              onClick={() => handleUploadToVault(item)}
                              className="py-2.5 bg-white hover:bg-zinc-200 text-black font-black uppercase text-[8px] tracking-wider rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                              title="Instant Cloud permanent storage save"
                            >
                              <Cloud className="w-3 h-3 shrink-0" />
                              Vault
                            </button>
                            <button
                              onClick={() => handleDownload(item)}
                              className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-[8px] tracking-wider rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                              title="Mirror download file to laptop"
                            >
                              <Download className="w-3 h-3 shrink-0" />
                              Save
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Universal Bulk / Settings section in Sidebar foot */}
              <div className="p-6 border-t border-white/5 bg-zinc-950/90 relative z-10 shrink-0 space-y-4">
                {dockItems.length > 1 && (
                  <button
                    onClick={uploadAllToCloud}
                    className="w-full py-4 bg-accent hover:brightness-110 text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                  >
                    <Cloud className="w-4 h-4 fill-black text-black" />
                    Upload All ({dockItems.length}) to Cloud
                  </button>
                )}

                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                  <span>Cloud Storage Stats</span>
                  <span>{cloudFilesCount} Active Storage Files</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
