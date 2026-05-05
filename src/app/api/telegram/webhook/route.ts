import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { getCurrentCycle } from '@/lib/utils';

/**
 * POST /api/telegram/webhook
 * Configurar con:
 *   .../setWebhook?url=https://<dominio>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Variables de entorno:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Requiere en Supabase:
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_session jsonb DEFAULT NULL;
 */

// ── Tipos de sesión conversacional ────────────────────────────────────────

type SessionStep =
  | 'select_category'
  | 'enter_expense_detail'
  | 'select_source'
  | 'enter_new_source_name'
  | 'enter_income_amount';

interface TelegramSession {
  flow: 'expense' | 'income';
  step: SessionStep;
  data: {
    category_id?: string | null;
    category_name?: string;
    income_source_label?: string;
    month_id?: string;
  };
}

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

// ── Handler principal ─────────────────────────────────────────────────────

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

  // 2. Despachar callback_query (botones inline pulsados)
  if (body.callback_query) {
    return handleCallbackQuery(token, body.callback_query);
  }

  const message = body.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text?.trim() ?? '';

  // 3. Rate limit por chat
  if (isRateLimited(chatId)) {
    await sendMessage(token, chatId, '⚠️ Demasiados intentos. Espera un momento e intenta de nuevo.');
    return NextResponse.json({ ok: true });
  }

  // /start o /menu → mostrar menú principal (cancela cualquier flujo activo)
  if (text === '/start' || text === '/menu') {
    const supabase = getServiceClient();
    if (supabase) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .single();
      if (prof) await clearSession(supabase, prof.id);
    }
    return handleStart(token, chatId, text === '/start');
  }

  // /vincular CODE
  if (text.startsWith('/vincular ')) {
    return handleVincular(token, chatId, text);
  }

  // /ayuda
  if (text === '/ayuda') {
    await sendMessage(
      token, chatId,
      '📖 *Comandos disponibles:*\n\n' +
      '/menu — Ver el menú principal\n' +
      '/vincular CÓDIGO — Vincular tu cuenta\n' +
      '/ayuda — Ver esta ayuda\n\n' +
      'Desde el menú puedes:\n' +
      '• Registrar gastos por categoría\n' +
      '• Registrar ingresos\n' +
      '• Consultar el estado de tu mensualidad',
      { parse_mode: 'Markdown' }
    );
    return NextResponse.json({ ok: true });
  }

  // Texto libre → verificar sesión activa primero
  const supabase = getServiceClient();
  if (!supabase) {
    await sendMessage(token, chatId, '❌ No se pudo procesar tu solicitud. Intenta más tarde.');
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, billing_cycle_day, telegram_session')
    .eq('telegram_chat_id', chatId)
    .single();

  if (!profile) {
    await sendMessage(token, chatId, '⚠️ Tu cuenta no está vinculada.\n\nGenera un código en *Configuración* de la app y envíalo aquí:\n/vincular CÓDIGO', { parse_mode: 'Markdown' });
    return NextResponse.json({ ok: true });
  }

  const session = profile.telegram_session as TelegramSession | null;

  // Si hay sesión activa, continuar el flujo
  if (session) {
    return handleSessionText(token, chatId, supabase, profile.id, profile.billing_cycle_day ?? 1, session, text);
  }

  // Sin sesión → mostrar menú
  await sendMainMenu(token, chatId, '🤖 Usa el menú para elegir una acción:');
  return NextResponse.json({ ok: true });
}

// ── /start ────────────────────────────────────────────────────────────────

async function handleStart(token: string, chatId: number, isFirst: boolean): Promise<NextResponse> {
  const greeting = isFirst
    ? '👋 ¡Hola! Soy tu asistente de presupuesto personal.\n\nPara vincular tu cuenta genera un código en *Configuración* de la app y envíalo:\n/vincular CÓDIGO\n\nSi ya vinculaste tu cuenta, elige una opción:'
    : '🏠 Menú principal:';
  await sendMainMenu(token, chatId, greeting);
  return NextResponse.json({ ok: true });
}

// ── /vincular CODE ────────────────────────────────────────────────────────

async function handleVincular(token: string, chatId: number, text: string): Promise<NextResponse> {
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

  await sendMainMenu(token, chatId, '✅ ¡Cuenta vinculada correctamente! ¿Qué deseas hacer?');
  return NextResponse.json({ ok: true });
}

// ── Callback query (botones pulsados) ─────────────────────────────────────

async function handleCallbackQuery(token: string, cq: TelegramCallbackQuery): Promise<NextResponse> {
  const chatId = cq.message?.chat.id;
  const callbackId = cq.id;
  const data = cq.data ?? '';

  if (!chatId) {
    await answerCallbackQuery(token, callbackId);
    return NextResponse.json({ ok: true });
  }

  if (isRateLimited(chatId)) {
    await answerCallbackQuery(token, callbackId, '⚠️ Demasiados intentos');
    return NextResponse.json({ ok: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    await answerCallbackQuery(token, callbackId, '❌ Error interno');
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, billing_cycle_day')
    .eq('telegram_chat_id', chatId)
    .single();

  if (!profile) {
    await answerCallbackQuery(token, callbackId, '⚠️ Cuenta no vinculada');
    await sendMessage(token, chatId, '⚠️ Tu cuenta no está vinculada. Usa /vincular CÓDIGO para conectarla.');
    return NextResponse.json({ ok: true });
  }

  await answerCallbackQuery(token, callbackId);

  // ── Flujo: inicio ────────────────────────────────────────────────────
  if (data === 'flow:expense') {
    return startExpenseFlow(token, chatId, supabase, profile.id);
  }
  if (data === 'flow:income') {
    return startIncomeFlow(token, chatId, supabase, profile.id, profile.billing_cycle_day ?? 1);
  }
  if (data === 'flow:status') {
    return handleStatusQuery(token, chatId, supabase, profile.id, profile.billing_cycle_day ?? 1);
  }

  // ── Flujo: selección de categoría ────────────────────────────────────
  if (data.startsWith('cat:')) {
    return handleCategorySelected(token, chatId, supabase, profile.id, data);
  }

  // ── Flujo: selección de fuente de ingreso ─────────────────────────────
  if (data.startsWith('src:')) {
    return handleSourceSelected(token, chatId, supabase, profile.id, data);
  }

  return NextResponse.json({ ok: true });
}

// ── Flujo GASTO — paso 1: listar categorías ───────────────────────────────

async function startExpenseFlow(
  token: string,
  chatId: number,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string
): Promise<NextResponse> {
  const { data: categories } = await supabase!
    .from('expense_categories')
    .select('id, name, color')
    .eq('user_id', profileId)
    .order('name');

  if (!categories || categories.length === 0) {
    await sendMessage(token, chatId, '⚠️ No tienes categorías configuradas. Agrégalas desde la app en *Configuración*. ', { parse_mode: 'Markdown' });
    return NextResponse.json({ ok: true });
  }

  // Botones en filas de 2, más "Sin categoría" al final
  const catButtons: InlineKeyboardButton[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row: InlineKeyboardButton[] = [];
    const cat1 = categories[i];
    const name1 = cat1.name.slice(0, 20);
    row.push({ text: cat1.name, callback_data: `cat:${cat1.id}:${name1}` });
    if (categories[i + 1]) {
      const cat2 = categories[i + 1];
      const name2 = cat2.name.slice(0, 20);
      row.push({ text: cat2.name, callback_data: `cat:${cat2.id}:${name2}` });
    }
    catButtons.push(row);
  }
  catButtons.push([{ text: 'Sin categoría', callback_data: 'cat:null:Sin categoría' }]);

  await setSession(supabase!, profileId, { flow: 'expense', step: 'select_category', data: {} });
  await sendMessageWithKeyboard(token, chatId, '💸 *Registrar gasto*\n\nSelecciona la categoría:', { inline_keyboard: catButtons }, { parse_mode: 'Markdown' });
  return NextResponse.json({ ok: true });
}

// ── Flujo GASTO — paso 2: categoría seleccionada ─────────────────────────

async function handleCategorySelected(
  token: string,
  chatId: number,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string,
  data: string
): Promise<NextResponse> {
  // data = "cat:{uuid}:{name}" o "cat:null:{name}"
  const parts = data.split(':');
  const rawId = parts[1];
  const categoryName = parts.slice(2).join(':');
  const categoryId = rawId === 'null' ? null : rawId;

  await setSession(supabase!, profileId, {
    flow: 'expense',
    step: 'enter_expense_detail',
    data: { category_id: categoryId, category_name: categoryName },
  });

  await sendMessage(
    token, chatId,
    `✅ Categoría: *${categoryName}*\n\nAhora ingresa el concepto y monto:\n_Ejemplo: Almuerzo 15000_`,
    { parse_mode: 'Markdown' }
  );
  return NextResponse.json({ ok: true });
}

// ── Flujo INGRESO — paso 1: listar fuentes ────────────────────────────────

async function startIncomeFlow(
  token: string,
  chatId: number,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string,
  cycleDay: number
): Promise<NextResponse> {
  const monthId = await getOrCreateMonth(supabase!, profileId, cycleDay);
  if (!monthId) {
    await sendMessage(token, chatId, '❌ No se pudo obtener el mes activo. Intenta más tarde.');
    return NextResponse.json({ ok: true });
  }

  const { data: sources } = await supabase!
    .from('income_sources')
    .select('id, label, amount')
    .eq('month_id', monthId)
    .order('label');

  const srcButtons: InlineKeyboardButton[][] = [];

  if (sources && sources.length > 0) {
    for (const src of sources) {
      const label = src.label.slice(0, 55); // max 64 - len("src:") = 60
      srcButtons.push([{ text: src.label, callback_data: `src:${label}` }]);
    }
  }
  srcButtons.push([{ text: '➕ Nueva fuente', callback_data: 'src:__new__' }]);

  await setSession(supabase!, profileId, { flow: 'income', step: 'select_source', data: { month_id: monthId } });

  const intro = sources && sources.length > 0
    ? '💰 *Registrar ingreso*\n\nSelecciona una fuente existente o crea una nueva:'
    : '💰 *Registrar ingreso*\n\nAún no tienes fuentes este mes. Crea una nueva:';

  await sendMessageWithKeyboard(token, chatId, intro, { inline_keyboard: srcButtons }, { parse_mode: 'Markdown' });
  return NextResponse.json({ ok: true });
}

// ── Flujo INGRESO — paso 2: fuente seleccionada ───────────────────────────

async function handleSourceSelected(
  token: string,
  chatId: number,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string,
  data: string
): Promise<NextResponse> {
  const label = data.slice(4); // quitar "src:"

  // Leer sesión para obtener month_id
  const { data: prof } = await supabase!
    .from('profiles')
    .select('telegram_session')
    .eq('id', profileId)
    .single();

  const session = prof?.telegram_session as TelegramSession | null;
  const monthId = session?.data?.month_id;

  if (!monthId) {
    await sendMessage(token, chatId, '❌ Sesión expirada. Usa /menu para empezar de nuevo.');
    return NextResponse.json({ ok: true });
  }

  if (label === '__new__') {
    await setSession(supabase!, profileId, { flow: 'income', step: 'enter_new_source_name', data: { month_id: monthId } });
    await sendMessage(token, chatId, '📝 ¿Cuál es el nombre de la nueva fuente de ingreso?\n_Ej: Salario, Freelance, Arriendo_', { parse_mode: 'Markdown' });
  } else {
    await setSession(supabase!, profileId, { flow: 'income', step: 'enter_income_amount', data: { month_id: monthId, income_source_label: label } });
    await sendMessage(token, chatId, `💵 ¿Cuánto quieres registrar para *${label}*?\n_Ingresa solo el monto: 500000_`, { parse_mode: 'Markdown' });
  }

  return NextResponse.json({ ok: true });
}

// ── Flujo CONSULTAR ESTADO ────────────────────────────────────────────────

async function handleStatusQuery(
  token: string,
  chatId: number,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string,
  cycleDay: number
): Promise<NextResponse> {
  const monthId = await getOrCreateMonth(supabase!, profileId, cycleDay);
  if (!monthId) {
    await sendMessage(token, chatId, '❌ No se pudo obtener el mes activo. Intenta más tarde.');
    return NextResponse.json({ ok: true });
  }

  const [{ data: monthData }, { data: expensesData }] = await Promise.all([
    supabase!.from('months').select('total_income, year, month').eq('id', monthId).single(),
    supabase!.from('expenses').select('amount').eq('month_id', monthId),
  ]);

  const totalIncome = monthData?.total_income ?? 0;
  const totalGastos = (expensesData ?? []).reduce((s, e) => s + e.amount, 0);
  const disponible = totalIncome - totalGastos;

  const mesNombre = monthData
    ? new Date(monthData.year, monthData.month - 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    : 'mes actual';

  const fmt = (n: number) => `$${n.toLocaleString('es-CO')}`;
  const emoji = disponible >= 0 ? '✅' : '⚠️';

  await sendMessage(
    token, chatId,
    `📊 *Estado de ${mesNombre}*\n\n` +
    `💰 Ingresos:    ${fmt(totalIncome)}\n` +
    `💸 Gastos:      ${fmt(totalGastos)}\n` +
    `${emoji} Disponible: ${fmt(disponible)}`,
    { parse_mode: 'Markdown' }
  );

  return NextResponse.json({ ok: true });
}

// ── Manejo de texto libre según sesión activa ─────────────────────────────

async function handleSessionText(
  token: string,
  chatId: number,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string,
  cycleDay: number,
  session: TelegramSession,
  text: string
): Promise<NextResponse> {
  const { flow, step, data } = session;

  // ── EXPENSE: ingresar concepto y monto ───────────────────────────────
  if (flow === 'expense' && step === 'enter_expense_detail') {
    const parsed = parseExpenseMessage(text);
    if (!parsed) {
      await sendMessage(token, chatId, '❌ No pude interpretar eso. Ingresa el concepto y monto:\n_Ej: Almuerzo 15000_', { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }

    const monthId = await getOrCreateMonth(supabase!, profileId, cycleDay);
    if (!monthId) {
      await sendMessage(token, chatId, '❌ No se pudo obtener el mes activo. Intenta más tarde.');
      return NextResponse.json({ ok: true });
    }

    const safeDesc = parsed.description
      ? parsed.description.replace(/\s+/g, ' ').trim().slice(0, 120)
      : null;
    const today = formatDateLocal(new Date());

    const { error } = await supabase!.from('expenses').insert({
      month_id: monthId,
      amount: parsed.amount,
      description: safeDesc,
      date: today,
      category_id: data.category_id ?? null,
      pocket_id: null,
    });

    await clearSession(supabase!, profileId);

    if (error) {
      await sendMessage(token, chatId, '❌ No se pudo registrar el gasto. Intenta más tarde.');
    } else {
      const fmt = `$${parsed.amount.toLocaleString('es-CO')}`;
      const desc = safeDesc ? ` — ${safeDesc}` : '';
      const cat = data.category_name && data.category_name !== 'Sin categoría' ? `\n📂 ${data.category_name}` : '';
      await sendMessage(token, chatId, `✅ *Gasto registrado*\n${fmt}${desc}${cat}`, { parse_mode: 'Markdown' });
    }
    return NextResponse.json({ ok: true });
  }

  // ── INCOME: ingresar nombre de nueva fuente ──────────────────────────
  if (flow === 'income' && step === 'enter_new_source_name') {
    const sourceName = text.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!sourceName) {
      await sendMessage(token, chatId, '❌ El nombre no puede estar vacío.');
      return NextResponse.json({ ok: true });
    }

    await setSession(supabase!, profileId, {
      flow: 'income',
      step: 'enter_income_amount',
      data: { ...data, income_source_label: sourceName },
    });

    await sendMessage(token, chatId, `💵 ¿Cuánto recibes de *${sourceName}*?\n_Ingresa solo el monto: 500000_`, { parse_mode: 'Markdown' });
    return NextResponse.json({ ok: true });
  }

  // ── INCOME: ingresar monto ────────────────────────────────────────────
  if (flow === 'income' && step === 'enter_income_amount') {
    const amount = parseAmount(text);
    if (!amount || amount <= 0) {
      await sendMessage(token, chatId, '❌ Monto inválido. Ingresa solo el número:\n_Ej: 500000_', { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }

    const monthId = data.month_id;
    const label = data.income_source_label;

    if (!monthId || !label) {
      await sendMessage(token, chatId, '❌ Sesión expirada. Usa /menu para empezar de nuevo.');
      await clearSession(supabase!, profileId);
      return NextResponse.json({ ok: true });
    }

    // Verificar si ya existe esta fuente en el mes
    const { data: existing } = await supabase!
      .from('income_sources')
      .select('id')
      .eq('month_id', monthId)
      .eq('label', label)
      .maybeSingle();

    let opError: { message: string } | null = null;

    if (existing) {
      const { error } = await supabase!
        .from('income_sources')
        .update({ amount })
        .eq('id', existing.id);
      opError = error;
    } else {
      const { error } = await supabase!
        .from('income_sources')
        .insert({ month_id: monthId, label, amount });
      opError = error;
    }

    if (opError) {
      await sendMessage(token, chatId, '❌ No se pudo guardar el ingreso. Intenta más tarde.');
      await clearSession(supabase!, profileId);
      return NextResponse.json({ ok: true });
    }

    // Recalcular total_income del mes
    const { data: allSources } = await supabase!
      .from('income_sources')
      .select('amount')
      .eq('month_id', monthId);

    const newTotal = (allSources ?? []).reduce((s, src) => s + src.amount, 0);
    await supabase!.from('months').update({ total_income: newTotal }).eq('id', monthId);

    await clearSession(supabase!, profileId);

    const fmt = `$${amount.toLocaleString('es-CO')}`;
    const action = existing ? 'actualizado' : 'registrado';
    await sendMessage(token, chatId, `✅ *Ingreso ${action}*\n${fmt} — ${label}`, { parse_mode: 'Markdown' });
    return NextResponse.json({ ok: true });
  }

  // Sesión en estado inesperado → limpiar y mostrar menú
  await clearSession(supabase!, profileId);
  await sendMainMenu(token, chatId, '🔄 Sesión reiniciada. ¿Qué deseas hacer?');
  return NextResponse.json({ ok: true });
}

// ── Helpers de BD ─────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

async function getOrCreateMonth(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  userId: string,
  cycleDay: number
): Promise<string | null> {
  const { year, month } = getCurrentCycle(new Date(), cycleDay);

  const { data: existing } = await supabase!
    .from('months')
    .select('id')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('months')
    .insert({ user_id: userId, year, month, total_income: 0 })
    .select('id')
    .single();

  if (error || !created) return null;
  return created.id;
}

async function setSession(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  profileId: string,
  session: TelegramSession
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ telegram_session: session as unknown as Database['public']['Tables']['profiles']['Update']['telegram_session'] })
    .eq('id', profileId);
}

async function clearSession(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  profileId: string
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ telegram_session: null })
    .eq('id', profileId);
}

// ── Helpers de parsing ────────────────────────────────────────────────────

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

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Helpers de Telegram API ───────────────────────────────────────────────

interface SendOptions {
  parse_mode?: 'Markdown' | 'HTML';
}

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][];
}

async function sendMainMenu(token: string, chatId: number, text: string): Promise<void> {
  const keyboard: InlineKeyboard = {
    inline_keyboard: [
      [{ text: '💸 Registrar gasto', callback_data: 'flow:expense' }],
      [{ text: '💰 Registrar ingreso', callback_data: 'flow:income' }],
      [{ text: '📊 Consultar estado', callback_data: 'flow:status' }],
    ],
  };
  await sendMessageWithKeyboard(token, chatId, text, keyboard, { parse_mode: 'Markdown' });
}

async function sendMessage(token: string, chatId: number, text: string, options?: SendOptions): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...options }),
  });
}

async function sendMessageWithKeyboard(
  token: string,
  chatId: number,
  text: string,
  keyboard: InlineKeyboard,
  options?: SendOptions
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: keyboard, ...options }),
  });
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  });
}

// ── Tipos de la API de Telegram ───────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name: string; username?: string };
  text?: string;
  date: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: { id: number; first_name: string; username?: string };
  message?: TelegramMessage;
  data?: string;
}