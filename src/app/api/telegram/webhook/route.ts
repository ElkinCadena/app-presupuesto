import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/telegram/webhook
 *
 * Telegram envía aquí cada mensaje recibido por el bot.
 * Configurar con:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<dominio>/api/telegram/webhook
 *
 * Fase actual: estructura base — lógica de mensajes en fase siguiente.
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
    // TODO (fase siguiente): validar code contra profiles.telegram_link_token
    //   y guardar telegram_chat_id en el perfil del usuario.
    await sendMessage(token, chatId, `🔗 Código recibido: *${code}*\n\nLa vinculación completa estará disponible próximamente.`);
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
