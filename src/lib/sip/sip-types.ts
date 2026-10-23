import { CallTranscriptSegment, CallSummaryField } from './call-summarizer';

export type SipConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'registered' | 'error';

export type CallDirection = 'inbound' | 'outbound';

export type CallState = 
  | 'idle' 
  | 'incoming_ringing' 
  | 'outgoing_calling' 
  | 'active' 
  | 'held' 
  | 'ended';

export interface CustomerSummary {
  id?: string;
  name: string;
  phone: string;
  bookingsCount: number;
  isVip: boolean;
  notes?: string;
  lastPickupLocation?: string;
  lastDropoffLocation?: string;
  lastRoute?: string;
}

export interface ActiveCall {
  id: string;
  phoneNumber: string;
  direction: CallDirection;
  startedAt?: Date;
  connectedAt?: Date;
  endedAt?: Date;
  durationSeconds: number;
  customer?: CustomerSummary;
  isMuted: boolean;
  isHeld: boolean;
  isRecording?: boolean;
}

export interface CallLogItem {
  id: string;
  callerNumber: string;
  direction: CallDirection;
  startedAt: string;
  duration: number; // in seconds
  status: 'COMPLETED' | 'MISSED' | 'REJECTED' | 'FAILED';
  customerName?: string;
  bookingId?: string;
  agentName?: string;
  audioDataUrl?: string;
  summaryText?: string;
  segments?: CallTranscriptSegment[];
  summaryFields?: CallSummaryField[];
}

export interface ViettelSipConfig {
  enabled: boolean;
  mode: 'LIVE' | 'SIMULATION';
  hotline: string;             // e.g. "0867757975"
  sipDomain: string;           // e.g. "siptrunk.viettel.vn" or IP
  wsServerUrl: string;         // e.g. "wss://sip.nhaxe.vn:8089/ws"
  sipUsername: string;         // e.g. "0867757975"
  sipPassword?: string;        // secret
  displayName: string;         // e.g. "Thanh Thien Hotline"
  stunServer: string;          // e.g. "stun:stun.l.google.com:19302"
  autoPopupOnCall: boolean;
  ringtoneVolume: number;      // 0.0 - 1.0
}
