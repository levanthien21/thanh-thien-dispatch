import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { canManageSystem } from '@/lib/access';

// Server-side SIP configuration storage fallback
let cachedSipConfig = {
  enabled: true,
  mode: 'SIMULATION',
  hotline: '0867757975',
  sipDomain: 'siptrunk.viettel.vn',
  wsServerUrl: 'wss://sip.nhaxe.vn:8089/ws',
  sipUsername: '0867757975',
  displayName: 'Nhà Xe Thanh Thiện',
  stunServer: 'stun:stun.l.google.com:19302',
  autoPopupOnCall: true,
  ringtoneVolume: 0.7,
  hasPassword: false
};

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await verifySessionToken(sessionToken);

  if (!user || !canManageSystem(user.role)) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  return NextResponse.json({ config: cachedSipConfig });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await verifySessionToken(sessionToken);

  if (!user || !canManageSystem(user.role)) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      enabled,
      mode,
      hotline,
      sipDomain,
      wsServerUrl,
      sipUsername,
      sipPassword,
      displayName,
      stunServer,
      autoPopupOnCall,
      ringtoneVolume
    } = body;

    const before = { ...cachedSipConfig };

    cachedSipConfig = {
      enabled: enabled ?? cachedSipConfig.enabled,
      mode: mode === 'LIVE' ? 'LIVE' : 'SIMULATION',
      hotline: hotline || cachedSipConfig.hotline,
      sipDomain: sipDomain || cachedSipConfig.sipDomain,
      wsServerUrl: wsServerUrl || cachedSipConfig.wsServerUrl,
      sipUsername: sipUsername || cachedSipConfig.sipUsername,
      displayName: displayName || cachedSipConfig.displayName,
      stunServer: stunServer || cachedSipConfig.stunServer,
      autoPopupOnCall: autoPopupOnCall ?? cachedSipConfig.autoPopupOnCall,
      ringtoneVolume: typeof ringtoneVolume === 'number' ? ringtoneVolume : cachedSipConfig.ringtoneVolume,
      hasPassword: Boolean(sipPassword) || cachedSipConfig.hasPassword
    };

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SIP_CONFIG_UPDATED',
        entityType: 'SipConfig',
        entityId: 'global',
        beforeData: JSON.stringify(before),
        afterData: JSON.stringify({ ...cachedSipConfig, hasPassword: Boolean(sipPassword) })
      }
    });

    return NextResponse.json({ success: true, config: cachedSipConfig });
  } catch (error: any) {
    console.error('Update SIP config error:', error);
    return NextResponse.json({ error: 'Failed to update SIP config' }, { status: 500 });
  }
}
