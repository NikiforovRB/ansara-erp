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
import { nanoid } from "nanoid";
import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DatePickerField } from "@/components/minimal-date-picker";
import { formatRuDayMonthWeekday } from "@/lib/dates";
import { IconCheckbox } from "@/components/icon-checkbox";
import { RightPanel } from "@/components/right-panel";
import { useTheme } from "@/components/theme-provider";
import addDocumentBlack from "@/icons/add-document-black.svg";
import addDocumentIcon from "@/icons/add-document.svg";
import addDocumentNav from "@/icons/add-document-nav.svg";
import deleteBlack from "@/icons/delete-black.svg";
import deleteIcon from "@/icons/delete.svg";
import deleteNav from "@/icons/delete-nav.svg";
import downBlack from "@/icons/down-black.svg";
import downNav from "@/icons/down-nav.svg";
import downIcon from "@/icons/down.svg";
import dragBlack from "@/icons/drag-black.svg";
import dragIcon from "@/icons/drag.svg";
import upBlack from "@/icons/up-black.svg";
import upNav from "@/icons/up-nav.svg";
import upIcon from "@/icons/up.svg";
import plusBlack from "@/icons/plus-black.svg";
import plusIcon from "@/icons/plus.svg";
import plusNav from "@/icons/plus-nav.svg";
import saveWhite from "@/icons/save-white.svg";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function fieldClass(extra = "") {
  return `form-input ${extra}`.trim();
}

function btnFooter(onCancel: () => void, onSave: () => void, disabled?: boolean) {
  return (
    <>
      <button
        type="button"
        className="rounded px-4 py-2 text-sm opacity-80 hover:opacity-100"
        onClick={onCancel}
      >
        Отмена
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40 bg-[#0f68e4] hover:bg-[#2677e8]"
        onClick={() => void onSave()}
        disabled={disabled}
      >
        <Image src={saveWhite} alt="" width={18} height={18} unoptimized />
        Сохранить
      </button>
    </>
  );
}

function SettingsLbl({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <span
      className={`text-xs ${theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"}`}
    >
      {children}
    </span>
  );
}

export type BacklogListStatus = "not_started" | "in_progress" | "completed" | "rejected";

const STATUS_LABELS: Record<BacklogListStatus, string> = {
  not_started: "Не в работе",
  in_progress: "В работе",
  completed: "Выполнено",
  rejected: "Отклонено",
};

const STATUS_TEXT_COLORS: Record<BacklogListStatus, string> = {
  not_started: "#8c8c8e",
  in_progress: "#5A86EE",
  completed: "#00B956",
  rejected: "#F33737",
};

function statusPillStyle(status: BacklogListStatus): CSSProperties {
  const c = STATUS_TEXT_COLORS[status];
  return {
    color: c,
    backgroundColor: `${c}33`,
  };
}

type BlTask = { id: string; description: string; done: boolean };
type BlList = {
  clientId: string;
  title: string;
  assigneeUserId: string | null;
  listStatus: BacklogListStatus;
  formedAt: string;
  tasks: BlTask[];
};

type StaffUser = {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  role: "admin" | "employee";
};

function TaskLineEditor({
  value,
  onChange,
  lineThrough,
}: {
  value: string;
  onChange: (v: string) => void;
  lineThrough?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || focusedRef.current) return;
    if (el.innerText !== value) el.innerText = value;
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`min-h-[1.25em] w-full min-w-0 flex-1 cursor-text px-0 py-0 text-sm font-normal leading-normal text-[var(--foreground)] outline-none ${
        lineThrough ? "line-through opacity-80" : ""
      }`}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        onChange(ref.current?.innerText?.replace(/\r\n/g, "\n").trim() ?? "");
      }}
      onInput={() => {
        onChange(ref.current?.innerText?.replace(/\r\n/g, "\n") ?? "");
      }}
    />
  );
}

function SortableTaskRow({
  task,
  onChangeDescription,
  onToggleDone,
  onDelete,
  editing,
  onStartEdit,
  onEndEdit,
}: {
  task: BlTask;
  onChangeDescription: (v: string) => void;
  onToggleDone: (done: boolean) => void;
  onDelete: () => void;
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}) {
  const { theme } = useTheme();
  const dragSrc = theme === "dark" ? dragBlack : dragIcon;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex min-h-[36px] items-center gap-2 border-b border-[var(--table-divider)] py-1.5 last:border-b-0"
    >
      <IconCheckbox
        checked={task.done}
        onChange={onToggleDone}
        ariaLabel="Выполнено"
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <TaskLineEditor
            value={task.description}
            onChange={onChangeDescription}
            lineThrough={task.done}
          />
        ) : (
          <button
            type="button"
            className={`w-full text-left text-sm font-normal leading-normal text-[var(--foreground)] ${
              task.done ? "line-through opacity-80" : ""
            }`}
            onClick={onStartEdit}
          >
            {task.description || <span className="text-[var(--muted)]">Задача</span>}
          </button>
        )}
      </div>
      {editing ? (
        <button type="button" className="shrink-0 text-xs text-[var(--muted)] underline" onClick={onEndEdit}>
          Готово
        </button>
      ) : null}
      <button
        type="button"
        className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center"
        aria-label="Удалить задачу"
        onClick={onDelete}
      >
        <Image
          src={theme === "dark" ? deleteBlack : deleteIcon}
          alt=""
          width={18}
          height={18}
          unoptimized
          className="transition-opacity duration-200 group-hover:opacity-0"
        />
        <Image
          src={deleteNav}
          alt=""
          width={18}
          height={18}
          unoptimized
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </button>
      <button
        type="button"
        className="cursor-grab touch-none shrink-0 p-1 active:cursor-grabbing"
        aria-label="Перетащить"
        {...attributes}
        {...listeners}
      >
        <Image src={dragSrc} alt="" width={16} height={16} unoptimized />
      </button>
    </div>
  );
}

export function BacklogFormPanel({
  open,
  projectId,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const [customerName, setCustomerName] = useState("");
  const [lists, setLists] = useState<BlList[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingTask, setEditingTask] = useState<{ li: number; ti: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    setEditingTask(null);
    void (async () => {
      const [j, u] = await Promise.all([
        fetchJson(`/api/projects/${projectId}`).catch(() => null),
        fetchJson("/api/users").catch(() => ({ users: [] })),
      ]);
      setStaff(u.users ?? []);
        setCustomerName(j?.project?.customerName ?? "");
      if (!j || !j.backlog) {
        setLists([]);
        setExpanded({});
        setFetching(false);
        return;
      }
      const grouped = new Map<
        string,
        {
          clientId: string;
          title: string;
          assigneeUserId: string | null;
          listStatus: BacklogListStatus;
          formedAt: string;
          tasks: BlTask[];
        }
      >();
      const order: string[] = [];
      const bl = j.backlog as {
        lists: {
          list: {
            id: string;
            title: string;
            listStatus?: BacklogListStatus;
            formedAt?: string;
          };
          assignee: { id: string } | null;
        }[];
        tasks: { listId: string; description: string; done: boolean }[];
      };
      for (const { list, assignee } of bl.lists) {
        order.push(list.id);
        grouped.set(list.id, {
          clientId: list.id,
          title: list.title,
          assigneeUserId: assignee?.id ?? null,
          listStatus: list.listStatus ?? "not_started",
          formedAt: list.formedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
          tasks: [],
        });
      }
      for (const t of bl.tasks) {
        const g = grouped.get(t.listId);
        if (g)
          g.tasks.push({
            id: nanoid(),
            description: t.description,
            done: t.done,
          });
      }
      const nextLists = order.map((id) => grouped.get(id)!);
      setLists(nextLists);
      const ex: Record<string, boolean> = {};
      for (let i = 0; i < nextLists.length; i++) {
        ex[nextLists[i]!.clientId] = i === 0;
      }
      setExpanded(ex);
      setFetching(false);
    })();
  }, [open, projectId]);

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/backlog`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lists: lists.map((l) => ({
            title: l.title,
            assigneeUserId: l.assigneeUserId,
            listStatus: l.listStatus,
            formedAt: l.formedAt,
            tasks: l.tasks.map((t) => ({ description: t.description, done: t.done })),
          })),
        }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Ошибка");
    } finally {
      setBusy(false);
    }
  }

  function onDragEnd(li: number) {
    return (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const list = lists[li];
      if (!list) return;
      const ids = list.tasks.map((t) => t.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      setLists((prev) =>
        prev.map((x, j) =>
          j === li ? { ...x, tasks: arrayMove(x.tasks, oldIndex, newIndex) } : x,
        ),
      );
    };
  }

  const addListMuted =
    theme === "dark" ? "text-[#666666] hover:text-[#5A86EE]" : "text-[#a4a4a4] hover:text-[#5A86EE]";
  const addTaskMuted = addListMuted;
  const delListMuted =
    theme === "dark" ? "text-[#666666] hover:text-[#F33737]" : "text-[#a4a4a4] hover:text-[#F33737]";

  return (
    <RightPanel
      open={open}
      title="Бэклог"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy)}
      contentLoading={fetching}
      saving={busy}
    >
      {customerName ? (
        <p className="mb-4 text-sm" style={{ color: theme === "dark" ? "#666666" : "#a4a4a4" }}>
          {customerName}
        </p>
      ) : null}
      <button
        type="button"
        className={`group inline-flex items-center gap-2 text-sm transition-colors ${addListMuted}`}
        onClick={() => {
          setLists((ls) => {
            const cid = nanoid();
            const next: BlList[] = [
              {
                clientId: cid,
                title: "Новый список",
                assigneeUserId: null,
                listStatus: "not_started",
                formedAt: new Date().toISOString().slice(0, 10),
                tasks: [],
              },
              ...ls,
            ];
            setExpanded(
              Object.fromEntries(next.map((l, i) => [l.clientId, i === 0])),
            );
            return next;
          });
        }}
      >
        <span className="relative h-5 w-5 shrink-0">
          <Image
            src={theme === "dark" ? addDocumentBlack : addDocumentIcon}
            alt=""
            width={20}
            height={20}
            unoptimized
            className="transition-opacity duration-200 group-hover:opacity-0"
          />
          <Image
            src={addDocumentNav}
            alt=""
            width={20}
            height={20}
            unoptimized
            className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        </span>
        Добавить список
      </button>

      <div className="mt-6 space-y-0">
        {lists.length > 0 ? (
          <div
            aria-hidden
            className="h-px w-full"
            style={{ backgroundColor: theme === "dark" ? "#474747" : "#dadada" }}
          />
        ) : null}
        {lists.map((list, li) => {
          const isOpen = expanded[list.clientId] ?? false;
          const dateMuted = theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]";

          return (
            <div key={list.clientId}>
              <div
                className="border-b pt-4 pb-4"
                style={{ borderColor: theme === "dark" ? "#474747" : "#dadada" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {!isOpen ? (
                      <>
                        <div className={`text-xs ${dateMuted}`}>
                          {formatRuDayMonthWeekday(list.formedAt)}
                        </div>
                        <div className="mt-1 text-xl font-normal leading-snug text-[var(--foreground)]">
                          {list.title || "Без названия"}
                        </div>
                        <div className="mt-2">
                          <span
                            className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                            style={statusPillStyle(list.listStatus)}
                          >
                            {STATUS_LABELS[list.listStatus]}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`group shrink-0 inline-flex items-center gap-1.5 text-sm transition-colors ${
                      theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"
                    } hover:text-[#5A86EE]`}
                    onClick={() =>
                      setExpanded((e) => ({
                        ...e,
                        [list.clientId]: !isOpen,
                      }))
                    }
                  >
                    <span className="relative h-4 w-4 shrink-0">
                      {isOpen ? (
                        <>
                          <Image
                            src={theme === "dark" ? upBlack : upIcon}
                            alt=""
                            width={16}
                            height={16}
                            unoptimized
                            className="transition-opacity duration-200 group-hover:opacity-0"
                          />
                          <Image
                            src={upNav}
                            alt=""
                            width={16}
                            height={16}
                            unoptimized
                            className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          />
                        </>
                      ) : (
                        <>
                          <Image
                            src={theme === "dark" ? downBlack : downIcon}
                            alt=""
                            width={16}
                            height={16}
                            unoptimized
                            className="transition-opacity duration-200 group-hover:opacity-0"
                          />
                          <Image
                            src={downNav}
                            alt=""
                            width={16}
                            height={16}
                            unoptimized
                            className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          />
                        </>
                      )}
                    </span>
                    {isOpen ? "Свернуть список" : "Развернуть список"}
                  </button>
                </div>

                {isOpen ? (
                  <>
                    <div className="mt-4 space-y-3 md:space-y-2">
                      <div className="hidden min-w-0 md:flex md:gap-x-3 md:items-baseline">
                        <div className="min-w-0 flex-1">
                          <SettingsLbl>Заголовок списка задач</SettingsLbl>
                        </div>
                        <div className="min-w-0 flex-1">
                          <SettingsLbl>Статус</SettingsLbl>
                        </div>
                        <div className="min-w-0 flex-1">
                          <SettingsLbl>Ответственный</SettingsLbl>
                        </div>
                        <div className="min-w-0 flex-1">
                          <SettingsLbl>Дата формирования списка</SettingsLbl>
                        </div>
                      </div>
                      <div className="hidden min-w-0 md:grid md:grid-cols-4 md:gap-x-3 md:gap-y-0">
                        <input
                          className={fieldClass("text-xl font-semibold leading-snug")}
                          value={list.title}
                          onChange={(e) =>
                            setLists((prev) =>
                              prev.map((x, j) =>
                                j === li ? { ...x, title: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <div
                          className="inline-flex max-w-full items-center rounded-[6px] px-2 py-0.5"
                          style={statusPillStyle(list.listStatus)}
                        >
                          <select
                            className="max-w-full cursor-pointer appearance-none border-0 bg-transparent py-1 pl-1 pr-2 text-sm font-semibold outline-none"
                            style={{ color: STATUS_TEXT_COLORS[list.listStatus] }}
                            value={list.listStatus}
                            onChange={(e) =>
                              setLists((prev) =>
                                prev.map((x, j) =>
                                  j === li
                                    ? {
                                        ...x,
                                        listStatus: e.target.value as BacklogListStatus,
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            {(Object.keys(STATUS_LABELS) as BacklogListStatus[]).map((k) => (
                              <option
                                key={k}
                                value={k}
                                style={{ color: STATUS_TEXT_COLORS[k] }}
                              >
                                {STATUS_LABELS[k]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <select
                          className={fieldClass()}
                          value={list.assigneeUserId ?? ""}
                          onChange={(e) =>
                            setLists((prev) =>
                              prev.map((x, j) =>
                                j === li
                                  ? { ...x, assigneeUserId: e.target.value || null }
                                  : x,
                              ),
                            )
                          }
                        >
                          <option value="">—</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.firstName} {s.lastName}
                            </option>
                          ))}
                        </select>
                        <DatePickerField
                          value={list.formedAt}
                          onChange={(v) =>
                            setLists((prev) =>
                              prev.map((x, j) => (j === li ? { ...x, formedAt: v } : x)),
                            )
                          }
                          className={fieldClass("w-full text-left")}
                        />
                      </div>
                      <div className="flex flex-col gap-3 md:hidden">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <SettingsLbl>Заголовок списка задач</SettingsLbl>
                          <input
                            className={fieldClass("text-xl font-semibold leading-snug")}
                            value={list.title}
                            onChange={(e) =>
                              setLists((prev) =>
                                prev.map((x, j) =>
                                  j === li ? { ...x, title: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <SettingsLbl>Статус</SettingsLbl>
                          <div
                            className="inline-flex max-w-full items-center rounded-[6px] px-2 py-0.5"
                            style={statusPillStyle(list.listStatus)}
                          >
                            <select
                              className="max-w-full cursor-pointer appearance-none border-0 bg-transparent py-1 pl-1 pr-2 text-sm font-semibold outline-none"
                              style={{ color: STATUS_TEXT_COLORS[list.listStatus] }}
                              value={list.listStatus}
                              onChange={(e) =>
                                setLists((prev) =>
                                  prev.map((x, j) =>
                                    j === li
                                      ? {
                                          ...x,
                                          listStatus: e.target.value as BacklogListStatus,
                                        }
                                      : x,
                                  ),
                                )
                              }
                            >
                              {(Object.keys(STATUS_LABELS) as BacklogListStatus[]).map((k) => (
                                <option
                                  key={k}
                                  value={k}
                                  style={{ color: STATUS_TEXT_COLORS[k] }}
                                >
                                  {STATUS_LABELS[k]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <SettingsLbl>Ответственный</SettingsLbl>
                          <select
                            className={fieldClass()}
                            value={list.assigneeUserId ?? ""}
                            onChange={(e) =>
                              setLists((prev) =>
                                prev.map((x, j) =>
                                  j === li
                                    ? { ...x, assigneeUserId: e.target.value || null }
                                    : x,
                                ),
                              )
                            }
                          >
                            <option value="">—</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.firstName} {s.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <SettingsLbl>Дата формирования списка</SettingsLbl>
                          <DatePickerField
                            value={list.formedAt}
                            onChange={(v) =>
                              setLists((prev) =>
                                prev.map((x, j) => (j === li ? { ...x, formedAt: v } : x)),
                              )
                            }
                            className={fieldClass("w-full text-left")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={onDragEnd(li)}
                      >
                        <SortableContext
                          items={list.tasks.map((t) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {list.tasks.map((t, ti) => (
                            <SortableTaskRow
                              key={t.id}
                              task={t}
                              editing={editingTask?.li === li && editingTask?.ti === ti}
                              onStartEdit={() => setEditingTask({ li, ti })}
                              onEndEdit={() => setEditingTask(null)}
                              onChangeDescription={(v) =>
                                setLists((prev) =>
                                  prev.map((x, j) =>
                                    j === li
                                      ? {
                                          ...x,
                                          tasks: x.tasks.map((y, k) =>
                                            k === ti ? { ...y, description: v } : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                )
                              }
                              onToggleDone={(done) =>
                                setLists((prev) =>
                                  prev.map((x, j) =>
                                    j === li
                                      ? {
                                          ...x,
                                          tasks: x.tasks.map((y, k) =>
                                            k === ti ? { ...y, done } : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                )
                              }
                              onDelete={() =>
                                setLists((prev) =>
                                  prev.map((x, j) =>
                                    j === li
                                      ? { ...x, tasks: x.tasks.filter((_, k) => k !== ti) }
                                      : x,
                                  ),
                                )
                              }
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>

                    <button
                      type="button"
                      className={`group mb-[100px] mt-3 inline-flex items-center gap-2 text-sm transition-colors ${addTaskMuted}`}
                      onClick={() =>
                        setLists((prev) =>
                          prev.map((x, j) =>
                            j === li
                              ? {
                                  ...x,
                                  tasks: [
                                    ...x.tasks,
                                    { id: nanoid(), description: "", done: false },
                                  ],
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      <span className="relative h-5 w-5 shrink-0">
                        <Image
                          src={theme === "dark" ? plusBlack : plusIcon}
                          alt=""
                          width={20}
                          height={20}
                          unoptimized
                          className="transition-opacity duration-200 group-hover:opacity-0"
                        />
                        <Image
                          src={plusNav}
                          alt=""
                          width={20}
                          height={20}
                          unoptimized
                          className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        />
                      </span>
                      Добавить задачу
                    </button>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className={`group inline-flex items-center gap-2 text-sm transition-colors ${delListMuted}`}
                        onClick={() => {
                          const cid = list.clientId;
                          setLists((prev) => prev.filter((_, j) => j !== li));
                          setExpanded((ex) => {
                            const next = { ...ex };
                            delete next[cid];
                            return next;
                          });
                        }}
                      >
                        <span className="relative h-[18px] w-[18px] shrink-0">
                          <Image
                            src={theme === "dark" ? deleteBlack : deleteIcon}
                            alt=""
                            width={18}
                            height={18}
                            unoptimized
                            className="transition-opacity duration-200 group-hover:opacity-0"
                          />
                          <Image
                            src={deleteNav}
                            alt=""
                            width={18}
                            height={18}
                            unoptimized
                            className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          />
                        </span>
                        Удалить список
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </RightPanel>
  );
}
