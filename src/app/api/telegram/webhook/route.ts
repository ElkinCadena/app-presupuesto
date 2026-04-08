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

  // ── Comando /ayuda ──────────────────────────────────────────────────────
  if (text === '/ayuda') {
    await sendMessage(
      token,
      chatId,
      '📖 *Comandos disponibles:*\n\n' +
        '/vincular CÓDIGO — Vincular tu cuenta\n' +
        '/ayuda — Ver esta ayuda\n\n' +
        '📝 *Registrar un gasto:*\n' +
        'Envía un mensaje con la descripción y el monto:\n\n' +
        '`Almuerzo 15000`\n' +
        '`15000 Transporte`\n' +
        '`25000`\n\n' +
        'El gasto se registra en el mes actual.'
    );
    return NextResponse.json({ ok: true });
  }

  // ── Registro de gasto (texto libre) ────────────────────────────────────
  const parsed = parseExpenseMessage(text);

  if (!parsed) {
    await sendMessage(token, chatId, '🤖 No entendí ese mensaje.\n\nPara registrar un gasto escribe:\n`Almuerzo 15000`\n\nEscribe /ayuda para más info.');
    return NextResponse.json({ ok: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    await sendMessage(token, chatId, '❌ Error de configuración del servidor.');
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  // Buscar usuario vinculado
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .single();

  if (!profile) {
    await sendMessage(token, chatId, '⚠️ Tu cuenta no está vinculada.\n\nEscribe /start para ver cómo vincularla.');
    return NextResponse.json({ ok: true });
  }

  // Obtener o crear el mes actual
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
      await sendMessage(token, chatId, '❌ No se pudo crear el mes actual. Intenta de nuevo.');
      return NextResponse.json({ ok: true });
    }
    monthRecord = newMonth;
  }

  // Insertar gasto
  const today = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { error: insertError } = await supabase
    .from('expenses')
    .insert({
      month_id: monthRecord.id,
      amount: parsed.amount,
      description: parsed.description,
      date: today,
      category_id: null,
      pocket_id: null,
    });

  if (insertError) {
    await sendMessage(token, chatId, '❌ No se pudo registrar el gasto. Intenta de nuevo.');
    return NextResponse.json({ ok: true });
  }

  const formattedAmount = parsed.amount.toLocaleString('es-CO');
  const descText = parsed.description ? ` — _${parsed.description}_` : '';
  await sendMessage(token, chatId, `✅ Gasto registrado: *$${formattedAmount}*${descText}`);
  return NextResponse.json({ ok: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Parsea un mensaje de texto libre para extraer monto y descripción.
 * Formatos soportados:
 *   "Almuerzo 15000"  → { description: "Almuerzo", amount: 15000 }
 *   "15000 Almuerzo"  → { description: "Almuerzo", amount: 15000 }
 *   "15000"           → { description: null, amount: 15000 }
 */
function parseExpenseMessage(text: string): { amount: number; description: string | null } | null {
  if (!text || text.startsWith('/')) return null;

  // Formato: "Descripción 15000" o "Descripción 15.000" (al final)
  const amountAtEnd = text.match(/^(.+?)\s+([\d.,]+)$/);
  if (amountAtEnd) {
    const amount = parseAmount(amountAtEnd[2]);
    if (amount > 0) return { description: amountAtEnd[1].trim(), amount };
  }

  // Formato: "15000 Descripción" (al inicio)
  const amountAtStart = text.match(/^([\d.,]+)\s+(.+)$/);
  if (amountAtStart) {
    const amount = parseAmount(amountAtStart[1]);
    if (amount > 0) return { description: amountAtStart[2].trim(), amount };
  }

  // Formato: solo número "15000"
  const amount = parseAmount(text);
  if (amount > 0) return { description: null, amount };

  return null;
}

function parseAmount(raw: string): number {
  // Eliminar separadores de miles (puntos o comas) y convertir
  const cleaned = raw.replace(/[.,]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

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
