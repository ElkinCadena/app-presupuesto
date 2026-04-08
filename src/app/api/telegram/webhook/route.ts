import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/**
 * POST /api/telegram/webhook
 * Configurar con:
 *   .../setWebhook?url=https://<dominio>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Variables de entorno:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

// ── Rate limit: máx 15 mensajes/minuto por chat ───────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const rateLimitMap = new Map<number, { count: number; windowStart: number }>();

function isRateLimited(chatId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(chatId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(chatId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validar secret token del webhook
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (incomingSecret !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 500 });

  let body: TelegramUpdate;
  try {
    body = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = body.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text?.trim() ?? '';

  // 2. Rate limit por chat
  if (isRateLimited(chatId)) {
    await sendMessage(token, chatId, '⚠️ Demasiados intentos. Espera un momento e intenta de nuevo.');
    return NextResponse.json({ ok: true });
  }

  // /start
  if (text === '/start') {
    await sendMessage(token, chatId, '👋 Hola! Para vincular tu cuenta escribe:\n\n/vincular CÓDIGO\n\nEncontrarás tu código en la sección Configuración de la app.');
    return NextResponse.json({ ok: true });
  }

  // /vincular CODE
  if (text.startsWith('/vincular ')) {
    const code = text.replace('/vincular ', '').trim().toUpperCase();
    const supabase = getServiceClient();
    if (!supabase) {
      await sendMessage(token, chatId, '❌ No se pudo procesar tu solicitud. Intenta más tarde.');
      return NextResponse.json({ ok: true });
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, telegram_link_token, telegram_link_expires_at')
      .eq('telegram_link_token', code)
      .single();

    const isValid =
      !fetchError &&
      profile !== null &&
      profile.telegram_link_expires_at !== null &&
      new Date(profile.telegram_link_expires_at) > new Date();

    if (!isValid) {
      await sendMessage(token, chatId, '❌ Código inválido o expirado. Genera uno nuevo desde la app.');
      return NextResponse.json({ ok: true });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: chatId, telegram_link_token: null, telegram_link_expires_at: null })
      .eq('id', profile.id);

    if (updateError) {
      await sendMessage(token, chatId, '❌ No se pudo procesar tu solicitud. Intenta más tarde.');
      return NextResponse.json({ ok: true });
    }

    await sendMessage(token, chatId, '✅ Cuenta vinculada correctamente. Ya puedes registrar gastos desde aquí.');
    return NextResponse.json({ ok: true });
  }

  // /ayuda
  if (text === '/ayuda') {
    await sendMessage(
      token, chatId,
      '📖 Comandos disponibles:\n\n/vincular CÓDIGO — Vincular tu cuenta\n/ayuda — Ver esta ayuda\n\n📝 Registrar un gasto:\nEnvía la descripción y el monto:\n\nAlmuerzo 15000\n15000 Transporte\n25000\n\nEl gasto se registra en el mes actual.'
    );
    return NextResponse.json({ ok: true });
  }

  // Texto libre → gasto
  const parsed = parseExpenseMessage(text);
  if (!parsed) {
    await sendMessage(token, chatId, '🤖 No entendí ese mensaje.\n\nPara registrar un gasto escribe la descripción y el monto:\nAlmuerzo 15000\n\nEscribe /ayuda para más info.');
    return NextResponse.json({ ok: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    await sendMessage(token, chatId, '❌ No se pudo procesar tu solicitud. Intenta más tarde.');
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .single();

  if (!profile) {
    await sendMessage(token, chatId, '⚠️ No se pudo registrar el gasto. Vincula tu cuenta desde la app y vuelve a intentar.');
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let { data: monthRecord } = await supabase
    .from('months')
    .select('id')
    .eq('user_id', profile.id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (!monthRecord) {
    const { data: newMonth, error: createMonthError } = await supabase
      .from('months')
      .insert({ user_id: profile.id, year, month, total_income: 0 })
      .select('id')
      .single();

    if (createMonthError || !newMonth) {
      await sendMessage(token, chatId, '❌ No se pudo procesar tu solicitud. Intenta más tarde.');
      return NextResponse.json({ ok: true });
    }
    monthRecord = newMonth;
  }

  const safeDescription = parsed.description
    ? parsed.description.replace(/\s+/g, ' ').trim().slice(0, 120)
    : null;

  const today = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { error: insertError } = await supabase.from('expenses').insert({
    month_id: monthRecord.id,
    amount: parsed.amount,
    description: safeDescription,
    date: today,
    category_id: null,
    pocket_id: null,
  });

  if (insertError) {
    await sendMessage(token, chatId, '❌ No se pudo procesar tu solicitud. Intenta más tarde.');
    return NextResponse.json({ ok: true });
  }

  const formattedAmount = parsed.amount.toLocaleString('es-CO');
  const descText = safeDescription ? ` — ${safeDescription}` : '';
  await sendMessage(token, chatId, `✅ Gasto registrado: $${formattedAmount}${descText}`);
  return NextResponse.json({ ok: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

function parseExpenseMessage(text: string): { amount: number; description: string | null } | null {
  if (!text || text.startsWith('/')) return null;

  const amountAtEnd = text.match(/^(.+?)\s+([\d.,]+)$/);
  if (amountAtEnd) {
    const amount = parseAmount(amountAtEnd[2]);
    if (amount > 0) return { description: amountAtEnd[1].trim(), amount };
  }

  const amountAtStart = text.match(/^([\d.,]+)\s+(.+)$/);
  if (amountAtStart) {
    const amount = parseAmount(amountAtStart[1]);
    if (amount > 0) return { description: amountAtStart[2].trim(), amount };
  }

  const amount = parseAmount(text);
  if (amount > 0) return { description: null, amount };

  return null;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[.,]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// ── Tipos de la API de Telegram ───────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name: string; username?: string };
  text?: string;
  date: number;
}