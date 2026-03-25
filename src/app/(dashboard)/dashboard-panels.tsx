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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import type { ReactNode, RefObject } from "react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DeadlineBlock } from "@/components/cells/deadline-block";
import { IconCheckbox } from "@/components/icon-checkbox";
import { DatePickerField, MinimalDatePicker } from "@/components/minimal-date-picker";
import { PaymentBlock } from "@/components/cells/payment-block";
import {
  LkEditorTimelineSection,
  sortTimelineDesc,
  type TlEntryEditor,
} from "@/components/lk-editor-timeline";
import { RightPanel } from "@/components/right-panel";
import { useTheme } from "@/components/theme-provider";
import {
  formatDateYmdLocal,
  dateYmdToEndIso,
  dateYmdToStartIso,
  formatRuDayMonthWeekday,
} from "@/lib/dates";
import { cmsOptions, type CmsValue } from "@/lib/cms-labels";
import commentBlack from "@/icons/comment-black.svg";
import commentIcon from "@/icons/comment.svg";
import commentNav from "@/icons/comment-nav.svg";
import deleteBlack from "@/icons/delete-black.svg";
import deleteIcon from "@/icons/delete.svg";
import deleteNav from "@/icons/delete-nav.svg";
import plusBlack from "@/icons/plus-black.svg";
import plusIcon from "@/icons/plus.svg";
import plusNav from "@/icons/plus-nav.svg";
import saveBlack from "@/icons/save-black.svg";
import saveIcon from "@/icons/save.svg";
import saveNav from "@/icons/save-nav.svg";
import saveWhite from "@/icons/save-white.svg";
import addDocumentBlack from "@/icons/add-document-black.svg";
import addDocumentIcon from "@/icons/add-document.svg";
import checkBlack from "@/icons/check-black.svg";
import checkWhite from "@/icons/check-white.svg";
import closeBlack from "@/icons/close-black.svg";
import closeIcon from "@/icons/close.svg";
import closeNav from "@/icons/close-nav.svg";
import editBlack from "@/icons/edit-black.svg";
import editIcon from "@/icons/edit.svg";
import addDocumentNav from "@/icons/add-document-nav.svg";
import photoBlack from "@/icons/photo-black.svg";
import photoIcon from "@/icons/photo.svg";
import photoNav from "@/icons/photo-nav.svg";
import calBlack from "@/icons/cal-black.svg";
import calNav from "@/icons/cal-nav.svg";
import calIcon from "@/icons/cal.svg";
import dragBlack from "@/icons/drag-black.svg";
import dragIcon from "@/icons/drag.svg";
import eyeBlack from "@/icons/eye-black.svg";
import eyeIcon from "@/icons/eye.svg";
import eyeNav from "@/icons/eye-nav.svg";
import eyeOff from "@/icons/eyeoff.svg";
import eyeOffNav from "@/icons/eyeoff-nav.svg";
import addDocIcon from "@/icons/adddoc.svg";
import addDocBlackIcon from "@/icons/adddoc-black.svg";
import addDocNav from "@/icons/adddoc-nav.svg";
import docSerIcon from "@/icons/docser.svg";
import docSerBlackIcon from "@/icons/docser-black.svg";
import docGreenIcon from "@/icons/doc-green.svg";
import docRedIcon from "@/icons/doc-red.svg";
import oplataBlack from "@/icons/oplata-black.svg";
import oplataIcon from "@/icons/oplata.svg";
import oplataNav from "@/icons/oplata-nav.svg";
import { paymentChipStyles } from "@/lib/payment-chip";
import { roleLabel } from "@/lib/role-labels";
import { xhrPostFormDataJsonWithProgress } from "@/lib/xhr-get-json";
import { nanoid } from "nanoid";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function fieldClass(extra = "") {
  return `form-input ${extra}`.trim();
}

function SettingsLbl({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <span
      className={`text-xs ${theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"}`}
    >
      {children}
    </span>
  );
}

function LkAddCommentTrigger({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  const { theme } = useTheme();
  const base = theme === "dark" ? commentBlack : commentIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 text-sm transition-colors ${
        theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"
      } hover:text-[#5A86EE] ${className}`.trim()}
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
          src={commentNav}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </span>
      Добавить комментарий
    </button>
  );
}

function SettingsField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${className}`.trim()}>
      <SettingsLbl>{label}</SettingsLbl>
      {children}
    </div>
  );
}

function SettingsPlusButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme();
  const base = theme === "dark" ? plusBlack : plusIcon;
  return (
    <button
      type="button"
      aria-label="Добавить пользователя"
      title="Добавить"
      onClick={onClick}
      className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center"
    >
      <Image
        src={base}
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
        className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </button>
  );
}

function SettingsSaveButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme();
  const base = theme === "dark" ? saveBlack : saveIcon;
  const text = theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 text-sm transition-colors ${text} hover:text-[#5A86EE]`}
    >
      <span className="relative h-[18px] w-[18px] shrink-0">
        <Image
          src={base}
          alt=""
          width={18}
          height={18}
          unoptimized
          className="transition-opacity duration-200 group-hover:opacity-0"
        />
        <Image
          src={saveNav}
          alt=""
          width={18}
          height={18}
          unoptimized
          className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </span>
      Сохранить
    </button>
  );
}

function SettingsDeleteButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme();
  const base = theme === "dark" ? deleteBlack : deleteIcon;
  const text = theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 text-sm transition-colors ${text} hover:text-[#F33737]`}
    >
      <span className="relative h-[18px] w-[18px] shrink-0">
        <Image
          src={base}
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
      Удалить
    </button>
  );
}

function LkSectionTitleBar({ title, onAdd }: { title: string; onAdd?: () => void }) {
  const { theme } = useTheme();
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="lk-section-title">{title}</h3>
        {onAdd ? <SettingsPlusButton onClick={onAdd} /> : null}
      </div>
      <div
        className="mt-2 h-px w-full"
        style={{ backgroundColor: theme === "dark" ? "#474747" : "#dadada" }}
      />
    </div>
  );
}

function LkAddTaskButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme();
  const base = theme === "dark" ? plusBlack : plusIcon;
  const muted = theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group mt-2 inline-flex items-center gap-2 text-sm transition-colors hover:text-[#5A86EE] ${muted}`}
    >
      <span className="relative inline-block h-5 w-5 shrink-0">
        <Image
          src={base}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 group-hover:opacity-0"
        />
        <Image
          src={plusNav}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </span>
      Добавить задачу
    </button>
  );
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

function formatThousandsRub(n: number) {
  const s = String(Math.max(0, Math.floor(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const MODAL_STATUS_TABS = [
  ["active", "Активные"],
  ["paused", "На паузе"],
  ["completed", "Завершённые"],
] as const;

function ModalFooterStatusTabs({
  value,
  onChange,
}: {
  value: "active" | "paused" | "completed";
  onChange: (v: "active" | "paused" | "completed") => void;
}) {
  const { theme } = useTheme();
  const navRef = useRef<HTMLElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ top: 4, left: 4, width: 0, height: 28 });
  const activeIdx = Math.max(0, MODAL_STATUS_TABS.findIndex(([k]) => k === value));
  const isDark = theme === "dark";

  useLayoutEffect(() => {
    const nav = navRef.current;
    const btn = btnRefs.current[activeIdx];
    if (!nav || !btn) return;

    function sync() {
      const n = navRef.current;
      const b = btnRefs.current[activeIdx];
      if (!n || !b) return;
      const nr = n.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      setPill({
        left: br.left - nr.left,
        top: br.top - nr.top,
        width: br.width,
        height: br.height,
      });
    }

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(nav);
    for (const b of btnRefs.current) {
      if (b) ro.observe(b);
    }
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [activeIdx, value]);

  const trackBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const pillBg = isDark ? "rgba(255,255,255,0.14)" : "#ffffff";
  const checkSrc = isDark ? checkWhite : checkBlack;

  return (
    <nav
      ref={navRef}
      className="relative inline-flex shrink-0 rounded-lg p-1 text-xs"
      style={{ backgroundColor: trackBg }}
    >
      <span
        className="pointer-events-none absolute rounded-md shadow-sm transition-[left,top,width,height] duration-300 ease-out"
        style={{
          left: pill.left,
          top: pill.top,
          width: pill.width,
          height: pill.height,
          backgroundColor: pillBg,
        }}
        aria-hidden
      />
      <div className="relative z-10 flex items-stretch gap-0">
        {MODAL_STATUS_TABS.map(([key, label], i) => (
          <button
            key={key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors duration-200 ${
              value === key
                ? isDark
                  ? "text-white"
                  : "text-[#171717]"
                : isDark
                  ? "text-[#a4a4a4] hover:text-white"
                  : "text-[#666666] hover:text-[#171717]"
            }`}
          >
            {value === key ? (
              <Image src={checkSrc} alt="" width={14} height={14} unoptimized className="shrink-0" />
            ) : null}
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function DescriptionEditable({
  value,
  onChange,
  minHeight,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || focusedRef.current) return;
    const next = value.replace(/\r\n/g, "\n");
    if (el.innerText !== next) {
      el.innerText = next;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="w-full max-w-none cursor-text whitespace-pre-wrap break-words px-0 py-0 text-sm text-[var(--foreground)] outline-none focus:outline-none"
      style={{ minHeight }}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const t = ref.current?.innerText?.replace(/\r\n/g, "\n") ?? "";
        onChange(t);
      }}
      onInput={() => {
        const t = ref.current?.innerText?.replace(/\r\n/g, "\n") ?? "";
        onChange(t);
      }}
    />
  );
}

export function AddProjectPanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetchJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone: phone || null,
          pinView: pin,
          shortDescription: shortDescription || null,
        }),
      });
      onCreated();
      setCustomerName("");
      setPhone("");
      setPin("");
      setShortDescription("");
    } catch {
      alert("Не удалось создать проект");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RightPanel
      open={open}
      title="Добавить проект"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy || pin.length !== 4)}
      saving={busy}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <SettingsLbl>Имя заказчика</SettingsLbl>
          <input
            className={fieldClass()}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <SettingsLbl>Телефон</SettingsLbl>
          <input
            className={fieldClass()}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 sm:col-span-2 lg:col-span-1">
          <SettingsLbl>ПИН-код на просмотр (4 цифры)</SettingsLbl>
          <input
            className={fieldClass()}
            value={pin}
            maxLength={4}
            inputMode="numeric"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-0.5">
        <SettingsLbl>Короткое описание (не обязательно)</SettingsLbl>
        <textarea
        className={fieldClass("min-h-[72px]")}
        value={shortDescription}
        onChange={(e) => setShortDescription(e.target.value)}
        />
      </div>
    </RightPanel>
  );
}

export function CustomerPanel({
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
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setFetching(true);
    void (async () => {
      try {
        const j = await fetchJson(`/api/projects/${projectId}`);
        setData(j);
      } catch {
        setData(null);
      } finally {
        setFetching(false);
      }
    })();
  }, [open, projectId]);

  const p = data?.project as
    | {
        customerName: string;
        phone: string | null;
        pinView: string;
        shortDescription: string | null;
        longDescription: string | null;
        cms: string | null;
        status: "active" | "paused" | "completed";
      }
    | undefined;
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [cms, setCms] = useState<CmsValue | "">("");
  const [status, setStatus] = useState<"active" | "paused" | "completed">("active");

  useEffect(() => {
    if (!p) return;
    setCustomerName(p.customerName);
    setPhone(p.phone ?? "");
    setPin(p.pinView);
    setShortDescription(p.shortDescription ?? "");
    setLongDescription(p.longDescription ?? "");
    setCms((p.cms ?? "") as CmsValue | "");
    setStatus(p.status);
  }, [p]);

  async function save() {
    if (!p) return;
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone: phone || null,
          pinView: pin,
          shortDescription: shortDescription || null,
          longDescription: longDescription || null,
          cms: cms || null,
          status,
        }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject() {
    if (!p) return;
    setDeleting(true);
    try {
      await fetchJson(`/api/projects/${projectId}`, { method: "DELETE" });
      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      alert("Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <RightPanel
        open={open}
        title="Заказчик"
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              className="rounded px-4 py-2 text-sm text-red-600/90 opacity-90 transition-opacity hover:opacity-100"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={!p || busy || deleting}
            >
              Удалить проект
            </button>
            <button
              type="button"
              className="rounded px-4 py-2 text-sm opacity-80 hover:opacity-100"
              onClick={onClose}
              disabled={busy || deleting}
            >
              Отмена
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40 bg-[#0f68e4] hover:bg-[#2677e8]"
              onClick={() => void save()}
              disabled={busy || deleting || !p || pin.length !== 4}
            >
              <Image src={saveWhite} alt="" width={18} height={18} unoptimized />
              Сохранить
            </button>
          </>
        }
        footerStart={p ? <ModalFooterStatusTabs value={status} onChange={setStatus} /> : null}
        contentLoading={fetching}
        saving={busy || deleting}
      >
        {!p ? (
          <p className="text-sm text-[var(--muted)]">Загрузка…</p>
        ) : (
          <>
            <p
              className="mb-4 text-sm"
              style={{ color: theme === "dark" ? "#666666" : "#a4a4a4" }}
            >
              {customerName}
            </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <SettingsLbl>Имя заказчика</SettingsLbl>
              <input
                className={fieldClass()}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <SettingsLbl>Телефон</SettingsLbl>
              <input className={fieldClass()} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <SettingsLbl>ПИН-код на просмотр</SettingsLbl>
              <input
                className={fieldClass()}
                value={pin}
                maxLength={4}
                inputMode="numeric"
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <SettingsLbl>CMS</SettingsLbl>
              <select
                className={fieldClass()}
                value={cms}
                onChange={(e) => setCms(e.target.value as CmsValue | "")}
              >
                <option value="">—</option>
                {cmsOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6">
            <SettingsLbl>Короткое описание</SettingsLbl>
            <DescriptionEditable
              value={shortDescription}
              onChange={setShortDescription}
              minHeight="3rem"
            />
          </div>
          <div className="mt-6">
            <SettingsLbl>Заметки</SettingsLbl>
            <DescriptionEditable
              value={longDescription}
              onChange={setLongDescription}
              minHeight="6rem"
            />
          </div>
          </>
        )}
      </RightPanel>
      {confirmDeleteOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-xl"
            style={{
              backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
              borderColor: theme === "dark" ? "#474747" : "#dadada",
            }}
          >
            <h4 className="text-base font-medium text-[var(--foreground)]">Удалить проект?</h4>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Проект будет удалён полностью вместе со всеми данными, включая изображения.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded px-4 py-2 text-sm opacity-80 hover:opacity-100"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                onClick={() => void deleteProject()}
                disabled={deleting}
              >
                {deleting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function DeadlineFormPanel({
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
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lkShowDeadline, setLkShowDeadline] = useState(true);
  const [comment, setComment] = useState("");
  const [calendarPlanUrl, setCalendarPlanUrl] = useState<string | null>(null);
  const [calendarPlanUploadingPct, setCalendarPlanUploadingPct] = useState<number | null>(null);
  const [calendarPlanBusy, setCalendarPlanBusy] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    void (async () => {
      const j = await fetchJson(`/api/projects/${projectId}`).catch(() => null);
      const dl = j?.deadline;
      setStart(dl?.startAt ? formatDateYmdLocal(new Date(dl.startAt)) : "");
      setEnd(dl?.endAt ? formatDateYmdLocal(new Date(dl.endAt)) : "");
      setComment(dl?.comment ?? "");
      setLkShowDeadline(j?.project?.lkShowDeadline !== false);
      setCustomerName(j?.project?.customerName ?? "");
      setCalendarPlanUrl(
        (dl as { calendarPlanWebpUrl?: string | null; calendarPlanOriginalUrl?: string | null })
          ?.calendarPlanWebpUrl ??
          (dl as { calendarPlanWebpUrl?: string | null; calendarPlanOriginalUrl?: string | null })
            ?.calendarPlanOriginalUrl ??
          null,
      );
      setCalendarPlanUploadingPct(null);
      setCalendarPlanBusy(false);
      setFetching(false);
    })();
  }, [open, projectId]);

  async function uploadCalendarPlanImage(file: File) {
    setCalendarPlanBusy(true);
    setCalendarPlanUploadingPct(0);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await xhrPostFormDataJsonWithProgress<{
        originalUrl: string;
        webpUrl: string;
      }>(`/api/projects/${projectId}/deadline-plan`, form, setCalendarPlanUploadingPct);
      setCalendarPlanUrl(res.webpUrl || res.originalUrl);
    } catch {
      alert("Ошибка");
      setCalendarPlanUploadingPct(null);
    } finally {
      setCalendarPlanBusy(false);
      window.setTimeout(() => setCalendarPlanUploadingPct(null), 650);
    }
  }

  async function deleteCalendarPlanImage() {
    setCalendarPlanBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/deadline-plan`, {
        method: "DELETE",
      });
      setCalendarPlanUrl(null);
    } catch {
      alert("Ошибка");
    } finally {
      setCalendarPlanBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/deadline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: start ? dateYmdToStartIso(start) : null,
          endAt: end ? dateYmdToEndIso(end) : null,
          comment: comment || null,
          lkShowDeadline,
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

  return (
    <RightPanel
      open={open}
      title="Текущий дедлайн"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <label className="text-xs text-[var(--muted)]">Начало дедлайна</label>
          <div className="flex items-center gap-2">
            <DatePickerField
              value={start}
              onChange={setStart}
              className={fieldClass("w-full text-left")}
            />
            {start ? (
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:text-[#5A86EE]"
                onClick={() => setStart("")}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <label className="text-xs text-[var(--muted)]">Конец дедлайна</label>
          <div className="flex items-center gap-2">
            <DatePickerField
              value={end}
              onChange={setEnd}
              className={fieldClass("w-full text-left")}
            />
            {end ? (
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:text-[#5A86EE]"
                onClick={() => setEnd("")}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <label className="mt-4 block text-xs text-[var(--muted)]">Комментарий</label>
      <textarea
        className={fieldClass("min-h-[96px]")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <label className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={lkShowDeadline}
          onChange={(e) => setLkShowDeadline(e.target.checked)}
        />
        Отображать дедлайн в редакторе ЛК
      </label>

      <div style={{ marginTop: calendarPlanUrl ? 10 : 100 }}>
        {!calendarPlanUrl ? (
          <label
            className={`group inline-flex cursor-pointer items-center gap-2 text-sm ${
              theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"
            } hover:text-[#5A86EE]`}
          >
            <span className="relative inline-flex h-6 w-6 items-center justify-center">
              <Image
                src={theme === "dark" ? photoBlack : photoIcon}
                alt=""
                width={18}
                height={18}
                unoptimized
                className="transition-opacity duration-200 group-hover:opacity-0"
              />
              <Image
                src={photoNav}
                alt=""
                width={18}
                height={18}
                unoptimized
                className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </span>
            Добавить изображение календарного плана
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={calendarPlanBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                void uploadCalendarPlanImage(f);
              }}
            />
          </label>
        ) : (
          <div className="relative w-full max-w-[500px] overflow-hidden rounded-lg border border-[var(--foreground)]/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={calendarPlanUrl}
              alt=""
              className="block h-auto w-full"
            />
            <button
              type="button"
              aria-label="Удалить изображение"
              disabled={calendarPlanBusy}
              onClick={() => void deleteCalendarPlanImage()}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Image src={deleteIcon} alt="" width={18} height={18} unoptimized />
            </button>
          </div>
        )}

        {calendarPlanUploadingPct != null ? (
          <div className="mt-3 flex items-center gap-2">
            <div
              className="h-[3px] min-h-[3px] flex-1 overflow-hidden rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--foreground) 12%, transparent)",
              }}
            >
              <div
                className="h-full bg-[#00B956] transition-[width] duration-100 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, calendarPlanUploadingPct ?? 0))}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-[var(--muted)]">
              {calendarPlanUploadingPct == null ? "—" : `${calendarPlanUploadingPct}%`}
            </span>
          </div>
        ) : null}
      </div>
    </RightPanel>
  );
}

type LedgerRow = {
  amountRubles: number;
  paymentDate: string;
  comment: string | null;
};
type DocRow = {
  docDate: string;
  url: string;
  linkTitle: string | null;
  comment: string | null;
};
type PaymentTextBlockState = "green" | "gray" | "neutral" | "red";
type BlockRow = {
  id: string;
  body: string | null;
  color: PaymentTextBlockState;
};

function sortLedgerRows(rows: LedgerRow[]) {
  return [...rows].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

function sortDocRows(rows: DocRow[]) {
  return [...rows].sort((a, b) => b.docDate.localeCompare(a.docDate));
}

export function PaymentsFormPanel({
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
  const [remaining, setRemaining] = useState(0);
  const [remStr, setRemStr] = useState("0");
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [lkShowPayments, setLkShowPayments] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [editLedger, setEditLedger] = useState<number | null>(null);
  const [editDoc, setEditDoc] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setEditLedger(null);
    setEditDoc(null);
    setFetching(true);
    void (async () => {
      const j = await fetchJson(`/api/projects/${projectId}`).catch(() => null);
      if (!j) {
        setFetching(false);
        return;
      }
      const rem = j.project.remainingAmountRubles ?? 0;
      setCustomerName(j.project.customerName ?? "");
      setRemaining(rem);
      setRemStr(formatThousandsRub(rem));
      setBlocks(
        (j.payments?.textBlocks ?? []).map(
          (b: { id?: string; body: string | null; color: PaymentTextBlockState }) => ({
            id: String(b.id ?? nanoid()),
            body: b.body,
            color: b.color,
          }),
        ),
      );
      setLkShowPayments(j.project?.lkShowPayments !== false);
      setLedger(sortLedgerRows(
        (j.payments?.ledger ?? []).map(
          (r: { amountRubles: number; paymentDate: string; comment: string | null }) => ({
            amountRubles: r.amountRubles,
            paymentDate: r.paymentDate.slice(0, 10),
            comment: r.comment,
          }),
        ),
      ));
      setDocs(sortDocRows(
        (j.payments?.documents ?? []).map(
          (r: {
            docDate: string;
            url: string;
            linkTitle?: string | null;
            comment: string | null;
          }) => ({
            docDate: r.docDate.slice(0, 10),
            url: r.url,
            linkTitle: r.linkTitle ?? null,
            comment: r.comment,
          }),
        ),
      ));
      setFetching(false);
    })();
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEditLedger(null);
        setEditDoc(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const paid = useMemo(
    () => ledger.reduce((s, r) => s + r.amountRubles, 0),
    [ledger],
  );

  const lineRule = theme === "dark" ? "#474747" : "#dadada";
  const mutedAction =
    theme === "dark"
      ? "text-[#666666] transition-colors hover:text-[#5A86EE]"
      : "text-[#a4a4a4] transition-colors hover:text-[#5A86EE]";
  const closeSrc = theme === "dark" ? closeBlack : closeIcon;
  const plusOnly = theme === "dark" ? plusBlack : plusIcon;

  const paymentSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function cycleDocState(current: PaymentTextBlockState): PaymentTextBlockState {
    // Doc icon has its own 3-state cycle: gray -> green -> red -> gray
    if (current === "gray") return "green";
    if (current === "green") return "red";
    return "gray";
  }

  function onPaymentBlocksDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    if (active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((x) => x.id === active.id);
      const newIndex = prev.findIndex((x) => x.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function getDocIconSrc(color: PaymentTextBlockState) {
    if (color === "green") return docGreenIcon;
    if (color === "red") return docRedIcon;
    return theme === "dark" ? docSerBlackIcon : docSerIcon;
  }

  function PaymentSortableItem({ item }: { item: BlockRow }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: item.id,
    });

    const style = {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
      opacity: isDragging ? 0.85 : 1,
    };

    if (item.body == null) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          className="inline-flex h-8 w-8 -ml-2 -mr-1 items-center justify-center"
        >
          <button
            type="button"
            aria-label="Состояние документа"
            className="relative h-8 w-8 cursor-grab rounded-full"
            onClick={() => {
              if (isDragging) return;
              setBlocks((prev) =>
                prev.map((x) =>
                  x.id === item.id ? { ...x, color: cycleDocState(x.color) } : x,
                ),
              );
            }}
            {...attributes}
            {...listeners}
          >
            <Image src={getDocIconSrc(item.color)} alt="" width={20} height={20} unoptimized />
            <button
              type="button"
              aria-label="Удалить документ"
              className="absolute -right-0.5 -top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#F33737] shadow-sm"
              onPointerDown={(e) => {
                // Don't start dragging from the delete button.
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setBlocks((prev) => prev.filter((x) => x.id !== item.id));
              }}
            >
              <span className="text-[10px] leading-none text-white">×</span>
            </button>
          </button>
        </div>
      );
    }

    const hasText = Boolean(item.body?.trim());
    const chip = paymentChipStyles(
      item.color === "red" ? "gray" : (item.color as "green" | "gray" | "neutral"),
      theme,
    );

    return (
      <div ref={setNodeRef} style={style} className="inline-flex">
        <div
          className={`inline-flex h-8 w-[100px] items-center gap-1.5 rounded-full px-2 ${
            hasText ? "justify-start" : "justify-center"
          }`}
          style={{
            backgroundColor: chip.backgroundColor,
            borderWidth: chip.borderColor ? 1 : 0,
            borderStyle: chip.borderColor ? "solid" : "none",
            borderColor: chip.borderColor ?? "transparent",
          }}
        >
          <button
            type="button"
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color === "green" ? "#00B956" : "#8c8c8e" }}
            aria-label="Цвет"
            onClick={() => {
              setBlocks((prev) =>
                prev.map((x) =>
                  x.id === item.id
                    ? {
                        ...x,
                        color:
                          x.color === "green"
                            ? "gray"
                            : x.color === "gray"
                              ? "neutral"
                              : "green",
                      }
                    : x,
                ),
              );
            }}
          />
          <input
            type="text"
            className="h-5 min-h-0 w-full min-w-0 border-0 bg-transparent py-0 text-xs leading-5 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{ color: item.color === "green" ? "#00B956" : "#8c8c8e" }}
            placeholder=" "
            value={item.body ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setBlocks((prev) => prev.map((x) => (x.id === item.id ? { ...x, body: v } : x)));
            }}
          />
          <button
            type="button"
            className="shrink-0 opacity-70 hover:opacity-100"
            aria-label="Удалить блок"
            onClick={() => setBlocks((prev) => prev.filter((x) => x.id !== item.id))}
          >
            <Image src={closeSrc} alt="" width={14} height={14} unoptimized />
          </button>
        </div>
      </div>
    );
  }

  async function save() {
    setBusy(true);
    try {
      const documentsOut = docs
        .filter((d) => d.url.trim().length > 0)
        .map((d) => ({
          docDate: d.docDate,
          url: d.url.trim(),
          linkTitle: d.linkTitle?.trim() || null,
          comment: d.comment?.trim() || null,
        }));
      await fetchJson(`/api/projects/${projectId}/payments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remainingAmountRubles: remaining,
          textBlocks: blocks,
          lkShowPayments,
          ledger,
          documents: documentsOut,
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

  return (
    <RightPanel
      open={open}
      title="Оплаты и документы"
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
      <div className="flex w-full flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1 basis-[min(100%,28rem)]">
          <PaymentBlock paidRubles={paid} remainingRubles={remaining} />
        </div>
        <div className="flex w-full max-w-[150px] shrink-0 flex-col gap-0.5 sm:w-[150px]">
          <SettingsLbl>Осталось оплатить</SettingsLbl>
          <input
            className={fieldClass(
              "max-w-[150px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            )}
            inputMode="numeric"
            value={remStr}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              const n = d === "" ? 0 : Number(d);
              setRemaining(Number.isFinite(n) ? n : 0);
              setRemStr(d === "" ? "" : formatThousandsRub(Number.isFinite(n) ? n : 0));
            }}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <DndContext
          sensors={paymentSensors}
          collisionDetection={closestCenter}
          onDragEnd={onPaymentBlocksDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={horizontalListSortingStrategy}
          >
            {blocks.map((b) => (
              <PaymentSortableItem key={b.id} item={b} />
            ))}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          aria-label="Добавить блок"
          title="Добавить блок"
          onClick={() =>
            setBlocks((prev) => [
              ...prev,
              { id: nanoid(), body: "", color: "gray" },
            ])
          }
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-80"
        >
          <Image src={plusOnly} alt="" width={20} height={20} unoptimized />
        </button>

        <button
          type="button"
          aria-label="Добавить документ"
          title="Добавить документ"
          onClick={() =>
            setBlocks((prev) => {
              const insertAfter = (() => {
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (prev[i].body != null) return i;
                }
                return -1;
              })();

              const docItem: BlockRow = {
                id: nanoid(),
                body: null,
                color: "gray",
              };

              const at = insertAfter + 1;
              return [...prev.slice(0, at), docItem, ...prev.slice(at)];
            })
          }
          className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-80"
        >
          <span className="relative h-8 w-8">
            <Image
              src={theme === "dark" ? addDocBlackIcon : addDocIcon}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 group-hover:opacity-0"
            />
            <Image
              src={addDocNav}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </span>
        </button>
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={lkShowPayments}
          onChange={(e) => setLkShowPayments(e.target.checked)}
        />
        Отображать в ЛК клиента
      </label>

      <div className="mt-10">
        <h3 className="modal-section-title text-[var(--foreground)]">Поступившие оплаты</h3>
        <div className="mt-2 h-px w-full" style={{ backgroundColor: lineRule }} />
        <div className="mt-px w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <tbody>
              {ledger.map((row, i) => (
                <Fragment key={i}>
                  <tr>
                    <td colSpan={4} className="p-0 align-top">
                      {editLedger === i ? (
                        <div className="space-y-2 py-2">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-3">
                            <div className="flex shrink-0 flex-wrap items-end gap-1">
                              <div className="flex w-[9.25rem] min-w-0 flex-col gap-0.5">
                                <SettingsLbl>Дата</SettingsLbl>
                                <DatePickerField
                                  value={row.paymentDate}
                                  onChange={(v) =>
                                    setLedger((prev) =>
                                      sortLedgerRows(
                                        prev.map((x, j) =>
                                          j === i ? { ...x, paymentDate: v } : x,
                                        ),
                                      ),
                                    )
                                  }
                                  className={fieldClass("w-full text-left")}
                                />
                              </div>
                              <div className="flex w-[9.25rem] min-w-0 flex-col gap-0.5">
                                <SettingsLbl>Сумма</SettingsLbl>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className={fieldClass("w-full")}
                                  placeholder="Сумма"
                                  value={
                                    row.amountRubles === 0
                                      ? ""
                                      : formatThousandsRub(row.amountRubles)
                                  }
                                  onChange={(e) => {
                                    const d = e.target.value.replace(/\D/g, "");
                                    const n = d === "" ? 0 : Number(d);
                                    setLedger((prev) =>
                                      prev.map((x, j) =>
                                        j === i
                                          ? {
                                              ...x,
                                              amountRubles: Number.isFinite(n) ? n : 0,
                                            }
                                          : x,
                                      ),
                                    );
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <SettingsLbl>Комментарий</SettingsLbl>
                              <input
                                className={fieldClass("w-full min-w-0")}
                                placeholder="Комментарий"
                                value={row.comment ?? ""}
                                onChange={(e) =>
                                  setLedger((prev) =>
                                    prev.map((x, j) =>
                                      j === i ? { ...x, comment: e.target.value || null } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="text-sm text-[var(--muted)] underline"
                              onClick={() => setEditLedger(null)}
                            >
                              Готово
                            </button>
                            <button
                              type="button"
                              className="text-sm text-red-600/90 underline"
                              onClick={() => {
                                setLedger((prev) => prev.filter((_, j) => j !== i));
                                setEditLedger(null);
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-[200px] shrink-0 text-[var(--foreground)]">
                            {formatRuDayMonthWeekday(row.paymentDate)}
                          </div>
                          <div className="w-[200px] shrink-0 text-[var(--foreground)]">
                            {formatThousandsRub(row.amountRubles)} ₽
                          </div>
                          <div className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                            {row.comment?.trim() || "—"}
                          </div>
                          <div className="w-10 shrink-0 text-right">
                            <button
                              type="button"
                              aria-label="Редактировать оплату"
                              className="inline-flex p-0.5"
                              onClick={() => setEditLedger(i)}
                            >
                              <Image
                                src={theme === "dark" ? editBlack : editIcon}
                                alt=""
                                width={18}
                                height={18}
                                unoptimized
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr aria-hidden>
                    <td colSpan={4} className="p-0">
                      <div className="h-px w-full" style={{ backgroundColor: lineRule }} />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className={`group mt-3 inline-flex items-center gap-2 text-sm ${mutedAction}`}
          onClick={() => {
            setLedger((r) => {
              const next = [
                ...r,
                {
                  amountRubles: 0,
                  paymentDate: new Date().toISOString().slice(0, 10),
                  comment: "",
                },
              ];
              setEditLedger(next.length - 1);
              return sortLedgerRows(next);
            });
          }}
        >
          <span className="relative h-5 w-5 shrink-0">
            <Image
              src={theme === "dark" ? oplataBlack : oplataIcon}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="transition-opacity duration-200 group-hover:opacity-0"
            />
            <Image
              src={oplataNav}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </span>
          Добавить оплату
        </button>
      </div>

      <div className="mt-10">
        <h3 className="modal-section-title text-[var(--foreground)]">Документы</h3>
        <div className="mt-2 h-px w-full" style={{ backgroundColor: lineRule }} />
        <div className="mt-px w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <tbody>
              {docs.map((row, i) => (
                <Fragment key={i}>
                  <tr>
                    <td colSpan={4} className="p-0 align-top">
                      {editDoc === i ? (
                        <div className="space-y-2 py-2">
                          <div className="flex min-w-0 flex-wrap items-end gap-2">
                            <div className="flex w-[9.25rem] shrink-0 flex-col gap-0.5">
                              <SettingsLbl>Дата</SettingsLbl>
                              <DatePickerField
                                value={row.docDate}
                                onChange={(v) =>
                                  setDocs((prev) =>
                                    sortDocRows(
                                      prev.map((x, j) => (j === i ? { ...x, docDate: v } : x)),
                                    ),
                                  )
                                }
                                className={fieldClass("w-full text-left")}
                              />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5 basis-[min(100%,18rem)]">
                              <SettingsLbl>URL</SettingsLbl>
                              <input
                                className={fieldClass("w-full min-w-0")}
                                placeholder="URL"
                                value={row.url}
                                onChange={(e) =>
                                  setDocs((prev) =>
                                    prev.map((x, j) =>
                                      j === i ? { ...x, url: e.target.value } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5 basis-[min(100%,14rem)]">
                              <SettingsLbl>Заголовок ссылки</SettingsLbl>
                              <input
                                className={fieldClass("w-full min-w-0")}
                                placeholder="Заголовок ссылки"
                                value={row.linkTitle ?? ""}
                                onChange={(e) =>
                                  setDocs((prev) =>
                                    prev.map((x, j) =>
                                      j === i ? { ...x, linkTitle: e.target.value || null } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <SettingsLbl>Комментарий</SettingsLbl>
                            <input
                              className={fieldClass("w-full")}
                              placeholder="Комментарий"
                              value={row.comment ?? ""}
                              onChange={(e) =>
                                setDocs((prev) =>
                                  prev.map((x, j) =>
                                    j === i ? { ...x, comment: e.target.value || null } : x,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="text-sm text-[var(--muted)] underline"
                              onClick={() => setEditDoc(null)}
                            >
                              Готово
                            </button>
                            <button
                              type="button"
                              className="text-sm text-red-600/90 underline"
                              onClick={() => {
                                setDocs((prev) => prev.filter((_, j) => j !== i));
                                setEditDoc(null);
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-[200px] shrink-0 text-[var(--foreground)]">
                            {formatRuDayMonthWeekday(row.docDate)}
                          </div>
                          <div className="min-w-0 flex-1">
                            {row.url.trim() ? (
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm underline decoration-[#5A86EE]/50 underline-offset-[3px]"
                                style={{ color: "#5A86EE" }}
                              >
                                {row.linkTitle?.trim() || row.url}
                              </a>
                            ) : (
                              <span className="text-[var(--muted)]">—</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                            {row.comment?.trim() ? row.comment.trim() : null}
                          </div>
                          <div className="w-10 shrink-0 text-right">
                            <button
                              type="button"
                              aria-label="Редактировать документ"
                              className="inline-flex p-0.5"
                              onClick={() => setEditDoc(i)}
                            >
                              <Image
                                src={theme === "dark" ? editBlack : editIcon}
                                alt=""
                                width={18}
                                height={18}
                                unoptimized
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr aria-hidden>
                    <td colSpan={4} className="p-0">
                      <div className="h-px w-full" style={{ backgroundColor: lineRule }} />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className={`group mt-3 inline-flex items-center gap-2 text-sm ${mutedAction}`}
          onClick={() => {
            setDocs((d) => {
              const next = [
                ...d,
                {
                  docDate: new Date().toISOString().slice(0, 10),
                  url: "",
                  linkTitle: null,
                  comment: "",
                },
              ];
              setEditDoc(next.length - 1);
              return sortDocRows(next);
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
          Добавить документ
        </button>
      </div>
    </RightPanel>
  );
}

export { BacklogFormPanel } from "@/components/backlog-form-panel";

type LkStageTask = {
  id: string;
  description: string;
  done: boolean;
  completedAt: string | null;
};

type StRow = {
  id: string;
  title: string;
  tasks: LkStageTask[];
};

function SortableLkStageTaskRow({
  task,
  si,
  ti,
  setStages,
}: {
  task: LkStageTask;
  si: number;
  ti: number;
  setStages: React.Dispatch<React.SetStateAction<StRow[]>>;
}) {
  const { theme } = useTheme();
  const dragSrc = theme === "dark" ? dragBlack : dragIcon;
  const dateAnchorRef = useRef<HTMLButtonElement>(null);
  const [dateOpen, setDateOpen] = useState(false);
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
  const taskRef = useRef<HTMLTextAreaElement>(null);
  const fitTaskHeight = useCallback(() => {
    const el = taskRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(24, el.scrollHeight)}px`;
  }, []);

  useLayoutEffect(() => {
    fitTaskHeight();
  }, [task.description, fitTaskHeight]);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(ti === 0
          ? {
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: theme === "dark" ? "#474747" : "#dadada",
            }
          : {}),
      }}
      className={`flex min-w-0 flex-wrap items-center gap-2 overflow-visible border-b border-[var(--table-divider)] py-1 last:border-b-0 ${
        ti === 0 ? "pt-2" : ""
      }`}
    >
      <IconCheckbox
        checked={task.done}
        onChange={(next) =>
          setStages((prev) =>
            prev.map((x, j) =>
              j === si
                ? {
                    ...x,
                    tasks: x.tasks.map((y, k) =>
                      k === ti ? { ...y, done: next } : y,
                    ),
                  }
                : x,
            ),
          )
        }
        ariaLabel="Выполнено"
      />
      <textarea
        ref={taskRef}
        className={`min-w-0 flex-1 self-center resize-none overflow-hidden border-0 bg-transparent p-0 text-sm leading-snug whitespace-pre-wrap break-words outline-none ${
          task.done ? "line-through opacity-80" : ""
        }`}
        value={task.description}
        rows={1}
        onChange={(e) =>
          setStages((prev) =>
            prev.map((x, j) =>
              j === si
                ? {
                    ...x,
                    tasks: x.tasks.map((y, k) =>
                      k === ti ? { ...y, description: e.target.value } : y,
                    ),
                  }
                : x,
            ),
          )
        }
      />
      <div className="flex shrink-0 items-center gap-0.5">
        {task.completedAt ? (
          <>
            <button
              type="button"
              className="group relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
              aria-label="Сбросить дату"
              onClick={() => {
                setDateOpen(false);
                setStages((prev) =>
                  prev.map((x, j) =>
                    j === si
                      ? {
                          ...x,
                          tasks: x.tasks.map((y, k) =>
                            k === ti ? { ...y, completedAt: null } : y,
                          ),
                        }
                      : x,
                  ),
                );
              }}
            >
              <Image
                src={theme === "dark" ? closeBlack : closeIcon}
                alt=""
                width={14}
                height={14}
                unoptimized
                className="transition-opacity duration-200 group-hover:opacity-0"
              />
              <Image
                src={closeNav}
                alt=""
                width={14}
                height={14}
                unoptimized
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </button>
            <button
              ref={dateAnchorRef}
              type="button"
              className={`shrink-0 border-0 bg-transparent p-0 text-left text-sm hover:opacity-90 ${
                task.done
                  ? "text-[#00B956]"
                  : theme === "dark"
                    ? "text-[#666666]"
                    : "text-[#a4a4a4]"
              }`}
              onClick={() => setDateOpen(true)}
            >
              {formatRuDayMonthWeekday(task.completedAt)}
            </button>
          </>
        ) : (
          <button
            ref={dateAnchorRef}
            type="button"
            className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center"
            aria-label="Выбрать дату"
            onClick={() => setDateOpen(true)}
          >
            <Image
              src={theme === "dark" ? calBlack : calIcon}
              alt=""
              width={18}
              height={18}
              unoptimized
              className="transition-opacity duration-200 group-hover:opacity-0"
            />
            <Image
              src={calNav}
              alt=""
              width={18}
              height={18}
              unoptimized
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </button>
        )}
      </div>
      {dateOpen ? (
        <MinimalDatePicker
          value={task.completedAt ?? ""}
          onChange={(v) => {
            setStages((prev) =>
              prev.map((x, j) =>
                j === si
                  ? {
                      ...x,
                      tasks: x.tasks.map((y, k) =>
                        k === ti ? { ...y, completedAt: v || null } : y,
                      ),
                    }
                  : x,
              ),
            );
            setDateOpen(false);
          }}
          onClose={() => setDateOpen(false)}
          anchorRef={dateAnchorRef}
        />
      ) : null}
      <button
        type="button"
        className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center"
        aria-label="Удалить задачу"
        onClick={() =>
          setStages((prev) =>
            prev.map((x, j) =>
              j === si
                ? { ...x, tasks: x.tasks.filter((_, k) => k !== ti) }
                : x,
            ),
          )
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
      <button
        type="button"
        className="cursor-grab touch-none shrink-0 p-0.5 active:cursor-grabbing"
        aria-label="Перетащить"
        {...attributes}
        {...listeners}
      >
        <Image src={dragSrc} alt="" width={16} height={16} unoptimized />
      </button>
    </div>
  );
}

export function LkEditorPanel({
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
  const [lkTitle, setLkTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lkShowDeadline, setLkShowDeadline] = useState(true);
  const [dcomment, setDcomment] = useState("");
  const [commentEditing, setCommentEditing] = useState(false);
  const [deadlinePick, setDeadlinePick] = useState<null | "start" | "end">(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const endDateRef = useRef<HTMLButtonElement>(null);
  const [timeline, setTimeline] = useState<TlEntryEditor[]>([]);
  const [timelineEditKey, setTimelineEditKey] = useState<string | null>(null);
  const [stages, setStages] = useState<StRow[]>([]);
  const [stagesComment, setStagesComment] = useState("");
  const [stagesCommentOpen, setStagesCommentOpen] = useState(false);
  const stagesCommentRef = useRef<HTMLTextAreaElement>(null);
  const [paid, setPaid] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [payBlocks, setPayBlocks] = useState<BlockRow[]>([]);
  const [lkShowPayments, setLkShowPayments] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [slider, setSlider] = useState<string[] | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [lkLoad, setLkLoad] = useState(false);

  const activeDeadlineRef: RefObject<HTMLButtonElement | null> =
    deadlinePick === "start" ? startDateRef : endDateRef;
  const { theme } = useTheme();
  const fitStagesCommentHeight = useCallback(() => {
    const el = stagesCommentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(36, el.scrollHeight)}px`;
  }, []);

  const stageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onStageTaskDragEnd(si: number) {
    return ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      setStages((prev) => {
        const st = prev[si];
        if (!st) return prev;
        const ids = st.tasks.map((t) => t.id);
        const oi = ids.indexOf(String(active.id));
        const ni = ids.indexOf(String(over.id));
        if (oi < 0 || ni < 0) return prev;
        const nextTasks = arrayMove(st.tasks, oi, ni);
        return prev.map((x, j) => (j === si ? { ...x, tasks: nextTasks } : x));
      });
    };
  }

  useEffect(() => {
    if (!open) return;
    setCommentEditing(false);
    setDeadlinePick(null);
    setTimelineEditKey(null);
    setStagesCommentOpen(false);
    setLkLoad(true);
    void (async () => {
      const j = await fetchJson(`/api/projects/${projectId}`).catch(() => null);
      if (!j) {
        setLkLoad(false);
        return;
      }
      setLkTitle(j.project.lkTitle ?? "");
      setCustomerName(j.project.customerName ?? "");
      setStagesComment(
        String((j.project as { lkStagesComment?: string | null }).lkStagesComment ?? ""),
      );
      const dl = j.deadline;
      setStart(dl?.startAt ? formatDateYmdLocal(new Date(dl.startAt)) : "");
      setEnd(dl?.endAt ? formatDateYmdLocal(new Date(dl.endAt)) : "");
      setLkShowDeadline(j.project.lkShowDeadline !== false);
      setDcomment(dl?.comment ?? "");

      const led = (j.payments?.ledger ?? []) as { amountRubles: number }[];
      setPaid(led.reduce((s, r) => s + r.amountRubles, 0));
      setRemaining((j.project as { remainingAmountRubles?: number }).remainingAmountRubles ?? 0);
      setLkShowPayments(j.project?.lkShowPayments !== false);
      setPayBlocks(
        (j.payments?.textBlocks ?? []).map(
          (b: { id?: string; body: string | null; color: PaymentTextBlockState }) => ({
            id: String(b.id ?? nanoid()),
            body: b.body,
            color: b.color,
          }),
        ),
      );

      const byEntry = new Map<string, TlEntryEditor>();
      const order: string[] = [];
      for (const e of j.timeline.entries as {
        id: string;
        entryDate: string;
        title: string;
        description?: string | null;
      }[]) {
        order.push(e.id);
        byEntry.set(e.id, {
          clientKey: nanoid(),
          entryDate: e.entryDate.slice(0, 10),
          title: e.title,
          description: e.description ?? "",
          images: [],
          links: [],
        });
      }
      for (const im of j.timeline.images as {
        entryId: string;
        originalKey: string;
        webpKey: string;
        webpUrl?: string | null;
        originalUrl?: string | null;
      }[]) {
        const ent = byEntry.get(im.entryId);
        if (!ent) continue;
        ent.images.push({
          id: nanoid(),
          originalKey: im.originalKey,
          webpKey: im.webpKey,
          webpUrl: im.webpUrl ?? "",
          originalUrl: im.originalUrl ?? "",
        });
      }
      for (const ln of j.timeline.links as {
        entryId: string;
        url: string;
        linkTitle: string;
      }[]) {
        const ent = byEntry.get(ln.entryId);
        if (!ent) continue;
        ent.links.push({ url: ln.url, title: ln.linkTitle });
      }
      setTimeline(sortTimelineDesc(order.map((id) => byEntry.get(id)!)));

      const stOrder: string[] = [];
      const stMap = new Map<string, StRow>();
      for (const s of j.stages as { id: string; title: string }[]) {
        stOrder.push(s.id);
        stMap.set(s.id, { id: s.id, title: s.title, tasks: [] });
      }
      for (const t of j.stageTasks as {
        stageId: string;
        description: string;
        done: boolean;
        completedAt: string | null;
      }[]) {
        const st = stMap.get(t.stageId);
        if (!st) continue;
        st.tasks.push({
          id: nanoid(),
          description: t.description,
          done: t.done,
          completedAt: t.completedAt ? t.completedAt.slice(0, 10) : null,
        });
      }
      setStages(stOrder.map((id) => stMap.get(id)!));
      setLkLoad(false);
    })();
  }, [open, projectId]);

  useLayoutEffect(() => {
    fitStagesCommentHeight();
  }, [stagesComment, stagesCommentOpen, fitStagesCommentHeight]);

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/lk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lkTitle,
          lkShowBacklog: false,
          lkShowDeadline,
          lkShowPayments,
          stagesComment: stagesComment.trim() || null,
          deadline: {
            startAt: start ? dateYmdToStartIso(start) : null,
            endAt: end ? dateYmdToEndIso(end) : null,
            comment: dcomment || null,
          },
          timeline: sortTimelineDesc(timeline).map((e) => ({
            entryDate: e.entryDate,
            title: e.title,
            description: e.description ?? "",
            images: e.images.map((im) => ({
              originalKey: im.originalKey,
              webpKey: im.webpKey,
            })),
            links: e.links.map((l) => ({ url: l.url, title: l.title })),
          })),
          stages: stages.map((s) => ({
            title: s.title,
            tasks: s.tasks.map((t) => ({
              description: t.description,
              done: t.done,
              completedAt: t.completedAt,
            })),
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

  return (
    <>
      <RightPanel
        open={open}
        title="Редактор ЛК"
        onClose={onClose}
        footer={btnFooter(onClose, save, busy)}
        contentLoading={lkLoad}
        saving={busy}
      >
        {customerName ? (
          <p className="mb-4 text-sm" style={{ color: theme === "dark" ? "#666666" : "#a4a4a4" }}>
            {customerName}
          </p>
        ) : null}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-[var(--muted)]">Заголовок ЛК</label>
          <input className={fieldClass()} value={lkTitle} onChange={(e) => setLkTitle(e.target.value)} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <LkSectionTitleBar
              title="Таймлайн работ по проекту"
              onAdd={() => {
                const nk = nanoid();
                setTimeline((t) =>
                  sortTimelineDesc([
                    {
                      clientKey: nk,
                      entryDate: new Date().toISOString().slice(0, 10),
                      title: "Новая запись",
                      description: "",
                      images: [],
                      links: [],
                    },
                    ...t,
                  ]),
                );
                setTimelineEditKey(nk);
              }}
            />
            <LkEditorTimelineSection
              projectId={projectId}
              timeline={timeline}
              setTimeline={setTimeline}
              editingKey={timelineEditKey}
              setEditingKey={setTimelineEditKey}
              onOpenSlider={(urls, index) => {
                setSlider(urls);
                setSliderIdx(index);
              }}
            />
          </div>

          <div className="space-y-8">
            {lkShowDeadline ? (
              <div className="mb-5">
                <h3 className="lk-section-title">Текущий дедлайн</h3>
                <div className="mt-2 w-full min-w-0">
                  <DeadlineBlock
                    startAt={start ? dateYmdToStartIso(start) : null}
                    endAt={end ? dateYmdToEndIso(end) : null}
                    comment={null}
                    onStartClick={() => setDeadlinePick("start")}
                    onEndClick={() => setDeadlinePick("end")}
                    startDateRef={startDateRef}
                    endDateRef={endDateRef}
                    commentSlot={
                      <>
                        {!dcomment.trim() && !commentEditing ? (
                          <LkAddCommentTrigger
                            className="mt-2"
                            onClick={() => setCommentEditing(true)}
                          />
                        ) : commentEditing ? (
                          <textarea
                            autoFocus
                            className={fieldClass("mt-2 min-h-[64px]")}
                            value={dcomment}
                            onChange={(e) => setDcomment(e.target.value)}
                            onBlur={() => setCommentEditing(false)}
                          />
                        ) : (
                          <button
                            type="button"
                            className="mt-2 w-full text-left text-sm text-[var(--muted)]"
                            onClick={() => setCommentEditing(true)}
                          >
                            {dcomment}
                          </button>
                        )}
                      </>
                    }
                  />
                </div>
              </div>
            ) : null}

            <div className="mb-5">
              <LkSectionTitleBar
                title="Этапы"
                onAdd={() =>
                  setStages((s) => [
                    ...s,
                    { id: nanoid(), title: "Новый этап", tasks: [] },
                  ])
                }
              />
              <div className="mt-4 space-y-6">
                {stages.map((st, si) => (
                  <div key={st.id}>
                    <div className="flex items-center gap-3">
                      <input
                        className="min-w-0 w-full flex-1 border-0 bg-transparent p-0 text-sm font-medium outline-none"
                        placeholder="Заголовок этапа"
                        value={st.title}
                        onChange={(e) =>
                          setStages((prev) =>
                            prev.map((x, j) =>
                              j === si ? { ...x, title: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center"
                        aria-label="Удалить этап"
                        onClick={() =>
                          setStages((prev) => prev.filter((_, j) => j !== si))
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
                    <div className="mt-3">
                      <DndContext
                        sensors={stageSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={onStageTaskDragEnd(si)}
                      >
                        <SortableContext
                          items={st.tasks.map((t) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {st.tasks.map((t, ti) => (
                            <SortableLkStageTaskRow
                              key={t.id}
                              task={t}
                              si={si}
                              ti={ti}
                              setStages={setStages}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                      <LkAddTaskButton
                        onClick={() =>
                          setStages((prev) =>
                            prev.map((x, j) =>
                              j === si
                                ? {
                                    ...x,
                                    tasks: [
                                      ...x.tasks,
                                      {
                                        id: nanoid(),
                                        description: "",
                                        done: false,
                                        completedAt: null,
                                      },
                                    ],
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
                {!stagesComment.trim() && !stagesCommentOpen ? (
                  <LkAddCommentTrigger
                    className="mt-4"
                    onClick={() => setStagesCommentOpen(true)}
                  />
                ) : (
                  <div className="mt-4 flex flex-col gap-0.5">
                    <span
                      className={`text-xs ${theme === "dark" ? "text-[#666666]" : "text-[#a4a4a4]"}`}
                    >
                      Комментарий
                    </span>
                    <textarea
                      ref={stagesCommentRef}
                      rows={1}
                      className="w-full resize-none overflow-hidden rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: theme === "dark" ? "#474747" : "#dadada",
                      }}
                      value={stagesComment}
                      onChange={(e) => setStagesComment(e.target.value)}
                      onBlur={() => {
                        if (!stagesComment.trim()) setStagesCommentOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {lkShowPayments ? (
            <div>
              <h3 className="lk-section-title">Оплаты</h3>
              <div className="mt-2 w-full min-w-0">
                <PaymentBlock paidRubles={paid} remainingRubles={remaining} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {payBlocks.map((b) => {
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
                        className="inline-flex h-8 w-8 -ml-2 -mr-1 items-center justify-center rounded-full"
                      >
                        <Image src={src} alt="" width={20} height={20} unoptimized />
                      </div>
                    );
                  }

                  const hasText = Boolean(b.body?.trim());
                  const chipColor = b.color === "red" ? "gray" : b.color;
                  const chip = paymentChipStyles(
                    chipColor as "green" | "gray" | "neutral",
                    theme,
                  );
                  return (
                    <div
                      key={b.id}
                      className={`inline-flex max-w-full min-h-[24px] shrink-0 items-center rounded-full py-0.5 text-xs whitespace-nowrap ${
                        hasText ? "px-3" : "w-[43px] justify-center px-0"
                      }`}
                      style={{
                        color: chip.color,
                        backgroundColor: chip.backgroundColor,
                        borderWidth: chip.borderColor ? 1 : 0,
                        borderStyle: chip.borderColor ? "solid" : "none",
                        borderColor: chip.borderColor ?? "transparent",
                      }}
                    >
                      <span className="min-w-0 truncate">
                        {hasText ? b.body : "\u00A0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            ) : null}
          </div>
        </div>
      </RightPanel>

      {deadlinePick ? (
        <MinimalDatePicker
          value={deadlinePick === "start" ? start : end}
          onChange={(ymd) => {
            if (deadlinePick === "start") setStart(ymd);
            else setEnd(ymd);
            setDeadlinePick(null);
          }}
          onClose={() => setDeadlinePick(null)}
          anchorRef={activeDeadlineRef}
        />
      ) : null}

      {slider ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
          role="presentation"
          onClick={() => setSlider(null)}
        >
          <div className="flex justify-end p-4">
            <button type="button" className="text-2xl" onClick={() => setSlider(null)}>
              ×
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slider[sliderIdx]}
              alt=""
              className="max-h-[85vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex justify-center gap-4 pb-6">
            <button
              type="button"
              disabled={sliderIdx <= 0}
              onClick={(e) => {
                e.stopPropagation();
                setSliderIdx((i) => Math.max(0, i - 1));
              }}
            >
              ←
            </button>
            <button
              type="button"
              disabled={sliderIdx >= slider.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setSliderIdx((i) => Math.min(slider.length - 1, i + 1));
              }}
            >
              →
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SettingsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<
    {
      id: string;
      login: string;
      firstName: string;
      lastName: string;
      role: "admin" | "employee";
      isActive: boolean;
      avatarKey: string | null;
      avatarUrl: string | null;
      sortOrder: number;
    }[]
  >([]);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const userSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  async function reload() {
    const j = await fetchJson("/api/users?all=1").catch(() => ({ users: [] }));
    const rows = j.users ?? [];
    setUsers(rows);
    setUserOrder(rows.map((u: { id: string }) => u.id));
  }

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open]);

  async function addUser() {
    if (!login.trim() || !password || !firstName.trim()) {
      alert("Укажите логин, пароль и имя");
      return;
    }
    try {
      await fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
        }),
      });
      setLogin("");
      setPassword("");
      setFirstName("");
      setLastName("");
      await reload();
    } catch {
      alert("Не удалось добавить");
    }
  }

  function onUsersDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setUserOrder((prev) => {
      const oi = prev.indexOf(String(active.id));
      const ni = prev.indexOf(String(over.id));
      if (oi < 0 || ni < 0) return prev;
      const next = arrayMove(prev, oi, ni);
      void fetchJson("/api/users/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next }),
      }).catch(() => null);
      return next;
    });
  }
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const orderedUsers = useMemo(() => {
    const out = userOrder.map((id) => userMap.get(id)).filter(Boolean) as typeof users;
    const missing = users.filter((u) => !userOrder.includes(u.id));
    return [...out, ...missing];
  }, [users, userOrder, userMap]);

  return (
    <RightPanel open={open} title="Настройки" onClose={onClose}>
      <div className="text-sm font-medium">Новый пользователь</div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <SettingsField label="Логин" className="min-w-[7rem] max-w-[10rem]">
          <input className={fieldClass("w-full")} value={login} onChange={(e) => setLogin(e.target.value)} />
        </SettingsField>
        <SettingsField label="Пароль" className="min-w-[7rem] max-w-[10rem]">
          <input
            className={fieldClass("w-full")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </SettingsField>
        <SettingsField label="Имя" className="min-w-[6rem] max-w-[9rem]">
          <input className={fieldClass("w-full")} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </SettingsField>
        <SettingsField label="Фамилия" className="min-w-[6rem] max-w-[9rem]">
          <input className={fieldClass("w-full")} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </SettingsField>
        <SettingsField label="Роль" className="min-w-[8.5rem] max-w-[11rem]">
          <select
            className={fieldClass("w-full")}
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "employee")}
          >
            <option value="employee">Сотрудник</option>
            <option value="admin">Администратор</option>
          </select>
        </SettingsField>
        <SettingsPlusButton onClick={() => void addUser()} />
      </div>

      <div className="mt-10 space-y-8">
        <DndContext
          sensors={userSensors}
          collisionDetection={closestCenter}
          onDragEnd={onUsersDragEnd}
        >
          <SortableContext
            items={orderedUsers.map((u) => u.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedUsers.map((u) => (
              <UserRow key={u.id} u={u} onChange={() => void reload()} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </RightPanel>
  );
}

function UserRow({
  u,
  onChange,
}: {
  u: {
    id: string;
    login: string;
    firstName: string;
    lastName: string;
    role: "admin" | "employee";
    isActive: boolean;
    avatarKey: string | null;
    avatarUrl: string | null;
  };
  onChange: () => void;
}) {
  const { theme } = useTheme();
  const [login, setLogin] = useState(u.login);
  const [firstName, setFirstName] = useState(u.firstName);
  const [lastName, setLastName] = useState(u.lastName);
  const [role, setRole] = useState(u.role);
  const [isActive, setIsActive] = useState(u.isActive);
  const [pwd, setPwd] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);
  const drag = useSortable({ id: u.id });
  const dragStyle = {
    transform: CSS.Transform.toString(drag.transform),
    transition: drag.transition,
    opacity: drag.isDragging ? 0.86 : 1,
  };

  useEffect(() => {
    setLogin(u.login);
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setRole(u.role);
    setIsActive(u.isActive);
    setPwd("");
    setSavedMsg(false);
  }, [u]);
  const dirty =
    login !== u.login ||
    firstName !== u.firstName ||
    lastName !== u.lastName ||
    role !== u.role ||
    isActive !== u.isActive ||
    pwd.trim().length > 0;

  async function save() {
    try {
      await fetchJson(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          firstName,
          lastName,
          role,
          isActive,
          ...(pwd ? { password: pwd } : {}),
        }),
      });
      setSavedMsg(true);
      window.setTimeout(() => setSavedMsg(false), 1800);
      onChange();
    } catch {
      alert("Ошибка сохранения");
    }
  }

  async function remove() {
    if (!confirm("Удалить пользователя?")) return;
    try {
      await fetchJson(`/api/users/${u.id}`, { method: "DELETE" });
      onChange();
    } catch {
      alert("Нельзя удалить");
    }
  }

  async function avatar(ev: { target: HTMLInputElement }) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.set("file", f);
    const res = await fetch(`/api/users/${u.id}/avatar`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) alert("Аватар не загружен");
    else onChange();
    ev.target.value = "";
  }

  return (
    <div
      ref={drag.setNodeRef}
      style={dragStyle}
      className="border-b border-[var(--foreground)]/10 pb-8 last:border-b-0 last:pb-0"
    >
      <div className="flex flex-wrap items-start gap-3">
        <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[var(--foreground)]/10 text-center text-[10px] leading-tight text-[var(--muted)]">
          {u.avatarUrl ? (
            <Image src={u.avatarUrl} alt="" fill className="object-cover" unoptimized sizes="56px" />
          ) : (
            "Аватар"
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void avatar(e)} />
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <SettingsField label="Логин" className="min-w-[7rem] max-w-[10rem]">
              <input className={fieldClass("w-full")} value={login} onChange={(e) => setLogin(e.target.value)} />
            </SettingsField>
            <SettingsField label="Пароль" className="min-w-[7rem] max-w-[10rem]">
              <input
                className={fieldClass("w-full")}
                placeholder="Новый пароль"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
              />
            </SettingsField>
            <SettingsField label="Имя" className="min-w-[6rem] max-w-[9rem]">
              <input className={fieldClass("w-full")} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </SettingsField>
            <SettingsField label="Фамилия" className="min-w-[6rem] max-w-[9rem]">
              <input className={fieldClass("w-full")} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </SettingsField>
            <SettingsField label="Роль" className="min-w-[8.5rem] max-w-[11rem]">
              <select
                className={fieldClass("w-full")}
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "employee")}
              >
                <option value="employee">Сотрудник</option>
                <option value="admin">Администратор</option>
              </select>
            </SettingsField>
            <div className="flex flex-col gap-0.5">
              <SettingsLbl>Статус</SettingsLbl>
              <button
                type="button"
                className="group relative inline-flex h-9 w-9 items-center justify-center rounded"
                aria-label={isActive ? "Активный" : "Неактивный"}
                onClick={() => setIsActive((v) => !v)}
              >
                <Image
                  src={
                    isActive
                      ? theme === "dark"
                        ? eyeBlack
                        : eyeIcon
                      : eyeOff
                  }
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="transition-opacity duration-200 group-hover:opacity-0"
                />
                <Image
                  src={isActive ? eyeNav : eyeOffNav}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              </button>
            </div>
            <button
              type="button"
              className="mt-5 cursor-grab touch-none p-1 text-[var(--muted)] active:cursor-grabbing"
              aria-label="Перетащить сотрудника"
              {...drag.attributes}
              {...drag.listeners}
            >
              <Image src={theme === "dark" ? dragBlack : dragIcon} alt="" width={16} height={16} unoptimized />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SettingsSaveButton onClick={() => void save()} />
            <SettingsDeleteButton onClick={() => void remove()} />
          </div>
          {dirty ? (
            <p className="text-xs text-[var(--muted)]">
              Не забудьте нажать на кнопку «Сохранить», чтобы изменения вступили в силу
            </p>
          ) : null}
          {savedMsg ? <p className="text-xs text-[#00B956]">Все изменения сохранены</p> : null}
        </div>
      </div>
    </div>
  );
}

type MeUser = {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  role: "admin" | "employee";
  avatarKey: string | null;
  avatarUrl: string | null;
};

export function MyProfilePanel({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [me, setMe] = useState<MeUser | null>(null);
  const [login, setLogin] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [profileLoad, setProfileLoad] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPick(null);
    setPreviewUrl(null);
    setPwd("");
    setProfileLoad(true);
    void (async () => {
      try {
        const j = await fetchJson("/api/auth/me");
        const u = j.user as MeUser | null;
        if (!u) return;
        setMe(u);
        setLogin(u.login);
        setFirstName(u.firstName);
        setLastName(u.lastName);
        setRole(u.role);
      } catch {
        setMe(null);
      } finally {
        setProfileLoad(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPick(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function save() {
    if (!me) return;
    setBusy(true);
    try {
      if (pick) {
        const fd = new FormData();
        fd.set("file", pick);
        const ar = await fetch(`/api/users/${me.id}/avatar`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!ar.ok) throw new Error("avatar");
        setPick(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      if (me.role === "employee") {
        await fetchJson(`/api/users/${me.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName }),
        });
      } else {
        await fetchJson(`/api/users/${me.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login,
            firstName,
            lastName,
            role,
            ...(pwd ? { password: pwd } : {}),
          }),
        });
      }
      onSaved();
      onClose();
    } catch {
      alert("Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  const avatarSrc = previewUrl ?? me?.avatarUrl ?? null;

  return (
    <RightPanel
      open={open}
      title="Мой профиль"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy || !me)}
      contentLoading={profileLoad}
      saving={busy}
    >
      {!me ? (
        <p className="text-sm text-[var(--muted)]">Загрузка…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-4">
            <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[var(--foreground)]/10 text-xs text-[var(--muted)]">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>
                  {firstName[0]}
                  {lastName[0]}
                </span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </label>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {me.role === "employee" ? (
                  <div className="flex flex-col gap-0.5">
                    <SettingsLbl>Логин</SettingsLbl>
                    <div className="text-sm text-[var(--foreground)]">{me.login}</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <SettingsLbl>Логин</SettingsLbl>
                    <input
                      className={fieldClass()}
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                    />
                  </div>
                )}
                {me.role === "admin" ? (
                  <div className="flex flex-col gap-0.5">
                    <SettingsLbl>Пароль</SettingsLbl>
                    <input
                      className={fieldClass()}
                      placeholder="Новый пароль (необязательно)"
                      type="password"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="hidden sm:block" aria-hidden />
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <SettingsLbl>Имя</SettingsLbl>
                  <input
                    className={fieldClass()}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <SettingsLbl>Фамилия</SettingsLbl>
                  <input
                    className={fieldClass()}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <SettingsLbl>Роль</SettingsLbl>
                  {me.role === "admin" ? (
                    <select
                      className={fieldClass()}
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as "admin" | "employee")
                      }
                    >
                      <option value="employee">Сотрудник</option>
                      <option value="admin">Администратор</option>
                    </select>
                  ) : (
                    <div className="py-2 text-sm text-[var(--foreground)]">
                      {roleLabel(me.role)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </RightPanel>
  );
}
