"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DeadlineBlock } from "@/components/cells/deadline-block";
import { PaymentBlock } from "@/components/cells/payment-block";
import { useTheme } from "@/components/theme-provider";

import dragBlack from "@/icons/drag-black.svg";
import dragIcon from "@/icons/drag.svg";
import editBlack from "@/icons/edit-black.svg";
import editNav from "@/icons/edit-nav.svg";
import editIcon from "@/icons/edit.svg";
import eyeBlack from "@/icons/eye-black.svg";
import eyeNav from "@/icons/eye-nav.svg";
import eyeIcon from "@/icons/eye.svg";

const COLS =
  "grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_40px] gap-x-3";

export type ProjectRow = {
  project: {
    id: string;
    customerName: string;
    shortDescription: string | null;
    slug: string;
    remainingAmountRubles: number;
  };
  deadline: {
    startAt: string | null;
    endAt: string | null;
    comment: string | null;
  } | null;
  paidRubles: number;
  paymentBlocks?: { id: string; body: string | null; color: "green" | "gray" }[];
  backlogPreview: null | {
    assignee: {
      id: string;
      firstName: string;
      lastName: string;
      avatarKey: string | null;
    } | null;
    assigneeAvatarUrl?: string | null;
  };
};

function LkActionButton({
  label,
  iconLight,
  iconDark,
  iconHover,
  onClick,
}: {
  label: string;
  iconLight: string;
  iconDark: string;
  iconHover: string;
  onClick: () => void;
}) {
  const { theme } = useTheme();
  const base = theme === "dark" ? iconDark : iconLight;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-[10px] border border-[var(--lk-border)] bg-transparent px-3 py-2 text-left text-sm transition-colors hover:border-[var(--foreground)]/40"
    >
      <span className="relative h-4 w-4 shrink-0">
        <Image
          src={base}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="transition-opacity duration-200 group-hover:opacity-0"
        />
        <Image
          src={iconHover}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </span>
      {label}
    </button>
  );
}

function PaymentBlocksPreview({
  blocks,
}: {
  blocks: { id: string; body: string | null; color: "green" | "gray" }[];
}) {
  if (!blocks.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {blocks.map((b) => (
        <div
          key={b.id}
          className="rounded-full px-3 py-1 text-xs whitespace-nowrap"
          style={{
            color: b.color === "green" ? "#00B956" : "#8c8c8e",
            backgroundColor:
              b.color === "green" ? "#00B95626" : "#8c8c8e26",
          }}
        >
          {b.body?.trim() ? b.body : " "}
        </div>
      ))}
    </div>
  );
}

function BacklogCell({ preview }: { preview: ProjectRow["backlogPreview"] }) {
  if (!preview) {
    return <span className="text-xs text-[var(--muted)]">Нет списков</span>;
  }
  if (!preview.assignee) {
    return <span className="text-xs text-[var(--muted)]">Без ответственного</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--foreground)]/10 text-center text-xs leading-7">
        {preview.assigneeAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.assigneeAvatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span>
            {preview.assignee.firstName[0]}
            {preview.assignee.lastName[0]}
          </span>
        )}
      </div>
      <span className="text-sm">{preview.assignee.firstName}</span>
    </div>
  );
}

function SortableProjectRow({
  row,
  onCustomer,
  onDeadline,
  onPayments,
  onBacklog,
  onLk,
}: {
  row: ProjectRow;
  onCustomer: () => void;
  onDeadline: () => void;
  onPayments: () => void;
  onBacklog: () => void;
  onLk: () => void;
}) {
  const { theme } = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.project.id,
    transition: {
      duration: 320,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    position: "relative" as const,
    opacity: isDragging ? 0.92 : 1,
  };

  const dragSrc = theme === "dark" ? dragBlack : dragIcon;

  return (
    <div ref={setNodeRef} style={style} className={`${COLS} border-b border-[var(--table-divider)] py-3`}>
      <div className="pr-2">
        <button type="button" className="text-left" onClick={onCustomer}>
          <div className="font-medium">{row.project.customerName}</div>
          {row.project.shortDescription ? (
            <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
              {row.project.shortDescription}
            </div>
          ) : null}
        </button>
      </div>
      <div className="max-w-[220px]">
        <DeadlineBlock
          startAt={row.deadline?.startAt ?? null}
          endAt={row.deadline?.endAt ?? null}
          comment={row.deadline?.comment ?? null}
          onClick={onDeadline}
        />
      </div>
      <div>
        <div className="flex flex-wrap gap-2">
          <LkActionButton
            label="Редактор ЛК"
            iconLight={editIcon}
            iconDark={editBlack}
            iconHover={editNav}
            onClick={onLk}
          />
          <LkActionButton
            label="Просмотр ЛК"
            iconLight={eyeIcon}
            iconDark={eyeBlack}
            iconHover={eyeNav}
            onClick={() =>
              window.open(`/lk/${row.project.slug}`, "_blank", "noopener,noreferrer")
            }
          />
        </div>
      </div>
      <div className="max-w-[220px]">
        <PaymentBlock
          paidRubles={row.paidRubles}
          remainingRubles={row.project.remainingAmountRubles}
          onClick={onPayments}
        />
        <PaymentBlocksPreview blocks={row.paymentBlocks ?? []} />
      </div>
      <div>
        <button type="button" className="w-full text-left" onClick={onBacklog}>
          <BacklogCell preview={row.backlogPreview} />
        </button>
      </div>
      <div className="flex items-start justify-end pt-1">
        <button
          type="button"
          className="cursor-grab touch-none p-1 active:cursor-grabbing"
          aria-label="Перетащить строку"
          {...attributes}
          {...listeners}
        >
          <Image src={dragSrc} alt="" width={18} height={18} unoptimized />
        </button>
      </div>
    </div>
  );
}

type Props = {
  rows: ProjectRow[];
  statusFilter: "active" | "paused" | "completed";
  setPanel: (
    p:
      | { kind: "customer"; id: string }
      | { kind: "deadline"; id: string }
      | { kind: "payments"; id: string }
      | { kind: "backlog"; id: string }
      | { kind: "lk"; id: string },
  ) => void;
  onOrderSaved?: () => void;
};

export function ProjectsSortableTable({
  rows,
  statusFilter,
  setPanel,
  onOrderSaved,
}: Props) {
  const ids = useMemo(() => rows.map((r) => r.project.id), [rows]);
  const [order, setOrder] = useState<string[]>(ids);

  useEffect(() => {
    setOrder(ids);
  }, [ids]);

  const rowById = useMemo(() => {
    const m = new Map(rows.map((r) => [r.project.id, r]));
    return m;
  }, [rows]);

  const orderedRows = useMemo(() => {
    const seen = new Set<string>();
    const out: ProjectRow[] = [];
    for (const id of order) {
      const r = rowById.get(id);
      if (r) {
        out.push(r);
        seen.add(id);
      }
    }
    for (const r of rows) {
      if (!seen.has(r.project.id)) out.push(r);
    }
    return out;
  }, [order, rowById, rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const persistOrder = useCallback(
    async (nextIds: string[], rollback: string[]) => {
      try {
        const res = await fetch("/api/projects/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: statusFilter, orderedIds: nextIds }),
        });
        if (!res.ok) setOrder(rollback);
        else onOrderSaved?.();
      } catch {
        setOrder(rollback);
      }
    },
    [onOrderSaved, statusFilter],
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const prev = order;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    void persistOrder(next, prev);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className="min-w-[900px]">
        <div
          className={`${COLS} border-b border-[var(--table-divider)] pb-2 text-left text-xs text-[var(--muted)]`}
        >
          <div className="pr-2 font-normal">Заказчик</div>
          <div className="font-normal">Текущий дедлайн</div>
          <div className="font-normal">ЛК заказчика</div>
          <div className="font-normal">Оплаты и документы</div>
          <div className="font-normal">Бэклог</div>
          <div className="font-normal" aria-hidden />
        </div>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {orderedRows.map((r) => (
            <SortableProjectRow
              key={r.project.id}
              row={r}
              onCustomer={() => setPanel({ kind: "customer", id: r.project.id })}
              onDeadline={() => setPanel({ kind: "deadline", id: r.project.id })}
              onPayments={() => setPanel({ kind: "payments", id: r.project.id })}
              onBacklog={() => setPanel({ kind: "backlog", id: r.project.id })}
              onLk={() => setPanel({ kind: "lk", id: r.project.id })}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}
