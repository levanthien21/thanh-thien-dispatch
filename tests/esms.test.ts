import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSmsTemplate, sendEsmsCustomerCareSms } from '../src/lib/esms';

test('renders all booking template variables', () => {
  assert.equal(renderSmsTemplate('{{name}} {{booking_code}} {{route}}', { name: 'An', booking_code: 'TT01', route: 'A-B' }), 'An TT01 A-B');
});

test('sends sandbox customer-care SMS without exposing credentials in result', async () => {
  process.env.ESMS_API_KEY = 'api-test'; process.env.ESMS_SECRET_KEY = 'secret-test'; process.env.ESMS_BRANDNAME = 'ThanhThien'; delete process.env.ESMS_SANDBOX; delete process.env.ESMS_CONTENT_OVERRIDE;
  let sentBody = '';
  const fakeFetch = async (_url: string | URL | Request, init?: RequestInit) => { sentBody = String(init?.body); return new Response(JSON.stringify({ CodeResult: '100', SMSID: 'sms-1' }), { status: 200 }); };
  const result = await sendEsmsCustomerCareSms({ phone: '0901234567', content: 'Xac nhan ve', requestId: 'booking-1' }, fakeFetch as typeof fetch);
  assert.equal(result.accepted, true); assert.equal(result.messageId, 'sms-1');
  assert.equal(JSON.parse(sentBody).Sandbox, '1'); assert.equal(JSON.stringify(result).includes('secret-test'), false);
});

test('uses the exact approved content override for a test Brandname', async () => {
  process.env.ESMS_API_KEY = 'api-test'; process.env.ESMS_SECRET_KEY = 'secret-test'; process.env.ESMS_BRANDNAME = 'Baotrixemay'; process.env.ESMS_CONTENT_OVERRIDE = 'Approved content';
  let sentBody = '';
  const fakeFetch = async (_url: string | URL | Request, init?: RequestInit) => { sentBody = String(init?.body); return new Response(JSON.stringify({ CodeResult: '100' }), { status: 200 }); };
  await sendEsmsCustomerCareSms({ phone: '0901234567', content: 'Booking content', requestId: 'booking-2' }, fakeFetch as typeof fetch);
  assert.equal(JSON.parse(sentBody).Content, 'Approved content');
  delete process.env.ESMS_CONTENT_OVERRIDE;
});
