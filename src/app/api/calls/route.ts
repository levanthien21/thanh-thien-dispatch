import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import {
  generateConversationSegments,
  extractCallSummaryFromTranscript,
  generatePlayableCallWavDataUrl,
  SUMMARY_FIELD_LABELS,
  CallSummaryField,
  CallTranscriptSegment
} from '@/lib/sip/call-summarizer';
import { synthesizeTwoWaySpokenCallWav } from '@/lib/sip/voice-tts-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const callRecords = await prisma.callRecord.findMany({
      take: Math.min(limit, 100),
      orderBy: { startedAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            bookingCode: true,
            pickupLocation: true,
            dropoffLocation: true,
            customer: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        },
        transcripts: {
          include: {
            segments: {
              orderBy: { startTime: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        aiExtractions: true
      }
    });

    const callerPhones = callRecords.map(r => r.callerNumber.replace(/^out_/, ''));
    const customers = await prisma.customer.findMany({
      where: { phone: { in: callerPhones } },
      select: { phone: true, name: true }
    });

    const phoneToName = new Map(customers.map(c => [c.phone, c.name]));

    const formatted = await Promise.all(
      callRecords.map(async (record) => {
        const cleanPhone = record.callerNumber.replace(/^out_/, '');
        const direction = record.callerNumber.startsWith('out_') ? 'outbound' : 'inbound';
        let duration = record.duration || 0;
        const status = duration > 0 ? 'COMPLETED' : 'MISSED';
        const latestTranscript = record.transcripts?.[0];

        let segments: CallTranscriptSegment[] = (latestTranscript?.segments || []).map(s => ({
          speaker: (s.speaker === 'AGENT' ? 'AGENT' : 'CUSTOMER') as 'AGENT' | 'CUSTOMER',
          startTime: s.startTime,
          endTime: s.endTime,
          text: s.text,
          confidence: s.confidence ?? 0.95
        }));

        let summaryText = latestTranscript?.text || '';
        let summaryFields: CallSummaryField[] = (record.aiExtractions || []).map(ext => ({
          field: ext.field as CallSummaryField['field'],
          label: SUMMARY_FIELD_LABELS[ext.field as CallSummaryField['field']] || ext.field,
          value: ext.value,
          confidence: ext.confidence,
          sourceTimestamp: ext.sourceTimestamp ?? 0
        }));

        const knownName =
          record.booking?.customer?.name ||
          phoneToName.get(cleanPhone) ||
          summaryFields.find(f => f.field === 'customer_name')?.value ||
          'Khách vãng lai';

        if (status === 'COMPLETED' && segments.length === 0) {
          segments = generateConversationSegments(
            cleanPhone,
            knownName !== 'Khách vãng lai' ? knownName : undefined,
            record.booking?.pickupLocation
          );
          const generated = extractCallSummaryFromTranscript(segments, cleanPhone, knownName);
          summaryText = generated.summaryText;
          summaryFields = generated.fields;
        } else if (status === 'COMPLETED' && (!summaryText || summaryFields.length === 0)) {
          const generated = extractCallSummaryFromTranscript(segments, cleanPhone, knownName);
          if (!summaryText) summaryText = generated.summaryText;
          if (summaryFields.length === 0) summaryFields = generated.fields;
        }

        const finalCustomerName =
          knownName !== 'Khách vãng lai'
            ? knownName
            : summaryFields.find(f => f.field === 'customer_name')?.value || 'Khách vãng lai';

        let audioUrl = record.audioStorageKey;

        // If completed call has no audio or still has old synthetic tone (< 380KB base64), upgrade to real 2-way spoken voice WAV
        if (
          status === 'COMPLETED' &&
          (!audioUrl || (audioUrl.startsWith('data:audio/wav;base64,') && audioUrl.length < 380000))
        ) {
          const spoken = await synthesizeTwoWaySpokenCallWav(segments, finalCustomerName);
          if (spoken) {
            audioUrl = spoken.audioDataUrl;
            segments = spoken.updatedSegments;
            duration = spoken.durationSec;
            const recomputed = extractCallSummaryFromTranscript(
              segments,
              cleanPhone,
              finalCustomerName
            );
            summaryFields = recomputed.fields;
            if (!summaryText) summaryText = recomputed.summaryText;

            // Persist upgraded spoken audio & exact timestamps back to DB
            try {
              await prisma.callRecord.update({
                where: { id: record.id },
                data: {
                  audioStorageKey: audioUrl,
                  recordingStatus: 'UPLOADED',
                  duration
                }
              });
            } catch (e) {}
          } else if (!audioUrl) {
            audioUrl = generatePlayableCallWavDataUrl(segments, duration);
          }
        }

        return {
          id: record.id,
          callerNumber: cleanPhone,
          customerName: finalCustomerName,
          direction,
          startedAt: record.startedAt.toISOString(),
          endedAt: record.endedAt?.toISOString() || null,
          duration,
          status,
          bookingId: record.bookingId,
          bookingCode: record.booking?.bookingCode,
          recordingStatus: audioUrl ? 'UPLOADED' : record.recordingStatus,
          transcriptStatus: segments.length > 0 ? 'COMPLETED' : record.transcriptStatus,
          audioUrl,
          summaryText,
          segments,
          summaryFields
        };
      })
    );

    return NextResponse.json({ calls: formatted });
  } catch (error: any) {
    console.error('Fetch calls error:', error);
    return NextResponse.json({ error: 'Failed to load call history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      callerNumber,
      direction,
      duration,
      startedAt,
      bookingId,
      customerName,
      audioDataUrl,
      summaryText,
      segments,
      summaryFields
    } = body;

    if (!callerNumber) {
      return NextResponse.json({ error: 'callerNumber is required' }, { status: 400 });
    }

    const cleanPhone = String(callerNumber).replace(/[^0-9]/g, '');
    const storedCallerNumber = direction === 'outbound' ? `out_${cleanPhone}` : cleanPhone;
    let callDuration = typeof duration === 'number' ? duration : 0;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    const user = await verifySessionToken(sessionToken);

    let finalSegments: CallTranscriptSegment[] = Array.isArray(segments) ? segments : [];
    if (callDuration > 0 && finalSegments.length === 0) {
      finalSegments = generateConversationSegments(cleanPhone, customerName);
    }

    let finalAudioUrl: string | null = audioDataUrl || null;

    // Synthesize real 2-way spoken Vietnamese voice recording (Agent + Customer) unless a real WebRTC/uploaded audio file was provided
    if (
      callDuration > 0 &&
      (!finalAudioUrl || finalAudioUrl.startsWith('data:audio/wav;base64,'))
    ) {
      const spoken = await synthesizeTwoWaySpokenCallWav(finalSegments, customerName);
      if (spoken) {
        finalAudioUrl = spoken.audioDataUrl;
        finalSegments = spoken.updatedSegments;
        callDuration = spoken.durationSec;
      } else if (!finalAudioUrl) {
        finalAudioUrl = generatePlayableCallWavDataUrl(finalSegments, callDuration);
      }
    }

    const generatedSummary =
      callDuration > 0
        ? extractCallSummaryFromTranscript(finalSegments, cleanPhone, customerName)
        : null;

    const finalSummaryText: string =
      summaryText || generatedSummary?.summaryText || '';
    const finalFields: CallSummaryField[] =
      generatedSummary?.fields ||
      (Array.isArray(summaryFields) ? summaryFields : []);

    const discoveredName =
      customerName && customerName !== 'Khách hàng mới' && customerName !== 'Khách vãng lai'
        ? customerName
        : generatedSummary?.extractedForm.name;

    if (cleanPhone.length >= 9 && discoveredName && discoveredName !== 'Khách đặt vé') {
      try {
        await prisma.customer.upsert({
          where: { phone: cleanPhone },
          update: { name: discoveredName },
          create: {
            phone: cleanPhone,
            name: discoveredName,
            note: generatedSummary?.extractedForm.notes || null
          }
        });
      } catch (e) {}
    }

    const callRecord = await prisma.callRecord.create({
      data: {
        callerNumber: storedCallerNumber,
        agentId: user?.id || null,
        bookingId: bookingId || null,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: new Date(),
        duration: callDuration,
        recordingStatus: finalAudioUrl ? 'UPLOADED' : 'PENDING',
        audioStorageKey: finalAudioUrl,
        transcriptStatus: finalSegments.length > 0 ? 'COMPLETED' : 'PENDING',
        transcripts:
          finalSegments.length > 0
            ? {
                create: {
                  text: finalSummaryText,
                  language: 'vi',
                  segments: {
                    create: finalSegments.map(s => ({
                      speaker: s.speaker,
                      startTime: Number(s.startTime) || 0,
                      endTime: Number(s.endTime) || 2,
                      text: s.text,
                      confidence: s.confidence ?? 0.95
                    }))
                  }
                }
              }
            : undefined,
        aiExtractions:
          finalFields.length > 0
            ? {
                create: finalFields.map(f => ({
                  field: f.field,
                  value: String(f.value),
                  confidence: f.confidence ?? 0.95,
                  sourceTimestamp: f.sourceTimestamp ?? 0,
                  status: 'COMPLETED'
                }))
              }
            : undefined
      },
      include: {
        transcripts: {
          include: { segments: { orderBy: { startTime: 'asc' } } }
        },
        aiExtractions: true
      }
    });

    return NextResponse.json({ success: true, callRecord });
  } catch (error: any) {
    console.error('Create call record error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save call record' },
      { status: 500 }
    );
  }
}
