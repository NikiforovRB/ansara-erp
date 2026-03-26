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
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DeadlineBlock } from "@/components/cells/deadline-block";
import { PaymentBlock } from "@/components/cells/payment-block";
import { useTheme } from "@/components/theme-provider";
import { formatRuDayMonthWeekday } from "@/lib/dates";
import { paymentChipStyles } from "@/lib/payment-chip";

import beklogBlack from "@/icons/beklog-black.svg";
import beklogIcon from "@/icons/beklog.svg";
import calendarBlack from "@/icons/calendar-black.svg";
import calendarIcon from "@/icons/calendar.svg";
import dragBlack from "@/icons/drag-black.svg";
import dragIcon from "@/icons/drag.svg";
import editBlack from "@/icons/edit-black.svg";
import editNav from "@/icons/edit-nav.svg";
import editIcon from "@/icons/edit.svg";
import eyeBlack from "@/icons/eye-black.svg";
import eyeNav from "@/icons/eye-nav.svg";
import eyeIcon from "@/icons/eye.svg";
import copyBlack from "@/icons/copy-black.svg";
import copyIcon from "@/icons/copy.svg";
import copyNav from "@/icons/copy-nav.svg";
import lkBlack from "@/icons/lk-black.svg";
import lkIcon from "@/icons/lk.svg";
import oplataBlack from "@/icons/oplata-black.svg";
import oplataIcon from "@/icons/oplata.svg";
import pauseBlack from "@/icons/pause-black.svg";
import pauseIcon from "@/icons/pause.svg";
import completeIcon from "@/icons/complete.svg";
import docSerIcon from "@/icons/docser.svg";
import docSerBlackIcon from "@/icons/docser-black.svg";
import docGreenIcon from "@/icons/doc-green.svg";
import docRedIcon from "@/icons/doc-red.svg";
import userDark from "@/icons/user.svg";
import user1Icon from "@/icons/user1.svg";

function cols(showBacklog: boolean) {
  return showBacklog
    ? "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,1.15fr)_minmax(0,1.05fr)_40px] gap-x-10"
    : "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,1.15fr)_40px] gap-x-10";
}

export type ProjectRow = {
  project: {
    id: string;
    customerName: string;
    shortDescription: string | null;
    slug: string;
    remainingAmountRubles: number;
    status: "active" | "paused" | "completed";
  };
  deadline: {
    startAt: string | null;
    endAt: string | null;
    comment: string | null;
  } | null;
  paidRubles: number;
  latestTimelineEntryDate?: string | null;
  paymentBlocks?: { id: string; body: string | null; color: "green" | "gray" | "neutral" | "red" }[];
  backlogPreview:
    | null
    | { variant: "all_completed" }
    | {
        variant: "active";
        assignee: {
          id: string;
          firstName: string;
          lastName: string;
          avatarKey: string | null;
        } | null;
        assigneeAvatarUrl?: string | null;
        lastListTitle?: string | null;
        lastListStatus?: "not_started" | "in_progress" | "completed" | "rejected";
        lastFormedAt?: string | null;
      };
};

function LkActionButton({
  label,
  iconLight,
  iconDark,
  iconHover,
  onClick,
  className = "",
}: {
  label: string;
  iconLight: string;
  iconDark: string;
  iconHover: string;
  onClick: () => void;
  className?: string;
}) {
  const { theme } = useTheme();
  const base = theme === "dark" ? iconDark : iconLight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex w-max max-w-full items-center gap-1.5 px-1 py-0 text-left text-[8px] leading-tight transition-colors hover:text-[#5A86EE] ${
        theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"
      } ${className}`.trim()}
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
  blocks: { id: string; body: string | null; color: "green" | "gray" | "neutral" | "red" }[];
}) {
  const { theme } = useTheme();
  if (!blocks.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {blocks.map((b) => {
        if (b.body == null) {
          const src =
            b.color === "green"
              ? docGreenIcon
              : b.color === "red"
                ? docRedIcon
                : theme === "dark"
                  ? docSerBlackIcon
                  : docSerIcon;
          return (
            <div
              key={b.id}
              className="inline-flex h-8 w-8 -ml-1 -mr-0.5 items-center justify-center rounded-full"
            >
              <Image src={src} alt="" width={20} height={20} unoptimized />
            </div>
          );
        }

        const hasText = Boolean(b.body?.trim());
        const chip = paymentChipStyles(
          b.color === "red" ? "gray" : (b.color as "green" | "gray" | "neutral"),
          theme,
        );
        return (
          <div
            key={b.id}
            className={`flex min-h-[24px] items-center rounded-full py-0.5 text-xs whitespace-nowrap ${
              hasText ? "min-w-0 px-3" : "w-[43px] shrink-0 justify-center px-0"
            }`}
            style={{
              color: chip.color,
              backgroundColor: chip.backgroundColor,
              borderWidth: chip.borderColor ? 1 : 0,
              borderStyle: chip.borderColor ? "solid" : "none",
              borderColor: chip.borderColor ?? "transparent",
            }}
          >
            {hasText ? b.body : "\u00A0"}
          </div>
        );
      })}
    </div>
  );
}

function BacklogCell({ preview }: { preview: ProjectRow["backlogPreview"] }) {
  const { theme } = useTheme();
  const labelCol = theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]";
  const emptyStyle =
    theme === "dark" ? "text-[#474747] italic" : "text-[#dadada] italic";
  if (!preview) {
    return <span className={`text-xs ${emptyStyle}`}>Нет списков</span>;
  }
  if (preview.variant === "all_completed") {
    return (
      <span className={`text-xs ${emptyStyle}`}>Нет актуальных задач</span>
    );
  }
  const title = preview.lastListTitle?.trim() ?? "";
  const doneLast = preview.lastListStatus === "completed";
  const formedLine =
    preview.lastFormedAt != null && preview.lastFormedAt !== ""
      ? formatRuDayMonthWeekday(preview.lastFormedAt)
      : null;
  return (
    <div className="w-full min-w-0 pl-[6px]">
      {title ? (
        <div className="w-full text-sm leading-tight line-clamp-2" title={title}>
          {title}
        </div>
      ) : null}
      {formedLine ? (
        <div className={`text-xs leading-tight ${labelCol} ${title ? "mt-1" : ""}`}>{formedLine}</div>
      ) : null}
      {doneLast ? (
        <div className="mt-1 text-xs font-medium" style={{ color: "#00B956" }}>
          Выполнено
        </div>
      ) : null}
      <div className={`flex gap-2 ${title || formedLine || doneLast ? "mt-2" : ""}`}>
        <div className="shrink-0">
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--foreground)]/10 text-center text-xs leading-7">
            {preview.assignee && preview.assigneeAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.assigneeAvatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : preview.assignee ? (
              <span>
                {preview.assignee.firstName[0]}
                {preview.assignee.lastName?.trim()?.[0] ?? ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-start gap-0.5">
          {!preview.assignee ? (
            <span className="text-xs text-[var(--muted)]">Без ответственного</span>
          ) : (
            <>
              <span className={`text-[10px] leading-none ${labelCol}`}>Ответственный</span>
              <span className="text-sm leading-tight">
                {preview.assignee.firstName}
                {preview.assignee.lastName?.trim()
                  ? ` ${preview.assignee.lastName.trim()}`
                  : ""}
              </span>
            </>
          )}
        </div>
      </div>
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
  showBacklogColumn,
}: {
  row: ProjectRow;
  onCustomer: () => void;
  onDeadline: () => void;
  onPayments: () => void;
  onBacklog: () => void;
  onLk: () => void;
  showBacklogColumn: boolean;
}) {
  const { theme } = useTheme();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
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
  const cellHover =
    theme === "dark"
      ? "-mx-1 rounded-md px-1 py-1 transition-colors hover:bg-[#1d1d1e]"
      : "-mx-1 rounded-md px-1 py-1 transition-colors hover:bg-[#f5f5f5]";

  const latestInfo = useMemo(() => {
    const raw = row.latestTimelineEntryDate;
    if (!raw) return null;
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startEntry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startToday.getTime() - startEntry.getTime()) / 86400000);
    const wd = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][d.getDay()] ?? "";
    const text = `${d.getDate()}, ${wd}`;
    const isToday = diffDays === 0;
    const isYesterday = diffDays === 1;
    const isFridayCarry =
      d.getDay() === 5 &&
      ((today.getDay() === 6 && diffDays === 1) ||
        (today.getDay() === 0 && diffDays === 2) ||
        (today.getDay() === 1 && diffDays === 3));
    const color = isToday
      ? "#00B956"
      : isYesterday || isFridayCarry
        ? theme === "dark"
          ? "#666666"
          : "#a4a4a4"
        : "#F33737";
    return { text, color };
  }, [row.latestTimelineEntryDate, theme]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${cols(showBacklogColumn)} border-b border-[var(--table-divider)] py-2`}
    >
      <div className={`flex min-h-[70px] items-start pr-2 ${cellHover}`}>
        <button
          type="button"
          className="flex min-h-[70px] w-full flex-col items-start justify-start text-left"
          onClick={onCustomer}
        >
          <div className="flex w-full items-start gap-2">
            {row.project.status === "paused" ? (
              <Image
                src={theme === "dark" ? pauseBlack : pauseIcon}
                alt=""
                width={18}
                height={18}
                unoptimized
                className="mt-0.5 shrink-0"
              />
            ) : null}
            {row.project.status === "completed" ? (
              <Image
                src={completeIcon}
                alt=""
                width={18}
                height={18}
                unoptimized
                className="mt-0.5 shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="font-medium">{row.project.customerName}</div>
              {row.project.shortDescription ? (
                <div className="mt-1 whitespace-pre-wrap text-xs text-[var(--muted)]">
                  {row.project.shortDescription}
                </div>
              ) : null}
            </div>
          </div>
        </button>
      </div>
      <div className={`flex min-h-[70px] max-w-[300px] items-start ${cellHover}`}>
        <DeadlineBlock
          startAt={row.deadline?.startAt ?? null}
          endAt={row.deadline?.endAt ?? null}
          comment={row.deadline?.comment ?? null}
          onClick={onDeadline}
          className="min-h-[70px] w-full"
        />
      </div>
      <div className="flex min-h-[70px] w-full flex-col items-center justify-start gap-[5px] pt-0">
        <div className="flex items-center">
          <LkActionButton
            label="Редактор ЛК"
            iconLight={editIcon}
            iconDark={editBlack}
            iconHover={editNav}
            onClick={onLk}
          />
          {latestInfo ? (
            <span className="ml-[10px] text-[11px] leading-none" style={{ color: latestInfo.color }}>
              {latestInfo.text}
            </span>
          ) : null}
        </div>
        <div className="flex items-center">
          <LkActionButton
            label="Просмотр ЛК"
            iconLight={eyeIcon}
            iconDark={eyeBlack}
            iconHover={eyeNav}
            onClick={() =>
              window.open(`/lk/${row.project.slug}`, "_blank", "noopener,noreferrer")
            }
          />
          <LkActionButton
            label=""
            className="ml-[10px]"
            iconLight={copyIcon}
            iconDark={copyBlack}
            iconHover={copyNav}
            onClick={() => {
              const url = `${window.location.origin}/lk/${row.project.slug}`;
              void navigator.clipboard.writeText(url).then(() => {
                setCopiedLink(url);
                window.setTimeout(() => setCopiedLink(null), 1000);
              });
            }}
          />
        </div>
        {copiedLink ? (
          <span className="mt-1 block text-[10px] text-[#00B956]">
            Ссылка {copiedLink} скопирована
          </span>
        ) : null}
      </div>
      <div
        className={`flex min-h-[70px] max-w-[400px] flex-col items-stretch gap-[9px] ${cellHover} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A86EE]`}
        role="button"
        tabIndex={0}
        onClick={onPayments}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPayments();
          }
        }}
      >
        <PaymentBlock
          paidRubles={row.paidRubles}
          remainingRubles={row.project.remainingAmountRubles}
          className="w-full"
        />
        <PaymentBlocksPreview blocks={row.paymentBlocks ?? []} />
      </div>
      {showBacklogColumn ? (
        <div className={`flex min-h-[70px] items-start ${cellHover}`}>
          <button
            type="button"
            className="flex min-h-[70px] w-full flex-col items-start justify-start text-left"
            onClick={onBacklog}
          >
            <BacklogCell preview={row.backlogPreview} />
          </button>
        </div>
      ) : null}
      <div className="flex min-h-[70px] items-start justify-end pt-0.5">
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
  showBacklogColumn?: boolean;
};

function TableHeadIcon({
  iconLight,
  iconDark,
  children,
}: {
  iconLight: string;
  iconDark: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const icon = theme === "dark" ? iconDark : iconLight;
  const cls = theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]";
  return (
    <div className={`flex items-center gap-2 font-normal ${cls}`}>
      <Image src={icon} alt="" width={16} height={16} unoptimized className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function ProjectsSortableTable({
  rows,
  statusFilter,
  setPanel,
  onOrderSaved,
  showBacklogColumn = true,
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
      <div className={showBacklogColumn ? "min-w-[900px]" : "min-w-[760px]"}>
        <div
          className={`${cols(showBacklogColumn)} border-b border-[var(--table-divider)] pb-2 text-left text-xs`}
        >
          <div className="pr-2">
            <TableHeadIcon iconLight={user1Icon} iconDark={userDark}>
              Заказчик
            </TableHeadIcon>
          </div>
          <TableHeadIcon iconLight={calendarIcon} iconDark={calendarBlack}>
            Текущий дедлайн
          </TableHeadIcon>
          <div className="flex w-full justify-center">
            <TableHeadIcon iconLight={lkIcon} iconDark={lkBlack}>
              ЛК заказчика
            </TableHeadIcon>
          </div>
          <TableHeadIcon iconLight={oplataIcon} iconDark={oplataBlack}>
            Оплаты и документы
          </TableHeadIcon>
          {showBacklogColumn ? (
            <TableHeadIcon iconLight={beklogIcon} iconDark={beklogBlack}>
              Бэклог
            </TableHeadIcon>
          ) : null}
          <div aria-hidden />
        </div>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {orderedRows.map((r) => (
            <SortableProjectRow
              key={r.project.id}
              row={r}
              onCustomer={() => setPanel({ kind: "customer", id: r.project.id })}
              onDeadline={() => setPanel({ kind: "deadline", id: r.project.id })}
              onPayments={() => setPanel({ kind: "payments", id: r.project.id })}
              onBacklog={
                showBacklogColumn
                  ? () => setPanel({ kind: "backlog", id: r.project.id })
                  : () => {}
              }
              onLk={() => setPanel({ kind: "lk", id: r.project.id })}
              showBacklogColumn={showBacklogColumn}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}
