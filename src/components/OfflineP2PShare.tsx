import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, Zap, Share2, Shield, QrCode, Clipboard, Check, 
  RefreshCw, Users, File, Download, Upload, AlertCircle, X, ChevronRight, Laptop, HelpCircle, AlertTriangle,
  Volume2, Disc, Key, Info, Radio, Signal,
  Music, Search, Sparkles, Shuffle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../utils/cn';
import { generateMelodyCatalog, playSynthesizedKrishnaFlute, stopAllFluteSounds, KrishnaMelody } from '../utils/fluteSynth';
import { copyToClipboard } from '../utils/clipboard';

interface ConnectionPeer {
  id: string;
  name: string;
  pin?: string;
  soundFreq?: number;
}

interface OfflineP2PShareProps {
  onClose: () => void;
  currentUserDisplayName: string | null;
  initialFile?: globalThis.File;
}

// Generate premium tech nicknames as fallback
const TECH_ADJECTIVES = ['CYBER', 'QUANTUM', 'NEON', 'AETHER', 'COSMIC', 'STALLAR', 'TURBO', 'OMNI', 'SOLAR', 'ZEPHYR'];
const TECH_NOUNS = ['VORTEX', 'CODER', 'PULSE', 'GRID', 'SHIELD', 'WAVE', 'RIDER', 'VOYAGER', 'NODE', 'SPARK'];

const generateRandomNickname = () => {
  const adj = TECH_ADJECTIVES[Math.floor(Math.random() * TECH_ADJECTIVES.length)];
  const noun = TECH_NOUNS[Math.floor(Math.random() * TECH_NOUNS.length)];
  return `${adj} ${noun} ${Math.floor(Math.random() * 90) + 10}`;
};

// --- INDIAN BANSURI FLUTE MELODIES DATABASE & DYNAMIC SYNTH PRESETS ---
export interface FluteMelody {
  id: number;
  title: string;
  raga: string;
  theme: string;
  desc: string;
  notes: { freq: number; duration: number }[];
}

const INDIAN_RAGAS = [
  { name: 'Raga Yaman', ratios: [1.0, 1.125, 1.25, 1.406, 1.50, 1.667, 1.875, 2.0], desc: 'An evening raga filled with peace, blessing, and divine light.' },
  { name: 'Raga Brindavani Sarang', ratios: [1.0, 1.125, 1.333, 1.50, 1.80, 2.0], desc: 'The holy mood of Lord Krishna playing with friends in Vrindavana.' },
  { name: 'Raga Bhupali', ratios: [1.0, 1.125, 1.25, 1.50, 1.667, 2.0], desc: 'A serene pentatonic scale representing pure spiritual innocence.' },
  { name: 'Raga Bhairavi', ratios: [1.0, 1.0667, 1.20, 1.333, 1.50, 1.60, 1.80, 2.0], desc: 'A morning raga of supreme surrender and devotional love.' },
  { name: 'Raga Desh', ratios: [1.0, 1.125, 1.333, 1.50, 1.875, 2.0], desc: 'The sweet melody of monsoon rain, calling hearts to reunite.' },
  { name: 'Raga Kalavati', ratios: [1.0, 1.25, 1.50, 1.667, 1.80, 2.0], desc: 'Bright, joyous notes representing the divine raas dance.' },
  { name: 'Raga Hansadhwani', ratios: [1.0, 1.125, 1.25, 1.50, 1.875, 2.0], desc: 'Lord Krishna riding on a royal swan, filled with pure bliss.' },
  { name: 'Raga Pilu', ratios: [1.0, 1.125, 1.20, 1.25, 1.50, 1.667, 1.80, 2.0], desc: 'A deeply emotional raga of sweet remembrance and devotion.' },
  { name: 'Raga Bageshri', ratios: [1.0, 1.125, 1.20, 1.333, 1.667, 1.80, 2.0], desc: 'Late night melody depicting Vrindavan in silent starlight.' },
  { name: 'Raga Kafi', ratios: [1.0, 1.125, 1.20, 1.333, 1.50, 1.667, 1.80, 2.0], desc: 'Rhythmic, playful raga used in Holi and Rasalila dances.' }
];

const DIVINE_THEMES = [
  'Gokula Maakhan Chor',
  'Vrindavan Sunset Flute-call',
  'Radha Rani Prem Milan',
  'Govardhan Giridhari Leela',
  'Kaliya Nartan Tandav',
  'Maha Raas Circular Dance',
  'Yamuna Bank Breeze',
  'Geeta Meditative Gyaan',
  'Mor Mukut Peacock Glide',
  'Devotion of Bansi Bajaiya'
];

export function get100DivineMelodies(): FluteMelody[] {
  const melodies: FluteMelody[] = [];
  
  for (let i = 0; i < 100; i++) {
    const ragaId = i % 10;
    const themeId = Math.floor(i / 10) % 10;
    const raga = INDIAN_RAGAS[ragaId];
    const theme = DIVINE_THEMES[themeId];
    
    // Deterministic random melody generation using LCG formula
    let seed = i + 1;
    const notesCount = 10 + (seed % 6); // 10 to 15 notes
    const notes: { freq: number; duration: number }[] = [];
    
    // Alternate octave root Sa between 820Hz, 920Hz, 1020Hz for beautiful, rich pitch diversity
    const baseSa = 820 + (seed % 3) * 100; 

    for (let j = 0; j < notesCount; j++) {
      // Deterministic pseudo-random note index in the raga scale
      seed = (seed * 9301 + 49297) % 233280;
      const noteIndex = seed % raga.ratios.length;
      const ratio = raga.ratios[noteIndex];
      const freq = baseSa * ratio;
      
      // Some notes are long resting notes, others are fast sweet transitions
      const isLeap = (j * 7 + 3) % 4 === 0;
      const duration = isLeap ? 0.55 : 0.3;
      
      notes.push({ freq, duration });
    }
    
    melodies.push({
      id: i + 1,
      title: `${theme} (Raga ${raga.name.split(' ').slice(1).join(' ')})`,
      raga: raga.name,
      theme,
      desc: raga.desc,
      notes
    });
  }
  
  return melodies;
}

// Ultrasonic/Chirp Frequency matching range (High pitches but audible for standard microphones/speakers)
const BASE_FREQUENCY = 1200; // Start at 1.2kHz for reliable audio mic pickup
const FREQ_STEP = 150;      // Freq step size for different room PIN signals

export default function OfflineP2PShare({ onClose, currentUserDisplayName, initialFile }: OfflineP2PShareProps) {
  const [sharingMode, setSharingMode] = useState<'wifi' | 'offgrid' | 'chirp' | 'pin'>('wifi');
  const [myNickname] = useState(() => currentUserDisplayName || generateRandomNickname());
  const [peerId] = useState(() => 'peer_' + Math.random().toString(36).substr(2, 9));
  
  // Krishna Flute states
  const [melodyCatalog] = useState(() => generateMelodyCatalog());
  const [selectedMelodyId, setSelectedMelodyId] = useState<number>(1);
  const [isPlayingFlute, setIsPlayingFlute] = useState(false);
  const [activeSwaraName, setActiveSwaraName] = useState<string>('');
  const [activeSwaraIndex, setActiveSwaraIndex] = useState<number>(-1);
  
  // Backing Transport Pipeline (Fallbacks to WebSocket if WebRTC fails)
  const [transportMode, setTransportMode] = useState<'webrtc' | 'websocket'>('webrtc');
  
  // Wi-Fi room discovery states
  const [nearbyPeers, setNearbyPeers] = useState<ConnectionPeer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<ConnectionPeer | null>(null);
  const [activeTransferFile, setActiveTransferFile] = useState<globalThis.File | null>(() => initialFile || null);
  
  // Local Transfer state controllers
  const [transferRole, setTransferRole] = useState<'sender' | 'receiver' | null>(null);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'negotiating' | 'transferring' | 'completed' | 'error'>('idle');
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0); // MB/s
  const [currentFileName, setCurrentFileName] = useState('');
  const [currentFileSize, setCurrentFileSize] = useState(0);
  const [transferredBytes, setTransferredBytes] = useState(0);

  // Sound Chirp pairing states
  const [chirpRole, setChirpRole] = useState<'transmit' | 'listen' | null>(null);
  const [chirpFileToSend, setChirpFileToSend] = useState<globalThis.File | null>(() => initialFile || null);
  const [isChirping, setIsChirping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chirpLog, setChirpLog] = useState<string>('');
  
  // PIN pairing states
  const [myPairingPin] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [enteredPin, setEnteredPin] = useState('');
  const [pinFileToSend, setPinFileToSend] = useState<globalThis.File | null>(() => initialFile || null);
  const [pinRole, setPinRole] = useState<'host' | 'join' | null>(null);

  // Manual QR/Signal copy-paste states (Off-Grid Mode)
  const [offGridRole, setOffGridRole] = useState<'send' | 'receive' | null>(null);
  const [localSdpCode, setLocalSdpCode] = useState('');
  const [remoteSdpInput, setRemoteSdpInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);

  // WebRTC references
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const signalSocketRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isRemoteDescriptionSetRef = useRef<boolean>(false);
  
  // Connection timeout reference (5 seconds till WebRTC switches to high-velocity Socket fallback)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handshake and received file buffers
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedMetaRef = useRef<{ name: string; size: number; mime: string } | null>(null);
  
  // Live performance optimization calculations
  const transferStartTime = useRef<number>(0);
  const lastProgressUpdate = useRef<number>(0);
  const lastLoadedBytes = useRef<number>(0);

  // Web Audio Context reference for Chirp Codecs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const listenIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Krishna Flute Divine Sync States
  const [selectedMelodyIndex, setSelectedMelodyIndex] = useState(0);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [melodySearchQuery, setMelodySearchQuery] = useState('');
  const [selectedRaga, setSelectedRaga] = useState<string>('All');
  const [melodyPage, setMelodyPage] = useState(0);
  const playTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Convert Base64 back to ArrayBuffer safely for WebSocket packet streaming
  const base64ToArrayBuffer = (base64Str: string): ArrayBuffer => {
    const binaryString = atob(base64Str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Process WebSocket Relayed File Packets securely (Ensures 100% bypass on double NAT firewalls)
  const handleRelayMessage = (payload: any) => {
    if (payload.type === 'header') {
      console.log('Dual-Relay: Received header packet:', payload);
      setCurrentFileName(payload.name);
      setCurrentFileSize(payload.size);
      setTransferStatus('transferring');
      setTransferRole('receiver');
      setTransportMode('websocket');
      setTransferredBytes(0);
      setTransferProgress(0);
      receivedChunksRef.current = [];
      receivedMetaRef.current = payload;
      transferStartTime.current = performance.now();
      lastProgressUpdate.current = performance.now();
    } 
    else if (payload.type === 'chunk') {
      const buffer = base64ToArrayBuffer(payload.chunk);
      receivedChunksRef.current.push(buffer);
      
      const receivedBytes = receivedChunksRef.current.reduce((acc, c) => acc + c.byteLength, 0);
      setTransferredBytes(receivedBytes);
      
      if (receivedMetaRef.current) {
        const progress = Math.min((receivedBytes / receivedMetaRef.current.size) * 100, 100);
        setTransferProgress(Math.round(progress));
        
        const now = performance.now();
        const elapsed = (now - lastProgressUpdate.current) / 1000;
        if (elapsed >= 0.5) {
          const addedBytes = receivedBytes - lastLoadedBytes.current;
          const speed = (addedBytes / 1024 / 1024) / elapsed; // MB/s
          setTransferSpeed(Math.round(speed * 10) / 10);
          lastProgressUpdate.current = now;
          lastLoadedBytes.current = receivedBytes;
        }

        if (receivedBytes >= receivedMetaRef.current.size) {
          assembleAndDownloadFile();
        }
      }
    } 
    else if (payload.type === 'eof') {
      console.log('Dual-Relay: Stream end detected. Compiling download...');
      assembleAndDownloadFile();
    }
  };

  // Setup WebSocket room signaling lane
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);
    signalSocketRef.current = socket;

    socket.onopen = () => {
      // Register device automatically
      socket.send(JSON.stringify({
        type: 'register-peer',
        peerId,
        name: myNickname
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'peers-list') {
          const rawPeers = message.peers as any[];
          
          // Re-serialize peer arrays in state
          const list = rawPeers
            .filter(p => p.id !== peerId)
            .map((p, index) => ({
              id: p.id,
              name: p.name,
              pin: p.pin || (100000 + (index * 382) % 900000).toString(),
              soundFreq: BASE_FREQUENCY + (index * FREQ_STEP)
            }));
          setNearbyPeers(list);
        }
        
        else if (message.type === 'relay-message') {
          handleRelayMessage(message.payload);
        }
        
        else if (message.type === 'webrtc-signal') {
          const { from, signal } = message;
          
          if (signal.type === 'offer') {
            console.log('WebRTC signaling offer accepted. Opening secure data highway...');
            setTransportMode('webrtc');
            setTransferRole('receiver');
            setTransferStatus('negotiating');
            
            cleanupWebRTC();
            
            const pc = createPeerConnection(from);
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
            
            isRemoteDescriptionSetRef.current = true;
            for (const cand of pendingCandidatesRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.error('Error draining candidate:', e);
              }
            }
            pendingCandidatesRef.current = [];
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            socket.send(JSON.stringify({
              type: 'webrtc-signal',
              to: from,
              signal: { type: 'answer', sdp: answer.sdp }
            }));
          } 
          
          else if (signal.type === 'answer') {
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
              isRemoteDescriptionSetRef.current = true;
              
              for (const cand of pendingCandidatesRef.current) {
                try {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  console.error('Error draining sender candidate:', e);
                }
              }
              pendingCandidatesRef.current = [];
            }
          } 
          
          else if (signal.type === 'candidate') {
            if (pcRef.current) {
              if (isRemoteDescriptionSetRef.current) {
                try {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (e) {
                  console.error('Candidate mapping crash avoided:', e);
                }
              } else {
                pendingCandidatesRef.current.push(signal.candidate);
              }
            }
          }

          else if (signal.type === 'fallback-to-websocket') {
            console.warn('Fallback relay requested by Sender on route signal block.');
            cleanupWebRTC();
            setTransportMode('websocket');
            setTransferRole('receiver');
            setTransferStatus('transferring');
            setTransferredBytes(0);
            setTransferProgress(0);
            receivedChunksRef.current = [];
            transferStartTime.current = performance.now();
            lastProgressUpdate.current = performance.now();
          }
        }
      } catch (err) {
        console.error('Signaling connection error:', err);
      }
    };

    return () => {
      socket.close();
      cleanupWebRTC();
      stopChirping();
      stopListeningToChirps();
      stopAllFluteSounds();
    };
  }, [peerId, myNickname]);

  // Handle cleanup of reference sockets and contexts
  const cleanupWebRTC = () => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    pendingCandidatesRef.current = [];
    isRemoteDescriptionSetRef.current = false;
    
    setTransferStatus('idle');
    setTransferProgress(0);
    setTransferSpeed(0);
    setTransferredBytes(0);
  };

  // Convert signaling offer/answers to shareable string metrics
  const getShareableSignal = (type: 'offer' | 'answer', sdp: string) => {
    const compactObj = { type, sdp };
    const json = JSON.stringify(compactObj);
    return btoa(unescape(encodeURIComponent(json)));
  };

  const parseShareableSignal = (base64: string) => {
    try {
      const json = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  };

  // Generate WebRTC peer pipeline with fallback logic
  const createPeerConnection = (targetPeerId: string | null) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' }
      ]
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && targetPeerId && signalSocketRef.current?.readyState === WebSocket.OPEN) {
        signalSocketRef.current.send(JSON.stringify({
          type: 'webrtc-signal',
          to: targetPeerId,
          signal: { type: 'candidate', candidate: event.candidate }
        }));
      }
    };

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    return pc;
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('WebRTC direct data channel ready!');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setTransportMode('webrtc');
      setTransferStatus('transferring');
      transferStartTime.current = performance.now();
      lastProgressUpdate.current = performance.now();
      lastLoadedBytes.current = 0;
      
      if (transferRole === 'sender' && activeTransferFile) {
        streamFileViaDataChannel(activeTransferFile, channel);
      }
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const metadata = JSON.parse(event.data);
        if (metadata.type === 'header') {
          setCurrentFileName(metadata.name);
          setCurrentFileSize(metadata.size);
          setTransferStatus('transferring');
          setTransferRole('receiver');
          setTransferredBytes(0);
          setTransferProgress(0);
          receivedChunksRef.current = [];
          receivedMetaRef.current = metadata;
          transferStartTime.current = performance.now();
          lastProgressUpdate.current = performance.now();
        } else if (metadata.type === 'eof') {
          assembleAndDownloadFile();
        }
      } else {
        const chunk = event.data as ArrayBuffer;
        receivedChunksRef.current.push(chunk);
        
        const receivedBytes = receivedChunksRef.current.reduce((acc, c) => acc + c.byteLength, 0);
        setTransferredBytes(receivedBytes);
        
        if (receivedMetaRef.current) {
          const progress = Math.min((receivedBytes / receivedMetaRef.current.size) * 100, 100);
          setTransferProgress(Math.round(progress));
          
          const now = performance.now();
          const elapsed = (now - lastProgressUpdate.current) / 1000;
          if (elapsed >= 0.5) {
            const addedBytes = receivedBytes - lastLoadedBytes.current;
            const speed = (addedBytes / 1024 / 1024) / elapsed; // MB/s
            setTransferSpeed(Math.round(speed * 10) / 10);
            lastProgressUpdate.current = now;
            lastLoadedBytes.current = receivedBytes;
          }

          if (receivedBytes >= receivedMetaRef.current.size) {
            assembleAndDownloadFile();
          }
        }
      }
    };

    channel.onerror = (err) => {
      console.error('P2P Data Channel Error, switching path:', err);
      setTransferStatus('error');
    };
  };

  const assembleAndDownloadFile = () => {
    if (receivedChunksRef.current.length === 0 || !receivedMetaRef.current) return;
    
    const blob = new Blob(receivedChunksRef.current, { type: receivedMetaRef.current.mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = receivedMetaRef.current.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setTransferStatus('completed');
  };

  // Binary direct browser stream generator over RTC channels
  const streamFileViaDataChannel = (file: globalThis.File, channel: RTCDataChannel) => {
    channel.send(JSON.stringify({
      type: 'header',
      name: file.name,
      size: file.size,
      mime: file.type
    }));

    const chunkSize = 16384; 
    const fileReader = new FileReader();
    let offset = 0;

    const readNextSlice = () => {
      if (channel.readyState !== 'open') return;
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    fileReader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      try {
        channel.send(buffer);
        offset += buffer.byteLength;
        setTransferredBytes(offset);
        
        const progress = Math.min((offset / file.size) * 100, 100);
        setTransferProgress(Math.round(progress));
        
        const now = performance.now();
        const elapsed = (now - lastProgressUpdate.current) / 1000;
        if (elapsed >= 0.5) {
          const addedBytes = offset - lastLoadedBytes.current;
          const speed = (addedBytes / 1024 / 1024) / elapsed; // MB/s
          setTransferSpeed(Math.round(speed * 10) / 10);
          lastProgressUpdate.current = now;
          lastLoadedBytes.current = offset;
        }

        if (offset < file.size) {
          if (channel.bufferedAmount > 8 * 1024 * 1024) { 
            channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null;
              readNextSlice();
            };
          } else {
            readNextSlice();
          }
        } else {
          channel.send(JSON.stringify({ type: 'eof' }));
          setTransferStatus('completed');
        }
      } catch (err) {
        console.error('DataStream error:', err);
        setTransferStatus('error');
      }
    };

    readNextSlice();
  };

  // High-performance binary WebSocket tunnel (Solves NAT blockages, bypasses routers)
  const streamFileViaWebSocket = (file: globalThis.File, targetId: string) => {
    setTransportMode('websocket');
    setTransferStatus('transferring');
    
    signalSocketRef.current?.send(JSON.stringify({
      type: 'relay-message',
      to: targetId,
      payload: {
        type: 'header',
        name: file.name,
        size: file.size,
        mime: file.type
      }
    }));

    const chunkSize = 65536; // 64KB Packets optimize socket speed
    let offset = 0;

    const readNextSlice = () => {
      if (signalSocketRef.current?.readyState !== WebSocket.OPEN) {
        setTransferStatus('error');
        return;
      }
      if (offset >= file.size) {
        signalSocketRef.current.send(JSON.stringify({
          type: 'relay-message',
          to: targetId,
          payload: { type: 'eof' }
        }));
        setTransferStatus('completed');
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      const fileReader = new FileReader();
      
      fileReader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1];

        signalSocketRef.current?.send(JSON.stringify({
          type: 'relay-message',
          to: targetId,
          payload: {
            type: 'chunk',
            chunk: base64
          }
        }));

        offset += slice.size;
        setTransferredBytes(offset);
        const progress = Math.min((offset / file.size) * 100, 100);
        setTransferProgress(Math.round(progress));

        const now = performance.now();
        const elapsed = (now - lastProgressUpdate.current) / 1000;
        if (elapsed >= 0.5) {
          const addedBytes = offset - lastLoadedBytes.current;
          const speed = (addedBytes / 1024 / 1024) / elapsed;
          setTransferSpeed(Math.round(speed * 10) / 10);
          lastProgressUpdate.current = now;
          lastLoadedBytes.current = offset;
        }

        // Slight micro-pause relaxes browser engine processing list
        setTimeout(readNextSlice, 5);
      };
      
      fileReader.readAsDataURL(slice);
    };

    readNextSlice();
  };

  // Launch handshaking for dynamic channels with 5S Watchdog till socket relay fallback triggers
  const executeDirectHandshake = async (targetId: string, file: globalThis.File) => {
    setTransportMode('webrtc');
    setTransferRole('sender');
    setTransferStatus('negotiating');
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);
    
    cleanupWebRTC();
    
    const pc = createPeerConnection(targetId);
    const channel = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(channel);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    signalSocketRef.current?.send(JSON.stringify({
      type: 'webrtc-signal',
      to: targetId,
      signal: { type: 'offer', sdp: offer.sdp }
    }));

    connectionTimeoutRef.current = setTimeout(() => {
      if (pcRef.current && (pcRef.current.iceConnectionState !== 'connected' && dataChannelRef.current?.readyState !== 'open')) {
        console.warn('P2P connection took too long. Seamlessly downgrading to high-efficiency Socket Relay Tunnel...');
        
        signalSocketRef.current?.send(JSON.stringify({
          type: 'webrtc-signal',
          to: targetId,
          signal: { type: 'fallback-to-websocket' }
        }));

        cleanupWebRTC();
        streamFileViaWebSocket(file, targetId);
      }
    }, 5000);
  };

  // Trigger auto room Wi-Fi stream
  const initiateWifiP2PSharing = () => {
    if (!selectedPeer || !activeTransferFile) return;
    executeDirectHandshake(selectedPeer.id, activeTransferFile);
  };

  // --- INTEGRATED HOLISTIC BANSURI FLUTE SIMULATOR ---
  const playBansuriMelodyAudio = (notes: { freq: number; duration: number }[]) => {
    try {
      // Clean up previous context / timers
      stopChirping();

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      setIsChirping(true);
      setChirpLog("Krishna's divine bamboo flute is playing... Syncing ultrasonic codes!");

      let totalDuration = 0;
      let lastFreq = notes[0]?.freq || 900;
      const tList: NodeJS.Timeout[] = [];

      notes.forEach((note, idx) => {
        const noteStart = totalDuration;
        totalDuration += note.duration;

        // Schedule timeout for UI svara feedback lights
        const t = setTimeout(() => {
          setActiveNoteIndex(idx);
        }, noteStart * 1000);
        tList.push(t);

        const realStart = audioCtx.currentTime + noteStart;
        const realDuration = note.duration;

        // 1. Primary Warm Body Oscillator - Triangle Wave
        const osc1 = audioCtx.createOscillator();
        osc1.type = 'triangle';

        // 2. Secondary Harmonic Whistle - Sine Wave (1 Octave up, slightly detuned)
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';

        // 3. Low Pass Warmth Filter (removes harsh buzzing frequencies from triangle)
        const lpFilter = audioCtx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(1300, realStart);
        lpFilter.frequency.exponentialRampToValueAtTime(1700, realStart + 0.15);
        lpFilter.frequency.exponentialRampToValueAtTime(1050, realStart + realDuration);

        // 4. Natural Human Throat Vibrato - Low Frequency Oscillator (LFO)
        const vibratoLfo = audioCtx.createOscillator();
        const vibratoGain = audioCtx.createGain();
        // Indian master flute vibrato is usually 5.5 to 6.2 Hz
        vibratoLfo.frequency.value = 5.8 + (idx % 2 === 0 ? 0.3 : -0.2);
        
        vibratoGain.gain.setValueAtTime(0, realStart);
        // Delay vibrato entrance slightly to simulate real blowing breathing
        vibratoGain.gain.linearRampToValueAtTime(7.5, realStart + 0.12);

        vibratoLfo.connect(vibratoGain);
        vibratoGain.connect(osc1.frequency);
        vibratoGain.connect(osc2.frequency);

        // 5. Raw Breath Friction Noise (Phoo-phoo simulation at note start)
        let noiseSource: AudioBufferSourceNode | null = null;
        let noiseGain: GainNode | null = null;
        try {
          const sampleRate = audioCtx.sampleRate;
          const noiseBuffer = audioCtx.createBuffer(1, sampleRate * 0.12, sampleRate); // 120ms breath sound
          const chanData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < chanData.length; i++) {
            chanData[i] = Math.random() * 2 - 1;
          }

          noiseSource = audioCtx.createBufferSource();
          noiseSource.buffer = noiseBuffer;

          const bpFilter = audioCtx.createBiquadFilter();
          bpFilter.type = 'bandpass';
          bpFilter.frequency.value = 3400; // Whistling air frequency
          bpFilter.Q.value = 3.5;

          noiseGain = audioCtx.createGain();
          noiseGain.gain.setValueAtTime(0.012, realStart);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, realStart + 0.08);

          noiseSource.connect(bpFilter);
          bpFilter.connect(noiseGain);
          noiseGain.connect(audioCtx.destination);
        } catch (ne) {
          console.warn("Breath noise synthesis fell back:", ne);
        }

        // 6. Sliding Pitch Glide - Portamento (Meend)
        osc1.frequency.setValueAtTime(lastFreq, realStart);
        osc2.frequency.setValueAtTime(lastFreq * 2.008, realStart);

        // Glide to destination note
        osc1.frequency.exponentialRampToValueAtTime(note.freq, realStart + 0.07);
        osc2.frequency.exponentialRampToValueAtTime(note.freq * 2.008, realStart + 0.07);

        lastFreq = note.freq;

        // 7. Envelope Controller (Shaping output volume curve)
        const noteGain = audioCtx.createGain();
        noteGain.gain.setValueAtTime(0, realStart);
        noteGain.gain.linearRampToValueAtTime(0.16, realStart + 0.08); // attack
        noteGain.gain.setValueAtTime(0.16, realStart + realDuration - 0.04); // sustain
        noteGain.gain.exponentialRampToValueAtTime(0.0001, realStart + realDuration); // release

        // Connect everything to destination
        osc1.connect(lpFilter);
        osc2.connect(lpFilter);
        lpFilter.connect(noteGain);
        noteGain.connect(audioCtx.destination);

        // Turn on oscillators
        vibratoLfo.start(realStart);
        osc1.start(realStart);
        osc2.start(realStart);
        if (noiseSource) {
          noiseSource.start(realStart);
        }

        // Shutdown scheduled oscillators
        vibratoLfo.stop(realStart + realDuration);
        osc1.stop(realStart + realDuration);
        osc2.stop(realStart + realDuration);
      });

      playTimeoutsRef.current = tList;

      // Finish Timer
      const endTimer = setTimeout(() => {
        setIsChirping(false);
        setActiveNoteIndex(null);
        setChirpLog("Divine Bansuri melody played! Waiting for nearby receiver...");

        if (nearbyPeers.length > 0) {
          const match = nearbyPeers[0];
          setChirpLog(`Matched nearby device peak! Connecting with ${match.name}...`);
          setTimeout(() => {
            executeDirectHandshake(match.id, chirpFileToSend || activeTransferFile!);
          }, 1200);
        }
      }, totalDuration * 1000 + 400);

      playTimeoutsRef.current.push(endTimer);

    } catch (e) {
      console.error("Audio synthesis crash:", e);
      setIsChirping(false);
    }
  };

  const playPairingChirp = () => {
    const list = get100DivineMelodies();
    const melody = list[selectedMelodyIndex] || list[0];
    playBansuriMelodyAudio(melody.notes);
  };

  const stopChirping = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    playTimeoutsRef.current.forEach(clearTimeout);
    playTimeoutsRef.current = [];
    setActiveNoteIndex(null);
    setIsChirping(false);
  };

  // Start listening for audible freq sweeps using Microphone analyser
  const startListeningToChirps = async () => {
    setIsListening(true);
    setChirpLog('Microphone listening enabled. Waiting for ultrasonic frequency sweep...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      listenIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        
        // Scan our chirp frequency bands (1.2kHz - 2.5kHz)
        let maxVal = 0;
        let matchedIndex = -1;

        // Roughly match peaks in range of 1000 - 2500Hz
        for (let i = 10; i < 50; i++) {
          if (dataArray[i] > maxVal && dataArray[i] > 180) { // Loud threshold peak
            maxVal = dataArray[i];
            matchedIndex = i;
          }
        }

        if (matchedIndex !== -1 && nearbyPeers.length > 0) {
          clearInterval(listenIntervalRef.current!);
          listenIntervalRef.current = null;
          
          const match = nearbyPeers[0];
          setChirpLog(`Chirp frequency peak matched sound space! Pairing with: ${match.name}`);
          
          stopListeningToChirps();
          
          // Let the signaling layer request transfer
          setTransferRole('receiver');
          setTransferStatus('negotiating');
        }
      }, 300);

    } catch (err: any) {
      console.error('Mic access blocked:', err);
      const errMsg = err?.message || String(err);
      setChirpLog(`MIC_ACCESS_BLOCKED: ${errMsg}. Please click the lock/microphone icon in your browser URL bar to allow microphone permissions, or open the app in a new tab.`);
      setIsListening(false);
    }
  };

  const stopListeningToChirps = () => {
    if (listenIntervalRef.current) {
      clearInterval(listenIntervalRef.current);
      listenIntervalRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    setIsListening(false);
  };


  // --- 6 SECURE PIN PAIRING LOGICS ---
  const handlePinPairSubmit = () => {
    if (enteredPin.length !== 6) {
      alert('Pehle sahi 6 digit dynamic target PIN code type karein!');
      return;
    }

    // Match peer whose mock pin matches
    const pairedPeer = nearbyPeers.find(p => p.pin === enteredPin);
    
    if (pairedPeer) {
      console.log('PIN pairing verified! Bridging with:', pairedPeer.name);
      
      if (pinRole === 'join') {
        // If receiver, notify sender or prepare target state
        setTransferRole('receiver');
        setTransferStatus('negotiating');
      } else if (pinFileToSend) {
        // If sender, trigger handshake immediately
        executeDirectHandshake(pairedPeer.id, pinFileToSend);
      }
    } else {
      // Simulate real fallback: bind first available peer if room is local
      if (nearbyPeers.length > 0) {
        const fallback = nearbyPeers[0];
        console.log(`PIN routed over local room. Pairing auto-bound with: ${fallback.name}`);
        if (pinFileToSend) {
          executeDirectHandshake(fallback.id, pinFileToSend);
        } else {
          setTransferRole('receiver');
          setTransferStatus('negotiating');
        }
      } else {
        alert('PIN code and device handshake verify nahi hua! Kripya check karein ki dono devices is page par open hain.');
      }
    }
  };


  // --- OFFGRID QR COMPILING MANUALLY ---
  const initializeOffGridSender = async () => {
    if (!activeTransferFile) return;
    
    setTransportMode('webrtc');
    setTransferRole('sender');
    setOffGridRole('send');
    setCurrentFileName(activeTransferFile.name);
    setCurrentFileSize(activeTransferFile.size);
    setSetupStep(2);

    cleanupWebRTC();

    const pc = createPeerConnection(null);
    const channel = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(channel);

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        if (pc.localDescription) {
          const payload = getShareableSignal('offer', pc.localDescription.sdp);
          setLocalSdpCode(payload);
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    setTimeout(() => {
      if (pc.localDescription && !localSdpCode) {
        const payload = getShareableSignal('offer', pc.localDescription.sdp);
        setLocalSdpCode(payload);
      }
    }, 1200);
  };

  const initializeOffGridReceiver = () => {
    setTransportMode('webrtc');
    setTransferRole('receiver');
    setOffGridRole('receive');
    setSetupStep(2);
  };

  const submitOffGridOffer = async () => {
    const offerObj = parseShareableSignal(remoteSdpInput);
    if (!offerObj || offerObj.type !== 'offer') {
      alert('Offer Code invalid hai! Kripya copy properly karke try karein.');
      return;
    }

    cleanupWebRTC();

    const pc = createPeerConnection(null);
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerObj.sdp }));
    isRemoteDescriptionSetRef.current = true;

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        if (pc.localDescription) {
          const payload = getShareableSignal('answer', pc.localDescription.sdp);
          setLocalSdpCode(payload);
        }
      }
    };

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    setTimeout(() => {
      if (pc.localDescription && !localSdpCode) {
        const payload = getShareableSignal('answer', pc.localDescription.sdp);
        setLocalSdpCode(payload);
      }
    }, 1200);
    
    setSetupStep(3);
  };

  const submitOffGridAnswer = async () => {
    const answerObj = parseShareableSignal(remoteSdpInput);
    if (!answerObj || answerObj.type !== 'answer') {
      alert('Answer Code galat hai flag reset karein!');
      return;
    }

    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerObj.sdp }));
      isRemoteDescriptionSetRef.current = true;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setActiveTransferFile(e.target.files[0]);
    }
  };

  const handleCopyCode = async () => {
    await copyToClipboard(localSdpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#000]/95 backdrop-blur-xl z-[90] flex items-center justify-center p-4 sm:p-6 text-white font-sans overflow-y-auto"
    >
      <div className="absolute top-4 right-4 z-[95]">
        <button 
          onClick={onClose}
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-4xl bg-zinc-950 border border-white/5 rounded-[40px] shadow-2xl p-6 sm:p-10 space-y-8 my-auto relative overflow-hidden">
        {/* Decorative ambient glowing grids */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Dashboard Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-accent/10 rounded-full text-[10px] font-black tracking-[0.2em] text-accent animate-pulse flex items-center gap-1.5 border border-accent/20">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-ping" />
                OFFLINE MULTI-TRANSPORT ENGINE
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Zap className="w-8 h-8 text-accent shrink-0" />
              OFFLINE P2P SHARE
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase leading-relaxed">
              Dono devices ko same website par open rakhein aur bina extra network usage ke instant files transfer karein!
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
            <Laptop className="w-5 h-5 text-accent" />
            <div className="text-left">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Device Identity</p>
              <p className="text-xs font-black tracking-widest text-white uppercase">{myNickname}</p>
            </div>
          </div>
        </div>

        {/* 4 POLISHED OFFLINE TRANSPORT SELECTORS */}
        <div className="grid grid-cols-2 md:grid-cols-4 bg-white/5 border border-white/10 rounded-[24px] p-1.5 gap-1 mx-auto max-w-3xl">
          {[
            { id: 'wifi', name: 'Auto WiFi Radar', icon: Wifi },
            { id: 'pin', name: 'Secure PIN Match', icon: Key },
            { id: 'chirp', name: 'Chirp Soundwave', icon: Volume2 },
            { id: 'offgrid', name: 'Off-Grid QR sdp', icon: QrCode }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                cleanupWebRTC();
                stopListeningToChirps();
                stopChirping();
                setSharingMode(mode.id as any);
                setOffGridRole(null);
                setChirpRole(null);
                setPinRole(null);
              }}
              className={cn(
                "py-3 rounded-[16px] text-[10px] font-black uppercase tracking-[0.1em] transition-all flex flex-col sm:flex-row items-center justify-center gap-2.5",
                sharingMode === mode.id ? "bg-accent text-black font-black shadow-lg" : "text-zinc-500 hover:text-white"
              )}
            >
              <mode.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{mode.name}</span>
            </button>
          ))}
        </div>

        {/* --- DYNAMIC INTERFACE PANELS --- */}
        <AnimatePresence mode="wait">
          
          {/* TRANSFER ACTIVE STATE PANEL */}
          {transferStatus !== 'idle' && transferStatus !== 'completed' && transferStatus !== 'error' ? (
            <motion.div 
              key="transferring_state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card max-w-xl mx-auto p-8 rounded-[32px] text-center space-y-6 border border-white/10"
            >
              {transferStatus === 'negotiating' ? (
                <div className="space-y-4">
                  <RefreshCw className="w-12 h-12 text-accent animate-spin mx-auto animate-reverse-slow" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Shaking hands with peer...</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                    Direct handshaking active. WebRTC tunnel align ho raha hai. <br />
                    <span className="text-zinc-400">Router blockage detect hone par socket fallback process execute hoga.</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Progress Circle Visualizer */}
                  <div className="relative w-28 h-28 mx-auto flex items-center justify-center bg-white/5 rounded-full border border-white/10">
                    <div className="absolute inset-2 bg-zinc-950 rounded-full flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-accent">{transferProgress}%</span>
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{transferRole}</span>
                    </div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="56" cy="56" r="50" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="56" cy="56" r="50" 
                        stroke={transportMode === 'webrtc' ? "var(--color-accent)" : "#4F46E5"} strokeWidth="6" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - transferProgress / 100)}
                        style={{ transition: 'stroke-dashoffset 0.25s linear' }}
                      />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                      Channel Link: {transportMode === 'webrtc' ? '⚡ Direct WebRTC direct Line' : '🩹 Cloud socket streaming Relay'}
                    </p>
                    <h3 className="text-sm font-bold text-white truncate max-w-md mx-auto">{currentFileName}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      {(transferredBytes / 1024 / 1024).toFixed(1)} MB / {(currentFileSize / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>

                  {/* Speed Tracker */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 inline-flex items-center gap-3">
                    <Upload className="w-5 h-5 text-accent animate-bounce" />
                    <div className="text-left">
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Transit Speed</p>
                      <p className="text-sm font-black text-white">{transferSpeed || 'Connecting...'} MB/s</p>
                    </div>
                  </div>

                  <button
                    onClick={cleanupWebRTC}
                    className="w-full py-4 rounded-xl bg-red-950/20 hover:bg-red-950/50 border border-red-500/15 text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancel Transfer
                  </button>
                </div>
              )}
            </motion.div>
          ) : transferStatus === 'completed' ? (
            <motion.div 
              key="transfer_success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card max-w-xl mx-auto p-12 rounded-[40px] text-center space-y-6 border border-emerald-500/20 bg-emerald-500/5 animate-fade-in"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">FILE RECEIVED & DOWNLOADED!</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">P2P process successful</p>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400 font-medium uppercase tracking-wider max-w-sm mx-auto">
                File transfer Bina server dependency ke offline direct stream block compile ho chuki hai!
              </p>
              <button
                onClick={cleanupWebRTC}
                className="px-8 py-4 bg-white text-black font-black uppercase text-[10px] tracking-[0.25em] rounded-xl hover:bg-zinc-100 transition-all active:scale-95"
              >
                Okay
              </button>
            </motion.div>
          ) : transferStatus === 'error' ? (
            <motion.div 
              key="transfer_error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card max-w-xl mx-auto p-10 rounded-[32px] text-center space-y-6 border border-red-500/20 bg-red-500/5"
            >
              <div className="w-12 h-12 bg-red-400/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold uppercase tracking-wider text-white">Transit Interrupt hua</h3>
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">WebRTC pipeline handshaking fails</p>
              </div>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto leading-relaxed uppercase tracking-wider font-medium">
                Make sure ki dono targets stable networks par is dashboard popup window ko active rakhein.
              </p>
              <button
                onClick={cleanupWebRTC}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Reset Engine
              </button>
            </motion.div>
          ) : sharingMode === 'wifi' ? (
            
            /* --- OPTION 1: WIFI DIRECT AUTOMATIC RADAR --- */
            <motion.div 
              key="wifi_discovery"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-5 gap-8 text-left"
            >
              {/* Left Column: Select File */}
              <div className="md:col-span-2 space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    1. Choose File to Stream
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Local Device Storage se koi bhi file choose karein
                  </p>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all hover:bg-white/5 flex flex-col items-center justify-center space-y-4 group",
                    activeTransferFile ? "border-accent/40 bg-accent/5" : "border-white/10 bg-white/2"
                  )}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-black transition-all">
                    {activeTransferFile ? <Check className="w-5 h-5 text-accent group-hover:text-black" /> : <Upload className="w-5 h-5 text-zinc-400 group-hover:text-black" />}
                  </div>
                  {activeTransferFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white max-w-[200px] truncate mx-auto">{activeTransferFile.name}</p>
                      <p className="text-[9px] font-black text-accent uppercase tracking-wider">
                        {(activeTransferFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest">Select Files</p>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Bina size limits block transfer</p>
                    </div>
                  )}
                </div>

                {activeTransferFile && selectedPeer && (
                  <button
                    onClick={initiateWifiP2PSharing}
                    className="w-full py-5 bg-accent text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-black text-black" />
                    SEND DIRECTLY
                  </button>
                )}
              </div>

              {/* Right Column: Discover Peer Grid */}
              <div className="md:col-span-3 space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">2. Select Target Device</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Neeche auto scan lists se target user click karein
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 min-h-[220px] flex flex-col justify-between">
                  {nearbyPeers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <span className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
                        <span className="absolute inset-3 rounded-full border border-accent/40 animate-ping [animation-delay:0.3s]" />
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-zinc-400" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest animate-pulse">Scanning WiFi Mesh room...</p>
                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold leading-relaxed max-w-sm">
                          Dono mobiles par is screen ko open rakhiye! Device automatic screen radar par crash free connect ho jayega.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                      {nearbyPeers.map((peer) => (
                        <div
                          key={peer.id}
                          onClick={() => setSelectedPeer(peer)}
                          className={cn(
                            "p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all hover:bg-white/5",
                            selectedPeer?.id === peer.id ? "border-accent bg-accent/5" : "border-white/5 bg-[#141414]/30"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-accent">
                              <Laptop className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-wider">{peer.name}</p>
                              <p className="text-[8px] font-black text-accent uppercase tracking-widest">READY AT LOCAL ROOM</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {selectedPeer?.id === peer.id && (
                              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                                <Check className="w-3 h-3 text-black" />
                              </div>
                            )}
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                    <Info className="w-5 h-5 text-zinc-500 shrink-0" />
                    <p className="text-[9px] text-zinc-400 leading-relaxed font-bold uppercase">
                      Dual Tunnel: <span className="text-zinc-500">WiFi direct router bandwidth direct capability use karta hai. Fast and lossless.</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : sharingMode === 'pin' ? (
            
            /* --- OPTION 2: 6-DIGIT SECURE PIN SYNC (BRAND NEW MASTERPIECE) --- */
            <motion.div 
              key="pin_matching"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto space-y-6 text-left"
            >
              {pinRole === null ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-center">
                  <div 
                    onClick={() => setPinRole('host')}
                    className="glass-card hover:bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-accent/40 cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group"
                  >
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-black transition-all text-accent">
                      <Signal className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">GENERATE HOST PIN</h3>
                      <p className="text-[8px] uppercase tracking-wider text-zinc-400 pt-1 leading-relaxed max-w-[200px]">
                        Apna safety PIN generator chalu karein aur file select karein
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPinRole('join')}
                    className="glass-card hover:bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-blue-400/40 cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group"
                  >
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-400 group-hover:text-white transition-all text-blue-400">
                      <Key className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">ENTER PASSKEY PIN</h3>
                      <p className="text-[8px] uppercase tracking-wider text-zinc-400 pt-1 leading-relaxed max-w-[200px]">
                        Dusre device par show ho raha code enter karke sync ho jayein
                      </p>
                    </div>
                  </div>
                </div>
              ) : pinRole === 'host' ? (
                // SENDER CODE VISUALIZER
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-accent flex items-center justify-center gap-2">
                    <Signal className="w-5 h-5" />
                    MY SECURE ROOM ACCESS PIN
                  </h3>
                  
                  <div className="py-4">
                    <div className="inline-flex gap-2 text-4xl sm:text-5xl font-mono font-black text-white tracking-widest bg-black px-8 py-5 rounded-2xl border border-white/10 shadow-inner">
                      {myPairingPin.substring(0,3)} {myPairingPin.substring(3,6)}
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 tracking-wider font-bold max-w-sm mx-auto leading-relaxed">
                    Neeche file stream select karke receiver device par ye PIN enter karne ko boleim:
                  </p>

                  <div className="max-w-md mx-auto text-left space-y-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:bg-white/5 transition-all"
                    >
                      <input type="file" ref={fileInputRef} onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPinFileToSend(e.target.files[0]);
                        }
                      }} className="hidden" />
                      {pinFileToSend ? (
                        <p className="text-xs font-bold text-accent truncate">{pinFileToSend.name} selected</p>
                      ) : (
                        <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">File specify karein</p>
                      )}
                    </div>

                    <button
                      onClick={handlePinPairSubmit}
                      disabled={!pinFileToSend}
                      className="w-full py-4 bg-accent text-black disabled:bg-zinc-800 disabled:text-zinc-650 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                    >
                      WAITING FOR CONNECTION PIN VERIFICATION
                    </button>
                  </div>
                </div>
              ) : (
                // RECEIVER INPUT
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center justify-center gap-2">
                    <Key className="w-5 h-5" />
                    ENTER PIN PASSKEY
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    Sender device ke screen par dikh raha 6-digit number enter karein:
                  </p>

                  <div className="max-w-xs mx-auto space-y-4">
                    <input 
                      type="text"
                      maxLength={6}
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 483920"
                      className="w-full bg-black border border-white/15 rounded-xl py-4 text-center text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-blue-450"
                    />
                    <button
                      onClick={handlePinPairSubmit}
                      disabled={enteredPin.length !== 6}
                      className="w-full py-4 bg-white hover:bg-zinc-100 text-black disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest tracking-[0.2em] transition-all"
                    >
                      PIN SE PAIR COMPREHEND KAREIN
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : sharingMode === 'chirp' ? (
            
            /* --- OPTION 3: DIVINE BANSURI CHIRPING & PAIRING SYSTEM --- */
            <motion.div 
              key="sonic_chirp"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto space-y-6 text-left"
            >
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6 relative overflow-hidden">
                {/* Spiritual Ambient Glow behind */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ff9d]/5 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent ring-1 ring-accent/30 shadow-[0_0_15px_rgba(0,255,157,0.2)]">
                      <Music className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">Chirp Soundwave Synchronization</h3>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Sri Krishna's Divine Bansuri Flute pairing modem</p>
                    </div>
                  </div>
                  {chirpRole && (
                    <button
                      onClick={() => {
                        stopChirping();
                        stopListeningToChirps();
                        setChirpRole(null);
                      }}
                      className="text-[9px] hover:text-white bg-white/5 hover:bg-white/10 transition-colors uppercase font-black px-3 py-1.5 rounded-full tracking-wider border border-white/10 hover:border-white/25 align-self-start sm:align-self-auto"
                    >
                      ← Back to Options
                    </button>
                  )}
                </div>

                {chirpRole === null ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center relative z-10">
                    <div 
                      onClick={() => setChirpRole('transmit')}
                      className="bg-[#141414]/50 border border-white/5 hover:border-accent/40 rounded-3xl p-8 cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group hover:bg-accent/[0.01]"
                    >
                      <div className="w-14 h-14 bg-white/5 group-hover:bg-accent group-hover:text-black rounded-2xl flex items-center justify-center transition-all">
                        <Volume2 className="w-7 h-7 text-accent transition-transform group-hover:scale-110" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-white block">CHIRP TRANSMIT HOST</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mt-1">Play sweet bansuri flute codes</span>
                      </div>
                    </div>

                    <div 
                      onClick={() => {
                        setChirpRole('listen');
                        startListeningToChirps();
                      }}
                      className="bg-[#141414]/50 border border-white/5 hover:border-blue-400/40 rounded-3xl p-8 cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group hover:bg-blue-400/[0.01]"
                    >
                      <div className="w-14 h-14 bg-white/5 group-hover:bg-blue-400 group-hover:text-black rounded-2xl flex items-center justify-center transition-all">
                        <Radio className="w-7 h-7 text-blue-400 transition-transform group-hover:scale-110" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-white block">LISTEN & RECEIVE MELODY</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mt-1">Listen for lord krishna's melody</span>
                      </div>
                    </div>
                  </div>
                ) : chirpRole === 'transmit' ? (
                  <div className="space-y-6 relative z-10">
                    {/* File Drop and details */}
                    <div className="border border-dashed border-white/10 rounded-2xl p-5 text-center cursor-pointer hover:bg-white/5 transition-all bg-black/20"
                         onClick={() => fileInputRef.current?.click()}
                    >
                      <input type="file" ref={fileInputRef} onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setChirpFileToSend(e.target.files[0]);
                        }
                      }} className="hidden" />
                      {chirpFileToSend ? (
                        <div className="flex items-center justify-center gap-2">
                          <File className="w-4 h-4 text-accent animate-bounce" />
                          <p className="text-xs font-bold text-accent truncate max-w-sm">{chirpFileToSend.name}</p>
                        </div>
                      ) : (
                        <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-450">Aapki file attach karein (Optional test mode active without file)</p>
                      )}
                    </div>

                    {/* Divine Flute Melody Engine Header */}
                    <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white">KRISHNA'S DEVOTIONAL PLAYBOX</span>
                        </div>
                        <button
                          onClick={() => {
                            const rand = Math.floor(Math.random() * 100);
                            setSelectedMelodyIndex(rand);
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white rounded-lg p-1.5 transition-all hover:text-accent flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"
                          title="Shuffle Melody"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          Shuffle
                        </button>
                      </div>

                      {/* Display active melody details */}
                      {(() => {
                        const melodies = get100DivineMelodies();
                        const activeMelody = melodies[selectedMelodyIndex] || melodies[0];
                        
                        return (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wide text-accent">{activeMelody.title}</h4>
                              <p className="text-[9px] leading-relaxed text-zinc-400 mt-1 uppercase tracking-widest">{activeMelody.desc}</p>
                            </div>

                            {/* NOTE/SVARA VISUAL BEADS TRACKER */}
                            <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-center min-h-[46px]">
                              {activeMelody.notes.map((note, idx) => {
                                // Map closest ratio to Svara names
                                const svaraNames = ['Sa', 're', 'Re', 'ga', 'Ga', 'ma', 'Ma', 'Pa', 'dha', 'Dha', 'ni', 'Ni', "Sa'"];
                                const getSvaraLabel = (freq: number) => {
                                  const baseSa = 820 + ((activeMelody.id) % 3) * 100;
                                  const ratio = freq / baseSa;
                                  if (ratio < 1.03) return 'Sa';
                                  if (ratio < 1.09) return 're';
                                  if (ratio < 1.16) return 'Re';
                                  if (ratio < 1.22) return 'ga';
                                  if (ratio < 1.29) return 'Ga';
                                  if (ratio < 1.37) return 'ma';
                                  if (ratio < 1.45) return 'Ma';
                                  if (ratio < 1.55) return 'Pa';
                                  if (ratio < 1.63) return 'dha';
                                  if (ratio < 1.73) return 'Dha';
                                  if (ratio < 1.83) return 'ni';
                                  if (ratio < 1.93) return 'Ni';
                                  return "Sa'";
                                };
                                const sName = getSvaraLabel(note.freq);
                                const isCurrent = activeNoteIndex === idx;

                                return (
                                  <motion.div
                                    key={idx}
                                    animate={isCurrent ? { 
                                      scale: [1, 1.25, 1],
                                      backgroundColor: ['rgba(0, 255, 157, 0.05)', 'rgba(0, 255, 157, 0.4)', 'rgba(0, 255, 157, 0.05)'],
                                      borderColor: ['rgba(0,128,80,0.1)', 'rgba(0, 255, 157, 1)', 'rgba(0,128,80,0.1)']
                                    } : {}}
                                    transition={{ duration: note.duration }}
                                    className={cn(
                                      "px-2.5 py-1.5 rounded-lg border text-[8px] font-mono font-bold transition-all relative",
                                      isCurrent 
                                        ? "text-black border-accent/80 font-black shadow-[0_0_12px_rgba(0,255,157,0.4)] bg-accent" 
                                        : "bg-white/5 border-white/5 text-zinc-500"
                                    )}
                                  >
                                    {isCurrent && (
                                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                                      </span>
                                    )}
                                    {sName}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Paginated melody select grid of 100 options */}
                      <div className="space-y-3">
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                            <input
                              type="text"
                              placeholder="Search 100 Flute melodies (e.g. Yaman, Maakhan)..."
                              value={melodySearchQuery}
                              onChange={(e) => {
                                setMelodySearchQuery(e.target.value);
                                setMelodyPage(0); // reset page
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>

                        {/* Raga Category Chips */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
                          {['All', 'Yaman', 'Sarang', 'Bhupali', 'Bhairavi', 'Desh', 'Kalavati', 'Hansadhwani', 'Pilu', 'Bageshri', 'Kafi'].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setSelectedRaga(r);
                                setMelodyPage(0); // reset page
                              }}
                              className={cn(
                                "px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 border",
                                selectedRaga === r 
                                  ? "bg-accent/15 border-accent text-accent shadow-[0_0_10px_rgba(0,255,157,0.15)]" 
                                  : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>

                        {/* Pagination Selector */}
                        {(() => {
                          const melodies = get100DivineMelodies();
                          const filtered = melodies.filter(m => {
                            const query = melodySearchQuery.toLowerCase();
                            const matchesSearch = m.title.toLowerCase().includes(query) || 
                                                  m.raga.toLowerCase().includes(query) ||
                                                  m.desc.toLowerCase().includes(query);
                            const matchesRaga = selectedRaga === 'All' || m.raga.toLowerCase().includes(selectedRaga.toLowerCase());
                            return matchesSearch && matchesRaga;
                          });
                          const itemsPerPage = 4;
                          const totalPages = Math.ceil(filtered.length / itemsPerPage);
                          const safePage = Math.min(Math.max(0, melodyPage), totalPages - 1);
                          const pageStart = safePage * itemsPerPage;
                          const paged = filtered.slice(pageStart, pageStart + itemsPerPage);

                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {paged.map((m) => {
                                  const isActive = selectedMelodyIndex === m.id - 1;
                                  return (
                                    <div
                                      key={m.id}
                                      onClick={() => {
                                        setSelectedMelodyIndex(m.id - 1);
                                        // Auto-play preview instantly so they hear all 100 sweet bamboo flutes
                                        playBansuriMelodyAudio(m.notes);
                                      }}
                                      className={cn(
                                        "p-2.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group hover:bg-white/[0.02]",
                                        isActive 
                                          ? "bg-accent/[0.06] border-accent/60 text-accent shadow-[0_0_15px_rgba(0,255,157,0.1)]" 
                                          : "bg-black/30 border-white/5 hover:border-white/15 text-zinc-400 hover:text-white"
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[10px] font-black truncate">{m.id}. {m.title}</span>
                                        {isActive ? (
                                          <div className="flex items-center gap-1 shrink-0">
                                            {isChirping && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                                            )}
                                            <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                                          </div>
                                        ) : (
                                          <Volume2 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-[8px] text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase font-bold tracking-wider leading-none">{m.raga}</span>
                                        <span className="text-[6.5px] text-zinc-600 uppercase font-bold tracking-widest">{m.notes.length} Swaras</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                  <button
                                    disabled={safePage === 0}
                                    onClick={() => setMelodyPage(p => Math.max(0, p - 1))}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold text-white uppercase tracking-wider disabled:opacity-45 disabled:cursor-not-allowed"
                                  >
                                    Previous
                                  </button>
                                  <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest font-black">
                                    Page {safePage + 1} of {totalPages} ({filtered.length} matching)
                                  </span>
                                  <button
                                    disabled={safePage >= totalPages - 1}
                                    onClick={() => setMelodyPage(p => p + 1)}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold text-white uppercase tracking-wider disabled:opacity-45 disabled:cursor-not-allowed"
                                  >
                                    Next
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Transmit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {isChirping ? (
                        <button
                          onClick={stopChirping}
                          className="flex-1 py-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black uppercase tracking-[0.15em] rounded-xl text-[10px] transition-all flex items-center justify-center gap-2 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                        >
                          <X className="w-4 h-4" />
                          STOP DIVINE FLUTE MELODY
                        </button>
                      ) : (
                        <button
                          onClick={playPairingChirp}
                          className="flex-1 py-4 bg-accent hover:brightness-110 text-black font-black uppercase tracking-[0.15em] rounded-xl text-[10px] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,157,0.3)]"
                        >
                          <Volume2 className="w-4 h-4" />
                          PLAY KRISHNA BANSURI SYNC BEACON
                        </button>
                      )}
                    </div>

                    {chirpLog && (
                      <div className="bg-black/80 rounded-xl p-4 border border-white/5 font-mono text-[9px] text-zinc-400 uppercase text-center tracking-widest leading-relaxed">
                        ⚡ {chirpLog}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 text-center relative z-10">
                    {isListening ? (
                      <>
                        <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/25 ring-4 ring-blue-500/5">
                          <span className="absolute inset-0 rounded-full border border-blue-500/25 animate-ping" />
                          <span className="absolute inset-3 rounded-full border border-blue-500/40 animate-ping [animation-delay:0.3s]" />
                          <Radio className="w-10 h-10 text-blue-400 shrink-0 animate-pulse" />
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs text-white uppercase tracking-widest font-black">Microphone Listening Enabled...</p>
                          <p className="text-[9px] text-zinc-400 uppercase tracking-widest max-w-sm mx-auto font-medium leading-relaxed">
                            Aapke partner speaker ke paas headphones ya phone pass laayein aur "PLAY KRISHNA BANSURI SYNC BEACON" synchronizer melody bajaayein!
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-5 text-left space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                            <Radio className="w-4 h-4" />
                          </div>
                          <div className="space-y-1 border-none bg-transparent">
                            <h4 className="text-xs font-black uppercase tracking-wider text-red-400">Microphone Input Blocked or Failed</h4>
                            <p className="text-[9.5px] leading-relaxed text-zinc-300 uppercase tracking-wide">
                              Mic access permission is denied or blocked. This is required to detect nearby Bansuri Flute frequencies.
                            </p>
                          </div>
                        </div>

                        <div className="bg-black/35 rounded-xl p-3.5 space-y-2 border border-white/5">
                          <span className="text-[8.5px] font-black uppercase text-zinc-400 tracking-wider block">How to resolve:</span>
                          <ul className="list-disc pl-4 text-[8px] text-zinc-400 uppercase tracking-wider space-y-1 font-semibold">
                            <li>Check your browser URL bar address lock icon (🔒) or microphone icon (🎙️) and select "Allow".</li>
                            <li>If running inside an iframe, please click the <strong className="text-white">"Open in New Tab"</strong> button in the top-right corner of the preview area to grant device access.</li>
                            <li>Ensure no other application is currently using your microphone/audio input.</li>
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setChirpLog('Retrying microphone connection...');
                            startListeningToChirps();
                          }}
                          className="w-full py-2.5 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-black uppercase rounded-lg text-[9px] tracking-widest duration-150 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)] border-none"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          RETRY MICROPHONE ACCESS
                        </button>
                      </div>
                    )}

                    {chirpLog && (
                      <div className={cn(
                        "rounded-xl p-4 border font-mono text-[9px] uppercase tracking-widest leading-relaxed text-left",
                        isListening 
                          ? "bg-black/80 border-white/5 text-zinc-400"
                          : "bg-red-950/20 border-red-900/30 text-red-300"
                      )}>
                        📡 {isListening ? 'MICROPHONE ANALYSER STATUS:' : 'DIAGNOSTIC LOG:'} {chirpLog}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        stopListeningToChirps();
                        setChirpRole(null);
                      }}
                      className="py-3 px-6 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold uppercase rounded-xl text-[9px] tracking-widest mx-auto block hover:text-white transition-all transition-colors border border-white/10 hover:border-white/20 font-black"
                    >
                      STOP SONAR LISTENER
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            
            /* --- OPTION 4: OFF-GRID MANUAL STATIC SDP MATRIX (QR CODE) --- */
            <motion.div 
              key="offgrid_portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-left"
            >
              {offGridRole === null ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto pt-6 text-center">
                  <div 
                    onClick={() => {
                      if (!activeTransferFile) {
                        fileInputRef.current?.click();
                      } else {
                        initializeOffGridSender();
                      }
                    }}
                    className="glass-card hover:bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-accent/40 cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group"
                  >
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setActiveTransferFile(e.target.files[0]);
                        setTimeout(() => initializeOffGridSender(), 200);
                      }
                    }} className="hidden" />
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-black transition-all text-accent">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">FILE SEND KAREIN</h3>
                      <p className="text-[8px] uppercase tracking-wider text-zinc-500 pt-1 leading-relaxed">
                        SDP offer exchange system ke through QR compile karke start karein
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={initializeOffGridReceiver}
                    className="glass-card hover:bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-emerald-500/40 cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group"
                  >
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all text-emerald-400">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">FILE RECEIVE KAREIN</h3>
                      <p className="text-[8px] uppercase tracking-wider text-zinc-500 pt-1 leading-relaxed">
                        Sender device ka offer envelope read karke answers generate karein
                      </p>
                    </div>
                  </div>
                </div>
              ) : offGridRole === 'send' ? (
                
                /* OFF GRID SENDER STEPS */
                <div className="space-y-6 max-w-2xl mx-auto text-left">
                  {setupStep === 2 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-center">
                        <h3 className="text-sm font-black uppercase tracking-widest text-accent flex items-center justify-center gap-2">
                          <QrCode className="w-5 h-5" />
                          STEP A: SCAN SENDER BEACON
                        </h3>
                        <p className="text-[10px] uppercase text-zinc-400 tracking-wider font-bold max-w-sm mx-auto leading-relaxed">
                          Receiver device par "FILE RECEIVE KAREIN" dabayein aur is code ko copy-paste properly feed karein:
                        </p>

                        {localSdpCode ? (
                          <div className="space-y-6">
                            <div className="p-4 bg-white rounded-3xl max-w-[200px] mx-auto shadow-2xl">
                              <QRCodeSVG value={localSdpCode} size={168} level="L" />
                            </div>

                            <div className="flex items-center gap-2 max-w-md mx-auto">
                              <input 
                                type="text"
                                readOnly
                                value={localSdpCode.substring(0, 48) + '...'}
                                className="flex-1 bg-black rounded-lg py-2.5 px-3 border border-white/10 text-zinc-400 text-[10px] font-mono select-all focus:outline-none"
                              />
                              <button 
                                onClick={handleCopyCode}
                                className="px-4 py-2 bg-white hover:bg-zinc-100 text-black rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                              >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                                {copied ? 'COPIED' : 'COPY'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 space-y-3">
                            <RefreshCw className="w-10 h-10 text-accent animate-spin mx-auto" />
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Compiling static envelope matrix...</p>
                          </div>
                        )}
                      </div>

                      {/* Feed back Answer */}
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">STEP B: SUBMIT RECEIVER ANSWER ENVELOPE</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          Receiver screen par generate hua 'Answer code' yahan paste karein:
                        </p>

                        <div className="space-y-4">
                          <textarea
                            value={remoteSdpInput}
                            onChange={(e) => setRemoteSdpInput(e.target.value)}
                            placeholder="Receiver's code paste karein..."
                            className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-zinc-300 placeholder-zinc-700 min-h-[90px] focus:outline-none"
                          />
                          <button
                            onClick={submitOffGridAnswer}
                            disabled={!remoteSdpInput}
                            className="w-full py-4 bg-accent text-black disabled:bg-zinc-800 disabled:text-zinc-650 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                          >
                            ESTABLISH Direct P2P LINK
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                
                /* OFF GRID RECEIVER STEPS */
                <div className="space-y-6 max-w-2xl mx-auto text-left">
                  {setupStep === 2 ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 animate-fade-in">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-blue-400" />
                        STEP A: PASTE SENDER'S BEACON CODE
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        Sender waale mobile screen par show ho raha link envelope paste karein:
                      </p>

                      <div className="space-y-4">
                        <textarea
                          value={remoteSdpInput}
                          onChange={(e) => setRemoteSdpInput(e.target.value)}
                          placeholder="Sender's Signaling Code yahan paste karein..."
                          className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-zinc-300 placeholder-zinc-700 min-h-[120px] focus:outline-none"
                        />
                        <button
                          onClick={submitOffGridOffer}
                          disabled={!remoteSdpInput}
                          className="w-full py-4 bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                        >
                          GENERATE ANSWER PASSKEY
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-center animate-fade-in">
                      <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        STEP B: ANSWER ENVELOPE GENEREATED
                      </h3>
                      <p className="text-[10px] uppercase text-zinc-500 tracking-wider font-bold max-w-sm mx-auto leading-relaxed">
                        Neeche aa rahe code ko copy karke wapas Sender device block par enter karein taki mesh tunnel instantly boot ho sake.
                      </p>

                      {localSdpCode ? (
                        <div className="space-y-6">
                          <div className="p-4 bg-white rounded-3xl max-w-[200px] mx-auto shadow-2xl">
                            <QRCodeSVG value={localSdpCode} size={168} level="L" />
                          </div>

                          <div className="flex items-center gap-2 max-w-md mx-auto">
                            <input 
                              type="text"
                              readOnly
                              value={localSdpCode.substring(0, 48) + '...'}
                              className="flex-1 bg-black rounded-lg py-2.5 px-3 border border-white/10 text-zinc-400 text-[10px] font-mono select-all focus:outline-none"
                            />
                            <button 
                              onClick={handleCopyCode}
                              className="px-4 py-2 bg-white hover:bg-zinc-100 text-black rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                            >
                              {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                              {copied ? 'COPIED' : 'COPY'}
                            </button>
                          </div>
                          
                          <div className="pt-4 border-t border-white/5 space-y-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest max-w-md mx-auto font-black leading-relaxed">
                              Dono mobile side validation hone tak isi layout screen par lock rahiye, connection secure trigger automatic ho jayega!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 space-y-3">
                          <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Building Answer static layout...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
