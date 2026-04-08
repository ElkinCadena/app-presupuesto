import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/**
 * POST /api/telegram/webhook
 *
 * Telegram envía aquí cada mensaje recibido por el bot.
 * Configurar con:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<dominio>/api/telegram/webhook
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Bot no configurado' }, { status: 500 });
  }

  let body: TelegramUpdate;
  try {
    body = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const message = body.message;
  if (!message) {
    // Telegram puede enviar otros tipos de updates (edited_message, etc.)
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text?.trim() ?? '';

  // ── Comando /start ────────────────────────────────────────────────────
  if (text === '/start') {
    await sendMessage(token, chatId, '👋 Hola! Para vincular tu cuenta escribe:\n\n/vincular CÓDIGO\n\nEncontrarás tu código en la sección *Configuración* de la app.');
    return NextResponse.json({ ok: true });
  }

  // ── Comando /vincular CODE ────────────────────────────────────────────
  if (text.startsWith('/vincular ')) {
    const code = text.replace('/vincular ', '').trim().toUpperCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      await sendMessage(token, chatId, '❌ Error de configuración del servidor. Contacta al administrador.');
      return NextResponse.json({ ok: true });
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

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
      .update({
        telegram_chat_id: chatId,
        telegram_link_token: null,
        telegram_link_expires_at: null,
      })
      .eq('id', profile.id);

    if (updateError) {
      await sendMessage(token, chatId, '❌ No se pudo completar la vinculación. Intenta de nuevo.');
      return NextResponse.json({ ok: true });
    }

    await sendMessage(token, chatId, '✅ Cuenta vinculada correctamente. Ya puedes registrar gastos desde aquí.');
    return NextResponse.json({ ok: true });
  }

  // ── Mensaje no reconocido ──────────────────────────────────────────────
  await sendMessage(token, chatId, '🤖 No entendí ese mensaje. Escribe /start para comenzar.');
  return NextResponse.json({ ok: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
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
