"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSip } from "@/lib/sip/use-sip";
import {
  CallSummaryField,
  CallTranscriptSegment,
  extractCallSummaryFromTranscript,
  generateConversationSegments,
  SUMMARY_FIELD_LABELS
} from "@/lib/sip/call-summarizer";
import { 
  Phone, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneOff, 
  Sparkles, 
  Clock, 
  Ticket, 
  Settings, 
  Mic, 
  MicOff, 
  Pause, 
  Play,
  RotateCcw,
  Volume2,
  FileText,
  Download,
  Upload,
  Copy,
  Edit3,
  Check,
  X,
  Search,
  Trash2,
  Send
} from "lucide-react";
import styles from "../booking/page.module.css"; 
import callStyles from "./calls.module.css";
import toast from "react-hot-toast";

interface DbCallRecord {
  id: string;
  callerNumber: string;
  customerName: string;
  direction: 'inbound' | 'outbound';
  startedAt: string;
  endedAt: string | null;
  duration: number;
  status: 'COMPLETED' | 'MISSED';
  bookingId?: string | null;
  bookingCode?: string | null;
  recordingStatus: string;
  transcriptStatus: string;
  audioUrl: string | null;
  summaryText: string;
  segments: CallTranscriptSegment[];
  summaryFields: CallSummaryField[];
}

export default function CallsPage() {
  const { 
    connectionStatus, 
    callState, 
    currentCall, 
    liveTranscript,
    liveSummary,
    makeCall, 
    answerCall, 
    hangupCall, 
    rejectCall, 
    toggleMute, 
    toggleHold, 
    simulateIncomingCall,
    addLiveTranscriptLine,
    config 
  } = useSip();

  const router = useRouter();
  const [dbCalls, setDbCalls] = useState<DbCallRecord[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingDemo, setCreatingDemo] = useState(false);

  // Live form state synced with liveSummary
  const [extractedData, setExtractedData] = useState({
    name: "",
    phone: "",
    route: "Chu Lai → Đà Nẵng",
    time: "15:00",
    pickup: "",
    dropoff: "",
    pax: 1,
    notes: ""
  });

  // Live manual / voice speech input during call
  const [manualSpeaker, setManualSpeaker] = useState<'CUSTOMER' | 'AGENT'>('CUSTOMER');
  const [manualText, setManualText] = useState("");
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Inline quick audio player state (for table rows)
  const [inlinePlayingId, setInlinePlayingId] = useState<string | null>(null);
  const inlineAudioRef = useRef<HTMLAudioElement | null>(null);

  // Selected call for Detailed Recording & Summary Modal
  const [selectedCall, setSelectedCall] = useState<DbCallRecord | null>(null);
  const [modalPlaying, setModalPlaying] = useState(false);
  const [modalCurrentTime, setModalCurrentTime] = useState(0);
  const [modalDuration, setModalDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const modalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Editing summary inside modal
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editSummaryText, setEditSummaryText] = useState("");
  const [editSummaryFields, setEditSummaryFields] = useState<CallSummaryField[]>([]);
  const [savingSummary, setSavingSummary] = useState(false);

  // Upload audio input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadCalls = async () => {
    try {
      const res = await fetch('/api/calls');
      if (res.ok) {
        const data = await res.json();
        const list: DbCallRecord[] = data.calls || [];
        setDbCalls(list);
        if (selectedCall) {
          const updated = list.find(item => item.id === selectedCall.id);
          if (updated) setSelectedCall(updated);
        }
      }
    } catch (e) {
      console.warn('Failed to load call history', e);
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [callState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscript]);

  // Sync liveSummary to right-hand form
  useEffect(() => {
    if (liveSummary) {
      setExtractedData({
        name: liveSummary.extractedForm.name,
        phone: liveSummary.extractedForm.phone,
        route: liveSummary.extractedForm.route,
        time: liveSummary.extractedForm.time,
        pickup: liveSummary.extractedForm.pickup,
        dropoff: liveSummary.extractedForm.dropoff,
        pax: liveSummary.extractedForm.pax,
        notes: liveSummary.extractedForm.notes
      });
    } else if (currentCall) {
      setExtractedData(prev => ({
        ...prev,
        phone: currentCall.phoneNumber,
        name: currentCall.customer?.name || prev.name,
        pickup: currentCall.customer?.lastPickupLocation || prev.pickup
      }));
    }
  }, [liveSummary, currentCall]);

  // Format mm:ss
  const formatDuration = (seconds: number) => {
    const sec = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start simulated call and auto-answer so user sees live recording & transcript immediately
  const startSimulationCall = () => {
    simulateIncomingCall('0912345678', 'Nguyễn Văn Hùng');
    toast.success('Đang mô phỏng cuộc gọi đến và tự động ghi âm...');
    setTimeout(() => {
      answerCall();
    }, 900);
  };

  // Instant 1-click create sample recorded call in DB
  const createInstantSampleRecordedCall = async () => {
    setCreatingDemo(true);
    try {
      const sampleCallers = [
        { phone: '0912345678', name: 'Nguyễn Văn Hùng' },
        { phone: '0987654321', name: 'Trần Thị Mai' },
        { phone: '0905112233', name: 'Lê Hoàng Nam' },
        { phone: '0868999888', name: 'Phạm Minh Tuấn' }
      ];
      const pick = sampleCallers[dbCalls.length % sampleCallers.length];
      const segments = generateConversationSegments(pick.phone, pick.name);
      const report = extractCallSummaryFromTranscript(segments, pick.phone, pick.name);

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerNumber: pick.phone,
          direction: 'inbound',
          duration: 18,
          startedAt: new Date().toISOString(),
          customerName: pick.name,
          summaryText: report.summaryText,
          segments: report.segments,
          summaryFields: report.fields
        })
      });

      if (res.ok) {
        toast.success(`Đã lưu ghi âm & tạo bảng tóm tắt cho khách ${pick.name}!`);
        await loadCalls();
      } else {
        toast.error('Không thể tạo bản ghi âm mẫu');
      }
    } catch (e) {
      toast.error('Lỗi khi tạo bản ghi âm mẫu');
    } finally {
      setCreatingDemo(false);
    }
  };

  // Toggle Web Speech API live microphone speech-to-text (Vietnamese)
  const toggleLiveSpeechRecognition = () => {
    if (isSpeechListening) {
      recognitionRef.current?.stop();
      setIsSpeechListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Trình duyệt này không hỗ trợ Web Speech API. Bạn có thể nhập câu thoại bên dưới.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last && last[0]?.transcript) {
        addLiveTranscriptLine(manualSpeaker, last[0].transcript);
      }
    };

    recognition.onerror = () => {
      setIsSpeechListening(false);
    };

    recognition.onend = () => {
      setIsSpeechListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsSpeechListening(true);
    toast.success('Đang thu âm giọng nói tiếng Việt trực tiếp từ Micro...');
  };

  const handleAddManualLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    addLiveTranscriptLine(manualSpeaker, manualText.trim());
    setManualText("");
  };

  // Inline table play/pause
  const toggleInlinePlay = (call: DbCallRecord) => {
    if (!call.audioUrl) {
      toast.error('Cuộc gọi này không có file ghi âm');
      return;
    }

    if (inlinePlayingId === call.id && inlineAudioRef.current) {
      inlineAudioRef.current.pause();
      setInlinePlayingId(null);
      return;
    }

    if (inlineAudioRef.current) {
      inlineAudioRef.current.pause();
    }

    const audio = new Audio(call.audioUrl);
    inlineAudioRef.current = audio;
    setInlinePlayingId(call.id);

    audio.onended = () => {
      setInlinePlayingId(null);
    };
    audio.onerror = () => {
      setInlinePlayingId(null);
      toast.error('Không thể phát file âm thanh');
    };
    audio.play().catch(() => {
      setInlinePlayingId(null);
    });
  };

  // Open detail modal for a call
  const openCallDetailModal = (call: DbCallRecord) => {
    if (inlineAudioRef.current) {
      inlineAudioRef.current.pause();
      setInlinePlayingId(null);
    }
    setSelectedCall(call);
    setEditSummaryText(call.summaryText || "");
    setEditSummaryFields(
      call.summaryFields && call.summaryFields.length > 0
        ? call.summaryFields.map(f => ({ ...f }))
        : []
    );
    setIsEditingSummary(false);
    setModalPlaying(false);
    setModalCurrentTime(0);
    setModalDuration(call.duration || 15);
  };

  const closeCallDetailModal = () => {
    if (modalAudioRef.current) {
      modalAudioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setModalPlaying(false);
    setSelectedCall(null);
  };

  const toggleModalAudio = () => {
    if (!modalAudioRef.current) return;
    if (modalPlaying) {
      modalAudioRef.current.pause();
      setModalPlaying(false);
    } else {
      modalAudioRef.current.play().then(() => {
        setModalPlaying(true);
      }).catch(() => {
        toast.error('Không thể phát âm thanh');
      });
    }
  };

  const seekModalAudio = (timeSec: number) => {
    if (!modalAudioRef.current) return;
    modalAudioRef.current.currentTime = Math.max(0, timeSec);
    setModalCurrentTime(timeSec);
    modalAudioRef.current.play().then(() => {
      setModalPlaying(true);
    }).catch(() => {});
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (modalAudioRef.current) {
      modalAudioRef.current.playbackRate = rate;
    }
  };

  // Browser Text-to-Speech (TTS) to read aloud the Vietnamese transcript or summary
  const speakTranscriptAloud = (call: DbCallRecord) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Trình duyệt không hỗ trợ đọc giọng nói tự động');
      return;
    }
    window.speechSynthesis.cancel();
    const textToRead =
      call.segments && call.segments.length > 0
        ? call.segments
            .map(s => `${s.speaker === 'AGENT' ? 'Tổng đài' : 'Khách'}: ${s.text}`)
            .join('. ')
        : call.summaryText;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
    toast.success('Đang đọc nội dung hội thoại bằng giọng nói...');
  };

  // Save edited summary table in modal
  const handleSaveSummaryEdits = async () => {
    if (!selectedCall) return;
    setSavingSummary(true);
    try {
      const res = await fetch(`/api/calls/${selectedCall.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryText: editSummaryText,
          summaryFields: editSummaryFields
        })
      });

      if (res.ok) {
        toast.success('Đã lưu bảng tóm tắt cuộc gọi!');
        setIsEditingSummary(false);
        await loadCalls();
      } else {
        toast.error('Không thể lưu bản tóm tắt');
      }
    } catch (e) {
      toast.error('Lỗi kết nối khi lưu tóm tắt');
    } finally {
      setSavingSummary(false);
    }
  };

  // Upload external audio recording file (.mp3, .wav, .m4a, .webm)
  const handleUploadNewRecording = async (e: React.ChangeEvent<HTMLInputElement>, targetCallId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File ghi âm tối đa 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      if (targetCallId) {
        // Attach to existing call
        const res = await fetch(`/api/calls/${targetCallId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioDataUrl: base64Audio })
        });
        if (res.ok) {
          toast.success('Đã cập nhật file ghi âm cho cuộc gọi!');
          await loadCalls();
        }
      } else {
        // Create a new call record from uploaded audio
        const res = await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callerNumber: extractedData.phone || '0912345678',
            direction: 'inbound',
            duration: 20,
            startedAt: new Date().toISOString(),
            customerName: extractedData.name || 'Khách gọi đặt vé',
            audioDataUrl: base64Audio
          })
        });
        if (res.ok) {
          toast.success('Đã tải file ghi âm lên và tự động tạo bảng tóm tắt văn bản!');
          await loadCalls();
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteCall = async (id: string) => {
    try {
      const res = await fetch(`/api/calls/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa bản ghi cuộc gọi');
        if (selectedCall?.id === id) closeCallDetailModal();
        await loadCalls();
      }
    } catch (e) {
      toast.error('Không thể xóa bản ghi');
    }
  };

  const copySummaryToClipboard = (call: DbCallRecord) => {
    const lines = [
      `📋 BẢNG TÓM TẮT CUỘC GỌI - NHÀ XE THANH THIỆN`,
      `• Thời gian: ${new Date(call.startedAt).toLocaleString('vi-VN')}`,
      `• Số điện thoại: ${call.callerNumber} (${call.customerName})`,
      `• Tóm tắt nhanh: ${call.summaryText}`,
      `--- Chi tiết trích xuất ---`,
      ...(call.summaryFields || []).map(f => `- ${f.label}: ${f.value}`)
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Đã sao chép bảng tóm tắt văn bản!');
  };

  const handleQuickBookingFromCall = (call: DbCallRecord) => {
    const getField = (key: CallSummaryField['field']) =>
      call.summaryFields?.find(f => f.field === key)?.value || '';

    const query = new URLSearchParams();
    query.set('phone', call.callerNumber);
    const nameVal = getField('customer_name') || call.customerName;
    if (nameVal && nameVal !== 'Khách vãng lai' && nameVal !== 'Khách hàng mới') {
      query.set('name', nameVal);
    }
    const routeVal = getField('route');
    if (routeVal) query.set('route', routeVal);
    const pickupVal = getField('pickup_location');
    if (pickupVal) query.set('pickup', pickupVal);
    const dropoffVal = getField('dropoff_location');
    if (dropoffVal) query.set('dropoff', dropoffVal);
    const notesVal = getField('notes');
    if (notesVal) query.set('notes', notesVal);

    router.push(`/booking?${query.toString()}`);
  };

  const handleQuickBookingFromLiveForm = () => {
    const query = new URLSearchParams();
    if (extractedData.phone) query.set('phone', extractedData.phone);
    if (extractedData.name && extractedData.name !== 'Khách hàng mới') query.set('name', extractedData.name);
    if (extractedData.route) query.set('route', extractedData.route);
    if (extractedData.pickup) query.set('pickup', extractedData.pickup);
    if (extractedData.dropoff) query.set('dropoff', extractedData.dropoff);
    if (extractedData.notes) query.set('notes', extractedData.notes);
    router.push(`/booking?${query.toString()}`);
  };

  const filteredCalls = dbCalls.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.callerNumber.toLowerCase().includes(q) ||
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.summaryText || '').toLowerCase().includes(q) ||
      (c.summaryFields || []).some(f => f.value.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.container}>
      {/* Hidden file input for uploading recordings */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => handleUploadNewRecording(e)}
      />

      {/* Header */}
      <header className={styles.header}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Hạ tầng Viettel SIP Trunking • Ghi Âm & AI Bóc Tách Văn Bản
          </span>
          <h1 className={styles.title}>Bàn Trực Tổng Đài, Ghi Âm & Bảng Tóm Tắt Cuộc Gọi</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Hotline: <strong>{config.hotline || '0867 75 79 75'}</strong> • Tự động lưu file ghi âm & chuyển thành bảng tóm tắt văn bản cho nhân viên đọc/nghe lại.
          </p>
        </div>

        <div className={styles.btnGroup} style={{ flexWrap: 'wrap' }}>
          <button 
            className={styles.btnSecondary} 
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Tải file ghi âm (.mp3, .wav, .m4a) từ máy lên để tạo bảng tóm tắt"
          >
            <Upload size={16} /> Tải file ghi âm lên
          </button>
          <button 
            className={styles.btnSecondary} 
            onClick={createInstantSampleRecordedCall}
            disabled={creatingDemo}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileText size={16} />
            {creatingDemo ? "Đang tạo..." : "Tạo bản ghi âm & tóm tắt mẫu"}
          </button>
          <button 
            className={styles.btnPrimary} 
            onClick={startSimulationCall} 
            disabled={callState !== 'idle'}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Sparkles size={16} />
            {callState !== 'idle' ? "Đang trong cuộc gọi..." : "Thử cuộc gọi & Ghi âm trực tiếp"}
          </button>
        </div>
      </header>

      {/* Live Call Controller Banner (if active) */}
      {currentCall && (
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.3)',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 52, 
              height: 52, 
              borderRadius: '50%', 
              background: '#ffffff', 
              color: '#0284c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <PhoneCall size={26} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>
                  {callState === 'incoming_ringing' ? '🔔 Cuộc gọi đến...' : 
                   callState === 'outgoing_calling' ? 'Đang quay số...' : '🔴 Đang ghi âm cuộc gọi & Chuyển văn bản'}
                </span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {currentCall.customer?.name ? `${currentCall.customer.name} (${currentCall.phoneNumber})` : currentCall.phoneNumber}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Thời lượng ghi âm: <strong>{formatDuration(currentCall.durationSeconds)}</strong> • Khi gác máy hệ thống sẽ tự động lưu file âm thanh & bảng tóm tắt.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {callState === 'incoming_ringing' ? (
              <>
                <button
                  type="button"
                  onClick={rejectCall}
                  style={{ padding: '10px 18px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={answerCall}
                  style={{ padding: '10px 20px', borderRadius: 10, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Bắt máy & Ghi âm
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{ padding: '10px 14px', borderRadius: 10, background: currentCall.isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {currentCall.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  <span>{currentCall.isMuted ? 'Mở Mic' : 'Tắt Mic'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleHold}
                  style={{ padding: '10px 14px', borderRadius: 10, background: currentCall.isHeld ? '#f59e0b' : 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {currentCall.isHeld ? <Play size={16} /> : <Pause size={16} />}
                  <span>{currentCall.isHeld ? 'Tiếp tục' : 'Giữ máy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => hangupCall()}
                  style={{ padding: '10px 18px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <PhoneOff size={16} />
                  <span>Gác máy & Lưu Ghi Âm</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Split Pane for Live Transcript & Live Structured Summary */}
      <div className={callStyles.splitPane} style={{ marginBottom: 32 }}>
        
        {/* Left Pane: Live Transcript & Voice Dictation */}
        <div className={callStyles.pane}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              Băng Ghi Âm Chuyển Thành Văn Bản (Live Transcript)
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentCall && (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.12)', padding: '4px 10px', borderRadius: 20 }}>
                  ● REC {formatDuration(currentCall.durationSeconds)}
                </span>
              )}
              <button
                type="button"
                onClick={toggleLiveSpeechRecognition}
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: isSpeechListening ? '#ef4444' : 'var(--bg-subtle)',
                  color: isSpeechListening ? '#fff' : 'var(--text-main)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Nhận diện giọng nói tiếng Việt trực tiếp qua Micro"
              >
                <Mic size={13} />
                {isSpeechListening ? 'Đang nghe Mic...' : 'Nhận diện giọng nói Mic'}
              </button>
            </div>
          </div>
          
          <div className={callStyles.chatBox}>
            {liveTranscript.length === 0 && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '50px', padding: '0 20px' }}>
                <PhoneCall size={32} style={{ opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Sẵn sàng tự động ghi âm & tách văn bản cuộc gọi</p>
                <small style={{ display: 'block', lineHeight: 1.5 }}>
                  Khi có cuộc gọi đến hoặc bấm <strong>&quot;Thử cuộc gọi &amp; Ghi âm trực tiếp&quot;</strong>, hệ thống sẽ thu âm toàn bộ cuộc trò chuyện và tự động lập <strong>Bảng Tóm Tắt Văn Bản</strong> bên phải.
                </small>
              </div>
            )}
            {liveTranscript.map((msg: CallTranscriptSegment, idx: number) => (
              <div key={idx} className={`${callStyles.message} ${msg.speaker === 'AGENT' ? callStyles.assistantMsg : callStyles.userMsg}`}>
                <span className={callStyles.sender}>
                  <span>{msg.speaker === 'AGENT' ? '🎧 Tổng đài viên' : '👤 Khách hàng'}</span>
                  <span style={{ opacity: 0.7 }}>[{formatDuration(msg.startTime)}]</span>
                </span>
                <p>{msg.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Manual / Live speech text input to append to transcript */}
          <form onSubmit={handleAddManualLine} style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
            <select
              value={manualSpeaker}
              onChange={(e) => setManualSpeaker(e.target.value as 'CUSTOMER' | 'AGENT')}
              className={styles.input}
              style={{ width: 135, padding: '8px 10px', fontSize: '0.82rem' }}
            >
              <option value="CUSTOMER">👤 Khách nói</option>
              <option value="AGENT">🎧 Tổng đài</option>
            </select>
            <input
              type="text"
              className={styles.input}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Nhập thêm câu hội thoại hoặc ghi chú nhanh..."
              style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
            />
            <button
              type="submit"
              className={styles.btnSecondary}
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}
            >
              <Send size={14} /> Thêm
            </button>
          </form>
        </div>

        {/* Right Pane: Live Text Summary Table & Quick Booking */}
        <div className={callStyles.pane}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 10px' }}>
            <span>Bảng Tóm Tắt Văn Bản & Đặt Vé Nhanh</span>
            {liveSummary && <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>⚡ Đã tóm tắt tự động</span>}
          </h2>

          {/* Executive Summary Box */}
          <div className={callStyles.summaryBox}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#0284c7', marginBottom: 4 }}>
              📄 Tóm tắt nội dung cuộc gọi:
            </div>
            <div>
              {liveSummary?.summaryText ||
                (extractedData.phone
                  ? `Khách hàng ${extractedData.name || 'mới'} (${extractedData.phone}) đặt ${extractedData.pax} vé tuyến ${extractedData.route} lúc ${extractedData.time}. Điểm đón: ${extractedData.pickup || 'Chưa rõ'}.`
                  : 'Chưa có dữ liệu tóm tắt. Hãy bắt đầu cuộc gọi hoặc chọn một bản ghi âm bên dưới để xem.')}
            </div>
          </div>
          
          <form className={styles.bookingForm} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tên khách hàng</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={extractedData.name} 
                  onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn Hùng" 
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Số điện thoại</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={extractedData.phone} 
                    onChange={(e) => setExtractedData({ ...extractedData, phone: e.target.value })}
                    placeholder="09xx xxx xxx" 
                  />
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => makeCall(extractedData.phone)}
                    disabled={!extractedData.phone}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px' }}
                    title="Gọi ngay số này"
                  >
                    <Phone size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tuyến hành trình</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={extractedData.route} 
                  onChange={(e) => setExtractedData({ ...extractedData, route: e.target.value })}
                  placeholder="Chu Lai → Đà Nẵng" 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Giờ đi</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={extractedData.time} 
                  onChange={(e) => setExtractedData({ ...extractedData, time: e.target.value })}
                  placeholder="15:00" 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Số vé</label>
                <input 
                  type="number" 
                  className={styles.input} 
                  value={extractedData.pax} 
                  onChange={(e) => setExtractedData({ ...extractedData, pax: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Điểm đón khách</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={extractedData.pickup} 
                  onChange={(e) => setExtractedData({ ...extractedData, pickup: e.target.value })}
                  placeholder="VD: Sân bay Chu Lai" 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Điểm trả khách</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={extractedData.dropoff} 
                  onChange={(e) => setExtractedData({ ...extractedData, dropoff: e.target.value })}
                  placeholder="VD: Bệnh viện Đà Nẵng" 
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Ghi chú / Yêu cầu trong cuộc gọi</label>
              <input 
                type="text" 
                className={styles.input} 
                value={extractedData.notes} 
                onChange={(e) => setExtractedData({ ...extractedData, notes: e.target.value })}
                placeholder="VD: Có 1 vali hành lý, gọi trước 15 phút" 
              />
            </div>

            <div className={styles.btnGroup} style={{ marginTop: 'auto', paddingTop: 8 }}>
              <button 
                type="button" 
                className={styles.btnPrimary} 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                disabled={!extractedData.phone}
                onClick={handleQuickBookingFromLiveForm}
              >
                <Ticket size={18} />
                <span>Chuyển Thông Tin Tóm Tắt Sang Đặt Vé</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Call Recordings & Text Summary Table Section */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Volume2 size={20} color="#0284c7" />
              <span>Kho Lưu Trữ Ghi Âm & Bảng Tóm Tắt Văn Bản Cuộc Gọi</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Nhân viên có thể bấm <strong>Nghe lại file ghi âm</strong> hoặc <strong>Xem bảng tóm tắt văn bản</strong> của từng cuộc gọi để kiểm tra và đặt vé.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className={styles.input}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm SĐT, tên khách, nội dung tóm tắt..."
                style={{ paddingLeft: 34, paddingRight: 12, paddingTop: 7, paddingBottom: 7, fontSize: '0.85rem' }}
              />
            </div>
            <button 
              type="button" 
              className={styles.btnSecondary} 
              onClick={loadCalls}
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RotateCcw size={14} /> Làm mới
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}>
                <th style={{ padding: '12px 14px', width: 155 }}>Thời gian</th>
                <th style={{ padding: '12px 14px', width: 170 }}>Khách hàng & SĐT</th>
                <th style={{ padding: '12px 14px', width: 165 }}>File Ghi Âm</th>
                <th style={{ padding: '12px 14px' }}>Bảng Tóm Tắt Văn Bản (AI Trích Xuất)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', width: 250 }}>Thao tác Nhân viên</th>
              </tr>
            </thead>
            <tbody>
              {loadingCalls ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách ghi âm & bản tóm tắt...
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Chưa có bản ghi âm cuộc gọi nào khớp tìm kiếm.</p>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={createInstantSampleRecordedCall}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Sparkles size={15} /> Tạo ngay 1 Bản Ghi Âm & Bảng Tóm Tắt mẫu để thử nghiệm
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((c) => {
                  const getField = (key: CallSummaryField['field']) =>
                    c.summaryFields?.find(f => f.field === key)?.value;
                  const routeBadge = getField('route');
                  const timeBadge = getField('departure_time');
                  const paxBadge = getField('passenger_count');
                  const pickupBadge = getField('pickup_location');
                  const isPlayingInline = inlinePlayingId === c.id;

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                      {/* Thời gian */}
                      <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {new Date(c.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div>{new Date(c.startedAt).toLocaleDateString('vi-VN')}</div>
                        <span style={{
                          display: 'inline-block',
                          marginTop: 4,
                          padding: '2px 7px',
                          borderRadius: 5,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: c.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                          color: c.status === 'COMPLETED' ? '#10b981' : '#ef4444'
                        }}>
                          {c.status === 'COMPLETED' ? 'Đã ghi âm' : 'Cuộc gọi nhỡ'}
                        </span>
                      </td>

                      {/* Khách hàng & SĐT */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 3 }}>
                          {c.customerName || 'Khách vãng lai'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0284c7', fontWeight: 600, fontSize: '0.84rem' }}>
                          {c.direction === 'outbound' ? (
                            <PhoneOutgoing size={13} color="#0284c7" />
                          ) : (
                            <PhoneIncoming size={13} color="#10b981" />
                          )}
                          <span>{c.callerNumber}</span>
                        </div>
                      </td>

                      {/* File Ghi Âm */}
                      <td style={{ padding: '14px' }}>
                        {c.audioUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => toggleInlinePlay(c)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 12px',
                                borderRadius: 8,
                                border: 'none',
                                background: isPlayingInline ? '#ef4444' : '#0284c7',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                width: 'fit-content'
                              }}
                            >
                              {isPlayingInline ? <Pause size={13} /> : <Play size={13} />}
                              <span>{isPlayingInline ? 'Đang phát...' : `Nghe (${formatDuration(c.duration)})`}</span>
                            </button>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Ghi âm {c.duration}s • Rõ tiếng
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không có âm thanh</span>
                        )}
                      </td>

                      {/* Bảng Tóm Tắt Văn Bản */}
                      <td style={{ padding: '14px' }}>
                        {c.summaryText ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ color: 'var(--text-main)', lineHeight: 1.45, fontSize: '0.86rem' }}>
                              {c.summaryText}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {routeBadge && (
                                <span className={callStyles.tagBadge}>🚌 {routeBadge}</span>
                              )}
                              {timeBadge && (
                                <span className={callStyles.tagBadge}>🕒 Xuất bến: {timeBadge}</span>
                              )}
                              {paxBadge && (
                                <span className={callStyles.tagBadge}>💺 {paxBadge}</span>
                              )}
                              {pickupBadge && (
                                <span className={callStyles.tagBadge}>📍 Đón: {pickupBadge}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Cuộc gọi nhỡ - Chưa có nội dung hội thoại
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={() => openCallDetailModal(c)}
                            style={{ padding: '7px 11px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, background: '#0369a1' }}
                            title="Mở bảng tóm tắt chi tiết & trình nghe ghi âm"
                          >
                            <FileText size={13} /> Bảng tóm tắt & Nghe
                          </button>
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => handleQuickBookingFromCall(c)}
                            style={{ padding: '7px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                            title="Đặt vé ngay từ thông tin tóm tắt"
                          >
                            <Ticket size={13} /> Đặt vé
                          </button>
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => makeCall(c.callerNumber)}
                            style={{ padding: '7px 9px', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}
                            title="Gọi lại cho khách"
                          >
                            <Phone size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Chi Tiết Ghi Âm & Bảng Tóm Tắt Văn Bản */}
      {selectedCall && (
        <div className={callStyles.modalOverlay} onClick={closeCallDetailModal}>
          <div className={callStyles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* Hidden file input for replacing call recording */}
            <input
              ref={modalFileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => handleUploadNewRecording(e, selectedCall.id)}
            />

            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-subtle)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Hồ Sơ Ghi Âm & Bảng Tóm Tắt Văn Bản Cuộc Gọi
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedCall.customerName} ({selectedCall.callerNumber}) • {new Date(selectedCall.startedAt).toLocaleString('vi-VN')}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => copySummaryToClipboard(selectedCall)}
                  style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Copy size={14} /> Sao chép văn bản
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => {
                    const callToBook = selectedCall;
                    closeCallDetailModal();
                    handleQuickBookingFromCall(callToBook);
                  }}
                  style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Ticket size={14} /> Đặt vé từ tóm tắt này
                </button>
                <button
                  type="button"
                  onClick={closeCallDetailModal}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={callStyles.modalBody}>
              {/* 1. Audio Recording Player */}
              <div className={callStyles.audioPlayerCard}>
                {selectedCall.audioUrl && (
                  <audio
                    ref={modalAudioRef}
                    src={selectedCall.audioUrl}
                    onTimeUpdate={(e) => setModalCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => {
                      const d = e.currentTarget.duration;
                      if (d && isFinite(d)) setModalDuration(d);
                    }}
                    onEnded={() => setModalPlaying(false)}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      onClick={toggleModalAudio}
                      disabled={!selectedCall.audioUrl}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#38bdf8',
                        color: '#0f172a',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      {modalPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                        🎧 Bản Ghi Âm Cuộc Gọi Gốc
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {formatDuration(modalCurrentTime)} / {formatDuration(modalDuration || selectedCall.duration)} • Bấm vào từng mốc thời gian bên dưới để nghe đúng đoạn đó
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Speed selector */}
                    {[0.75, 1, 1.25, 1.5].map(rate => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => changePlaybackRate(rate)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: playbackRate === rate ? '#38bdf8' : 'transparent',
                          color: playbackRate === rate ? '#0f172a' : '#e2e8f0',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {rate}x
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => speakTranscriptAloud(selectedCall)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.25)',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      title="Đọc toàn bộ cuộc hội thoại bằng giọng nói tiếng Việt"
                    >
                      <Volume2 size={14} /> Đọc hội thoại (TTS)
                    </button>

                    {selectedCall.audioUrl && (
                      <a
                        href={selectedCall.audioUrl}
                        download={`ghi-am-${selectedCall.callerNumber}-${selectedCall.id.slice(0, 6)}.wav`}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.25)',
                          background: 'rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Download size={14} /> Tải file âm thanh
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.25)',
                        background: 'transparent',
                        color: '#cbd5e1',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Upload size={13} /> Thay file ghi âm
                    </button>
                  </div>
                </div>

                {/* Seek bar */}
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, modalDuration || selectedCall.duration || 15)}
                  step={0.1}
                  value={modalCurrentTime}
                  onChange={(e) => seekModalAudio(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
              </div>

              {/* 2. Bảng Tóm Tắt Văn Bản (Structured Text Summary Table) */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={17} color="#0284c7" />
                    <span>Bảng Tóm Tắt Nội Dung Cuộc Gọi Bằng Văn Bản</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isEditingSummary ? (
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={() => setIsEditingSummary(true)}
                        style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit3 size={13} /> Chỉnh sửa bảng tóm tắt
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onClick={() => setIsEditingSummary(false)}
                          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={handleSaveSummaryEdits}
                          disabled={savingSummary}
                          style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Check size={13} /> {savingSummary ? 'Đang lưu...' : 'Lưu bảng tóm tắt'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Executive Summary Paragraph */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(2, 132, 199, 0.05)' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: 6 }}>
                    Tóm tắt tổng quan (Dành cho nhân viên đọc nhanh):
                  </div>
                  {isEditingSummary ? (
                    <textarea
                      className={styles.input}
                      rows={2}
                      value={editSummaryText}
                      onChange={(e) => setEditSummaryText(e.target.value)}
                      style={{ width: '100%', fontSize: '0.9rem' }}
                    />
                  ) : (
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {selectedCall.summaryText || 'Chưa có văn bản tóm tắt.'}
                    </div>
                  )}
                </div>

                {/* Structured Table */}
                <table className={callStyles.summaryTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Hạng mục thông tin</th>
                      <th>Nội dung văn bản trích xuất từ ghi âm</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Mốc ghi âm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditingSummary ? editSummaryFields : selectedCall.summaryFields || []).map((item, idx) => (
                      <tr key={item.field || idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                          {SUMMARY_FIELD_LABELS[item.field] || item.label}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {isEditingSummary ? (
                            <input
                              type="text"
                              className={styles.input}
                              value={item.value}
                              onChange={(e) => {
                                const next = [...editSummaryFields];
                                next[idx] = { ...next[idx], value: e.target.value };
                                setEditSummaryFields(next);
                              }}
                              style={{ padding: '6px 10px', fontSize: '0.86rem' }}
                            />
                          ) : (
                            item.value
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => seekModalAudio(item.sourceTimestamp || 0)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-subtle)',
                              color: '#0284c7',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Bấm để nghe đoạn ghi âm tại mốc thời gian này"
                          >
                            ▶ {formatDuration(item.sourceTimestamp || 0)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 3. Toàn Văn Hội Thoại Theo Từng Câu (Full Dialogue Transcript) */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    💬 Nội Dung Hội Thoại Chi Tiết Từng Câu (Bấm vào câu bất kỳ để nghe lại đoạn đó)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCall(selectedCall.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Trash2 size={13} /> Xóa bản ghi này
                  </button>
                </div>

                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                  {(!selectedCall.segments || selectedCall.segments.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                      Không có đoạn hội thoại chi tiết.
                    </div>
                  ) : (
                    selectedCall.segments.map((seg, i) => {
                      const isActiveSeg =
                        modalPlaying &&
                        modalCurrentTime >= seg.startTime &&
                        modalCurrentTime <= seg.endTime;

                      return (
                        <div
                          key={i}
                          onClick={() => seekModalAudio(seg.startTime)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: isActiveSeg ? '2px solid #0284c7' : '1px solid var(--border-color)',
                            background: isActiveSeg
                              ? 'rgba(2, 132, 199, 0.1)'
                              : seg.speaker === 'AGENT'
                              ? 'var(--bg-subtle)'
                              : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 12
                          }}
                        >
                          <div>
                            <div style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: seg.speaker === 'AGENT' ? '#0284c7' : '#10b981',
                              marginBottom: 2
                            }}>
                              {seg.speaker === 'AGENT' ? '🎧 Tổng đài viên' : '👤 Khách hàng'}
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                              {seg.text}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#0284c7',
                            whiteSpace: 'nowrap',
                            background: 'rgba(2, 132, 199, 0.1)',
                            padding: '3px 8px',
                            borderRadius: 6
                          }}>
                            ▶ {formatDuration(seg.startTime)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
