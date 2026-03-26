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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { nanoid } from "nanoid";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { DatePickerField } from "@/components/minimal-date-picker";
import { useTheme } from "@/components/theme-provider";
import closeBlack from "@/icons/close-black.svg";
import closeIcon from "@/icons/close.svg";
import editBlack from "@/icons/edit-black.svg";
import editIcon from "@/icons/edit.svg";
import editNav from "@/icons/edit-nav.svg";
import deleteBlack from "@/icons/delete-black.svg";
import deleteIcon from "@/icons/delete.svg";
import deleteNav from "@/icons/delete-nav.svg";
import linkBlack from "@/icons/link-black.svg";
import linkIcon from "@/icons/link.svg";
import linkNav from "@/icons/link-nav.svg";
import photoBlack from "@/icons/photo-black.svg";
import photoNav from "@/icons/photo-nav.svg";
import photoIcon from "@/icons/photo.svg";
import { formatRuDayMonthWeekday } from "@/lib/dates";

export type TlImgEditor = {
  id: string;
  originalKey: string;
  webpKey: string;
  webpUrl?: string;
  originalUrl?: string;
};

export type TlEntryEditor = {
  id?: string;
  clientKey: string;
  entryDate: string;
  title: string;
  description: string;
  images: TlImgEditor[];
  links: { url: string; title: string }[];
};

function fieldClass(extra = "") {
  return `form-input ${extra}`.trim();
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

export function sortTimelineDesc(entries: TlEntryEditor[]): TlEntryEditor[] {
  return [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

export type TimelineUploadResult = {
  originalKey: string;
  webpKey: string;
  originalUrl: string;
  webpUrl: string;
};

export function uploadTimelineImageXHR(
  projectId: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<TimelineUploadResult> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        // 1) Ask server for presigned PUT URL (tiny JSON -> no 413).
        const initRes = await fetch(`/api/projects/${projectId}/timeline-upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ mime: file.type || "application/octet-stream" }),
        });
        if (!initRes.ok) {
          reject(new Error(`${initRes.status}: ${await initRes.text()}`));
          return;
        }
        const init = (await initRes.json()) as {
          originalKey: string;
          webpKey: string;
          uploadUrl: string;
        };

        // 2) Upload original directly to S3 using presigned URL (track progress).
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", init.uploadUrl);
        xhr.timeout = 30 * 60 * 1000; // 30 min
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
          }
        };
        xhr.onload = async () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`${xhr.status}: ${xhr.responseText || "s3_upload_failed"}`));
            return;
          }
          // 3) Finalize: server downloads from S3, generates webp, returns URLs.
          const finRes = await fetch(
            `/api/projects/${projectId}/timeline-upload-finalize`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                originalKey: init.originalKey,
                webpKey: init.webpKey,
              }),
            },
          );
          if (!finRes.ok) {
            reject(new Error(`${finRes.status}: ${await finRes.text()}`));
            return;
          }
          const out = (await finRes.json()) as TimelineUploadResult;
          resolve(out);
        };
        xhr.onerror = () =>
          reject(
            new Error(
              "cors_blocked: S3 запретил запрос из браузера (нужен CORS на бакете для PUT).",
            ),
          );
        xhr.ontimeout = () => reject(new Error("timeout"));
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      } catch (e) {
        reject(e as Error);
      }
    })();
  });
}

function SortableTimelineThumb({
  img,
  onRemove,
  onPreview,
}: {
  img: TlImgEditor;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const { theme } = useTheme();
  const closeSrc = theme === "dark" ? closeBlack : closeIcon;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
    zIndex: isDragging ? 3 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onPreview()}
      className="relative h-20 w-20 shrink-0 cursor-grab touch-none overflow-hidden rounded-lg active:cursor-grabbing"
      title="Перетащите; двойной щелчок — увеличить"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.webpUrl || ""}
        alt=""
        className="pointer-events-none h-full w-full select-none object-cover"
        draggable={false}
      />
      <button
        type="button"
        className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/50 p-0 text-white hover:bg-black/70"
        aria-label="Удалить фото"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Image src={closeSrc} alt="" width={12} height={12} unoptimized />
      </button>
    </div>
  );
}

function TimelineEntryBlock({
  projectId,
  entry,
  expanded,
  onToggleEdit,
  onPatch,
  onUpdateEntry,
  onDeleteEntry,
  onOpenSlider,
}: {
  projectId: string;
  entry: TlEntryEditor;
  expanded: boolean;
  onToggleEdit: () => void;
  onPatch: (patch: Partial<TlEntryEditor>) => void;
  onUpdateEntry: (fn: (e: TlEntryEditor) => TlEntryEditor) => void;
  onDeleteEntry: () => void;
  onOpenSlider: (urls: string[], index: number) => void;
}) {
  const { theme } = useTheme();
  const editBase = theme === "dark" ? editBlack : editIcon;
  const [uploadOverallPct, setUploadOverallPct] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const fitDescHeight = useCallback(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(72, el.scrollHeight)}px`;
  }, []);

  useLayoutEffect(() => {
    if (!expanded) return;
    fitDescHeight();
  }, [expanded, entry.description, fitDescHeight]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function onImagesDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onUpdateEntry((ent) => {
      const ids = ent.images.map((im) => im.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return ent;
      return { ...ent, images: arrayMove(ent.images, oldIndex, newIndex) };
    });
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const arr = Array.from(files);
    const slotIds = arr.map(() => nanoid());
    const blobUrls: string[] = [];
    const pending: TlImgEditor[] = arr.map((file, i) => {
      const u = URL.createObjectURL(file);
      blobUrls.push(u);
      return {
        id: slotIds[i]!,
        originalKey: "__pending__",
        webpKey: "__pending__",
        webpUrl: u,
        originalUrl: u,
      };
    });

    onUpdateEntry((ent) => ({ ...ent, images: [...ent.images, ...pending] }));

    const total = arr.length;
    const progresses = arr.map(() => 0);
    const bumpOverall = () => {
      const sum = progresses.reduce((a, b) => a + b, 0) / total;
      setUploadOverallPct(Math.round(sum));
    };

    setUploadOverallPct(0);

    try {
      // Avoid overloading server on big batches: upload with limited concurrency.
      const CONCURRENCY = 2;
      let nextIdx = 0;
      const runOne = async () => {
        const i = nextIdx++;
        if (i >= arr.length) return;
        const file = arr[i]!;
        const sid = slotIds[i]!;
        const j = await uploadTimelineImageXHR(projectId, file, (p) => {
          progresses[i] = p;
          bumpOverall();
        });
        URL.revokeObjectURL(blobUrls[i]!);
        onUpdateEntry((ent) => ({
          ...ent,
          images: ent.images.map((im) =>
            im.id === sid
              ? {
                  id: im.id,
                  originalKey: j.originalKey,
                  webpKey: j.webpKey,
                  webpUrl: j.webpUrl,
                  originalUrl: j.originalUrl,
                }
              : im,
          ),
        }));
        await runOne();
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, arr.length) }, () => runOne()));
    } catch (e) {
      const msg = (e as Error | null)?.message ?? "";
      alert(msg ? `Загрузка не удалась: ${msg}` : "Загрузка не удалась");
      for (const u of blobUrls) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      }
      onUpdateEntry((ent) => ({
        ...ent,
        images: ent.images.filter((im) => !slotIds.includes(im.id)),
      }));
    } finally {
      setUploadOverallPct(null);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--foreground)]/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-[var(--muted)]">
            {formatRuDayMonthWeekday(entry.entryDate)}
          </div>
          <div className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
            {entry.title.trim() || "Без заголовка"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {expanded ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center"
              aria-label="Удалить запись таймлайна"
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
                className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleEdit}
            className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center"
            aria-label={expanded ? "Закрыть редактирование" : "Редактировать"}
          >
            <Image
              src={editBase}
              alt=""
              width={18}
              height={18}
              unoptimized
              className="transition-opacity duration-200 group-hover:opacity-0"
            />
            <Image
              src={editNav}
              alt=""
              width={18}
              height={18}
              unoptimized
              className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-0.5">
            <SettingsLbl>Дата</SettingsLbl>
            <DatePickerField
              value={entry.entryDate}
              onChange={(v) => onPatch({ entryDate: v })}
              className={fieldClass("w-full text-left")}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <SettingsLbl>Заголовок</SettingsLbl>
            <input
              className={fieldClass()}
              value={entry.title}
              onChange={(e) => onPatch({ title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <SettingsLbl>Описание</SettingsLbl>
            <textarea
              ref={descRef}
              className={fieldClass("min-h-[72px] resize-none overflow-hidden")}
              value={entry.description}
              onChange={(e) => onPatch({ description: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <SettingsLbl>Фото</SettingsLbl>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onImagesDragEnd}
            >
              <SortableContext
                items={entry.images.map((im) => im.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex flex-wrap items-start gap-2">
                  {entry.images.map((im, ii) => (
                    <SortableTimelineThumb
                      key={im.id}
                      img={im}
                      onRemove={() =>
                        onUpdateEntry((ent) => ({
                          ...ent,
                          images: ent.images.filter((x) => x.id !== im.id),
                        }))
                      }
                      onPreview={() => {
                        const urls = entry.images
                          .map((x) => x.originalUrl || x.webpUrl)
                          .filter(Boolean) as string[];
                        const idx = entry.images.findIndex((x) => x.id === im.id);
                        onOpenSlider(urls, Math.max(0, idx));
                      }}
                    />
                  ))}
                  <label
                    className="group relative inline-flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--foreground)]/25 hover:border-[var(--foreground)]/40"
                    aria-label="Добавить фото"
                  >
                    <span className="relative inline-block h-7 w-7 shrink-0">
                      <Image
                        src={theme === "dark" ? photoBlack : photoIcon}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 group-hover:opacity-0"
                      />
                      <Image
                        src={photoNav}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(ev) => {
                        void onFilesSelected(ev.target.files);
                        ev.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </SortableContext>
            </DndContext>
            {uploadOverallPct != null ? (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-none bg-[var(--foreground)]/10">
                  <div
                    className="h-full rounded-none bg-[#00B956] transition-[width] duration-150"
                    style={{ width: `${uploadOverallPct}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {uploadOverallPct}%
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-0.5">
            <SettingsLbl>Ссылки</SettingsLbl>
            <div className="space-y-2">
              {entry.links.map((ln, li) => (
                <div key={li} className="flex flex-wrap items-center gap-2">
                  <input
                    className={fieldClass("min-w-[8rem] flex-1")}
                    placeholder="URL"
                    value={ln.url}
                    onChange={(ev) =>
                      onPatch({
                        links: entry.links.map((y, k) =>
                          k === li ? { ...y, url: ev.target.value } : y,
                        ),
                      })
                    }
                  />
                  <input
                    className={fieldClass("min-w-[8rem] flex-1")}
                    placeholder="Заголовок ссылки"
                    value={ln.title}
                    onChange={(ev) =>
                      onPatch({
                        links: entry.links.map((y, k) =>
                          k === li ? { ...y, title: ev.target.value } : y,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center"
                    aria-label="Удалить ссылку"
                    onClick={() =>
                      onPatch({
                        links: entry.links.filter((_, k) => k !== li),
                      })
                    }
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
                </div>
              ))}
              <button
                type="button"
                className={`group inline-flex items-center gap-1.5 text-xs transition-colors ${
                  theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"
                } hover:text-[#5A86EE]`}
                onClick={() =>
                  onPatch({
                    links: [...entry.links, { url: "", title: "" }],
                  })
                }
              >
                <span className="relative h-4 w-4 shrink-0">
                  <Image
                    src={theme === "dark" ? linkBlack : linkIcon}
                    alt=""
                    width={16}
                    height={16}
                    unoptimized
                    className="transition-opacity duration-200 group-hover:opacity-0"
                  />
                  <Image
                    src={linkNav}
                    alt=""
                    width={16}
                    height={16}
                    unoptimized
                    className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  />
                </span>
                Добавить ссылку
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmDeleteOpen ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-xl"
            style={{
              backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
              borderColor: theme === "dark" ? "#474747" : "#dadada",
            }}
          >
            <h4 className="text-base font-medium text-[var(--foreground)]">Удалить запись?</h4>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Эта запись таймлайна будет удалена.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded px-4 py-2 text-sm opacity-80 hover:opacity-100"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDeleteEntry();
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LkEditorTimelineSection({
  projectId,
  timeline,
  setTimeline,
  onOpenSlider,
  editingKey,
  setEditingKey,
}: {
  projectId: string;
  timeline: TlEntryEditor[];
  setTimeline: Dispatch<SetStateAction<TlEntryEditor[]>>;
  onOpenSlider: (urls: string[], index: number) => void;
  editingKey: string | null;
  setEditingKey: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <div className="mt-4 space-y-4">
      {timeline.map((e) => (
        <TimelineEntryBlock
          key={e.clientKey}
          projectId={projectId}
          entry={e}
          expanded={editingKey === e.clientKey}
          onToggleEdit={() =>
            setEditingKey((k) => (k === e.clientKey ? null : e.clientKey))
          }
          onPatch={(patch) => {
            setTimeline((prev) =>
              sortTimelineDesc(
                prev.map((x) =>
                  x.clientKey === e.clientKey ? { ...x, ...patch } : x,
                ),
              ),
            );
          }}
          onUpdateEntry={(fn) => {
            setTimeline((prev) =>
              sortTimelineDesc(
                prev.map((x) => (x.clientKey === e.clientKey ? fn(x) : x)),
              ),
            );
          }}
          onDeleteEntry={() => {
            setTimeline((prev) => prev.filter((x) => x.clientKey !== e.clientKey));
            setEditingKey((k) => (k === e.clientKey ? null : k));
          }}
          onOpenSlider={onOpenSlider}
        />
      ))}
    </div>
  );
}
