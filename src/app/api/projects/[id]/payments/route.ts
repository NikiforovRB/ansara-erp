import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, ensureDocumentsLinkTitleColumn } from "@/lib/db";
import {
  documents,
  paymentLedger,
  paymentTextBlocks,
  projects,
} from "@/lib/db/schema";

const putSchema = z.object({
  remainingAmountRubles: z.number().int().min(0),
  textBlocks: z.array(
    z.object({
      body: z.string().optional().nullable(),
      color: z.enum(["green", "gray", "neutral", "red"]),
    }),
  ),
  ledger: z.array(
    z.object({
      amountRubles: z.number().int(),
      paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      comment: z.string().optional().nullable(),
    }),
  ),
  documents: z.array(
    z.object({
      docDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      url: z.string().min(1),
      linkTitle: z.string().optional().nullable(),
      comment: z.string().optional().nullable(),
    }),
  ),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!p) return Response.json({ error: "Не найдено" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const { remainingAmountRubles, textBlocks, ledger, documents: docs } =
    parsed.data;
  const ledgerSorted = [...ledger].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  const docsSorted = [...docs].sort((a, b) => b.docDate.localeCompare(a.docDate));
  const lkShowPayments = (json as { lkShowPayments?: boolean } | null)?.lkShowPayments;

  await ensureDocumentsLinkTitleColumn();

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        remainingAmountRubles,
        ...(typeof lkShowPayments === "boolean" ? { lkShowPayments } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    await tx.delete(paymentTextBlocks).where(eq(paymentTextBlocks.projectId, id));
    if (textBlocks.length) {
      await tx.insert(paymentTextBlocks).values(
        textBlocks.map((b, i) => ({
          projectId: id,
          body: b.body ?? null,
          color: b.color,
          sortOrder: i,
        })),
      );
    }

    await tx.delete(paymentLedger).where(eq(paymentLedger.projectId, id));
    if (ledgerSorted.length) {
      await tx.insert(paymentLedger).values(
        ledgerSorted.map((row) => ({
          projectId: id,
          amountRubles: row.amountRubles,
          paymentDate: row.paymentDate,
          comment: row.comment ?? null,
        })),
      );
    }

    await tx.delete(documents).where(eq(documents.projectId, id));
    if (docsSorted.length) {
      await tx.insert(documents).values(
        docsSorted.map((row) => ({
          projectId: id,
          docDate: row.docDate,
          url: row.url,
          linkTitle: row.linkTitle?.trim() || null,
          comment: row.comment ?? null,
        })),
      );
    }
  });

  return Response.json({ ok: true });
}
