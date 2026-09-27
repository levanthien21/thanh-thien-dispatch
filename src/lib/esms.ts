const ESMS_ENDPOINT = 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/';

export type EsmsSendResult = { accepted: boolean; code: string; messageId?: string; error?: string };

function readConfig() {
  const apiKey = process.env.ESMS_API_KEY?.trim();
  const secretKey = process.env.ESMS_SECRET_KEY?.trim();
  const brandname = process.env.ESMS_BRANDNAME?.trim();
  if (!apiKey || !secretKey || !brandname) throw new Error('Thiếu cấu hình ESMS_API_KEY, ESMS_SECRET_KEY hoặc ESMS_BRANDNAME');
  return { apiKey, secretKey, brandname, sandbox: process.env.ESMS_SANDBOX !== '0', contentOverride: process.env.ESMS_CONTENT_OVERRIDE?.trim() };
}

export async function sendEsmsCustomerCareSms(input: { phone: string; content: string; requestId: string }, request: typeof fetch = fetch): Promise<EsmsSendResult> {
  const config = readConfig();
  const response = await request(ESMS_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ApiKey: config.apiKey, SecretKey: config.secretKey, Brandname: config.brandname, Content: config.contentOverride || input.content, Phone: input.phone, SmsType: '2', IsUnicode: '1', Sandbox: config.sandbox ? '1' : '0', RequestId: input.requestId.slice(0, 50) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return { accepted: false, code: `HTTP_${response.status}`, error: 'eSMS không phản hồi thành công' };
  const payload = await response.json() as { CodeResult?: string | number; SMSID?: string; ErrorMessage?: string };
  const code = String(payload.CodeResult ?? 'UNKNOWN');
  return { accepted: code === '100', code, messageId: payload.SMSID, error: code === '100' ? undefined : (payload.ErrorMessage || `eSMS trả về mã ${code}`) };
}

export function renderSmsTemplate(content: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, value), content);
}
