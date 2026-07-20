import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireAuth, hasPermission } from "@/server/middleware/auth";
import { renderInvoicePdf } from "@/server/services/invoices";

/** GST tax invoice PDF (owner or staff). Generated on first request, gap-free numbering. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await ctx.params;
    const isStaff = hasPermission(auth.role, "orders.view");
    const { pdf, filename } = await renderInvoicePdf(id, auth.userId, isStaff);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
