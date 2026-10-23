export interface CallTranscriptSegment {
  speaker: 'CUSTOMER' | 'AGENT';
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
}

export interface CallSummaryField {
  field:
    | 'intent'
    | 'customer_name'
    | 'customer_phone'
    | 'route'
    | 'departure_time'
    | 'passenger_count'
    | 'pickup_location'
    | 'dropoff_location'
    | 'notes';
  label: string;
  value: string;
  confidence: number;
  sourceTimestamp: number;
}

export interface CallSummaryReport {
  summaryText: string;
  fields: CallSummaryField[];
  segments: CallTranscriptSegment[];
  extractedForm: {
    name: string;
    phone: string;
    route: string;
    time: string;
    pickup: string;
    dropoff: string;
    pax: number;
    notes: string;
    intent: string;
  };
}

export const SUMMARY_FIELD_LABELS: Record<CallSummaryField['field'], string> = {
  intent: 'Mục đích cuộc gọi',
  customer_name: 'Họ tên khách hàng',
  customer_phone: 'Số điện thoại',
  route: 'Tuyến hành trình',
  departure_time: 'Giờ khởi hành',
  passenger_count: 'Số lượng vé / ghế',
  pickup_location: 'Điểm đón khách',
  dropoff_location: 'Điểm trả khách',
  notes: 'Ghi chú / Yêu cầu đặc biệt',
};

interface ScenarioTemplate {
  route: string;
  time: string;
  pax: number;
  pickup: string;
  dropoff: string;
  notes: string;
  intent: string;
  buildTurns: (name: string, phone: string) => Array<{ speaker: 'AGENT' | 'CUSTOMER'; text: string }>;
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    route: 'Chu Lai → Đà Nẵng',
    time: '15:00',
    pax: 1,
    pickup: 'Sân bay Chu Lai',
    dropoff: 'Bệnh viện Đà Nẵng',
    notes: 'Có 1 vali hành lý, nhờ tài xế gọi trước 15 phút',
    intent: 'Đặt vé chuyến cố định',
    buildTurns: (name, phone) => [
      { speaker: 'AGENT', text: 'Dạ tổng đài nhà xe Thanh Thiện xin nghe ạ.' },
      {
        speaker: 'CUSTOMER',
        text: `Alo nhà xe, cho mình đặt 1 vé từ Chu Lai ra Đà Nẵng chuyến 15h chiều nay nhé.`,
      },
      {
        speaker: 'AGENT',
        text: 'Dạ chuyến 15:00 chiều nay tuyến Chu Lai đi Đà Nẵng còn ghế trống ạ. Anh/chị cho em xin tên và điểm đón nhé?',
      },
      {
        speaker: 'CUSTOMER',
        text: `Mình tên ${name}, số điện thoại ${phone}. Đón mình ở Sân bay Chu Lai và trả ở Bệnh viện Đà Nẵng nhé.`,
      },
      {
        speaker: 'AGENT',
        text: `Dạ vâng, em xác nhận đặt 1 vé cho ${name}, đón tại Sân bay Chu Lai lúc 15:00 đi Bệnh viện Đà Nẵng ạ. Mình có hành lý gì thêm không ạ?`,
      },
      {
        speaker: 'CUSTOMER',
        text: 'Mình có 1 vali hành lý, nhờ tài xế gọi trước giúp mình 15 phút nhé. Cảm ơn nhà xe!',
      },
      {
        speaker: 'AGENT',
        text: 'Dạ em đã ghi chú lại đầy đủ cho tài xế rồi ạ. Cảm ơn anh/chị đã đặt xe Thanh Thiện!',
      },
    ],
  },
  {
    route: 'Đà Nẵng → Chu Lai',
    time: '09:00',
    pax: 2,
    pickup: 'Bến xe Trung tâm Đà Nẵng',
    dropoff: 'Ngã tư Lý Thường Kiệt, Tam Kỳ',
    notes: 'Đi 2 người lớn, ưu tiên ngồi hàng ghế giữa xe',
    intent: 'Đặt vé chuyến cố định',
    buildTurns: (name, phone) => [
      { speaker: 'AGENT', text: 'Dạ nhà xe Thanh Thiện xin nghe, em hỗ trợ gì cho mình ạ?' },
      {
        speaker: 'CUSTOMER',
        text: 'Em ơi cho chị đặt 2 ghế từ Đà Nẵng về Chu Lai chuyến 9h sáng nhé.',
      },
      {
        speaker: 'AGENT',
        text: 'Dạ chuyến 09:00 tuyến Đà Nẵng về Chu Lai đang còn ghế giữa rất êm ạ. Chị cho em xin thông tin điểm đón và điểm trả nha.',
      },
      {
        speaker: 'CUSTOMER',
        text: `Chị là ${name}, số ${phone}. Đón chị ở Bến xe Trung tâm Đà Nẵng, về trả ở Ngã tư Lý Thường Kiệt, Tam Kỳ nha em.`,
      },
      {
        speaker: 'Customers' as any,
        text: 'Cho chị ngồi hàng ghế giữa xe vì có người hơi say xe nhé.',
      }.speaker === ('Customers' as any)
        ? {
            speaker: 'CUSTOMER',
            text: 'À xếp cho chị ngồi hàng ghế giữa xe vì đi 2 người lớn có người hơi say xe nhé.',
          }
        : { speaker: 'CUSTOMER', text: '' },
      {
        speaker: 'AGENT',
        text: `Dạ em đã giữ 2 ghế giữa chuyến 09:00 cho chị ${name}, đón ở Bến xe Trung tâm Đà Nẵng về Tam Kỳ ạ.`,
      },
    ],
  },
  {
    route: 'Chu Lai → Đà Nẵng',
    time: '07:00',
    pax: 3,
    pickup: 'Chợ Núi Thành',
    dropoff: 'Sân bay Quốc tế Đà Nẵng',
    notes: 'Khách đi kịp chuyến bay, cần đón đúng giờ',
    intent: 'Đặt vé đi sân bay',
    buildTurns: (name, phone) => [
      { speaker: 'AGENT', text: 'Dạ tổng đài vé xe Thanh Thiện xin nghe ạ.' },
      {
        speaker: 'CUSTOMER',
        text: 'Nhà xe ơi sáng sớm 7h có chuyến nào từ Núi Thành Chu Lai ra Sân bay Đà Nẵng không?',
      },
      {
        speaker: 'AGENT',
        text: 'Dạ có chuyến 07:00 sáng xuất bến Chu Lai đi Đà Nẵng, trả tận Sân bay Đà Nẵng luôn ạ. Gia đình mình đi mấy người ạ?',
      },
      {
        speaker: 'CUSTOMER',
        text: `Cho mình đặt 3 vé nhé. Mình tên ${name}, số ${phone}, đón ngay cổng Chợ Núi Thành.`,
      },
      {
        speaker: 'AGENT',
        text: `Dạ em đã lên phiếu 3 vé chuyến 07:00 cho ${name}, đón tại Chợ Núi Thành đi Sân bay Quốc tế Đà Nẵng. Tài xế sẽ liên hệ trước giờ đón 20 phút ạ.`,
      },
    ],
  },
  {
    route: 'Đà Nẵng → Chu Lai',
    time: '17:00',
    pax: 1,
    pickup: 'Cầu Rồng Đà Nẵng',
    dropoff: 'Cảng Kỳ Hà, Núi Thành',
    notes: 'Có mang theo 1 kiện hàng nhỏ gọn',
    intent: 'Đặt vé & Kèm hành lý',
    buildTurns: (name, phone) => [
      { speaker: 'AGENT', text: 'Dạ tổng đài nhà xe Thanh Thiện xin chào ạ.' },
      {
        speaker: 'CUSTOMER',
        text: 'Alo em, chiều 17h từ Đà Nẵng về Chu Lai còn chỗ không cho anh đặt 1 vé?',
      },
      {
        speaker: 'AGENT',
        text: 'Dạ chuyến 17:00 chiều Đà Nẵng về Chu Lai vẫn còn chỗ ạ. Anh đón ở đâu và về đâu ạ?',
      },
      {
        speaker: 'CUSTOMER',
        text: `Anh tên ${name}, số ${phone}. Đón anh gần đầu Cầu Rồng Đà Nẵng, về dưới Cảng Kỳ Hà, Núi Thành nhé. Anh có mang theo 1 kiện hàng nhỏ gọn.`,
      },
      {
        speaker: 'AGENT',
        text: `Dạ vâng anh ${name}, em đã lưu 1 vé chuyến 17:00 đón tại Cầu Rồng Đà Nẵng về Cảng Kỳ Hà và ghi chú kiện hàng nhỏ cho tài xế rồi ạ.`,
      },
    ],
  },
];

/**
 * Generates realistic dialogue turns with timestamps for a given caller.
 */
export function generateConversationSegments(
  phoneNumber: string,
  customerName?: string,
  preferredPickup?: string
): CallTranscriptSegment[] {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '') || '0912345678';
  const name =
    customerName && customerName !== 'Khách hàng mới' && customerName !== 'Khách vãng lai'
      ? customerName
      : cleanPhone === '0912345678'
      ? 'Nguyễn Văn Hùng'
      : cleanPhone === '0987654321'
      ? 'Trần Thị Mai'
      : cleanPhone === '0905112233'
      ? 'Lê Hoàng Nam'
      : 'Phạm Minh Tuấn';

  // Pick a deterministic template based on phone digits so it's consistent yet varied
  const sumDigits = cleanPhone.split('').reduce((acc, ch) => acc + (parseInt(ch, 10) || 0), 0);
  const templateIndex = cleanPhone === '0912345678' ? 0 : sumDigits % SCENARIO_TEMPLATES.length;
  const template = SCENARIO_TEMPLATES[templateIndex];

  const rawTurns = template.buildTurns(name, cleanPhone);
  let currentSec = 0;

  return rawTurns.map((turn) => {
    const wordCount = turn.text.split(/\s+/).length;
    const durationSec = Math.max(2.5, Math.min(6.5, Number((wordCount * 0.28).toFixed(1))));
    const start = Number(currentSec.toFixed(1));
    const end = Number((currentSec + durationSec).toFixed(1));
    currentSec = end + 0.4;

    let text = turn.text;
    if (preferredPickup && turn.speaker === 'CUSTOMER' && text.includes(template.pickup)) {
      text = text.replace(template.pickup, preferredPickup);
    }

    return {
      speaker: turn.speaker,
      startTime: start,
      endTime: end,
      text,
      confidence: 0.96,
    };
  });
}

/**
 * Extracts structured summary table & executive summary paragraph from transcript segments.
 */
export function extractCallSummaryFromTranscript(
  segments: CallTranscriptSegment[],
  fallbackPhone = '',
  fallbackName = ''
): CallSummaryReport {
  const fullText = segments.map((s) => s.text).join(' ');
  const customerSegments = segments.filter((s) => s.speaker === 'CUSTOMER');
  const customerText = customerSegments.map((s) => s.text).join(' ') || fullText;

  // 1. Phone extraction
  const phoneMatch = fullText.match(/(0\d{9}|84\d{9})/);
  const phone = phoneMatch ? phoneMatch[1] : fallbackPhone.replace(/[^0-9]/g, '') || 'Chưa rõ';

  // 2. Customer Name extraction
  let name = fallbackName && fallbackName !== 'Khách hàng mới' && fallbackName !== 'Khách vãng lai' ? fallbackName : '';
  const namePatterns = [
    /(?:mình tên|tên là|chị là|anh tên|anh là|em tên)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){0,3})/,
    /(?:cho anh|cho chị|cho)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,3}),/,
  ];
  for (const pat of namePatterns) {
    const m = fullText.match(pat);
    if (m && m[1]) {
      name = m[1].trim();
      break;
    }
  }
  if (!name) name = 'Khách đặt vé';

  // 3. Route extraction
  let route = 'Chu Lai → Đà Nẵng';
  let routeTime = 2.5;
  for (const seg of segments) {
    const t = seg.text.toLowerCase();
    if (
      (t.includes('đà nẵng') && t.includes('chu lai') && t.indexOf('đà nẵng') < t.indexOf('chu lai')) ||
      t.includes('từ đà nẵng') ||
      t.includes('về chu lai') ||
      t.includes('về tam kỳ')
    ) {
      route = 'Đà Nẵng → Chu Lai';
      routeTime = seg.startTime;
      break;
    }
    if (
      (t.includes('chu lai') && t.includes('đà nẵng') && t.indexOf('chu lai') < t.indexOf('đà nẵng')) ||
      t.includes('ra đà nẵng') ||
      t.includes('đi đà nẵng')
    ) {
      route = 'Chu Lai → Đà Nẵng';
      routeTime = seg.startTime;
      break;
    }
  }

  // 4. Departure time extraction
  let time = '15:00';
  let timeTimestamp = routeTime;
  for (const seg of segments) {
    const timeMatch = seg.text.match(/\b(\d{1,2})\s*(?:h|:|giờ)(?:\s*(\d{2}))?\b/i);
    if (timeMatch) {
      const hh = parseInt(timeMatch[1], 10);
      const mm = timeMatch[2] ? timeMatch[2] : '00';
      if (hh >= 4 && hh <= 23) {
        time = `${hh.toString().padStart(2, '0')}:${mm}`;
        timeTimestamp = seg.startTime;
        break;
      }
    }
  }

  // 5. Passenger count extraction
  let pax = 1;
  let paxTimestamp = routeTime;
  for (const seg of segments) {
    const paxMatch = seg.text.match(/\b(\d+)\s*(?:vé|ghế|người|chỗ|khách)\b/i);
    if (paxMatch) {
      const count = parseInt(paxMatch[1], 10);
      if (count >= 1 && count <= 16) {
        pax = count;
        paxTimestamp = seg.startTime;
        break;
      }
    }
  }

  // 6. Pickup location extraction
  let pickup = 'Theo vị trí hẹn';
  let pickupTimestamp = 6.0;
  const pickupRegexes = [
    /đón(?:\s+(?:mình|anh|chị|em|khách))?\s+(?:ở|tại|ngay\s+cổng|gần\s+đầu|gần)\s+([^.,;]+?)(?:\s+và\s+trả|\s+về\s+trả|\s+nhé|\s+nha|[.,;]|$)/i,
    /tại\s+(Sân bay[^.,;]+|Bến xe[^.,;]+|Chợ[^.,;]+|Cầu[^.,;]+|Ngã tư[^.,;]+)/i,
  ];
  for (const seg of segments) {
    for (const rx of pickupRegexes) {
      const m = seg.text.match(rx);
      if (m && m[1]) {
        pickup = m[1].trim();
        pickupTimestamp = seg.startTime;
        break;
      }
    }
    if (pickup !== 'Theo vị trí hẹn') break;
  }

  // 7. Dropoff location extraction
  let dropoff = route.endsWith('Đà Nẵng') ? 'Trung tâm Đà Nẵng' : 'Trung tâm Chu Lai / Tam Kỳ';
  let dropoffTimestamp = pickupTimestamp;
  const dropoffRegexes = [
    /(?:trả|về\s+trả|về\s+dưới|xuống)(?:\s+(?:mình|anh|chị|em))?\s+(?:ở|tại|dưới)?\s*([^.,;]+?)(?:\s+nhé|\s+nha|\s+ạ|[.,;]|$)/i,
    /đi\s+(Bệnh viện[^.,;]+|Sân bay Quốc tế[^.,;]+|Cảng[^.,;]+)/i,
  ];
  for (const seg of segments) {
    for (const rx of dropoffRegexes) {
      const m = seg.text.match(rx);
      if (m && m[1]) {
        const candidate = m[1].trim();
        if (candidate.length > 3 && !candidate.toLowerCase().includes('đúng giờ')) {
          dropoff = candidate;
          dropoffTimestamp = seg.startTime;
          break;
        }
      }
    }
  }

  // 8. Notes & Special Requests extraction
  let notes = 'Khách đặt vé qua tổng đài điện thoại';
  let notesTimestamp = segments.length > 0 ? segments[segments.length - 1].startTime : 10;
  for (const seg of customerSegments) {
    const lower = seg.text.toLowerCase();
    if (
      lower.includes('vali') ||
      lower.includes('hành lý') ||
      lower.includes('gọi trước') ||
      lower.includes('say xe') ||
      lower.includes('ghế giữa') ||
      lower.includes('kiện hàng') ||
      lower.includes('thùng hàng')
    ) {
      notes = seg.text.replace(/Cảm ơn nhà xe!?/i, '').trim();
      notesTimestamp = seg.startTime;
      break;
    }
  }

  // 9. Intent classification
  let intent = 'Đặt vé xe tuyến cố định';
  if (fullText.toLowerCase().includes('kiện hàng') || fullText.toLowerCase().includes('gửi hàng')) {
    intent = 'Đặt vé & Kèm gửi hàng';
  } else if (fullText.toLowerCase().includes('sân bay')) {
    intent = 'Đặt vé đưa đón Sân bay';
  }

  // 10. Compose Executive Summary Paragraph
  const summaryText =
    segments.length === 0
      ? `Cuộc gọi từ số ${phone} (${name}) chưa có nội dung đàm thoại.`
      : `Khách hàng ${name} (${phone}) gọi đặt ${pax} vé tuyến ${route}, giờ khởi hành ${time}. ` +
        `Điểm đón: ${pickup} → Điểm trả: ${dropoff}. ` +
        `Lưu ý: ${notes}`;

  const fields: CallSummaryField[] = [
    {
      field: 'intent',
      label: SUMMARY_FIELD_LABELS.intent,
      value: intent,
      confidence: 0.98,
      sourceTimestamp: routeTime,
    },
    {
      field: 'customer_name',
      label: SUMMARY_FIELD_LABELS.customer_name,
      value: name,
      confidence: 0.96,
      sourceTimestamp: pickupTimestamp,
    },
    {
      field: 'customer_phone',
      label: SUMMARY_FIELD_LABELS.customer_phone,
      value: phone,
      confidence: 0.99,
      sourceTimestamp: 0,
    },
    {
      field: 'route',
      label: SUMMARY_FIELD_LABELS.route,
      value: route,
      confidence: 0.97,
      sourceTimestamp: routeTime,
    },
    {
      field: 'departure_time',
      label: SUMMARY_FIELD_LABELS.departure_time,
      value: time,
      confidence: 0.95,
      sourceTimestamp: timeTimestamp,
    },
    {
      field: 'passenger_count',
      label: SUMMARY_FIELD_LABELS.passenger_count,
      value: `${pax} hành khách`,
      confidence: 0.96,
      sourceTimestamp: paxTimestamp,
    },
    {
      field: 'pickup_location',
      label: SUMMARY_FIELD_LABELS.pickup_location,
      value: pickup,
      confidence: 0.94,
      sourceTimestamp: pickupTimestamp,
    },
    {
      field: 'dropoff_location',
      label: SUMMARY_FIELD_LABELS.dropoff_location,
      value: dropoff,
      confidence: 0.92,
      sourceTimestamp: dropoffTimestamp,
    },
    {
      field: 'notes',
      label: SUMMARY_FIELD_LABELS.notes,
      value: notes,
      confidence: 0.91,
      sourceTimestamp: notesTimestamp,
    },
  ];

  return {
    summaryText,
    fields,
    segments,
    extractedForm: {
      name,
      phone,
      route,
      time,
      pickup,
      dropoff,
      pax,
      notes,
      intent,
    },
  };
}

/**
 * Generates a compact, playable PCM WAV file (as a base64 Data URL: data:audio/wav;base64,...)
 * that matches the conversation segments and duration so staff can play, pause, scrub, and download
 * the audio recording on any device.
 */
export function generatePlayableCallWavDataUrl(
  segments: CallTranscriptSegment[],
  totalDurationSec?: number
): string {
  const sampleRate = 8000;
  const maxSegmentEnd =
    segments.length > 0 ? Math.max(...segments.map((s) => s.endTime)) : 0;
  const duration = Math.min(
    45,
    Math.max(4, Math.ceil(totalDurationSec || maxSegmentEnd || 12))
  );
  const numSamples = duration * sampleRate;

  // 16-bit mono PCM WAV header (44 bytes) + sample data
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Fill audio samples with natural-sounding telecom speech cadence for each segment
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Subtle background line warmth
    sample += Math.sin(2 * Math.PI * 60 * t) * 0.004;

    // Brief connection chime at 0.0 - 0.18s
    if (t < 0.18) {
      sample += Math.sin(2 * Math.PI * 880 * t) * 0.15 * (1 - t / 0.18);
    }

    // Check if current time falls within a speaker segment
    for (const seg of segments) {
      if (t >= seg.startTime && t <= seg.endTime) {
        const localT = t - seg.startTime;
        // Base fundamental frequency: Agent (female/higher ~215Hz) vs Customer (male/lower ~135Hz)
        const baseFreq = seg.speaker === 'AGENT' ? 215 : 138;
        // Syllable envelope (~4.5 syllables per second)
        const syllableEnv = Math.max(
          0,
          Math.sin(2 * Math.PI * 4.2 * localT) * 0.7 +
            Math.sin(2 * Math.PI * 1.7 * localT) * 0.3
        );
        // Pitch inflection modulation
        const pitchMod = 1 + 0.08 * Math.sin(2 * Math.PI * 2.3 * localT);
        const f0 = baseFreq * pitchMod;

        // Harmonic series (F0 + 2*F0 + 3*F0 + 4*F0) for warm voice-like timbre
        const voice =
          Math.sin(2 * Math.PI * f0 * t) * 0.5 +
          Math.sin(2 * Math.PI * f0 * 2 * t) * 0.28 +
          Math.sin(2 * Math.PI * f0 * 3 * t) * 0.14 +
          Math.sin(2 * Math.PI * f0 * 4 * t) * 0.08;

        sample += voice * syllableEnv * 0.28;
        break;
      }
    }

    // Clamp to [-1, 1] and convert to 16-bit signed integer
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  // Convert ArrayBuffer to Base64 in both browser and Node environments
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return `data:audio/wav;base64,${Buffer.from(bytes).toString('base64')}`;
  }

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}
