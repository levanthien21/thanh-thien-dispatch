"use client";

import { useSyncExternalStore, useEffect } from 'react';
import { sipService } from './sip-store';
import { 
  SipConnectionStatus, 
  CallState, 
  ActiveCall, 
  ViettelSipConfig,
  CallLogItem 
} from './sip-types';
import { CallTranscriptSegment, CallSummaryReport } from './call-summarizer';

const EMPTY_LOGS: CallLogItem[] = [];
const EMPTY_TRANSCRIPT: CallTranscriptSegment[] = [];

export function useSip() {
  const connectionStatus = useSyncExternalStore(
    (callback) => sipService.subscribe(callback),
    () => sipService.getConnectionStatus(),
    () => 'disconnected' as SipConnectionStatus
  );

  const callState = useSyncExternalStore(
    (callback) => sipService.subscribe(callback),
    () => sipService.getCallState(),
    () => 'idle' as CallState
  );

  const currentCall = useSyncExternalStore(
    (callback) => sipService.subscribe(callback),
    () => sipService.getCurrentCall(),
    () => null as ActiveCall | null
  );

  const config = useSyncExternalStore(
    (callback) => sipService.subscribe(callback),
    () => sipService.getConfig(),
    () => sipService.getConfig()
  );

  const recentLogs = useSyncExternalStore(
    (callback) => sipService.subscribe(callback),
    () => sipService.getRecentLogs(),
    () => EMPTY_LOGS
  );

  const liveTranscript = useSyncExternalStore(
    (callback) => sipService.subscribe(callback),
    () => sipService.getLiveTranscript(),
    () => EMPTY_TRANSCRIPT
  );

  const liveSummary = useSyncExternalStore(
    (callback) => sipService.subscribe(callback),
    () => sipService.getLiveSummary(),
    () => null as CallSummaryReport | null
  );

  useEffect(() => {
    sipService.connect();
  }, []);

  return {
    connectionStatus,
    callState,
    currentCall,
    config,
    recentLogs,
    liveTranscript,
    liveSummary,
    makeCall: (phone: string) => sipService.makeCall(phone),
    answerCall: () => sipService.answerCall(),
    hangupCall: () => sipService.hangupCall(),
    rejectCall: () => sipService.rejectCall(),
    toggleMute: () => sipService.toggleMute(),
    toggleHold: () => sipService.toggleHold(),
    sendDtmf: (digit: string) => sipService.sendDtmf(digit),
    simulateIncomingCall: (phone?: string, name?: string) => sipService.simulateIncomingCall(phone, name),
    addLiveTranscriptLine: (speaker: 'AGENT' | 'CUSTOMER', text: string) => sipService.addLiveTranscriptLine(speaker, text),
    saveConfig: (newCfg: Partial<ViettelSipConfig>) => sipService.saveConfig(newCfg),
    reconnect: () => sipService.reconnect()
  };
}
