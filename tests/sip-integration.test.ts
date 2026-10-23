import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPath, isProtectedPath } from '../src/lib/access';
import { normalizePhone, PHONE_PATTERN } from '../src/lib/business-rules';
import {
  generateConversationSegments,
  extractCallSummaryFromTranscript,
  generatePlayableCallWavDataUrl
} from '../src/lib/sip/call-summarizer';

test('SIP settings access is restricted to ADMIN only', () => {
  for (const path of ['/settings/sip', '/api/settings/sip']) {
    assert.equal(canAccessPath('ADMIN', path), true, `ADMIN should access ${path}`);
    assert.equal(canAccessPath('DISPATCHER', path), false, `DISPATCHER should NOT access ${path}`);
    assert.equal(canAccessPath('AGENT', path), false, `AGENT should NOT access ${path}`);
  }
});

test('Calls center station is accessible to all operating roles', () => {
  assert.equal(canAccessPath('AGENT', '/calls'), true, 'AGENT should access /calls');
  assert.equal(canAccessPath('DISPATCHER', '/calls'), true, 'DISPATCHER should access /calls');
  assert.equal(canAccessPath('ADMIN', '/calls'), true, 'ADMIN should access /calls');
  assert.equal(canAccessPath('AGENT', '/api/calls'), true, 'AGENT should access /api/calls');
  assert.equal(isProtectedPath('/calls'), true, '/calls should be protected');
});

test('Phone normalization strips display separators and validates against PHONE_PATTERN', () => {
  const variations = [
    { input: '0867 75 79 75', expected: '0867757975' },
    { input: '0867-75-79-75', expected: '0867757975' },
    { input: '0867.75.79.75', expected: '0867757975' },
    { input: ' 0867 757 975 ', expected: '0867757975' },
    { input: '+84867757975', expected: '84867757975' }
  ];

  for (const item of variations) {
    const normalized = normalizePhone(item.input);
    assert.equal(normalized, item.expected, `Failed to normalize ${item.input}`);
    assert.equal(PHONE_PATTERN.test(normalized), true, `Failed pattern for ${normalized}`);
  }
});

test('Call summarizer extracts structured booking table and summary text from transcript', () => {
  const segments = generateConversationSegments('0912345678', 'Nguyễn Văn Hùng');
  assert.ok(segments.length >= 4, 'Should generate multi-turn conversation segments');

  const report = extractCallSummaryFromTranscript(segments, '0912345678', 'Nguyễn Văn Hùng');
  assert.equal(report.extractedForm.phone, '0912345678');
  assert.equal(report.extractedForm.name, 'Nguyễn Văn Hùng');
  assert.equal(report.extractedForm.route, 'Chu Lai → Đà Nẵng');
  assert.equal(report.extractedForm.time, '15:00');
  assert.equal(report.extractedForm.pax, 1);
  assert.ok(report.extractedForm.pickup.includes('Sân bay Chu Lai'));
  assert.ok(report.summaryText.includes('Nguyễn Văn Hùng'));
  assert.equal(report.fields.length, 9, 'Summary table should expose all 9 structured fields');
});

test('Call audio synthesizer generates valid playable RIFF WAVE audio data URL', () => {
  const segments = generateConversationSegments('0912345678', 'Nguyễn Văn Hùng');
  const dataUrl = generatePlayableCallWavDataUrl(segments, 6);
  assert.ok(dataUrl.startsWith('data:audio/wav;base64,'), 'Should produce WAV data URL');
  const base64Part = dataUrl.slice('data:audio/wav;base64,'.length);
  const raw = Buffer.from(base64Part, 'base64');
  assert.equal(raw.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(raw.subarray(8, 12).toString('ascii'), 'WAVE');
});
