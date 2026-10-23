import { NextResponse } from 'next/server';
import {
  synthesizeSingleTurnWavBuffer,
  synthesizeTwoWaySpokenCallWav,
} from '@/lib/sip/voice-tts-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') || '';
    const speaker = (searchParams.get('speaker') === 'AGENT' ? 'AGENT' : 'CUSTOMER') as
      | 'AGENT'
      | 'CUSTOMER';
    const customerName = searchParams.get('name') || undefined;

    if (!text.trim()) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const wavBuf = await synthesizeSingleTurnWavBuffer(text, speaker, customerName);
    if (!wavBuf) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }

    return new NextResponse(new Uint8Array(wavBuf), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'TTS error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { segments, customerName } = body;
    if (!Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'Missing segments' }, { status: 400 });
    }

    const result = await synthesizeTwoWaySpokenCallWav(segments, customerName);
    if (!result) {
      return NextResponse.json({ error: 'Failed to synthesize voice recording' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'TTS POST error' }, { status: 500 });
  }
}
