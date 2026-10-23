import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  extractCallSummaryFromTranscript,
  SUMMARY_FIELD_LABELS,
  CallSummaryField,
  CallTranscriptSegment
} from '@/lib/sip/call-summarizer';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      audioDataUrl,
      summaryText,
      summaryFields,
      segments
    }: {
      audioDataUrl?: string;
      summaryText?: string;
      summaryFields?: CallSummaryField[];
      segments?: CallTranscriptSegment[];
    } = body;

    const existing = await prisma.callRecord.findUnique({
      where: { id },
      include: {
        transcripts: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi cuộc gọi' }, { status: 404 });
    }

    // 1. Update audio recording if uploaded
    if (audioDataUrl) {
      await prisma.callRecord.update({
        where: { id },
        data: {
          audioStorageKey: audioDataUrl,
          recordingStatus: 'UPLOADED',
          duration: existing.duration && existing.duration > 0 ? existing.duration : 15
        }
      });
    }

    // 2. Update transcript summary text & segments
    let computedFields = summaryFields;
    let computedSummary = summaryText;

    if (Array.isArray(segments) && segments.length > 0 && !computedFields) {
      const cleanPhone = existing.callerNumber.replace(/^out_/, '');
      const report = extractCallSummaryFromTranscript(segments, cleanPhone);
      computedSummary = computedSummary || report.summaryText;
      computedFields = report.fields;
    }

    const latestTranscript = existing.transcripts?.[0];
    if (latestTranscript) {
      if (typeof computedSummary === 'string') {
        await prisma.transcript.update({
          where: { id: latestTranscript.id },
          data: { text: computedSummary }
        });
      }
      if (Array.isArray(segments) && segments.length > 0) {
        await prisma.transcriptSegment.deleteMany({
          where: { transcriptId: latestTranscript.id }
        });
        await prisma.transcriptSegment.createMany({
          data: segments.map(s => ({
            transcriptId: latestTranscript.id,
            speaker: s.speaker,
            startTime: Number(s.startTime) || 0,
            endTime: Number(s.endTime) || 2,
            text: s.text,
            confidence: s.confidence ?? 0.95
          }))
        });
      }
    } else if (computedSummary || (Array.isArray(segments) && segments.length > 0)) {
      await prisma.transcript.create({
        data: {
          callId: id,
          text: computedSummary || '',
          language: 'vi',
          segments:
            Array.isArray(segments) && segments.length > 0
              ? {
                  create: segments.map(s => ({
                    speaker: s.speaker,
                    startTime: Number(s.startTime) || 0,
                    endTime: Number(s.endTime) || 2,
                    text: s.text,
                    confidence: s.confidence ?? 0.95
                  }))
                }
              : undefined
        }
      });
      await prisma.callRecord.update({
        where: { id },
        data: { transcriptStatus: 'COMPLETED' }
      });
    }

    // 3. Update structured summary table fields (AIExtraction)
    if (Array.isArray(computedFields) && computedFields.length > 0) {
      await prisma.aIExtraction.deleteMany({
        where: { callId: id }
      });
      await prisma.aIExtraction.createMany({
        data: computedFields.map(f => ({
          callId: id,
          field: f.field,
          value: String(f.value),
          confidence: f.confidence ?? 0.95,
          sourceTimestamp: f.sourceTimestamp ?? 0,
          status: 'COMPLETED'
        }))
      });
    }

    return NextResponse.json({
      success: true,
      summaryText: computedSummary,
      summaryFields: computedFields?.map(f => ({
        ...f,
        label: SUMMARY_FIELD_LABELS[f.field] || f.label || f.field
      }))
    });
  } catch (error: any) {
    console.error('Update call record error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi cập nhật bản ghi âm & tóm tắt' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const transcripts = await prisma.transcript.findMany({
      where: { callId: id },
      select: { id: true }
    });
    const transcriptIds = transcripts.map(t => t.id);

    if (transcriptIds.length > 0) {
      await prisma.transcriptSegment.deleteMany({
        where: { transcriptId: { in: transcriptIds } }
      });
      await prisma.transcript.deleteMany({
        where: { callId: id }
      });
    }

    await prisma.aIExtraction.deleteMany({
      where: { callId: id }
    });

    await prisma.callRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete call record error:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể xóa bản ghi cuộc gọi' },
      { status: 500 }
    );
  }
}
