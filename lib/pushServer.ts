import webpush from 'web-push';
import { supabaseAdmin } from './supabaseAdmin';

// Sending reminders to phones and computers (Web Push). Server only.
// The key pair that signs them is made once, on first use, and kept in the server-only app_secrets table,
// so there is nothing to configure by hand.
type Keys = { publicKey: string; privateKey: string };
let cached: Keys | null = null;

export async function pushKeys(): Promise<Keys> {
  if (cached) return cached;
  const { data } = await supabaseAdmin.from('app_secrets').select('value').eq('name', 'push-keys').maybeSingle();
  if (data?.value?.publicKey && data.value.privateKey) return (cached = data.value as Keys);
  const made = webpush.generateVAPIDKeys();
  // If two requests race, the first one saved wins and both use it.
  await supabaseAdmin.from('app_secrets').upsert({ name: 'push-keys', value: made }, { onConflict: 'name', ignoreDuplicates: true });
  const { data: again } = await supabaseAdmin.from('app_secrets').select('value').eq('name', 'push-keys').single();
  return (cached = (again?.value as Keys) || made);
}

export type StoredSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Sends one notification. Returns 'gone' when the device no longer accepts them (the row should be removed). */
export async function sendPush(sub: StoredSubscription, message: { title: string; body: string; url: string }): Promise<'sent' | 'gone' | 'failed'> {
  const keys = await pushKeys();
  try {
    await webpush.sendNotification(sub, JSON.stringify(message), { vapidDetails: { subject: 'https://ascend-five-iota.vercel.app', publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 6 * 3600, urgency: 'normal' });
    return 'sent';
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'gone';
    console.error('push failed:', status, (err as Error).message);
    return 'failed';
  }
}

/** Only real push services may be stored as a destination (the server will later make requests to this address). */
export function isPushEndpoint(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length > 1000) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && /(^|\.)(push\.apple\.com|googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|notify\.windows\.com)$/.test(u.hostname);
  } catch { return false; }
}
