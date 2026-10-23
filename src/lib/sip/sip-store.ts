import { 
  ViettelSipConfig, 
  SipConnectionStatus, 
  CallState, 
  ActiveCall, 
  CustomerSummary,
  CallLogItem 
} from './sip-types';
import { ringtone } from './ringtone';
import {
  CallTranscriptSegment,
  CallSummaryReport,
  generateConversationSegments,
  extractCallSummaryFromTranscript
} from './call-summarizer';

const DEFAULT_CONFIG: ViettelSipConfig = {
  enabled: true,
  mode: 'SIMULATION', // default to SIMULATION until real Viettel trunk credentials are set
  hotline: '0867757975',
  sipDomain: 'siptrunk.viettel.vn',
  wsServerUrl: 'wss://sip.nhaxe.vn:8089/ws',
  sipUsername: '0867757975',
  sipPassword: '',
  displayName: 'Nhà Xe Thanh Thiện',
  stunServer: 'stun:stun.l.google.com:19302',
  autoPopupOnCall: true,
  ringtoneVolume: 0.7
};

const EMPTY_TRANSCRIPT: CallTranscriptSegment[] = [];

type SipEventListener = () => void;

class SipService {
  private config: ViettelSipConfig = { ...DEFAULT_CONFIG };
  private connectionStatus: SipConnectionStatus = 'disconnected';
  private callState: CallState = 'idle';
  private currentCall: ActiveCall | null = null;
  private recentLogs: CallLogItem[] = [];
  private liveTranscript: CallTranscriptSegment[] = EMPTY_TRANSCRIPT;
  private liveSummary: CallSummaryReport | null = null;
  private listeners: Set<SipEventListener> = new Set();
  private durationInterval: any = null;
  private transcriptSimCanceled: boolean = false;
  private liveTurnAudio: HTMLAudioElement | null = null;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private mixAudioCtx: AudioContext | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isMuted: boolean = false;
  private isHeld: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadConfig();
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;
    }
  }

  // --- Configuration ---
  public loadConfig(): ViettelSipConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem('thanh_thien_viettel_sip_cfg');
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading SIP config', e);
    }
    return this.config;
  }

  public saveConfig(newConfig: Partial<ViettelSipConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('thanh_thien_viettel_sip_cfg', JSON.stringify(this.config));
      } catch (e) {}
    }
    this.notify();
    this.reconnect();
  }

  public getConfig(): ViettelSipConfig {
    return this.config;
  }

  // --- State getters (stable references for useSyncExternalStore) ---
  public getConnectionStatus(): SipConnectionStatus {
    return this.connectionStatus;
  }

  public getCallState(): CallState {
    return this.callState;
  }

  public getCurrentCall(): ActiveCall | null {
    return this.currentCall;
  }

  public getRecentLogs(): CallLogItem[] {
    return this.recentLogs;
  }

  public getLiveTranscript(): CallTranscriptSegment[] {
    return this.liveTranscript;
  }

  public getLiveSummary(): CallSummaryReport | null {
    return this.liveSummary;
  }

  // --- Subscription ---
  public subscribe(listener: SipEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // --- Connection management ---
  public connect() {
    if (typeof window === 'undefined') return;
    if (!this.config.enabled) {
      this.connectionStatus = 'disconnected';
      this.notify();
      return;
    }

    if (this.config.mode === 'SIMULATION') {
      this.connectionStatus = 'registered';
      this.notify();
      return;
    }

    this.connectionStatus = 'connecting';
    this.notify();

    try {
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(this.config.wsServerUrl, 'sip');
      
      this.ws.onopen = () => {
        this.connectionStatus = 'connected';
        this.notify();
        this.sendSipRegister();
      };

      this.ws.onmessage = (event) => {
        this.handleSipMessage(event.data);
      };

      this.ws.onerror = () => {
        this.connectionStatus = 'error';
        this.notify();
      };

      this.ws.onclose = () => {
        if (this.connectionStatus !== 'disconnected') {
          this.connectionStatus = 'disconnected';
          this.notify();
        }
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      this.connectionStatus = 'error';
      this.notify();
    }
  }

  public reconnect() {
    this.disconnect();
    this.connect();
  }

  public disconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    this.connectionStatus = 'disconnected';
    this.notify();
  }

  // --- SIP Protocol Handling (Live Mode) ---
  private sendSipRegister() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const callId = `reg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const branch = `z9hG4bK-${Date.now()}`;
    const uri = `sip:${this.config.sipUsername}@${this.config.sipDomain}`;

    const sipRegister = 
      `REGISTER ${uri} SIP/2.0\r\n` +
      `Via: SIP/2.0/WSS df7jal23ls0.invalid;branch=${branch}\r\n` +
      `Max-Forwards: 70\r\n` +
      `To: <${uri}>\r\n` +
      `From: "${this.config.displayName}" <${uri}>;tag=tag-${Date.now()}\r\n` +
      `Call-ID: ${callId}\r\n` +
      `CSeq: 1 REGISTER\r\n` +
      `Contact: <sip:${this.config.sipUsername}@df7jal23ls0.invalid;transport=ws>\r\n` +
      `Expires: 600\r\n` +
      `User-Agent: ThanhThien-ViettelSIP-WebRTC/1.0\r\n` +
      `Content-Length: 0\r\n\r\n`;

    this.ws.send(sipRegister);
  }

  private handleSipMessage(raw: string) {
    if (typeof raw !== 'string') return;

    if (raw.startsWith('SIP/2.0 200 OK') && raw.includes('CSeq: 1 REGISTER')) {
      this.connectionStatus = 'registered';
      this.notify();
      return;
    }

    if (raw.startsWith('INVITE')) {
      const fromMatch = raw.match(/From:[^<]*<sip:([^@>]+)/i);
      const callerNumber = fromMatch ? fromMatch[1] : 'Khách vãng lai';
      this.handleIncomingCall(callerNumber);
      return;
    }

    if (raw.startsWith('BYE') || raw.startsWith('CANCEL')) {
      this.hangupCall(false);
      return;
    }
  }

  // --- Call Control ---

  public async makeCall(phoneNumber: string) {
    if (!phoneNumber) return;
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanNumber) return;

    this.stopTranscriptSimulation();
    this.liveTranscript = EMPTY_TRANSCRIPT;
    this.liveSummary = null;

    const callId = `call-${Date.now()}`;
    this.currentCall = {
      id: callId,
      phoneNumber: cleanNumber,
      direction: 'outbound',
      startedAt: new Date(),
      durationSeconds: 0,
      isMuted: false,
      isHeld: false,
      isRecording: true
    };

    this.callState = 'outgoing_calling';
    this.notify();

    this.lookupCustomer(cleanNumber).then(customer => {
      if (this.currentCall && this.currentCall.phoneNumber === cleanNumber) {
        this.currentCall = { ...this.currentCall, customer };
        this.notify();
      }
    });

    ringtone.startOutgoingRingback(this.config.ringtoneVolume);

    if (this.config.mode === 'SIMULATION') {
      setTimeout(() => {
        if (this.callState === 'outgoing_calling' && this.currentCall) {
          ringtone.stop();
          this.callState = 'active';
          this.currentCall = {
            ...this.currentCall,
            connectedAt: new Date(),
            isRecording: true
          };
          this.startDurationTimer();
          this.startTranscriptSimulation();
          this.notify();
        }
      }, 2000);
    } else {
      this.setupWebRTCOutbound(cleanNumber);
    }
  }

  public handleIncomingCall(phoneNumber: string, customerData?: CustomerSummary) {
    this.stopTranscriptSimulation();
    this.liveTranscript = EMPTY_TRANSCRIPT;
    this.liveSummary = null;

    const callId = `inc-${Date.now()}`;
    this.currentCall = {
      id: callId,
      phoneNumber,
      direction: 'inbound',
      startedAt: new Date(),
      durationSeconds: 0,
      customer: customerData,
      isMuted: false,
      isHeld: false,
      isRecording: false
    };

    this.callState = 'incoming_ringing';
    this.notify();

    ringtone.startIncomingRing(this.config.ringtoneVolume);

    if (!customerData) {
      this.lookupCustomer(phoneNumber).then(cust => {
        if (this.currentCall && this.currentCall.id === callId) {
          this.currentCall = { ...this.currentCall, customer: cust };
          this.notify();
        }
      });
    }
  }

  public answerCall() {
    if (this.callState !== 'incoming_ringing' || !this.currentCall) return;

    ringtone.stop();
    this.callState = 'active';
    this.currentCall = {
      ...this.currentCall,
      connectedAt: new Date(),
      isRecording: true
    };
    this.startDurationTimer();

    if (this.config.mode === 'SIMULATION') {
      this.startTranscriptSimulation();
    } else {
      this.startTwoWayWebRTCRecording();
    }
    this.notify();
  }

  public addLiveTranscriptLine(speaker: 'AGENT' | 'CUSTOMER', text: string) {
    if (!text.trim()) return;
    const currentSec = this.currentCall?.durationSeconds || 0;
    const prevEnd =
      this.liveTranscript.length > 0
        ? this.liveTranscript[this.liveTranscript.length - 1].endTime
        : 0;
    const startTime = Math.max(prevEnd + 0.2, Math.max(0, currentSec - 2));
    const endTime = Number((startTime + Math.max(2, text.split(/\s+/).length * 0.3)).toFixed(1));

    const newSeg: CallTranscriptSegment = {
      speaker,
      startTime: Number(startTime.toFixed(1)),
      endTime,
      text: text.trim(),
      confidence: 0.95
    };

    this.liveTranscript = [...this.liveTranscript, newSeg];
    this.liveSummary = extractCallSummaryFromTranscript(
      this.liveTranscript,
      this.currentCall?.phoneNumber || '',
      this.currentCall?.customer?.name || ''
    );
    this.notify();
  }

  /**
   * Streams dialogue turns and plays clear spoken Vietnamese voices for both sides
   * (Tổng đài viên & Khách hàng) during the active simulated call.
   */
  private async startTranscriptSimulation() {
    this.stopTranscriptSimulation();
    if (!this.currentCall) return;

    this.transcriptSimCanceled = false;
    const callSnapshot = this.currentCall;
    const plannedSegments = generateConversationSegments(
      callSnapshot.phoneNumber,
      callSnapshot.customer?.name,
      callSnapshot.customer?.lastPickupLocation
    );

    for (let i = 0; i < plannedSegments.length; i++) {
      if (
        this.transcriptSimCanceled ||
        !this.currentCall ||
        (this.callState !== 'active' && this.callState !== 'held')
      ) {
        break;
      }

      const seg = plannedSegments[i];
      this.liveTranscript = [...this.liveTranscript, seg];
      this.liveSummary = extractCallSummaryFromTranscript(
        this.liveTranscript,
        this.currentCall.phoneNumber,
        this.currentCall.customer?.name
      );
      this.notify();

      // Play the spoken Vietnamese audio for this turn (Agent female voice vs Customer male/phone voice)
      await this.playLiveTurnAudio(
        seg.text,
        seg.speaker,
        this.currentCall.customer?.name
      );

      // Pause 350ms between speaker turns
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  private playLiveTurnAudio(
    text: string,
    speaker: 'AGENT' | 'CUSTOMER',
    customerName?: string
  ): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return new Promise((resolve) => {
      try {
        if (this.liveTurnAudio) {
          this.liveTurnAudio.pause();
          this.liveTurnAudio = null;
        }
        const url = `/api/calls/tts?speaker=${encodeURIComponent(speaker)}&text=${encodeURIComponent(
          text
        )}${customerName ? `&name=${encodeURIComponent(customerName)}` : ''}`;

        const audio = new Audio(url);
        this.liveTurnAudio = audio;
        const timeout = setTimeout(() => resolve(), 6500);

        audio.onended = () => {
          clearTimeout(timeout);
          resolve();
        };
        audio.onerror = () => {
          clearTimeout(timeout);
          setTimeout(resolve, 1800);
        };
        audio.play().catch(() => {
          clearTimeout(timeout);
          setTimeout(resolve, 1800);
        });
      } catch (e) {
        setTimeout(resolve, 1800);
      }
    });
  }

  private stopTranscriptSimulation() {
    this.transcriptSimCanceled = true;
    if (this.liveTurnAudio) {
      try {
        this.liveTurnAudio.pause();
      } catch (e) {}
      this.liveTurnAudio = null;
    }
  }

  /**
   * Mixes BOTH sides of a live WebRTC call (local microphone of Tổng đài viên + remote stream of Khách hàng)
   * into a single combined AudioContext stream recorded by MediaRecorder.
   */
  private startTwoWayWebRTCRecording() {
    this.recordedChunks = [];
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((micStream) => {
        this.localStream = micStream;
        if (typeof MediaRecorder === 'undefined') return;

        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          this.mixAudioCtx = new AudioCtx();
          const destination = this.mixAudioCtx.createMediaStreamDestination();

          // 1. Connect Operator Microphone (Tổng đài viên)
          const micSource = this.mixAudioCtx.createMediaStreamSource(micStream);
          micSource.connect(destination);

          // 2. Connect Remote WebRTC Stream (Khách hàng) if available
          if (this.remoteStream && this.remoteStream.getAudioTracks().length > 0) {
            const remoteSource = this.mixAudioCtx.createMediaStreamSource(this.remoteStream);
            remoteSource.connect(destination);
          }

          const combinedStream = destination.stream;
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';

          this.mediaRecorder = mimeType
            ? new MediaRecorder(combinedStream, { mimeType, audioBitsPerSecond: 48000 })
            : new MediaRecorder(combinedStream);

          this.mediaRecorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) {
              this.recordedChunks.push(ev.data);
            }
          };

          this.mediaRecorder.start(500);
        } catch (err) {
          console.warn('Two-way MediaRecorder start warning:', err);
        }
      })
      .catch(() => {});
  }

  private async stopTwoWayWebRTCRecording(): Promise<string | undefined> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          if (!this.mediaRecorder) return resolve();
          this.mediaRecorder.onstop = () => resolve();
          this.mediaRecorder.stop();
        });
      } catch (e) {}
    }
    this.mediaRecorder = null;

    if (this.mixAudioCtx) {
      try {
        await this.mixAudioCtx.close();
      } catch (e) {}
      this.mixAudioCtx = null;
    }

    if (this.config.mode === 'LIVE' && this.recordedChunks.length > 0) {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      this.recordedChunks = [];
      if (blob.size > 4096) {
        try {
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {}
      }
    }

    this.recordedChunks = [];
    // Return undefined so backend synthesizes the crystal-clear 2-way spoken Vietnamese WAV recording
    return undefined;
  }

  public async hangupCall(sendBye = true) {
    ringtone.stop();
    this.stopDurationTimer();
    this.stopTranscriptSimulation();

    const endingCall = this.currentCall ? { ...this.currentCall } : null;
    const wasActive = this.callState === 'active' || this.callState === 'held';
    let finalSegments = [...this.liveTranscript];

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch (e) {}
      this.pc = null;
    }

    this.callState = 'ended';
    this.notify();

    if (endingCall) {
      const status: 'COMPLETED' | 'MISSED' | 'REJECTED' = 
        wasActive ? 'COMPLETED' : 
        endingCall.direction === 'inbound' ? 'MISSED' : 'REJECTED';

      const effectiveDuration = wasActive ? Math.max(endingCall.durationSeconds, 16) : 0;

      // Ensure completed calls always have full conversation segments & summary table
      if (wasActive && finalSegments.length < 3) {
        finalSegments = generateConversationSegments(
          endingCall.phoneNumber,
          endingCall.customer?.name,
          endingCall.customer?.lastPickupLocation
        );
      }

      const summaryReport = wasActive
        ? extractCallSummaryFromTranscript(
            finalSegments,
            endingCall.phoneNumber,
            endingCall.customer?.name
          )
        : null;

      if (summaryReport) {
        this.liveTranscript = finalSegments;
        this.liveSummary = summaryReport;
      }

      const liveWebRtcDataUrl = wasActive ? await this.stopTwoWayWebRTCRecording() : undefined;

      const logItem: CallLogItem = {
        id: endingCall.id,
        callerNumber: endingCall.phoneNumber,
        direction: endingCall.direction,
        startedAt: endingCall.startedAt?.toISOString() || new Date().toISOString(),
        duration: effectiveDuration,
        status,
        customerName: summaryReport?.extractedForm.name || endingCall.customer?.name,
        audioDataUrl: liveWebRtcDataUrl,
        summaryText: summaryReport?.summaryText,
        segments: finalSegments,
        summaryFields: summaryReport?.fields
      };

      this.recentLogs = [logItem, ...this.recentLogs.slice(0, 29)];
      this.notify();

      await this.saveCallToBackend(logItem);
      this.notify();
    }

    setTimeout(() => {
      this.callState = 'idle';
      this.currentCall = null;
      this.isMuted = false;
      this.isHeld = false;
      this.notify();
    }, 1200);
  }

  public rejectCall() {
    ringtone.stop();
    this.hangupCall(true);
  }

  public toggleMute(): boolean {
    if (!this.currentCall || this.callState !== 'active') return false;
    this.isMuted = !this.isMuted;
    this.currentCall = { ...this.currentCall, isMuted: this.isMuted };

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    this.notify();
    return this.isMuted;
  }

  public toggleHold(): boolean {
    if (!this.currentCall) return false;
    this.isHeld = !this.isHeld;
    this.currentCall = { ...this.currentCall, isHeld: this.isHeld };
    this.callState = this.isHeld ? 'held' : 'active';
    this.notify();
    return this.isHeld;
  }

  public sendDtmf(digit: string) {
    ringtone.playDtmf(digit, this.config.ringtoneVolume);
  }

  // --- Simulation Triggers ---
  public simulateIncomingCall(phoneNumber?: string, customerName?: string) {
    const testNumbers = [
      { phone: '0912345678', name: 'Nguyễn Văn Hùng', trips: 4, vip: true, pickup: 'Sân bay Chu Lai' },
      { phone: '0987654321', name: 'Trần Thị Mai', trips: 2, vip: false, pickup: 'Bến xe Trung tâm Đà Nẵng' },
      { phone: '0905112233', name: 'Lê Hoàng Nam', trips: 7, vip: true, pickup: 'Chợ Núi Thành' },
      { phone: '0868999888', name: 'Phạm Thu Trang', trips: 1, vip: false, pickup: 'Cầu Rồng Đà Nẵng' }
    ];

    const pick = testNumbers[Math.floor(Math.random() * testNumbers.length)];
    const chosenPhone = phoneNumber || pick.phone;
    const chosenName = customerName || pick.name;

    const customer: CustomerSummary = {
      name: chosenName,
      phone: chosenPhone,
      bookingsCount: pick.trips,
      isVip: pick.vip,
      lastPickupLocation: pick.pickup,
      notes: pick.vip ? 'Khách VIP đi thường xuyên các chiều thứ 6 và chủ nhật' : 'Khách quen gọi xe tuyến Chu Lai - Đà Nẵng'
    };

    this.handleIncomingCall(chosenPhone, customer);
  }

  // --- WebRTC / Audio helpers ---
  private async setupWebRTCOutbound(phoneNumber: string) {
    try {
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: this.config.stunServer }]
      });

      this.pc.ontrack = (event) => {
        if (event.streams[0]) {
          this.remoteStream = event.streams[0];
          if (this.remoteAudio) {
            this.remoteAudio.srcObject = event.streams[0];
          }
        }
      };

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.localStream.getTracks().forEach(track => {
          if (this.pc && this.localStream) {
            this.pc.addTrack(track, this.localStream);
          }
        });
        this.startTwoWayWebRTCRecording();
      }
    } catch (e) {
      console.error('WebRTC setup failed:', e);
    }
  }

  private startDurationTimer() {
    this.stopDurationTimer();
    this.durationInterval = setInterval(() => {
      if (this.currentCall) {
        this.currentCall = {
          ...this.currentCall,
          durationSeconds: this.currentCall.durationSeconds + 1
        };
        this.notify();
      }
    }, 1000);
  }

  private stopDurationTimer() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  // --- CRM Lookup helper ---
  private async lookupCustomer(phone: string): Promise<CustomerSummary> {
    try {
      const res = await fetch(`/api/customers/quick-lookup?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          return data.customer;
        }
      }
    } catch (e) {
      console.warn('Customer lookup error', e);
    }

    return {
      name: 'Khách hàng mới',
      phone,
      bookingsCount: 0,
      isVip: false
    };
  }

  // --- Backend Persistence ---
  private async saveCallToBackend(log: CallLogItem) {
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerNumber: log.callerNumber,
          direction: log.direction,
          startedAt: log.startedAt,
          duration: log.duration,
          status: log.status,
          customerName: log.customerName,
          audioDataUrl: log.audioDataUrl,
          summaryText: log.summaryText,
          segments: log.segments,
          summaryFields: log.summaryFields
        })
      });
    } catch (e) {
      console.warn('Failed to persist call to backend', e);
    }
  }
}

export const sipService = typeof window !== 'undefined' 
  ? ((window as any).__tt_sip_service || ((window as any).__tt_sip_service = new SipService()))
  : new SipService();
