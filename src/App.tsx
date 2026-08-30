import type { User } from './lib/firebase';
import React, { createContext, useContext, useEffect, useState, useRef, Component } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  appleProvider,
  facebookProvider,
  githubProvider,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  OperationType,
  handleFirestoreError,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp
} from './lib/firebase';
import { 
  Github,
  Facebook,
  ChevronDown,
  FileIcon, 
  Upload, 
  LogOut, 
  Share2, 
  Trash2, 
  Download, 
  Search, 
  Folder, 
  MoreVertical, 
  Check, 
  Copy, 
  Globe, 
  Lock,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileArchive,
  AlertCircle,
  AlertTriangle,
  Zap,
  Shield,
  Cpu,
  QrCode,
  X,
  Play,
  Pause,
  Maximize2,
  HardDrive,
  Clock,
  ArrowLeft,
  Star,
  Tag,
  Plus,
  Filter,
  Users,
  Eye,
  UserCircle,
  ChevronUp,
  Home,
  Mail,
  Key,
  User as UserIcon,
  Activity as ActivityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './utils/cn';
import { QRCodeSVG } from 'qrcode.react';
import { generateLogo } from './services/logoGenerator';
import { copyToClipboard } from './utils/clipboard';
import OfflineP2PShare from './components/OfflineP2PShare';
import OppoFileDock from './components/OppoFileDock';

// --- Types ---
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface FolderMetadata {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  isGuest?: boolean;
}

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  ownerId: string;
  downloadUrl: string;
  isPublic: boolean;
  createdAt: string;
  isGuest?: boolean;
  tags?: string[];
  isFavorite?: boolean;
  expiryDate?: string;
  password?: string;
  folderId?: string | null;
}

interface UploadProgress {
  id: string;
  name: string;
  size: number;
  progress: number;
  speed: number; // bytes per second
  speedHistory: number[]; // track speed over time
  remaining: number; // seconds
  status: 'uploading' | 'completed' | 'error';
  startTime: number;
  loaded: number;
}

interface DownloadProgress {
  id: string;
  name: string;
  size: number;
  progress: number;
  speed: number;
  speedHistory: number[];
  remaining: number;
  status: 'downloading' | 'completed' | 'error';
  startTime: number;
  loaded: number;
}

interface Activity {
  id: string;
  type: 'upload' | 'delete' | 'share' | 'favorite' | 'tag' | 'move';
  fileName: string;
  timestamp: string;
  userId: string;
}

// --- Constants ---
const GUEST_LIMIT = 1 * 1024 * 1024 * 1024; // 1GB
const PRO_LIMIT = 20 * 1024 * 1024 * 1024; // 20GB

// --- Components ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: string | null;
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setError(e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] p-6">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all uppercase tracking-widest text-[10px]"
            >
              Try Again
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]"
            >
              Reset App Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function FileTypeIcon({ type, className }: { type: string, className?: string }) {
  if (type.startsWith('image/')) return <ImageIcon className={cn("w-6 h-6 text-accent", className)} />;
  if (type.startsWith('video/')) return <Video className={cn("w-6 h-6 text-purple-400", className)} />;
  if (type.startsWith('audio/')) return <Music className={cn("w-6 h-6 text-pink-400", className)} />;
  if (type.includes('zip') || type.includes('rar')) return <FileArchive className={cn("w-6 h-6 text-orange-400", className)} />;
  if (type.includes('pdf') || type.includes('text')) return <FileText className={cn("w-6 h-6 text-red-400", className)} />;
  return <FileIcon className={cn("w-6 h-6 text-zinc-500", className)} />;
}

function ActivityLog({ activities, onClose }: { activities: Activity[], onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0F0F11] border-l border-white/5 z-[100] p-8 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-display font-semibold text-white/90">Activity Log</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-5 h-5 text-zinc-500" />
        </button>
      </div>
      
      <div className="space-y-6">
        {activities.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-12">No recent activity</p>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                {activity.type === 'upload' && <Upload className="w-4 h-4 text-accent/70" />}
                {activity.type === 'delete' && <Trash2 className="w-4 h-4 text-red-500/70" />}
                {activity.type === 'share' && <Share2 className="w-4 h-4 text-blue-500/70" />}
                {activity.type === 'favorite' && <Check className="w-4 h-4 text-yellow-500/70" />}
                {activity.type === 'tag' && <Globe className="w-4 h-4 text-purple-500/70" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-zinc-300">
                  <span className="text-zinc-500 capitalize">{activity.type}</span>: {activity.fileName}
                </p>
                <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest mt-1">
                  {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function StorageBreakdown({ breakdown, total, limit }: { breakdown: any, total: number, limit: number }) {
  const categories = [
    { label: 'Images', value: breakdown.images, color: 'bg-accent/70' },
    { label: 'Videos', value: breakdown.videos, color: 'bg-purple-500/70' },
    { label: 'Docs', value: breakdown.docs, color: 'bg-red-500/70' },
    { label: 'Music', value: breakdown.music, color: 'bg-pink-500/70' },
    { label: 'Other', value: breakdown.other, color: 'bg-zinc-500/70' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Storage Breakdown</h4>
        <span className="text-[9px] text-zinc-600 font-semibold">{Math.round((total / limit) * 100)}% Used</span>
      </div>
      
      <div className="h-1.5 w-full bg-white/5 rounded-sm overflow-hidden flex border border-white/5">
        {categories.map((cat, i) => (
          <motion.div 
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${(cat.value / limit) * 100}%` }}
            className={cn("h-full", cat.color)}
          />
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={cn("w-1 h-1 rounded-sm shrink-0", cat.color)} />
              <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-widest truncate">{cat.label}</span>
            </div>
            <span className="text-[8px] font-mono text-zinc-600 shrink-0">{formatSize(cat.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds: number) {
  if (seconds === Infinity || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SpeedVisualizer({ history, className }: { history: number[], className?: string }) {
  if (!history || history.length < 2) return null;
  
  const width = 120;
  const height = 40;
  const max = Math.max(...history, 1024);
  const min = 0;
  const range = max - min || 1;
  
  const points = history.slice(-30).map((val, i, arr) => {
    const x = (i / (arr.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <div className={cn("relative group/speed", className)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="speedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <polyline
          fill="url(#speedGradient)"
          points={areaPoints}
          className="opacity-20"
        />
        
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="text-accent"
          filter="url(#glow)"
        />
        
        <motion.circle
          cx={width}
          cy={height - ((history[history.length - 1] - min) / range) * height}
          r="3"
          className="fill-accent shadow-[0_0_10px_var(--color-accent-glow)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      </svg>
    </div>
  );
}

function PublicDownloadPage({ shareId, logoUrl }: { shareId: string, logoUrl: string | null }) {
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const docRef = doc(db, 'files', shareId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as FileMetadata;
          if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
            setError('This link has expired.');
          } else {
            setFile(data);
          }
        } else {
          setError('File not found or link expired.');
        }
      } catch (err) {
        setError('Failed to fetch file details.');
      } finally {
        setLoading(false);
      }
    };
    fetchFile();
  }, [shareId]);

  const handleUnlock = () => {
    if (file?.password === passwordInput) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const onDownload = async () => {
    if (!file) return;
    
    const startTime = Date.now();
    let loaded = 0;
    let speedSamplesDownload: { time: number, loaded: number }[] = [];
    let lastUpdateUI = 0;

    const downloadId = crypto.randomUUID();
    setDownloadProgress({
      id: downloadId,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      speedHistory: [],
      remaining: 0,
      status: 'downloading',
      startTime,
      loaded: 0
    });

    try {
      const response = await fetch(file.downloadUrl);
      if (!response.body) throw new Error('ReadableStream not supported');
      
      const reader = response.body.getReader();
      const contentLength = +(response.headers.get('Content-Length') || file.size);
      
      const chunks: Uint8Array[] = [];
      
      while(true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        const now = performance.now();
        speedSamplesDownload.push({ time: now, loaded });
        
        const sampleWindow = 2000;
        while (speedSamplesDownload.length > 0 && speedSamplesDownload[0].time < now - sampleWindow) {
          speedSamplesDownload.shift();
        }

        const totalElapsed = (Date.now() - startTime) / 1000;
        const avgSpeed = loaded / (totalElapsed || 0.1);
        
        let rollingSpeed = avgSpeed;
        if (speedSamplesDownload.length >= 2) {
          const first = speedSamplesDownload[0];
          const last = speedSamplesDownload[speedSamplesDownload.length - 1];
          const timeSpan = (last.time - first.time) / 1000;
          const loadedSpan = last.loaded - first.loaded;
          rollingSpeed = timeSpan > 0.1 ? loadedSpan / timeSpan : avgSpeed;
        }

        const progress = (loaded / contentLength) * 100;
        const remaining = (contentLength - loaded) / (rollingSpeed || 1);

        if (now - lastUpdateUI > 100) {
          lastUpdateUI = now;
          setDownloadProgress(prev => prev ? {
            ...prev,
            progress,
            speed: rollingSpeed,
            speedHistory: [...(prev.speedHistory || []), rollingSpeed].slice(-30),
            remaining,
            loaded
          } : null);
        }
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadProgress(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
      setTimeout(() => setDownloadProgress(null), 5000);

    } catch (error) {
      console.error('Download failed', error);
      setDownloadProgress(prev => prev ? { ...prev, status: 'error' } : null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#030303]"><div className="loader-glow" /></div>;
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030303] p-6">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_var(--color-accent-glow)] overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Share2 className="w-6 h-6 text-black" />
          )}
        </div>
        <span className="font-display font-bold text-2xl tracking-tighter text-gradient">SHARE<span className="text-accent">FILES</span></span>
      </div>
      <div className="glass-card p-12 rounded-[40px] text-center max-w-sm w-full">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-zinc-500 mb-8">{error}</p>
        <button onClick={() => window.location.href = '/'} className="accent-button w-full">Go to Home</button>
      </div>
      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-12">
        Securely shared via Share Files 🚀
      </p>
    </div>
  );

  if (file?.password && !isUnlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030303] p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_var(--color-accent-glow)] overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Share2 className="w-6 h-6 text-black" />
            )}
          </div>
          <span className="font-display font-bold text-2xl tracking-tighter text-gradient">SHARE<span className="text-accent">FILES</span></span>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 rounded-[48px] w-full max-w-md text-center"
        >
          <Lock className="w-16 h-16 text-accent mx-auto mb-8" />
          <h2 className="text-2xl font-display font-bold mb-2">PASSWORD PROTECTED</h2>
          <p className="text-zinc-500 text-sm mb-8">This file is protected. Please enter the password to continue.</p>
          
          <div className="space-y-4">
            <input 
              type="password"
              placeholder="Enter Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className={cn(
                "w-full bg-white/5 border rounded-2xl px-6 py-4 text-center text-lg focus:outline-none transition-all",
                passwordError ? "border-red-500 animate-shake" : "border-white/10 focus:border-accent"
              )}
            />
            <button 
              onClick={handleUnlock}
              className="w-full accent-button py-5 text-sm"
            >
              Unlock File
            </button>
          </div>
        </motion.div>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-12">
          Securely shared via Share Files 🚀
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="px-6 h-20 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.href = '/'}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-500 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_var(--color-accent-glow)] overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Share2 className="w-6 h-6 text-black" />
              )}
            </div>
            <span className="font-display font-bold text-2xl tracking-tighter text-gradient">SHARE<span className="text-accent">FILES</span></span>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 sm:p-12 rounded-[32px] sm:rounded-[48px] w-full max-w-lg text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-[0_0_20px_var(--color-accent-glow)]" />
          
          {file?.expiryDate && (
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
              <CountdownTimer expiryDate={new Date(file.expiryDate)} />
            </div>
          )}

          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-accent/10 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <FileTypeIcon type={file!.type} />
          </div>

          {/* Inline Preview for Public Page */}
          <div className="mb-8 sm:mb-12">
            {file!.type.startsWith('image/') ? (
              <div className="relative group">
                <img 
                  src={file!.downloadUrl} 
                  alt={file!.name} 
                  className="max-w-full max-h-[300px] rounded-2xl mx-auto object-contain shadow-2xl border border-white/10"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : file!.type.startsWith('video/') ? (
              <video controls className="max-w-full max-h-[300px] rounded-2xl mx-auto shadow-2xl border border-white/10">
                <source src={file!.downloadUrl} type={file!.type} />
              </video>
            ) : file!.type.startsWith('audio/') ? (
              <div className="glass-card p-6 rounded-2xl">
                <Music className="w-12 h-12 text-accent mx-auto mb-4 animate-pulse" />
                <audio controls className="w-full accent-accent">
                  <source src={file!.downloadUrl} type={file!.type} />
                </audio>
              </div>
            ) : null}
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2 truncate px-4 uppercase tracking-tight">{file!.name}</h2>
          <p className="text-zinc-500 text-xs sm:text-sm font-bold uppercase tracking-widest mb-8 sm:mb-12">{formatSize(file!.size)} • Ready to Download</p>
          
          <div className="space-y-4">
            {!downloadProgress ? (
              <button 
                onClick={onDownload}
                className="w-full accent-button py-5 sm:py-6 text-base sm:text-lg flex items-center justify-center gap-3 ripple"
              >
                <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                Download Now
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 rounded-3xl border-blue-500/30 text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">
                      {formatSize(downloadProgress.speed)}/s
                    </span>
                  </div>
                  <span className="text-xl font-black text-blue-500">{Math.round(downloadProgress.progress)}%</span>
                </div>
                
                <SpeedVisualizer history={downloadProgress.speedHistory} className="mb-4" />
                
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${downloadProgress.progress}%` }}
                    className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  />
                </div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                  {downloadProgress.status === 'downloading' ? `${formatTime(downloadProgress.remaining)} remaining` : downloadProgress.status === 'completed' ? 'Download Finished!' : 'Error'}
                </p>
              </motion.div>
            )}
            <p className="text-[9px] sm:text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] pt-4">
              Securely shared via Share Files 🚀
            </p>
          </div>
        </motion.div>
      </main>
    </>
  );
}

const CountdownTimer = ({ expiryDate }: { expiryDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, expired: true });
        return true;
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft({ h, m, s, expired: false });
        return false;
      }
    };

    calculateTime();
    const timer = setInterval(() => {
      const isExpired = calculateTime();
      if (isExpired) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryDate]);

  const format = (n: number) => n.toString().padStart(2, '0');

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-2 font-mono text-red-500 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/20">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-xs font-bold tracking-tighter uppercase">Session Expired</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/20">
      <Clock className="w-3.5 h-3.5" />
      <span className="text-xs font-bold tracking-tighter">
        EXPIRES IN: {format(timeLeft.h)}:{format(timeLeft.m)}:{format(timeLeft.s)}
      </span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [shareFile, setShareFile] = useState<FileMetadata | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [comingSoonError, setComingSoonError] = useState<string | null>(null);
  const [isTurboMode, setIsTurboMode] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tagInput, setTagInput] = useState<{ fileId: string, value: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'images' | 'videos' | 'docs' | 'music' | 'favorites'>('all');
  const [sortOption, setSortOption] = useState<'date' | 'name' | 'size' | 'type'>('date');
  const [guestSession, setGuestSession] = useState<{ id: string, expiry: string } | null>(null);
  const [networkSpeed, setNetworkSpeed] = useState(0);
  const [networkSpeedHistory, setNetworkSpeedHistory] = useState<number[]>([]);
  const [latency, setLatency] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  const [userName, setUserName] = useState<string | null>(localStorage.getItem('user_display_name') || 'Guest User');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const [view, setView] = useState<'landing' | 'vault'>('vault');
  const [activeTab, setActiveTab] = useState<'home' | 'vault' | 'activity' | 'profile'>('vault');
  const [showOfflineShare, setShowOfflineShare] = useState(false);
  const [initialP2pFile, setInitialP2pFile] = useState<File | null>(null);

  useEffect(() => {
    if (view === 'vault') {
      const interval = setInterval(async () => {
        const start = performance.now();
        try {
          await fetch('/api/ping');
          const end = performance.now();
          setLatency(Math.round(end - start));
        } catch (e) {
          console.error('Ping failed');
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailAuthModal, setShowEmailAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderMetadata | null>(null);
  const [movingFile, setMovingFile] = useState<FileMetadata | null>(null);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState<FolderMetadata | null>(null);
  
  const getProviderName = () => {
    if (user) {
      const provider = user.providerData[0]?.providerId;
      if (provider === 'google.com') return 'GOOGLE';
      if (provider === 'apple.com') return 'APPLE';
      if (provider === 'facebook.com') return 'FACEBOOK';
      if (provider === 'github.com') return 'GITHUB';
      return 'ACCOUNT';
    }
    return 'GUEST';
  };
  
  const expiryOptions = [
    { label: '1 Hour', value: 1 * 60 * 60 * 1000 },
    { label: '1 Day', value: 24 * 60 * 60 * 1000 },
    { label: '1 Week', value: 7 * 24 * 60 * 60 * 1000 },
    { label: 'No Expiry', value: null },
  ];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueue = useRef<{ file: File; folderId: string | null }[]>([]);
  const isUploading = useRef(false);
  const speedSamples = useRef<{ time: number, loaded: number }[]>([]);
  const trackingLock = useRef(false);

  useEffect(() => {
    // Real-time WebSocket Presence Tracking
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'count') {
            setVisitorCount(data.value);
          }
        } catch (err) {
          console.error('Failed to parse socket message:', err);
        }
      };

      socket.onclose = () => {
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection restricted or blocked by iframe sandbox:', err);
        socket?.close();
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.onclose = null; // Prevent reconnect on intentional close
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
      
      // Logic for scroll hint visibility
      setIsScrolling(true);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 200);

      // Use functional update or check sessionStorage to avoid closure issues
      if (scrolled > 10) {
        if (!sessionStorage.getItem('scroll_hint_seen')) {
          setShowScrollHint(false);
          sessionStorage.setItem('scroll_hint_seen', 'true');
        }
      }

      if (scrolled > 90) {
        setHasReachedBottom(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (user && !userName) {
      const name = user.displayName || user.email?.split('@')[0];
      if (name) {
        localStorage.setItem('user_display_name', name);
        setUserName(name);
        setShowNamePrompt(false);
      }
    }
  }, [user, userName]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploads.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploads]);

  useEffect(() => {
    const fetchLogo = async () => {
      const url = await generateLogo();
      if (url) setLogoUrl(url);
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    const checkLatency = async () => {
      const start = performance.now();
      try {
        // Use absolute URL to avoid issues in some iframe environments
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/ping?t=${Date.now()}`, {
          mode: 'same-origin',
          cache: 'no-store'
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const end = performance.now();
        const diff = end - start;
        setLatency(Math.max(1, Math.round(diff)));
      } catch (e) {
        // Silently handle latency check failures to avoid console clutter
        // unless it's a persistent issue
        setLatency(0);
      }
    };
    
    // Small delay before first check to ensure server is ready
    const initialTimeout = setTimeout(() => {
      checkLatency();
    }, 1000);

    const interval = setInterval(checkLatency, 5000); // Increase interval to 5s to reduce noise
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      setShareId(path.split('/share/')[1]);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('guest_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Fix prefix mismatch for security rules
      if (parsed.id && parsed.id.startsWith('guest_')) {
        parsed.id = parsed.id.replace('guest_', 'guest-');
      }
      // Refresh expiry to 30 days from now on every visit as requested by user
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const updatedSession = { ...parsed, expiry: newExpiry };
      
      localStorage.setItem('guest_session', JSON.stringify(updatedSession));
      setGuestSession(updatedSession);
      
      if (!user && !loading) {
        setIsGuestMode(true);
        // Removed auto-redirect to vault to show landing page first
        // Automatically set a guest name if not provided
        if (!userName) {
          const defaultName = `Guest-${parsed.id.substring(6, 10)}`;
          setUserName(defaultName);
          sessionStorage.setItem('user_display_name', defaultName);
          setShowNamePrompt(false);
        }
      }
    } else if (!user && !loading && !isGuestMode) {
      // Automatically start a guest session if none exists and user is not logged in
      // But don't force them into vault view immediately if they just landed
      const id = `guest-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`;
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const session = { id, expiry };
      localStorage.setItem('guest_session', JSON.stringify(session));
      setGuestSession(session);
      setIsGuestMode(true);
      
      if (!userName) {
        const defaultName = `Guest-${id.substring(6, 10)}`;
        setUserName(defaultName);
        sessionStorage.setItem('user_display_name', defaultName);
        setShowNamePrompt(false);
      }
    }
  }, [user, loading, isGuestMode]);

  const startGuestSession = () => {
    const id = `guest-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`;
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const session = { id, expiry };
    localStorage.setItem('guest_session', JSON.stringify(session));
    setGuestSession(session);
    setIsGuestMode(true);
    setView('vault');
    
    // Automatically set a guest name if not provided
    if (!userName) {
      const defaultName = `Guest-${id.substring(6, 10)}`;
      setUserName(defaultName);
      sessionStorage.setItem('user_display_name', defaultName);
      setShowNamePrompt(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setIsGuestMode(false);
        setView('vault');
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          createdAt: new Date().toISOString(),
          storageLimit: PRO_LIMIT
        }, { merge: true }).catch(err => {
          console.error('Failed to save user profile:', err);
          // Don't throw here, just log. We want the user to be able to use the app even if profile save fails.
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ownerId = user ? user.uid : (isGuestMode && guestSession ? guestSession.id : null);
    if (!ownerId) {
      setFiles([]);
      return;
    }

    const q = query(
      collection(db, 'files'),
      where('ownerId', '==', ownerId)
      // Removing orderBy temporarily to avoid index issues for new users/guests
      // orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileMetadata));
      // Sort on client side to avoid index requirement
      newFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFiles(newFiles);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'files'));

    return () => unsubscribe();
  }, [user, isGuestMode, guestSession]);

  useEffect(() => {
    const ownerId = user ? user.uid : (isGuestMode && guestSession ? guestSession.id : null);
    if (!ownerId) {
      setFolders([]);
      return;
    }

    const q = query(
      collection(db, 'folders'),
      where('ownerId', '==', ownerId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FolderMetadata));
      newFolders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFolders(newFolders);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'folders'));

    return () => unsubscribe();
  }, [user, isGuestMode, guestSession]);

  const createFolder = async (name: string) => {
    const ownerId = user ? user.uid : (isGuestMode && guestSession ? guestSession.id : null);
    if (!ownerId) return;

    try {
      const folderId = `folder-${crypto.randomUUID()}`;
      const folderRef = doc(db, 'folders', folderId);
      await setDoc(folderRef, {
        id: folderId,
        name,
        ownerId,
        createdAt: new Date().toISOString(),
        isGuest: isGuestMode
      });
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'folders');
    }
  };

  const renameFolder = async (folderId: string, newName: string) => {
    try {
      const folderRef = doc(db, 'folders', folderId);
      await updateDoc(folderRef, { name: newName });
      setEditingFolder(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `folders/${folderId}`);
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await deleteDoc(doc(db, 'folders', folderId));
      
      // Move files in this folder to root
      const filesInFolder = files.filter(f => f.folderId === folderId);
      for (const file of filesInFolder) {
        await updateDoc(doc(db, 'files', file.id), { folderId: null });
      }
      
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `folders/${folderId}`);
    }
  };

  const moveFileToFolder = async (fileId: string, folderId: string | null) => {
    try {
      const fileRef = doc(db, 'files', fileId);
      await updateDoc(fileRef, { folderId });
      setMovingFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `files/${fileId}`);
    }
  };

  const filteredFiles = files
    .filter(file => {
      // Category filter
      if (activeCategory === 'images' && !file.type.startsWith('image/')) return false;
      if (activeCategory === 'videos' && !file.type.startsWith('video/')) return false;
      if (activeCategory === 'music' && !file.type.startsWith('audio/')) return false;
      if (activeCategory === 'docs' && !file.type.includes('pdf') && !file.type.includes('text') && !file.type.includes('word') && !file.type.includes('sheet')) return false;
      if (activeCategory === 'favorites' && !file.isFavorite) return false;
      
      // Search filter
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Folder filter (only if not searching and not in a special category)
      if (!searchQuery && activeCategory === 'all') {
        return (file.folderId || null) === currentFolderId;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'name') return a.name.localeCompare(b.name);
      if (sortOption === 'size') return b.size - a.size;
      if (sortOption === 'type') return a.type.localeCompare(b.type);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError(null);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (userName) {
          await updateProfile(result.user, { displayName: userName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowEmailAuthModal(false);
      setView('vault');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Email auth failed', err);
      setLoginError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (method: 'google' | 'apple' | 'facebook' | 'github' | 'email' = 'google') => {
    setLoginError(null);
    if (method === 'email') {
      setIsSignUp(false);
      setShowEmailAuthModal(true);
      return;
    }

    try {
      let provider;
      switch (method) {
        case 'google': provider = googleProvider; break;
        case 'apple': provider = appleProvider; break;
        case 'facebook': provider = facebookProvider; break;
        case 'github': provider = githubProvider; break;
        default: provider = googleProvider;
      }
      
      console.log(`Initiating ${method} Login...`);
      const result = await signInWithPopup(auth, provider);
      console.log(`${method} Login successful:`, result.user.email);
      setView('vault');
    } catch (err: any) {
      console.error(`${method} Login failed`, err);
      // Handle specific cancellation or configuration errors
      setLoginError(err.message || 'Login failed. Please try again.');
    }
  };

  const appleLogin = async () => {
    // For now, simulate login success for the UI request
    setIsGuestMode(true);
    setView('vault');
    setComingSoonError("APPLE LOGIN SIMULATED (GUEST MODE)");
    setTimeout(() => setComingSoonError(null), 3000);
  };

  const facebookLogin = async () => {
    setIsGuestMode(true);
    setView('vault');
    setComingSoonError("FACEBOOK LOGIN SIMULATED (GUEST MODE)");
    setTimeout(() => setComingSoonError(null), 3000);
  };

  const githubLogin = async () => {
    setIsGuestMode(true);
    setView('vault');
    setComingSoonError("GITHUB LOGIN SIMULATED (GUEST MODE)");
    setTimeout(() => setComingSoonError(null), 3000);
  };

  const logout = async () => {
    try {
      setFiles([]); // Clear files immediately on logout
      await signOut(auth);
      setIsGuestMode(false);
      localStorage.removeItem('guest_session');
      setGuestSession(null);
      setView('landing');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const addActivity = (type: Activity['type'], fileName: string) => {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type,
      fileName,
      timestamp: new Date().toISOString(),
      userId: user?.uid || guestSession?.id || 'anonymous'
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 50));
  };

  const processQueue = async () => {
    if (isUploading.current || uploadQueue.current.length === 0) return;
    
    isUploading.current = true;
    const item = uploadQueue.current.shift();
    if (!item) {
      isUploading.current = false;
      return;
    }
    const { file, folderId: targetFolderId } = item;

    const uploadId = crypto.randomUUID();
    const startTime = Date.now();
    speedSamples.current = [];
    let lastLoaded = 0;
    let lastTime = performance.now();

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('files', file);
    const ownerId = user ? user.uid : (guestSession?.id || 'anonymous');
    formData.append('isGuest', (!user).toString());
    formData.append('uploaderName', userName || 'Unknown User');

    setUploads(prev => [...prev, {
      id: uploadId,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      speedHistory: [],
      remaining: 0,
      status: 'uploading',
      startTime: startTime,
      loaded: 0
    }]);

    let lastUpdateUI = 0;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = performance.now();
        
        // Add current sample
        speedSamples.current.push({ time: now, loaded: event.loaded });
        
        // Remove samples older than 2 seconds for a smoother rolling average
        const sampleWindow = 2000;
        while (speedSamples.current.length > 0 && speedSamples.current[0].time < now - sampleWindow) {
          speedSamples.current.shift();
        }

        const totalElapsed = (Date.now() - startTime) / 1000;
        const avgSpeed = event.loaded / (totalElapsed || 0.1);
        
        // Calculate rolling speed
        let rollingSpeed = avgSpeed;
        if (speedSamples.current.length >= 2) {
          const first = speedSamples.current[0];
          const last = speedSamples.current[speedSamples.current.length - 1];
          const timeSpan = (last.time - first.time) / 1000; // seconds
          const loadedSpan = last.loaded - first.loaded;
          rollingSpeed = timeSpan > 0.1 ? loadedSpan / timeSpan : avgSpeed;
        }

        const progress = (event.loaded / event.total) * 100;
        const remaining = (event.total - event.loaded) / (rollingSpeed || 1);

        // Throttle UI updates to 10fps for performance and smoothness
        if (now - lastUpdateUI > 100) {
          lastUpdateUI = now;
          setNetworkSpeed(rollingSpeed);
          setNetworkSpeedHistory(prev => [...prev, rollingSpeed].slice(-50));
          
          setUploads(prev => prev.map(u => u.id === uploadId ? { 
            ...u, 
            progress, 
            speed: rollingSpeed, 
            speedHistory: [...(u.speedHistory || []), rollingSpeed].slice(-30),
            remaining,
            loaded: event.loaded 
          } : u));
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        try {
          const responseArray = JSON.parse(xhr.responseText);
          const response = responseArray[0];
          const fileMetadata: FileMetadata = {
            id: response.id,
            name: response.name,
            size: response.size,
            type: response.type,
            ownerId: ownerId,
            downloadUrl: `/api/download/${response.id}`,
            isPublic: true,
            createdAt: response.createdAt,
            isGuest: response.isGuest,
            tags: [],
            isFavorite: false,
            folderId: targetFolderId
          };

          await setDoc(doc(db, 'files', response.id), fileMetadata);
          addActivity('upload', fileMetadata.name);
          setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'completed', progress: 100 } : u));
          setShareFile(fileMetadata);
          
          setTimeout(() => {
            setUploads(prev => prev.filter(u => u.id !== uploadId));
          }, 3000);
        } catch (e) {
          console.error('Failed to parse upload response', e);
        }
      } else {
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'error' } : u));
      }
      isUploading.current = false;
      if (uploadQueue.current.length === 0) setNetworkSpeed(0);
      processQueue();
    };

    xhr.onerror = () => {
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'error' } : u));
      isUploading.current = false;
      processQueue();
    };

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  };

  const uploadFiles = (filesToUpload: FileList | File[], folderId: string | null = currentFolderId) => {
    const filesArray = Array.from(filesToUpload) as File[];
    const currentUsage = files.reduce((acc, f) => acc + f.size, 0);
    const limit = user ? PRO_LIMIT : GUEST_LIMIT;
    
    const totalNewSize = filesArray.reduce((acc, f) => acc + f.size, 0);
    if (currentUsage + totalNewSize > limit) {
      alert(`Storage limit reached! ${user ? '20GB' : '1GB'} max.`);
      return;
    }

    const items = filesArray.map(file => ({ file, folderId }));
    uploadQueue.current.push(...items);
    processQueue();
  };

  const handleDownload = async (file: FileMetadata) => {
    const downloadId = crypto.randomUUID();
    const startTime = Date.now();
    let loaded = 0;
    let speedSamplesDownload: { time: number, loaded: number }[] = [];
    let lastUpdateUI = 0;

    setDownloads(prev => [...prev, {
      id: downloadId,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      speedHistory: [],
      remaining: 0,
      status: 'downloading',
      startTime,
      loaded: 0
    }]);

    try {
      const response = await fetch(file.downloadUrl);
      if (!response.body) throw new Error('ReadableStream not supported');
      
      const reader = response.body.getReader();
      const contentLength = +(response.headers.get('Content-Length') || file.size);
      
      const chunks: Uint8Array[] = [];
      
      while(true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        const now = performance.now();
        speedSamplesDownload.push({ time: now, loaded });
        
        const sampleWindow = 2000;
        while (speedSamplesDownload.length > 0 && speedSamplesDownload[0].time < now - sampleWindow) {
          speedSamplesDownload.shift();
        }

        const totalElapsed = (Date.now() - startTime) / 1000;
        const avgSpeed = loaded / (totalElapsed || 0.1);
        
        let rollingSpeed = avgSpeed;
        if (speedSamplesDownload.length >= 2) {
          const first = speedSamplesDownload[0];
          const last = speedSamplesDownload[speedSamplesDownload.length - 1];
          const timeSpan = (last.time - first.time) / 1000;
          const loadedSpan = last.loaded - first.loaded;
          rollingSpeed = timeSpan > 0.1 ? loadedSpan / timeSpan : avgSpeed;
        }

        const progress = (loaded / contentLength) * 100;
        const remaining = (contentLength - loaded) / (rollingSpeed || 1);

        if (now - lastUpdateUI > 100) {
          lastUpdateUI = now;
          setDownloads(prev => prev.map(d => d.id === downloadId ? {
            ...d,
            progress,
            speed: rollingSpeed,
            speedHistory: [...(d.speedHistory || []), rollingSpeed].slice(-30),
            remaining,
            loaded
          } : d));
        }
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloads(prev => prev.map(d => d.id === downloadId ? { ...d, status: 'completed', progress: 100 } : d));
      setTimeout(() => {
        setDownloads(prev => prev.filter(d => d.id !== downloadId));
      }, 3000);

    } catch (error) {
      console.error('Download failed', error);
      setDownloads(prev => prev.map(d => d.id === downloadId ? { ...d, status: 'error' } : d));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    uploadFiles(selectedFiles);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const togglePublic = async (file: FileMetadata) => {
    try {
      await updateDoc(doc(db, 'files', file.id), { isPublic: !file.isPublic });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `files/${file.id}`);
    }
  };

  const deleteFile = async (fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!confirm('Delete this file?')) return;
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'files', fileId));
      
      // Delete from Server
      await fetch(`/api/delete/${fileId}`, { method: 'DELETE' });
      
      if (fileToDelete) addActivity('delete', fileToDelete.name);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `files/${fileId}`);
    }
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!confirm(`Delete ${selectedFiles.length} files?`)) return;

    try {
      await Promise.all(selectedFiles.map(async (id) => {
        const fileToDelete = files.find(f => f.id === id);
        // Delete from Firestore
        await deleteDoc(doc(db, 'files', id));
        // Delete from Server
        await fetch(`/api/delete/${id}`, { method: 'DELETE' });
        
        if (fileToDelete) addActivity('delete', fileToDelete.name);
      }));
      setSelectedFiles([]);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Batch delete failed', error);
    }
  };

  const bulkToggleFavorite = async () => {
    if (selectedFiles.length === 0) return;
    
    const firstFile = files.find(f => f.id === selectedFiles[0]);
    if (!firstFile) return;
    
    const newState = !firstFile.isFavorite;
    
    try {
      await Promise.all(selectedFiles.map(id => 
        updateDoc(doc(db, 'files', id), { isFavorite: newState })
      ));
      addActivity('favorite', `${selectedFiles.length} files`);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Bulk favorite failed', error);
    }
  };

  const bulkMoveToFolder = async (folderId: string | null) => {
    if (selectedFiles.length === 0) return;
    
    try {
      await Promise.all(selectedFiles.map(id => 
        updateDoc(doc(db, 'files', id), { folderId })
      ));
      addActivity('move', `${selectedFiles.length} files`);
      setSelectedFiles([]);
      setShowBulkMoveModal(false);
    } catch (error) {
      console.error('Bulk move failed', error);
    }
  };

  const toggleFavorite = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    try {
      await updateDoc(doc(db, 'files', fileId), { isFavorite: !file.isFavorite });
      addActivity('favorite', file.name);
    } catch (error) {
      console.error('Toggle favorite failed', error);
    }
  };

  const setFileExpiry = async (fileId: string, expiryDate: string | null) => {
    try {
      await updateDoc(doc(db, 'files', fileId), { expiryDate });
      if (shareFile && shareFile.id === fileId) {
        setShareFile({ ...shareFile, expiryDate: expiryDate || undefined });
      }
      addActivity('share', shareFile?.name || 'File');
    } catch (err) {
      console.error('Failed to set expiry date', err);
    }
  };

  const setFilePassword = async (fileId: string, password: string | null) => {
    try {
      await updateDoc(doc(db, 'files', fileId), { password });
      if (shareFile && shareFile.id === fileId) {
        setShareFile({ ...shareFile, password: password || undefined });
      }
      addActivity('share', shareFile?.name || 'File');
    } catch (err) {
      console.error('Failed to set password', err);
    }
  };

  const addTag = async (fileId: string, tag: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !tag) return;
    const newTags = [...(file.tags || []), tag];
    try {
      await updateDoc(doc(db, 'files', fileId), { tags: newTags });
      addActivity('tag', file.name);
    } catch (error) {
      console.error('Add tag failed', error);
    }
  };

  const removeTag = async (fileId: string, tagToRemove: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    const newTags = (file.tags || []).filter(t => t !== tagToRemove);
    try {
      await updateDoc(doc(db, 'files', fileId), { tags: newTags });
    } catch (error) {
      console.error('Remove tag failed', error);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };



  const favorites = files.filter(f => f.isFavorite);

  const storageBreakdown = {
    images: files.filter(f => f.type?.startsWith('image/')).reduce((acc, f) => acc + (f.size || 0), 0),
    videos: files.filter(f => f.type?.startsWith('video/')).reduce((acc, f) => acc + (f.size || 0), 0),
    docs: files.filter(f => f.type?.includes('pdf') || f.type?.includes('word') || f.type?.includes('text')).reduce((acc, f) => acc + (f.size || 0), 0),
    music: files.filter(f => f.type?.startsWith('audio/')).reduce((acc, f) => acc + (f.size || 0), 0),
    other: files.filter(f => f.type && !f.type.startsWith('image/') && !f.type.startsWith('video/') && !f.type.startsWith('audio/') && !f.type.includes('pdf') && !f.type.includes('word') && !f.type.includes('text')).reduce((acc, f) => acc + (f.size || 0), 0),
  };
  const totalUsed = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const limit = user ? PRO_LIMIT : GUEST_LIMIT;
  const usagePercent = (totalUsed / limit) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <div className="loader-glow" />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-700",
      view === 'vault' ? "app-mode" : "bg-bg"
    )}>
      <ErrorBoundary>
      {/* Name Prompt Overlay */}
      <AnimatePresence>
        {showNamePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-[100px] bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-md glass-card p-8 rounded-lg border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={cn(
                  "w-16 h-16 bg-accent rounded-lg flex items-center justify-center border border-accent/20 overflow-hidden",
                  isTurboMode && "shadow-[0_0_30px_var(--color-accent-glow)]"
                )}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Share2 className="w-8 h-8 text-black" />
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-black tracking-tight uppercase">WELCOME TO SHARE FILES</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Please enter your name to continue</p>
                </div>
                <div className="w-full space-y-4">
                  <input
                    type="text"
                    placeholder="YOUR NAME"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-6 py-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-accent/50 transition-all text-center"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const name = (e.target as HTMLInputElement).value.trim();
                        if (name) {
                          localStorage.setItem('user_display_name', name);
                          setUserName(name);
                          setShowNamePrompt(false);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      const name = input.value.trim();
                      if (name) {
                        localStorage.setItem('user_display_name', name);
                        setUserName(name);
                        setShowNamePrompt(false);
                      }
                    }}
                    className="w-full py-4 bg-accent text-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.5)] transition-all"
                  >
                    GET STARTED
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {comingSoonError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs sm:text-sm font-bold text-red-500 uppercase tracking-widest leading-tight">
                {comingSoonError}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn(
        "min-h-screen flex flex-col bg-[#030303] text-white font-sans selection:bg-accent/30 selection:text-accent transition-all duration-500",
        isTurboMode && "shadow-[inset_0_0_100px_rgba(0,255,157,0.1)]",
        showNamePrompt && "pointer-events-none overflow-hidden h-screen"
      )}>
        {/* Scroll Progress Bar */}
        <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-white/5">
          <motion.div 
            className="h-full bg-accent shadow-[0_0_10px_var(--color-accent-glow)]"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Floating Upload Button for Mobile - REMOVED per user request */}

        <AnimatePresence mode="wait">
          {shareId ? (
            <motion.div key="public" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <PublicDownloadPage shareId={shareId} logoUrl={logoUrl} />
            </motion.div>
          ) : view === 'landing' ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Website Header */}
            <header className="p-6 md:p-12 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center border border-accent/20 overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Share2 className="w-6 h-6 text-black" />
                  )}
                </div>
                <h1 className="text-2xl font-display font-black tracking-tighter text-white uppercase">SHARE FILES</h1>
              </div>

              {/* Removed Profile info from landing header per user feedback */}
            </header>

            <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 sm:p-6 md:p-12">
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-16 py-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/5 border border-accent/20 rounded-md">
                      <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">SHARE FILES</span>
                    </div>

                    {visitorCount !== null && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                          {visitorCount.toLocaleString()} ACTIVE USERS
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-6xl md:text-8xl font-display font-bold leading-[0.85] tracking-tighter text-white uppercase">
                    SECURE <br />
                    <span className="text-accent">FILES</span>
                  </h2>
                  
                  <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                    Fast and secure file storage.
                    <span className="text-zinc-400">Pro</span> // <span className="text-zinc-400">Guest</span>
                  </p>
                </motion.div>

                <div className="w-full max-w-sm space-y-4">
                  <div className="space-y-3">
                    <button 
                      onClick={() => login('google')}
                      className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-zinc-100 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] group/btn"
                    >
                      <div className="w-6 h-6 flex items-center justify-center transition-transform group-hover/btn:scale-110">
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      </div>
                      <span className="text-[10px]">Continue with Google</span>
                    </button>

                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        onClick={() => login('apple')}
                        className="flex-1 bg-black text-white py-4 rounded-2xl flex items-center justify-center hover:bg-zinc-800 active:scale-95 transition-all border border-white/10 group/btn shadow-xl"
                        title="Continue with Apple"
                      >
                        <div className="transition-transform group-hover/btn:scale-110">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05 1.61-3.22 1.61-1.14 0-1.55-.67-2.83-.67-1.28 0-1.74.67-2.83.67-1.14 0-2.23-.74-3.22-1.61-2.02-2.02-3.55-5.71-3.55-8.81 0-2.93 1.54-4.51 3.02-4.51 1.14 0 1.9.72 2.76.72.82 0 1.57-.72 2.76-.72 1.48 0 3.02 1.58 3.02 4.51-.02.43-.07.82-.12 1.2-.55 3.39-2.02 6.67-2.05 7.62zm-3.05-15.03c.53-.61.91-1.42.91-2.25 0-.12-.01-.24-.04-.32-.74.07-1.64.55-2.17 1.16-.48.53-.91 1.34-.91 2.21 0 .15.02.26.04.36s.18.15.26.15c.67 0 1.48-.61 1.91-1.31z" />
                          </svg>
                        </div>
                      </button>
                      <button 
                        onClick={() => login('facebook')}
                        className="flex-1 bg-[#1877F2] text-white py-4 rounded-2xl flex items-center justify-center hover:bg-[#166fe5] active:scale-95 transition-all shadow-lg shadow-blue-500/20 group/btn"
                        title="Continue with Facebook"
                      >
                        <div className="transition-transform group-hover/btn:scale-110">
                          <Facebook className="w-5 h-5 fill-white stroke-none" />
                        </div>
                      </button>
                      <button 
                        onClick={() => login('github')}
                        className="flex-1 bg-[#24292F] text-white py-4 rounded-2xl flex items-center justify-center hover:bg-[#1c1f23] active:scale-95 transition-all group/btn border border-white/5"
                        title="Continue with GitHub"
                      >
                        <div className="transition-transform group-hover/btn:scale-110 text-white">
                          <Github className="w-5 h-5 fill-current" />
                        </div>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.3em]">OR</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => login('email')}
                      className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-black transition-all">
                        <Mail className="w-4 h-4" />
                      </div>
                      Sign in with Email
                    </button>
                    
                    <button 
                      onClick={startGuestSession}
                      className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <UserCircle className="w-4 h-4" />
                      </div>
                      Access as Guest
                    </button>

                    <button 
                      onClick={() => setShowOfflineShare(true)}
                      className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-black transition-all">
                        <Zap className="w-4 h-4 text-accent animate-pulse" />
                      </div>
                      Offline P2P Share
                    </button>
                  </div>

                  {(user || isGuestMode) && (
                    <div className="w-full pt-6">
                      <button 
                        onClick={() => setView('vault')}
                        className="w-full py-5 bg-accent text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,255,148,0.3)] animate-pulse-slow"
                      >
                        <Shield className="w-5 h-5" />
                        ENTER PRIVATE VAULT
                      </button>
                    </div>
                  )}
                </div>

                {/* Features Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 pb-24">
                  {[
                    { icon: Shield, title: "SECURE VAULT", desc: "Military-grade encryption for all your sensitive files and folders." },
                    { icon: Zap, title: "TURBO SPEED", desc: "Blazing fast upload and download speeds with real-time tracking." },
                    { icon: Share2, title: "EASY SHARING", desc: "Generate secure share links with custom expiry and password protection." }
                  ].map((feat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="glass-card p-8 rounded-[32px] text-left space-y-4 group hover:border-accent/30 transition-all"
                    >
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-black transition-all">
                        <feat.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">{feat.title}</h3>
                      <p className="text-[10px] leading-relaxed text-zinc-500 font-medium uppercase tracking-widest">{feat.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </main>
          </motion.div>
        ) : view === 'vault' ? (
          <motion.div 
            key="vault"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-screen bg-[#030303]"
          >
              {/* Native App Top Bar */}
              <header className="border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur-xl sticky top-0 z-[60] px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-md shadow-accent/20">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-5 h-5 object-cover" />
                      ) : (
                        <Zap className="w-5 h-5 text-black stroke-[2.5]" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                        ShareFiles
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-bold">PRO</span>
                      </h1>
                      <p className="text-[10px] text-zinc-400 font-medium">Fast Offline & Cloud Hub</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowOfflineShare(true)}
                      className="px-3 py-1.5 rounded-xl bg-accent text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-accent/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black" />
                      <span>Send / Receive</span>
                    </button>

                    <div className="relative group">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent/40 transition-all">
                        {user?.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserCircle className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl z-50">
                        <div className="px-3 py-2 border-b border-white/5 mb-1">
                          <p className="text-xs font-bold text-white truncate">{userName || user?.displayName || 'User'}</p>
                          <p className="text-[10px] text-accent">Active Session</p>
                        </div>
                        <button 
                          onClick={() => setShowActivityLog(true)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <Clock className="w-4 h-4 text-zinc-400" />
                          Transfer History
                        </button>
                        <button 
                          onClick={logout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 pb-28 space-y-5">
                {/* Mobile/Native App Quick Action Hero Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button 
                    onClick={() => setShowOfflineShare(true)}
                    className="p-4 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 hover:border-accent flex flex-col items-start justify-between gap-3 text-left transition-all active:scale-[0.98] group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent text-black flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5 fill-black" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Send & Receive</h4>
                      <p className="text-[10px] text-zinc-400">Offline P2P & Sound</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 flex flex-col items-start justify-between gap-3 text-left transition-all active:scale-[0.98] group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Upload File</h4>
                      <p className="text-[10px] text-zinc-400">Cloud Storage Vault</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setShowNewFolderModal(true)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 flex flex-col items-start justify-between gap-3 text-left transition-all active:scale-[0.98] group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">New Folder</h4>
                      <p className="text-[10px] text-zinc-400">{folders.length} Created</p>
                    </div>
                  </button>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-start justify-between gap-2">
                    <div className="flex items-center justify-between w-full">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">{Math.round(totalUsed / 1024 / 1024)}MB / {Math.round(limit / 1024 / 1024)}MB</span>
                    </div>
                    <div className="w-full space-y-1">
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full" 
                          style={{ width: `${Math.min(100, (totalUsed / limit) * 100)}%` }} 
                        />
                      </div>
                      <p className="text-[9px] text-zinc-500 font-medium">Vault Storage</p>
                    </div>
                  </div>
                </div>

                {/* Horizontal App Category Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Files', icon: HardDrive },
                    { id: 'images', label: 'Photos', icon: ImageIcon },
                    { id: 'videos', label: 'Videos', icon: Video },
                    { id: 'docs', label: 'Docs', icon: FileText },
                    { id: 'favorites', label: 'Starred', icon: Star },
                  ].map(cat => {
                    const count = cat.id === 'all' ? files.length : files.filter(f => {
                      if (cat.id === 'images') return f.type.startsWith('image/');
                      if (cat.id === 'videos') return f.type.startsWith('video/');
                      if (cat.id === 'docs') return f.type.includes('pdf') || f.type.includes('text');
                      if (cat.id === 'favorites') return f.isFavorite;
                      return false;
                    }).length;
                    
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all shrink-0 active:scale-95",
                          activeCategory === cat.id 
                            ? "bg-accent text-black shadow-md shadow-accent/20" 
                            : "bg-white/5 text-zinc-400 hover:text-white border border-white/5"
                        )}
                      >
                        <cat.icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", activeCategory === cat.id ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-zinc-400")}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" 
                    placeholder="Search your files, photos, docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                    {/* Bulk Actions Bar */}
                    <AnimatePresence>
                      {selectedFiles.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="flex items-center justify-between bg-zinc-900 border border-accent/20 p-4 rounded-2xl shadow-2xl"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-accent uppercase tracking-widest pr-4 border-r border-white/10">
                              {selectedFiles.length} Selected
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={bulkToggleFavorite}
                                className="p-2 text-zinc-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all"
                                title="Add to Favorites"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setShowBulkMoveModal(true)}
                                className="p-2 text-zinc-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                title="Move to Folder"
                              >
                                <Folder className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setSelectedFiles([])}
                              className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors"
                            >
                              CANCEL
                            </button>
                            <button 
                              onClick={() => setShowBulkDeleteConfirm(true)}
                              className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                            >
                              DELETE
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Breadcrumbs */}
                    {(currentFolderId || folders.length > 0) && !searchQuery && activeCategory === 'all' && (
                        <div className="flex items-center gap-2 px-2">
                          <button 
                            onClick={() => setCurrentFolderId(null)}
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
                              !currentFolderId ? "text-accent" : "text-zinc-500 hover:text-white"
                            )}
                          >
                            Root
                          </button>
                          {currentFolderId && (
                            <>
                              <span className="text-zinc-700">/</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-accent whitespace-nowrap">
                                {folders.find(f => f.id === currentFolderId)?.name || 'Folder'}
                              </span>
                            </>
                          )}
                        </div>
                    )}

                  {/* Folders Grid */}
                  {!searchQuery && activeCategory === 'all' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {folders.map(folder => (
                        <motion.div
                          key={folder.id}
                          layoutId={folder.id}
                          onClick={() => setCurrentFolderId(folder.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverFolderId(folder.id);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverFolderId(null);
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverFolderId(null);

                            // Handle desktop/local files dropped onto folder zone
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              uploadFiles(e.dataTransfer.files, folder.id);
                              return;
                            }

                            // Handle existing vault files drag-and-drop
                            const dragDataString = e.dataTransfer.getData("text/plain");
                            try {
                              if (dragDataString) {
                                const dragData = JSON.parse(dragDataString);
                                if (dragData.type === 'vault-file') {
                                  const idsToMove = dragData.selectedFileIds || [dragData.fileId];
                                  for (const id of idsToMove) {
                                    await moveFileToFolder(id, folder.id);
                                  }
                                }
                              }
                            } catch (err) {
                              console.error("Failed to parse drop payload on folder drop zone:", err);
                            }
                          }}
                          className={cn(
                            "glass-card p-4 rounded-2xl border-white/5 hover:border-accent/30 hover:bg-accent/[0.02] transition-all cursor-pointer group relative overflow-hidden",
                            currentFolderId === folder.id && "border-accent/50 bg-accent/5",
                            dragOverFolderId === folder.id && "border-accent bg-accent/10 scale-105 shadow-[0_0_25px_rgba(0,255,157,0.3)] ring-2 ring-accent/20"
                          )}
                        >
                          <AnimatePresence>
                            {dragOverFolderId === folder.id && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-[#00ff9d]/10 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-20 pointer-events-none"
                              >
                                <Upload className="w-5 h-5 text-accent animate-bounce" />
                                <span className="text-[8px] font-black tracking-[0.15em] text-accent uppercase">
                                  Drop item
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                              <Folder className="w-5 h-5 text-accent" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate text-white group-hover:text-accent transition-colors">{folder.name}</p>
                              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                                {files.filter(f => f.folderId === folder.id).length} Files
                              </p>
                            </div>
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFolder(editingFolder?.id === folder.id ? null : folder);
                                }}
                                className="p-1.5 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              
                              <AnimatePresence>
                                {editingFolder?.id === folder.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl p-2 z-[70] shadow-2xl"
                                  >
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newName = prompt('Rename folder to:', folder.name);
                                        if (newName && newName !== folder.name) {
                                          renameFolder(folder.id, newName);
                                        }
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-widest"
                                    >
                                      <Tag className="w-3 h-3" />
                                      Rename
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteFolderConfirm(folder);
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-all uppercase tracking-widest"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                {/* Uploading Status */}
                <AnimatePresence>
                  {uploads.map(u => (
                    <motion.div 
                      key={u.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      className="glass-card p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border-accent/30 bg-accent/[0.02] relative overflow-hidden group mb-4"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10 gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,148,0.3)] relative overflow-hidden shrink-0">
                            <motion.div 
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                            </motion.div>
                            <motion.div 
                              className="absolute bottom-0 left-0 h-1 bg-black/20"
                              animate={{ width: `${u.progress}%` }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold truncate group-hover:text-accent transition-colors">{u.name}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 sm:mt-1">
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-2.5 h-2.5 text-accent" />
                                <span className="text-[8px] sm:text-[10px] font-bold text-accent uppercase tracking-widest whitespace-nowrap">
                                  {formatSize(u.speed)}/s
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-2.5 h-2.5 text-zinc-500" />
                                <span className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                                  {u.status === 'completed' ? 'Finished' : `${formatTime(u.remaining)} left`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <HardDrive className="w-2.5 h-2.5 text-zinc-500" />
                                <span className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                                  {formatSize(u.loaded)} / {formatSize(u.size)}
                                </span>
                              </div>
                            </div>
                            <SpeedVisualizer history={u.speedHistory} className="mt-3" />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-xl sm:text-2xl font-display font-black text-accent leading-none">
                              {Math.round(u.progress)}%
                            </span>
                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-[0.2em] mt-1",
                              u.status === 'uploading' ? "text-accent animate-pulse" : 
                              u.status === 'completed' ? "text-emerald-500" : "text-red-500"
                            )}>
                              {u.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1 relative z-10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${u.progress}%` }}
                          transition={{ type: "spring", stiffness: 50, damping: 20 }}
                          className={cn(
                            "h-full rounded-full shadow-[0_0_15px_rgba(0,255,148,0.5)] transition-colors duration-500 relative overflow-hidden",
                            u.status === 'completed' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-accent"
                          )} 
                        >
                          {/* Animated beam effect */}
                          {u.status === 'uploading' && (
                            <motion.div 
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2 skew-x-12"
                            />
                          )}
                        </motion.div>
                        
                        {/* Real-time status inside progress bar area */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[7px] sm:text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">
                            {u.status === 'uploading' ? `${formatSize(u.speed)}/s • ${formatTime(u.remaining)} remaining` : u.status === 'completed' ? 'Transfer Complete' : 'Error'}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic particles for high speed */}
                      {u.status === 'uploading' && u.speed > 1024 * 1024 && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ x: -20, y: Math.random() * 100 + '%', opacity: 0 }}
                              animate={{ 
                                x: ['0%', '120%'],
                                opacity: [0, 1, 0]
                              }}
                              transition={{ 
                                duration: Math.random() * 1 + 0.5,
                                repeat: Infinity,
                                delay: Math.random() * 2
                              }}
                              className="absolute w-1 h-1 bg-accent rounded-full blur-[1px]"
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Decorative background glow */}
                      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-accent/5 blur-3xl rounded-full pointer-events-none" />
                    </motion.div>
                  ))}

                  {downloads.map(d => (
                    <motion.div 
                      key={d.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      className="glass-card p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border-blue-500/30 bg-blue-500/[0.02] relative overflow-hidden group mb-4"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10 gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] relative overflow-hidden shrink-0">
                            <motion.div 
                              animate={{ y: [0, 4, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </motion.div>
                            <motion.div 
                              className="absolute top-0 left-0 h-1 bg-white/20"
                              animate={{ width: `${d.progress}%` }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold truncate group-hover:text-blue-400 transition-colors">{d.name}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 sm:mt-1">
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-2.5 h-2.5 text-blue-400" />
                                <span className="text-[8px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">
                                  {formatSize(d.speed)}/s
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-2.5 h-2.5 text-zinc-500" />
                                <span className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                                  {d.status === 'completed' ? 'Finished' : `${formatTime(d.remaining)} left`}
                                </span>
                              </div>
                            </div>
                            <SpeedVisualizer history={d.speedHistory} className="mt-3" />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-xl sm:text-2xl font-display font-black text-blue-500 leading-none">
                              {Math.round(d.progress)}%
                            </span>
                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-[0.2em] mt-1",
                              d.status === 'downloading' ? "text-blue-500 animate-pulse" : 
                              d.status === 'completed' ? "text-emerald-500" : "text-red-500"
                            )}>
                              {d.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1 relative z-10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${d.progress}%` }}
                          transition={{ type: "spring", stiffness: 50, damping: 20 }}
                          className={cn(
                            "h-full rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-colors duration-500 relative overflow-hidden",
                            d.status === 'completed' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-blue-500"
                          )} 
                        >
                          {d.status === 'downloading' && (
                            <motion.div 
                              animate={{ x: ['100%', '-200%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2 -skew-x-12"
                            />
                          )}
                        </motion.div>
                        
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[7px] sm:text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">
                            {d.status === 'downloading' ? `${formatSize(d.speed)}/s • ${formatTime(d.remaining)} remaining` : d.status === 'completed' ? 'Download Complete' : 'Error'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="space-y-6">
                  <div className="flex flex-col gap-4 px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <h3 
                            className={cn(
                              "text-xs font-bold uppercase tracking-[0.2em] cursor-pointer transition-colors",
                              currentFolderId ? "text-zinc-500 hover:text-white" : "text-accent"
                            )}
                            onClick={() => setCurrentFolderId(null)}
                          >
                            Vault
                          </h3>
                          {currentFolderId && (
                            <>
                              <span className="text-zinc-700">/</span>
                              <h3 className="text-xs font-bold text-accent uppercase tracking-[0.2em]">
                                {folders.find(f => f.id === currentFolderId)?.name}
                              </h3>
                            </>
                          )}
                        </div>
                        {filteredFiles.length > 0 && (
                          <button 
                            onClick={() => {
                              if (selectedFiles.length === filteredFiles.length) {
                                setSelectedFiles([]);
                              } else {
                                setSelectedFiles(filteredFiles.map(f => f.id));
                              }
                            }}
                            className="flex items-center gap-2 group"
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border transition-all flex items-center justify-center",
                              selectedFiles.length === filteredFiles.length && filteredFiles.length > 0
                                ? "bg-accent border-accent text-black"
                                : "border-white/10 group-hover:border-white/30"
                            )}>
                              {selectedFiles.length === filteredFiles.length && filteredFiles.length > 0 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">Select All</span>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowNewFolderModal(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                        >
                          <Plus className="w-3.5 h-3.5 text-accent group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">New Folder</span>
                        </button>
                        <span className="text-[10px] text-zinc-600 font-bold">{filteredFiles.length} Items</span>
                      </div>
                    </div>
                  </div>
                  

                  {filteredFiles.length === 0 && (!folders.length || currentFolderId) ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-32 text-center glass-card rounded-[40px] border-dashed"
                    >
                      <Folder className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                      <p className="text-zinc-600 font-medium">Your vault is empty. <br /> Start by uploading some fire files! 🔥</p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {filteredFiles.map((file, idx) => (
                        <motion.div 
                          key={file.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          draggable
                          onDragStart={(e) => {
                            const data = {
                              type: "vault-file",
                              fileId: file.id,
                              selectedFileIds: selectedFiles.includes(file.id) ? selectedFiles : [file.id]
                            };
                            e.dataTransfer.setData("text/plain", JSON.stringify(data));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className={cn(
                            "glass-card p-4 sm:p-6 rounded-[24px] sm:rounded-3xl flex items-center justify-between group gap-3 sm:gap-4 transition-all relative overflow-hidden cursor-grab active:cursor-grabbing",
                            selectedFiles.includes(file.id) ? "border-accent/50 bg-accent/[0.03]" : "hover:border-white/20 hover:bg-white/[0.01]"
                          )}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFileSelection(file.id);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center shrink-0",
                                selectedFiles.includes(file.id) 
                                  ? "bg-accent border-accent text-black shadow-[0_0_15px_rgba(0,255,157,0.4)]" 
                                  : "border-white/20 hover:border-accent/50 bg-white/5"
                              )}
                            >
                              {selectedFiles.includes(file.id) && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                            </button>

                            <div 
                              className="flex items-center gap-3 sm:gap-4 flex-1 cursor-pointer min-w-0"
                              onClick={() => setPreviewFile(file)}
                            >
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-accent/10 transition-colors shrink-0">
                                <FileTypeIcon type={file.type} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold truncate group-hover:text-accent transition-colors">{file.name}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 sm:mt-1">
                                  <p className="text-[8px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">
                                    {formatSize(file.size)} • {format(new Date(file.createdAt), 'MMM d')}
                                  </p>
                                  {file.tags && file.tags.length > 0 && (
                                    <div className="flex gap-1 overflow-hidden">
                                      {file.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-[7px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                                          {tag}
                                        </span>
                                      ))}
                                      {file.tags.length > 2 && (
                                        <span className="text-[7px] font-bold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                                          +{file.tags.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <div className="relative group/move">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMovingFile(movingFile?.id === file.id ? null : file);
                                }}
                                className={cn(
                                  "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all shrink-0",
                                  movingFile?.id === file.id ? "text-accent bg-accent/10" : "text-zinc-500 hover:text-white hover:bg-white/5"
                                )}
                                title="Move to Folder"
                              >
                                <Folder className="w-3.5 h-3.5 sm:w-4 h-4" />
                              </button>
                              
                              <AnimatePresence>
                                {movingFile?.id === file.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-48 glass-card p-2 z-50 shadow-2xl"
                                  >
                                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest p-2 border-b border-white/5 mb-1">Move to:</p>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                      <button
                                        onClick={() => moveFileToFolder(file.id, null)}
                                        className={cn(
                                          "w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2",
                                          file.folderId === null ? "text-accent bg-accent/10" : "text-zinc-400 hover:bg-white/5"
                                        )}
                                      >
                                        <Globe className="w-3 h-3" /> Root Vault
                                      </button>
                                      {folders.map(folder => (
                                        <button
                                          key={folder.id}
                                          onClick={() => moveFileToFolder(file.id, folder.id)}
                                          className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2",
                                            file.folderId === folder.id ? "text-accent bg-accent/10" : "text-zinc-400 hover:bg-white/5"
                                          )}
                                        >
                                          <Folder className="w-3 h-3" /> {folder.name}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              className="p-2 sm:p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-all shrink-0"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5 sm:w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFile(file);
                              }}
                              className="p-2 sm:p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-all shrink-0"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5 sm:w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(file.id);
                              }}
                              className={cn(
                                "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all shrink-0",
                                file.isFavorite ? "text-yellow-500 bg-yellow-500/10" : "text-zinc-500 hover:text-white hover:bg-white/5"
                              )}
                              title="Favorite"
                            >
                              <Star className={cn("w-3.5 h-3.5 sm:w-4 h-4", file.isFavorite ? "fill-current" : "")} />
                            </button>
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMovingFile(movingFile?.id === file.id ? null : file);
                                }}
                                className="p-2 sm:p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-all shrink-0"
                                title="Move to Folder"
                              >
                                <Folder className="w-3.5 h-3.5 sm:w-4 h-4" />
                              </button>
                              
                              <AnimatePresence>
                                {movingFile?.id === file.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full right-0 mb-2 z-50 bg-zinc-900 border border-white/10 p-2 rounded-xl shadow-2xl min-w-[180px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1">Move to:</p>
                                    <button 
                                      onClick={() => moveFileToFolder(file.id, null)}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest",
                                        !file.folderId ? "text-accent bg-accent/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                                      )}
                                    >
                                      <Globe className="w-3 h-3" />
                                      Root
                                    </button>
                                    {folders.map(folder => (
                                      <button 
                                        key={folder.id}
                                        onClick={() => moveFileToFolder(file.id, folder.id)}
                                        className={cn(
                                          "w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest",
                                          file.folderId === folder.id ? "text-accent bg-accent/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                      >
                                        <Folder className="w-3 h-3" />
                                        {folder.name}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagInput(tagInput?.fileId === file.id ? null : { fileId: file.id, value: '' });
                                }}
                                className="p-2 sm:p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-all shrink-0"
                                title="Add Tag"
                              >
                                <Tag className="w-3.5 h-3.5 sm:w-4 h-4" />
                              </button>
                              
                              <AnimatePresence>
                                {tagInput?.fileId === file.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full right-0 mb-2 z-50 bg-zinc-900 border border-white/10 p-2 rounded-xl shadow-2xl flex gap-2 min-w-[150px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input 
                                      autoFocus
                                      type="text"
                                      placeholder="New tag..."
                                      value={tagInput.value}
                                      onChange={(e) => setTagInput({ ...tagInput, value: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tagInput.value.trim()) {
                                          addTag(file.id, tagInput.value.trim());
                                          setTagInput(null);
                                        }
                                      }}
                                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none focus:border-accent/50 w-full"
                                    />
                                    <button 
                                      onClick={() => {
                                        if (tagInput.value.trim()) {
                                          addTag(file.id, tagInput.value.trim());
                                          setTagInput(null);
                                        }
                                      }}
                                      className="bg-accent text-black p-1 rounded-lg hover:opacity-80 transition-opacity"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareFile(file);
                              }}
                              className="p-2 sm:p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-all shrink-0"
                              title="Share"
                            >
                              <Share2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFile(file.id);
                              }}
                              className="p-2 sm:p-3 text-zinc-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg sm:rounded-xl transition-all shrink-0"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  </div>
              </main>
              <div className="h-12 md:hidden" />
            </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Shared Footer */}
        <footer className="py-12 border-t border-white/5 mt-auto">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-display font-bold tracking-widest text-zinc-500"
            >
              ⚡ MADE WITH <span className="text-accent shadow-accent-glow">RUDRA</span> 🚀
            </motion.p>
          </div>
        </footer>

        <AnimatePresence>
          {showScrollHint && !hasReachedBottom && !isScrolling && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none"
            >
              <div className="bg-black/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 shadow-2xl whitespace-nowrap">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.4em] whitespace-nowrap">
                  🌿 VIEW MORE 🌿
                </span>
              </div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="w-6 h-6 text-accent drop-shadow-[0_0_10px_rgba(0,255,148,0.5)]" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {previewFile && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-8 flex justify-between items-center border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                    <FileTypeIcon type={previewFile.type} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold truncate max-w-[150px] sm:max-w-md">{previewFile.name}</h3>
                    <p className="text-[8px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{formatSize(previewFile.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownload(previewFile)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button 
                    onClick={() => setPreviewFile(null)}
                    className="p-2 sm:p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all shrink-0"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
                {previewFile.type.startsWith('video/') ? (
                  <video controls className="max-w-full max-h-full rounded-2xl sm:rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                    <source src={previewFile.downloadUrl} type={previewFile.type} />
                  </video>
                ) : previewFile.type.startsWith('audio/') ? (
                  <div className="w-full max-w-md glass-card p-8 sm:p-12 rounded-[32px] sm:rounded-[40px] text-center">
                    <Music className="w-16 h-16 sm:w-20 sm:h-20 text-accent mx-auto mb-6 sm:mb-8 animate-float" />
                    <audio controls className="w-full accent-accent"><source src={previewFile.downloadUrl} type={previewFile.type} /></audio>
                  </div>
                ) : previewFile.type.startsWith('image/') ? (
                  <img src={previewFile.downloadUrl} alt="" className="max-w-full max-h-full rounded-[32px] object-contain shadow-2xl border border-white/10" />
                ) : (
                  <div className="text-center space-y-6">
                    <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto">
                      <FileText className="w-12 h-12 text-zinc-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-zinc-400 font-medium">Preview not available for this format</p>
                      <p className="text-xs text-zinc-600 uppercase font-bold tracking-widest">{previewFile.type}</p>
                    </div>
                    <a 
                      href={previewFile.downloadUrl} 
                      download 
                      className="accent-button inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Vault Item
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {showActivityLog && (
            <ActivityLog 
              activities={activities} 
              onClose={() => setShowActivityLog(false)} 
            />
          )}

          {shareFile && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="glass-card p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] w-full max-w-[95%] sm:max-w-sm text-center relative overflow-hidden mx-auto"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-[0_0_20px_var(--color-accent-glow)]" />
                
                <button 
                  onClick={() => setShareFile(null)}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all z-20 group border border-white/5"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform" />
                </button>

                <div className="flex flex-col items-center pt-6 sm:pt-4">
                  <div className="bg-white p-4 rounded-[24px] inline-block mb-6 shadow-2xl relative">
                    <QRCodeSVG value={`${window.location.origin}/share/${shareFile.id}`} size={140} />
                  </div>

                  {/* Decorative Progress Bar */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-8 relative">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-full bg-accent shadow-[0_0_10px_var(--color-accent-glow)]"
                    />
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-display font-bold mb-2 uppercase tracking-tight">FILE READY TO SHARE</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mb-8 font-medium">Scan or copy link to share this item.</p>
                </div>
                
                <div className="mb-8 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Set Expiry</span>
                    <Clock className="w-3 h-3 text-zinc-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {expiryOptions.map((opt) => {
                      const isSelected = opt.value === null 
                        ? !shareFile.expiryDate 
                        : shareFile.expiryDate && Math.abs(new Date(shareFile.expiryDate).getTime() - (Date.now() + opt.value)) < 10000; // within 10s tolerance
                      
                      return (
                        <button
                          key={opt.label}
                          onClick={() => setFileExpiry(shareFile.id, opt.value ? new Date(Date.now() + opt.value).toISOString() : null)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                            isSelected
                              ? "bg-accent/10 text-accent border-accent/20"
                              : "bg-white/5 text-zinc-500 border-transparent hover:bg-white/10"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-8 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password Protection</span>
                    <Lock className="w-3 h-3 text-zinc-500" />
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Optional Password"
                      defaultValue={shareFile.password || ''}
                      onBlur={(e) => setFilePassword(shareFile.id, e.target.value || null)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-all"
                    />
                    {shareFile.password && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Check className="w-4 h-4 text-accent" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={async () => {
                      const success = await copyToClipboard(`${window.location.origin}/share/${shareFile.id}`);
                      if (success) {
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2500);
                      }
                    }}
                    className={cn(
                      "w-full py-5 text-sm uppercase font-black tracking-widest rounded-2xl transition-all duration-300",
                      linkCopied 
                        ? "bg-[#00ff9d] text-black shadow-[0_0_20px_rgba(0,255,157,0.4)] border border-transparent scale-[1.02]" 
                        : "accent-button text-black ripple"
                    )}
                  >
                    {linkCopied ? "Copied to Clipboard! 🚀" : "Copy Download Link"}
                  </button>
                  <button 
                    onClick={() => setShareFile(null)} 
                    className="w-full py-4 text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Reset Guest Session Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <AlertTriangle className="w-32 h-32 -mr-8 -mt-8" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold tracking-tight">Reset {getProviderName()} Session?</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    This will permanently delete all your local data and clear your session. <span className="text-white font-bold">This action cannot be undone.</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={async () => {
                      localStorage.clear();
                      sessionStorage.clear();
                      if (user) await signOut(auth);
                      window.location.reload();
                    }}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-500/20"
                  >
                    Yes, Reset Session
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Folder Confirm Modal */}
      <AnimatePresence>
        {showDeleteFolderConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-md glass-card p-8 rounded-[32px] border border-white/10"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/20">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-black tracking-tight uppercase">DELETE FOLDER?</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                    Are you sure you want to delete <span className="text-white">"{showDeleteFolderConfirm.name}"</span>? 
                    Files inside will be moved to the root directory.
                  </p>
                </div>
                <div className="w-full grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowDeleteFolderConfirm(null)}
                    className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => {
                      deleteFolder(showDeleteFolderConfirm.id);
                      setShowDeleteFolderConfirm(null);
                    }}
                    className="py-4 bg-red-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewFolderModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                  <Folder className="w-8 h-8 text-accent" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold tracking-tight">Create New Folder</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Organize your files with a new folder.
                  </p>
                </div>

                <div className="space-y-4">
                  <input 
                    type="text"
                    placeholder="Folder Name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-all"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={() => createFolder(newFolderName)}
                    disabled={!newFolderName.trim()}
                    className="flex-1 py-4 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-bold text-sm transition-all shadow-lg shadow-accent/20"
                  >
                    Create Folder
                  </button>
                  <button 
                    onClick={() => setShowNewFolderModal(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Folder Modal */}
      <AnimatePresence>
        {editingFolder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingFolder(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                  <FileText className="w-8 h-8 text-accent" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold tracking-tight">Rename Folder</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Enter a new name for your folder.
                  </p>
                </div>

                <div className="space-y-4">
                  <input 
                    type="text"
                    placeholder="Folder Name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-all"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={() => renameFolder(editingFolder.id, newFolderName)}
                    disabled={!newFolderName.trim()}
                    className="flex-1 py-4 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-bold text-sm transition-all shadow-lg shadow-accent/20"
                  >
                    Rename
                  </button>
                  <button 
                    onClick={() => setEditingFolder(null)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Auth Modal */}
      <AnimatePresence>
        {showEmailAuthModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailAuthModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0F0F11] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Mail className="w-32 h-32 -mr-8 -mt-8" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                  <Mail className="w-8 h-8 text-accent" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold tracking-tight text-white uppercase">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h3>
                  <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest leading-relaxed">
                    {isSignUp ? 'Join the secure cloud vault' : 'Access your encrypted files'}
                  </p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-accent transition-colors" />
                      <input 
                        type="email"
                        placeholder="EMAIL ADDRESS"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-xs font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-accent/50 transition-all uppercase tracking-widest"
                      />
                    </div>
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-accent transition-colors" />
                      <input 
                        type="password"
                        placeholder="PASSWORD"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-xs font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-accent/50 transition-all uppercase tracking-widest"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-tight">{loginError}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        {isSignUp ? 'Initialize Account' : 'Authorize Access'}
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 text-center">
                  <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-[10px] font-bold text-zinc-500 hover:text-accent uppercase tracking-[0.2em] transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'New here? Create an account'}
                  </button>
                </div>

                <button 
                  onClick={() => setShowEmailAuthModal(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-zinc-500 text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Trash2 className="w-32 h-32 -mr-8 -mt-8" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold tracking-tight">Delete Multiple Files?</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    You are about to delete <span className="text-white font-bold">{selectedFiles.length} files</span> permanently. This action cannot be undone.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={deleteSelectedFiles}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-500/20"
                  >
                    Yes, Delete All
                  </button>
                  <button 
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Move Modal */}
      <AnimatePresence>
        {showBulkMoveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkMoveModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6">Move {selectedFiles.length} Items</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2 text-left">
                <button 
                  onClick={() => bulkMoveToFolder(null)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 group"
                >
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20">
                    <HardDrive className="w-5 h-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white uppercase tracking-widest">Vault Root</p>
                  </div>
                </button>
                {folders.map(folder => (
                  <button 
                    key={folder.id}
                    onClick={() => bulkMoveToFolder(folder.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 group"
                  >
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20">
                      <Folder className="w-5 h-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white uppercase tracking-widest">{folder.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowBulkMoveModal(false)}
                className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 font-bold uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Native App Floating Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 shadow-2xl flex items-center justify-around">
        <button 
          onClick={() => {
            setShowOfflineShare(false);
            setActiveCategory('all');
          }}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-1.5 rounded-full transition-all active:scale-95",
            !showOfflineShare && !showActivityLog ? "text-accent" : "text-zinc-400 hover:text-white"
          )}
        >
          <HardDrive className="w-5 h-5" />
          <span className="text-[10px] font-bold">Files</span>
        </button>

        <button 
          onClick={() => setShowOfflineShare(true)}
          className="flex items-center justify-center w-12 h-12 -mt-4 bg-accent text-black rounded-full shadow-lg shadow-accent/40 active:scale-90 hover:scale-105 transition-all"
          title="Fast Transfer"
        >
          <Zap className="w-6 h-6 fill-black" />
        </button>

        <button 
          onClick={() => setShowActivityLog(true)}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-1.5 rounded-full transition-all active:scale-95",
            showActivityLog ? "text-accent" : "text-zinc-400 hover:text-white"
          )}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-bold">History</span>
        </button>
      </div>

      <AnimatePresence>
        {showOfflineShare && (
          <OfflineP2PShare 
            onClose={() => {
              setShowOfflineShare(false);
              setInitialP2pFile(null);
            }} 
            initialFile={initialP2pFile || undefined}
            currentUserDisplayName={userName || user?.displayName || null} 
          />
        )}
      </AnimatePresence>

      <OppoFileDock 
        onSendP2P={(file) => {
          setInitialP2pFile(file);
          setShowOfflineShare(true);
        }}
        onUploadToVault={(filesToUpload) => {
          uploadFiles(filesToUpload);
        }}
        cloudFilesCount={files.length}
      />
      </div>
    </ErrorBoundary>
  </div>
);
}

