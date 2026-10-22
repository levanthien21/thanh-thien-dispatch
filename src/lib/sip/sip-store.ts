import { 
  ViettelSipConfig, 
  SipConnectionStatus, 
  CallState, 
  ActiveCall, 
  CustomerSummary,
  CallLogItem 
} from './sip-types';
import { ringtone } from './ringtone';

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

type SipEventListener = () => void;

class SipService {
  private config: ViettelSipConfig = { ...DEFAULT_CONFIG };
  private connectionStatus: SipConnectionStatus = 'disconnected';
  private callState: CallState = 'idle';
  private currentCall: ActiveCall | null = null;
  private recentLogs: CallLogItem[] = [];
  private listeners: Set<SipEventListener> = new Set();
  private durationInterval: any = null;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private isHeld: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadConfig();
      // Initialize remote audio element
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

  // --- State getters ---
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

    // Live mode: connect to SIP WebRTC WebSocket Gateway
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
      // Inbound call from SIP Trunk
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

    const callId = `call-${Date.now()}`;
    this.currentCall = {
      id: callId,
      phoneNumber: cleanNumber,
      direction: 'outbound',
      startedAt: new Date(),
      durationSeconds: 0,
      isMuted: false,
      isHeld: false
    };

    this.callState = 'outgoing_calling';
    this.notify();

    // Query customer info from CRM in background
    this.lookupCustomer(cleanNumber).then(customer => {
      if (this.currentCall && this.currentCall.phoneNumber === cleanNumber) {
        this.currentCall.customer = customer;
        this.notify();
      }
    });

    ringtone.startOutgoingRingback(this.config.ringtoneVolume);

    if (this.config.mode === 'SIMULATION') {
      // Auto-answer after 2.5 seconds in simulation mode
      setTimeout(() => {
        if (this.callState === 'outgoing_calling') {
          ringtone.stop();
          this.callState = 'active';
          if (this.currentCall) {
            this.currentCall.connectedAt = new Date();
          }
          this.startDurationTimer();
          this.notify();
        }
      }, 2500);
    } else {
      // Live WebRTC call via SIP gateway
      this.setupWebRTCOutbound(cleanNumber);
    }
  }

  public handleIncomingCall(phoneNumber: string, customerData?: CustomerSummary) {
    const callId = `inc-${Date.now()}`;
    this.currentCall = {
      id: callId,
      phoneNumber,
      direction: 'inbound',
      startedAt: new Date(),
      durationSeconds: 0,
      customer: customerData,
      isMuted: false,
      isHeld: false
    };

    this.callState = 'incoming_ringing';
    this.notify();

    ringtone.startIncomingRing(this.config.ringtoneVolume);

    if (!customerData) {
      this.lookupCustomer(phoneNumber).then(cust => {
        if (this.currentCall && this.currentCall.id === callId) {
          this.currentCall.customer = cust;
          this.notify();
        }
      });
    }
  }

  public answerCall() {
    if (this.callState !== 'incoming_ringing' || !this.currentCall) return;

    ringtone.stop();
    this.callState = 'active';
    this.currentCall.connectedAt = new Date();
    this.startDurationTimer();
    this.notify();

    // Request microphone access in browser
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        this.localStream = stream;
      }).catch(err => {
        console.warn('Microphone permission denied or not found:', err);
      });
    }
  }

  public hangupCall(sendBye = true) {
    ringtone.stop();
    this.stopDurationTimer();

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch (e) {}
      this.pc = null;
    }

    if (this.currentCall) {
      this.currentCall.endedAt = new Date();
      const status: 'COMPLETED' | 'MISSED' | 'REJECTED' = 
        this.callState === 'active' || this.callState === 'held' ? 'COMPLETED' : 
        this.currentCall.direction === 'inbound' ? 'MISSED' : 'REJECTED';

      const logItem: CallLogItem = {
        id: this.currentCall.id,
        callerNumber: this.currentCall.phoneNumber,
        direction: this.currentCall.direction,
        startedAt: this.currentCall.startedAt?.toISOString() || new Date().toISOString(),
        duration: this.currentCall.durationSeconds,
        status,
        customerName: this.currentCall.customer?.name
      };

      this.recentLogs = [logItem, ...this.recentLogs.slice(0, 29)];

      // Persist call to backend database
      this.saveCallToBackend(logItem);
    }

    this.callState = 'ended';
    this.notify();

    setTimeout(() => {
      this.callState = 'idle';
      this.currentCall = null;
      this.isMuted = false;
      this.isHeld = false;
      this.notify();
    }, 1500);
  }

  public rejectCall() {
    ringtone.stop();
    this.hangupCall(true);
  }

  public toggleMute(): boolean {
    if (!this.currentCall || this.callState !== 'active') return false;
    this.isMuted = !this.isMuted;
    this.currentCall.isMuted = this.isMuted;

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
    this.currentCall.isHeld = this.isHeld;
    this.callState = this.isHeld ? 'held' : 'active';
    this.notify();
    return this.isHeld;
  }

  public sendDtmf(digit: string) {
    ringtone.playDtmf(digit, this.config.ringtoneVolume);
  }

  // --- Simulation Triggers (For testing before Viettel contract) ---
  public simulateIncomingCall(phoneNumber?: string, customerName?: string) {
    const testNumbers = [
      { phone: '0912345678', name: 'Nguyễn Văn Hùng', trips: 4, vip: true, pickup: 'Sân bay Chu Lai' },
      { phone: '0987654321', name: 'Trần Thị Mai', trips: 2, vip: false, pickup: 'Ngã tư Lý Thường Kiệt, Tam Kỳ' },
      { phone: '0905112233', name: 'Lê Hoàng Nam', trips: 7, vip: true, pickup: 'Bến xe Trung tâm Đà Nẵng' },
      { phone: '0868999888', name: 'Phạm Thu Trang', trips: 0, vip: false, pickup: 'Chợ Núi Thành' }
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
        if (this.remoteAudio && event.streams[0]) {
          this.remoteAudio.srcObject = event.streams[0];
        }
      };

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.localStream.getTracks().forEach(track => {
          if (this.pc && this.localStream) {
            this.pc.addTrack(track, this.localStream);
          }
        });
      }
    } catch (e) {
      console.error('WebRTC setup failed:', e);
    }
  }

  private startDurationTimer() {
    this.stopDurationTimer();
    this.durationInterval = setInterval(() => {
      if (this.currentCall) {
        this.currentCall.durationSeconds += 1;
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
          customerName: log.customerName
        })
      });
    } catch (e) {
      console.warn('Failed to persist call to backend', e);
    }
  }
}

// Global singleton instance for the browser
export const sipService = typeof window !== 'undefined' 
  ? ((window as any).__tt_sip_service || ((window as any).__tt_sip_service = new SipService()))
  : new SipService();
