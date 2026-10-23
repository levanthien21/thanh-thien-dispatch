import { MPEGDecoder } from 'mpg123-decoder';
import { CallTranscriptSegment } from './call-summarizer';

/**
 * Normalizes Vietnamese text so TTS reads times, phone numbers, and symbols naturally.
 */
function normalizeVietnameseForTts(text: string): string {
  return text
    .replace(/→/g, ' đi ')
    .replace(/\b(\d{1,2}):00\b/g, '$1 giờ')
    .replace(/\b(\d{1,2}):(\d{2})\b/g, '$1 giờ $2 phút')
    .replace(/\b(\d{1,2})h\b/gi, '$1 giờ')
    .replace(/\b(0\d{9})\b/g, (match) => {
      // Group phone digits so TTS reads naturally: "0912, 345, 678"
      return `${match.slice(0, 4)}, ${match.slice(4, 7)}, ${match.slice(7)}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits text into chunks <= 165 chars at punctuation boundaries for Google TTS.
 */
function splitTextIntoTtsChunks(text: string): string[] {
  const normalized = normalizeVietnameseForTts(text);
  if (normalized.length <= 165) return [normalized];

  const clauses = normalized.split(/(?<=[.,;?!])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const clause of clauses) {
    if (!current) {
      current = clause;
    } else if ((current + ' ' + clause).length <= 165) {
      current += ' ' + clause;
    } else {
      chunks.push(current);
      current = clause;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Trims leading and trailing near-silence from a PCM Float32Array.
 */
function trimSilence(pcm: Float32Array, sampleRate: number): Float32Array {
  const threshold = 0.008;
  const padSamples = Math.floor(sampleRate * 0.05);
  let start = 0;
  let end = pcm.length - 1;

  while (start < pcm.length && Math.abs(pcm[start]) < threshold) {
    start++;
  }
  while (end > start && Math.abs(pcm[end]) < threshold) {
    end--;
  }

  start = Math.max(0, start - padSamples);
  end = Math.min(pcm.length, end + padSamples);
  return pcm.subarray(start, end);
}

/**
 * Hann-windowed WSOLA time-stretch + resampling pitch shifter.
 * Allows shifting pitch (e.g. 0.83 for a Male caller voice, 1.09 for a distinct Female caller voice)
 * while keeping natural speaking speed and clear Vietnamese pronunciation.
 */
function pitchShiftPcm(
  input: Float32Array,
  sampleRate: number,
  pitchFactor: number,
  tempoFactor = 1.0
): Float32Array {
  if (Math.abs(pitchFactor - 1.0) < 0.01 && Math.abs(tempoFactor - 1.0) < 0.01) {
    return input;
  }

  const stretchRatio = pitchFactor / tempoFactor;
  const windowSize = Math.floor(sampleRate * 0.035); // 35ms grain
  const hopAnalysis = Math.floor(windowSize / 4);
  const hopSynthesis = Math.max(1, Math.floor(hopAnalysis * stretchRatio));
  const searchRange = Math.floor(hopAnalysis * 0.45);

  const hann = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  const stretchedLen = Math.floor(input.length * stretchRatio) + windowSize * 2;
  const stretched = new Float32Array(stretchedLen);
  const norm = new Float32Array(stretchedLen);

  let inPos = 0;
  let outPos = 0;

  while (inPos + windowSize < input.length && outPos + windowSize < stretchedLen) {
    let bestOffset = 0;
    if (outPos > 0 && inPos > searchRange && inPos + windowSize + searchRange < input.length) {
      let bestCorr = -Infinity;
      const checkLen = Math.min(hopSynthesis, Math.floor(windowSize / 3));
      for (let off = -searchRange; off <= searchRange; off += 4) {
        let corr = 0;
        for (let k = 0; k < checkLen; k += 2) {
          corr += stretched[outPos + k] * input[inPos + off + k];
        }
        if (corr > bestCorr) {
          bestCorr = corr;
          bestOffset = off;
        }
      }
    }

    const actualIn = Math.max(0, Math.min(input.length - windowSize, inPos + bestOffset));
    for (let i = 0; i < windowSize; i++) {
      const w = hann[i];
      stretched[outPos + i] += input[actualIn + i] * w;
      norm[outPos + i] += w * w;
    }

    inPos += hopAnalysis;
    outPos += hopSynthesis;
  }

  for (let i = 0; i < outPos; i++) {
    if (norm[i] > 1e-4) {
      stretched[i] /= norm[i];
    }
  }

  const finalLen = Math.floor(outPos / pitchFactor);
  const output = new Float32Array(finalLen);
  for (let i = 0; i < finalLen; i++) {
    const srcIdx = i * pitchFactor;
    const idx0 = Math.floor(srcIdx);
    const frac = srcIdx - idx0;
    const s0 = stretched[idx0] || 0;
    const s1 = stretched[idx0 + 1] || 0;
    output[i] = s0 + frac * (s1 - s0);
  }

  return output;
}

/**
 * Applies a subtle mobile telephone bandpass filter (260Hz - 3600Hz) to the Customer's voice
 * so the listener clearly hears the difference between the studio headset Agent and the mobile Customer.
 */
function applyPhoneLineCharacteristic(input: Float32Array, sampleRate: number): Float32Array {
  const out = new Float32Array(input.length);
  // High-pass at ~250 Hz
  const rcHigh = 1.0 / (2 * Math.PI * 250);
  const dt = 1.0 / sampleRate;
  const alphaHigh = rcHigh / (rcHigh + dt);

  // Low-pass at ~3600 Hz
  const rcLow = 1.0 / (2 * Math.PI * 3600);
  const alphaLow = dt / (rcLow + dt);

  let prevIn = 0;
  let prevHigh = 0;
  let prevLow = 0;

  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const high = alphaHigh * (prevHigh + x - prevIn);
    prevIn = x;
    prevHigh = high;

    const low = prevLow + alphaLow * (high - prevLow);
    prevLow = low;

    // Gentle soft-clipping & gain normalization for clear phone presence
    out[i] = Math.tanh(low * 1.35);
  }
  return out;
}

/**
 * Resamples PCM from srcRate to dstRate using linear interpolation.
 */
function resamplePcm(input: Float32Array, srcRate: number, dstRate: number): Float32Array {
  if (srcRate === dstRate) return input;
  const ratio = srcRate / dstRate;
  const outLen = Math.floor(input.length / ratio);
  const output = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] || 0;
    const s1 = input[idx + 1] || 0;
    output[i] = s0 + frac * (s1 - s0);
  }
  return output;
}

function isLikelyFemaleCustomerName(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  const femaleTokens = ['thị', 'mai', 'trang', 'lan', 'hương', 'linh', 'hoa', 'ngọc', 'thảo', 'hà', 'yến', 'nhung', 'vy'];
  return femaleTokens.some(token => lower.includes(token));
}

/**
 * Fetches spoken Vietnamese TTS MP3 for a single text chunk.
 */
async function fetchVietnameseTtsMp3(chunkText: string): Promise<Uint8Array | null> {
  try {
    const url =
      'https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=' +
      encodeURIComponent(chunkText);
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  } catch (e) {
    console.warn('TTS fetch error:', e);
    return null;
  }
}

/**
 * Synthesizes a complete two-way spoken Vietnamese call recording (.wav Data URL)
 * with clear voices for both AGENT (Tổng đài viên) and CUSTOMER (Khách hàng),
 * and returns the updated segments with exact audio startTime/endTime + total duration.
 */
export async function synthesizeTwoWaySpokenCallWav(
  segments: CallTranscriptSegment[],
  customerName?: string
): Promise<{
  audioDataUrl: string;
  updatedSegments: CallTranscriptSegment[];
  durationSec: number;
} | null> {
  if (!segments || segments.length === 0) return null;

  const targetSampleRate = 12000; // 12kHz 16-bit mono PCM: crisp voice clarity & compact size
  const decoder = new MPEGDecoder();
  await decoder.ready;

  try {
    const isFemaleCustomer = isLikelyFemaleCustomerName(customerName);
    // Male customer -> 0.83x pitch (deeper male voice); Female customer -> 1.09x pitch (distinct female caller voice)
    const customerPitch = isFemaleCustomer ? 1.09 : 0.83;

    const pcmParts: Float32Array[] = [];
    const updatedSegments: CallTranscriptSegment[] = [];

    // 0.25s initial phone pickup tone + pause
    const introSamples = Math.floor(targetSampleRate * 0.25);
    const introPcm = new Float32Array(introSamples);
    for (let i = 0; i < Math.floor(targetSampleRate * 0.08); i++) {
      const t = i / targetSampleRate;
      introPcm[i] = Math.sin(2 * Math.PI * 950 * t) * 0.12 * (1 - i / (targetSampleRate * 0.08));
    }
    pcmParts.push(introPcm);
    let currentSampleOffset = introSamples;

    const pauseBetweenTurnsSamples = Math.floor(targetSampleRate * 0.35);

    for (const seg of segments) {
      const textChunks = splitTextIntoTtsChunks(seg.text);
      const turnPcmChunks: Float32Array[] = [];

      for (const chunkText of textChunks) {
        const mp3Bytes = await fetchVietnameseTtsMp3(chunkText);
        if (!mp3Bytes || mp3Bytes.length === 0) continue;

        const decoded = decoder.decode(mp3Bytes);
        if (!decoded.channelData || !decoded.channelData[0] || decoded.channelData[0].length === 0) {
          continue;
        }

        const trimmed = trimSilence(decoded.channelData[0], decoded.sampleRate);
        let processed: Float32Array;

        if (seg.speaker === 'AGENT') {
          // Tổng đài viên: Clear, warm female studio headset voice
          processed = pitchShiftPcm(trimmed, decoded.sampleRate, 1.0, 1.06);
        } else {
          // Khách hàng: Distinct Male (or distinct Female) caller voice over mobile phone line
          const pitched = pitchShiftPcm(trimmed, decoded.sampleRate, customerPitch, 1.03);
          processed = applyPhoneLineCharacteristic(pitched, decoded.sampleRate);
        }

        const resampled = resamplePcm(processed, decoded.sampleRate, targetSampleRate);
        turnPcmChunks.push(resampled);
      }

      // Combine chunks for this turn
      const turnTotalLen = turnPcmChunks.reduce((acc, arr) => acc + arr.length, 0);
      if (turnTotalLen === 0) continue;

      const turnPcm = new Float32Array(turnTotalLen);
      let offset = 0;
      for (const arr of turnPcmChunks) {
        turnPcm.set(arr, offset);
        offset += arr.length;
      }

      const startTime = Number((currentSampleOffset / targetSampleRate).toFixed(1));
      pcmParts.push(turnPcm);
      currentSampleOffset += turnPcm.length;
      const endTime = Number((currentSampleOffset / targetSampleRate).toFixed(1));

      updatedSegments.push({
        ...seg,
        startTime,
        endTime,
      });

      // Add natural pause after turn
      pcmParts.push(new Float32Array(pauseBetweenTurnsSamples));
      currentSampleOffset += pauseBetweenTurnsSamples;
    }

    if (updatedSegments.length === 0) {
      return null;
    }

    const totalSamples = pcmParts.reduce((acc, arr) => acc + arr.length, 0);
    const wavBuffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(wavBuffer);

    const writeString = (pos: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM = 1
    view.setUint16(22, 1, true); // Mono = 1
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, totalSamples * 2, true);

    let sampleIdx = 0;
    for (const part of pcmParts) {
      for (let i = 0; i < part.length; i++) {
        const clamped = Math.max(-1, Math.min(1, part[i] * 0.92));
        view.setInt16(44 + sampleIdx * 2, clamped * 32767, true);
        sampleIdx++;
      }
    }

    const durationSec = Math.max(1, Math.round(totalSamples / targetSampleRate));
    const base64 = Buffer.from(wavBuffer).toString('base64');

    return {
      audioDataUrl: `data:audio/wav;base64,${base64}`,
      updatedSegments,
      durationSec,
    };
  } catch (err) {
    console.error('synthesizeTwoWaySpokenCallWav error:', err);
    return null;
  } finally {
    try {
      decoder.free();
    } catch (e) {}
  }
}

/**
 * Synthesizes a single dialogue turn as a playable WAV buffer for live real-time call playback.
 */
export async function synthesizeSingleTurnWavBuffer(
  text: string,
  speaker: 'AGENT' | 'CUSTOMER',
  customerName?: string
): Promise<Buffer | null> {
  const res = await synthesizeTwoWaySpokenCallWav(
    [
      {
        speaker,
        startTime: 0,
        endTime: 3,
        text,
        confidence: 0.98,
      },
    ],
    customerName
  );
  if (!res) return null;
  const base64 = res.audioDataUrl.replace(/^data:audio\/wav;base64,/, '');
  return Buffer.from(base64, 'base64');
}
