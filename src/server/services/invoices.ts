import PDFDocument from "pdfkit";
import path from "path";
import { existsSync } from "fs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { badRequest, notFound } from "@/lib/api";
import { fiscalYear, formatInvoiceNumber, amountInWords } from "@/lib/invoice-utils";
import { getSellerGstin, getSetting } from "./settings";

/**
 * GST tax invoices. Numbers are gap-free per Indian fiscal year: the
 * InvoiceCounter row is incremented under SELECT ... FOR UPDATE inside the
 * same transaction that creates the Invoice row.
 */

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true; user: { select: { firstName: true; lastName: true; email: true } } };
}>;

function invoiceEligible(order: OrderWithItems): string | null {
  if (order.status === "CANCELLED") return "Cancelled orders have no invoice";
  if (order.paymentStatus === "PAID") return null;
  if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) return null;
  if (order.channel === "WHOLESALE") return null; // B2B credit sale: invoice on confirmation
  return "The invoice becomes available once the order is paid or dispatched";
}

export async function ensureInvoice(orderId: string, requesterId: string, isStaff: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (!order || (!isStaff && order.userId !== requesterId)) throw notFound("Order");

  const blocked = invoiceEligible(order);
  if (blocked) throw badRequest(blocked);

  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) return { order, invoice: existing };

  const sellerGstin = await getSellerGstin();
  const fy = fiscalYear(new Date());

  const invoice = await prisma.$transaction(async (tx) => {
    // Gap-free sequence under a row lock.
    await tx.$executeRaw`
      INSERT INTO "InvoiceCounter" ("fiscalYear", "lastSequence")
      VALUES (${fy}, 0)
      ON CONFLICT ("fiscalYear") DO NOTHING`;
    const rows = await tx.$queryRaw<{ lastSequence: number }[]>`
      SELECT "lastSequence" FROM "InvoiceCounter" WHERE "fiscalYear" = ${fy} FOR UPDATE`;
    const seq = rows[0].lastSequence + 1;
    await tx.$executeRaw`
      UPDATE "InvoiceCounter" SET "lastSequence" = ${seq} WHERE "fiscalYear" = ${fy}`;

    return tx.invoice.create({
      data: {
        orderId,
        invoiceNumber: formatInvoiceNumber(fy, seq),
        fiscalYear: fy,
        sequence: seq,
        sellerGstin: sellerGstin || null,
        buyerGstin: order.buyerGstin,
      },
    });
  });

  return { order, invoice };
}

// ─────────────────────────── PDF rendering ───────────────────────────

const INR = (n: number | Prisma.Decimal) =>
  `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export async function renderInvoicePdf(orderId: string, requesterId: string, isStaff: boolean): Promise<{ pdf: Buffer; filename: string }> {
  const { order, invoice } = await ensureInvoice(orderId, requesterId, isStaff);
  const storeName = await getSetting("store.name", "Amity Arts");
  const warehouseCity = await getSetting("warehouse.city", "Mumbai");
  const addr = order.shippingAddress as {
    fullName: string; phone: string; line1: string; line2?: string;
    city: string; state: string; stateCode: string; pincode: string;
  };

  const doc = new PDFDocument({ size: "A4", margin: 46 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const ink = "#191612";
  const muted = "#78716c";
  const line = "#ddd6c4";
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // Header: logo + title
  const logoPath = path.join(process.cwd(), "public", "brand", "logo.png");
  if (existsSync(logoPath)) {
    doc.image(logoPath, left, 40, { height: 42 });
  } else {
    doc.font("Helvetica-Bold").fontSize(18).fillColor(ink).text(storeName, left, 46);
  }
  doc.font("Helvetica-Bold").fontSize(16).fillColor(ink).text("TAX INVOICE", left, 50, { width, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor(muted)
    .text(`Invoice ${invoice.invoiceNumber}`, { width, align: "right" })
    .text(
      `Date ${invoice.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
      { width, align: "right" },
    );

  doc.moveTo(left, 108).lineTo(right, 108).strokeColor(line).stroke();

  // Seller / buyer blocks
  const blockY = 122;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("SOLD BY", left, blockY);
  doc.font("Helvetica").fontSize(9).fillColor(muted)
    .text(`${storeName}® India`, left, blockY + 14)
    .text(`${warehouseCity}, Maharashtra`, left)
    .text(invoice.sellerGstin ? `GSTIN: ${invoice.sellerGstin}` : "GSTIN: pending registration entry", left);

  const buyerX = left + width / 2;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("BILLED TO", buyerX, blockY);
  doc.font("Helvetica").fontSize(9).fillColor(muted)
    .text(addr.fullName, buyerX, blockY + 14)
    .text(`${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}`, buyerX)
    .text(`${addr.city}, ${addr.state} ${addr.pincode}`, buyerX)
    .text(`Phone: ${addr.phone}`, buyerX);
  if (invoice.buyerGstin) {
    doc.text(`GSTIN: ${invoice.buyerGstin}`, buyerX);
  }

  doc.font("Helvetica").fontSize(9).fillColor(muted)
    .text(`Order ${order.orderNumber} · ${order.channel === "WHOLESALE" ? "B2B" : "B2C"} · Place of supply: ${addr.state} (${order.placeOfSupplyState})`, left, blockY + 78);

  // Items table — fixed column boxes so nothing overlaps.
  let y = blockY + 102;
  const cols = [
    { key: "name", label: "ITEM", x: left + 4, w: 148, align: "left" as const },
    { key: "hsn", label: "HSN", x: left + 156, w: 32, align: "left" as const },
    { key: "qty", label: "QTY", x: left + 190, w: 26, align: "right" as const },
    { key: "rate", label: "RATE", x: left + 222, w: 60, align: "right" as const },
    { key: "taxable", label: "TAXABLE", x: left + 288, w: 70, align: "right" as const },
    { key: "tax", label: "GST", x: left + 364, w: 66, align: "right" as const },
    { key: "total", label: "TOTAL", x: left + 436, w: width - 440, align: "right" as const },
  ];
  const col = (k: string) => cols.find((c) => c.key === k)!;
  const cell = (k: string, text: string, yy: number) => {
    const c = col(k);
    doc.text(text, c.x, yy, { width: c.w, align: c.align, lineBreak: false, ellipsis: true });
  };

  doc.rect(left, y - 6, width, 20).fillColor("#f4f1e9").fill();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(ink);
  for (const c of cols) doc.text(c.label, c.x, y, { width: c.w, align: c.align, lineBreak: false });
  y += 22;

  doc.font("Helvetica").fontSize(8.5);
  for (const item of order.items) {
    const name = item.variantTitle ? `${item.name} (${item.variantTitle})` : item.name;
    const taxable = Number(item.lineTotal) - Number(item.taxAmount) > 0 && order.channel === "RETAIL"
      ? Number(item.lineTotal) - Number(item.taxAmount)
      : Number(item.unitPrice) * item.quantity;
    doc.fillColor(ink);
    cell("name", name, y);
    doc.fillColor(muted);
    cell("hsn", item.hsnCode ?? "7117", y);
    cell("qty", String(item.quantity), y);
    cell("rate", INR(item.unitPrice), y);
    cell("taxable", INR(taxable), y);
    cell(
      "tax",
      `${Number(item.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} @${Number(item.taxRatePercent)}%`,
      y,
    );
    doc.fillColor(ink);
    cell("total", INR(item.lineTotal), y);
    y += 18;
  }

  doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
  y += 12;

  // Totals block (right aligned)
  const totals: [string, string][] = [
    ["Taxable value", INR(order.subtotal)],
    ...(order.isInterState
      ? ([["IGST", INR(order.igstAmount)]] as [string, string][])
      : ([
          ["CGST", INR(order.cgstAmount)],
          ["SGST", INR(order.sgstAmount)],
        ] as [string, string][])),
    ["Shipping", Number(order.shippingAmount) === 0 ? "Free" : INR(order.shippingAmount)],
  ];
  const totalsLabelX = left + 318;
  const totalsValueX = left + 400;
  const totalsValueW = width - 404;
  for (const [label, value] of totals) {
    doc.font("Helvetica").fontSize(9).fillColor(muted)
      .text(label, totalsLabelX, y, { width: 78, lineBreak: false });
    doc.fillColor(ink).text(value, totalsValueX, y, { width: totalsValueW, align: "right", lineBreak: false });
    y += 15;
  }
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(ink)
    .text("GRAND TOTAL", totalsLabelX - 30, y + 2, { width: 108, lineBreak: false });
  doc.text(INR(order.totalAmount), totalsValueX, y + 2, { width: totalsValueW, align: "right", lineBreak: false });
  y += 26;

  doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(muted)
    .text(`Amount in words: ${amountInWords(Number(order.totalAmount))}`, left, y, { width });
  y += 24;

  // Payment + declaration
  doc.font("Helvetica").fontSize(8.5).fillColor(muted)
    .text(
      `Payment: ${order.paymentMethod.replace("_", " ")} · ${order.paymentStatus}${
        order.paymentMethod === "PAY_LATER" && order.dueDate
          ? ` · due ${order.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
          : ""
      }`,
      left, y,
    );
  y += 22;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
  doc.fontSize(7.5)
    .text(
      order.channel === "RETAIL"
        ? "Prices are inclusive of GST. This is a computer-generated invoice and does not require a signature."
        : "GST charged in addition to the taxable value as itemised above. This is a computer-generated invoice and does not require a signature.",
      left, y + 10, { width },
    );

  doc.end();
  const pdf = await done;
  return { pdf, filename: `${invoice.invoiceNumber.replaceAll("/", "-")}.pdf` };
}
