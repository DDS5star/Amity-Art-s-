import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/**
 * WhatsApp adapter — Meta Business Cloud API driver.
 * Every order event enqueues a WhatsAppMessageLog row (QUEUED) and then
 * attempts delivery. When env keys are absent the message stays logged and
 * sending no-ops gracefully, so the platform works before Meta onboarding.
 */

export interface WhatsAppTemplateMessage {
  toPhone: string; // E.164 without '+', e.g. "919876543210"
  templateName: string; // pre-approved template, e.g. "order_confirmation"
  languageCode?: string; // default "en"
  bodyParams: string[]; // template {{1}}, {{2}}, …
  orderId?: string;
  userId?: string;
}

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

const isConfigured = () =>
  Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MINUTES = [5, 30, 120];

/** Queue + attempt to send. Never throws — messaging must not break checkout. */
export async function sendTemplateMessage(msg: WhatsAppTemplateMessage): Promise<void> {
  const log = await prisma.whatsAppMessageLog.create({
    data: {
      toPhone: msg.toPhone,
      templateName: msg.templateName,
      payload: {
        languageCode: msg.languageCode ?? "en",
        bodyParams: msg.bodyParams,
      } as Prisma.InputJsonValue,
      orderId: msg.orderId,
      userId: msg.userId,
    },
  });
  await attemptSend(log.id);
}

/** Attempt delivery of a queued/failed log row. Used by both the direct path and the retry sweep. */
export async function attemptSend(logId: string): Promise<void> {
  const log = await prisma.whatsAppMessageLog.findUnique({ where: { id: logId } });
  if (!log || log.status === "SENT" || log.status === "DELIVERED" || log.status === "READ") return;

  if (!isConfigured()) {
    // Stay QUEUED: a retry sweep can deliver once keys are configured.
    console.info(`[whatsapp] not configured — "${log.templateName}" to ${log.toPhone} stays queued`);
    return;
  }

  const payload = log.payload as { languageCode: string; bodyParams: string[] };

  try {
    const res = await fetch(
      `${META_GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: log.toPhone,
          type: "template",
          template: {
            name: log.templateName,
            language: { code: payload.languageCode },
            components: payload.bodyParams.length
              ? [
                  {
                    type: "body",
                    parameters: payload.bodyParams.map((text) => ({ type: "text", text })),
                  },
                ]
              : undefined,
          },
        }),
      },
    );

    const body = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };

    if (res.ok && body.messages?.[0]?.id) {
      await prisma.whatsAppMessageLog.update({
        where: { id: logId },
        data: { status: "SENT", providerMessageId: body.messages[0].id, attempts: { increment: 1 } },
      });
      return;
    }
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  } catch (err) {
    const attempts = log.attempts + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    await prisma.whatsAppMessageLog.update({
      where: { id: logId },
      data: {
        status: exhausted ? "FAILED" : "QUEUED",
        attempts,
        lastError: err instanceof Error ? err.message : String(err),
        nextRetryAt: exhausted
          ? null
          : new Date(Date.now() + RETRY_BACKOFF_MINUTES[attempts - 1] * 60_000),
      },
    });
  }
}

/** Retry sweep — call from a cron/route later. */
export async function retryQueuedMessages(limit = 25): Promise<number> {
  const due = await prisma.whatsAppMessageLog.findMany({
    where: {
      status: "QUEUED",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const row of due) await attemptSend(row.id);
  return due.length;
}

// ── Order-event helpers (used by the order service in the next phase) ──

export async function notifyOrderPlaced(params: {
  phone: string;
  customerName: string;
  orderNumber: string;
  totalAmount: string;
  orderId: string;
  userId: string;
}) {
  await sendTemplateMessage({
    toPhone: params.phone,
    templateName: "order_confirmation",
    bodyParams: [params.customerName, params.orderNumber, params.totalAmount],
    orderId: params.orderId,
    userId: params.userId,
  });
}
