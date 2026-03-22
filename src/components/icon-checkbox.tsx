"use client";

import Image from "next/image";
import checkboxBlack from "@/icons/checkbox-black.svg";
import checkboxNav from "@/icons/checkbox-nav.svg";
import checkboxIcon from "@/icons/checkbox.svg";
import checkboxCompleteNav from "@/icons/checkboxcomplete-nav.svg";
import checkboxComplete from "@/icons/checkboxcomplete.svg";
import { useTheme } from "@/components/theme-provider";

export function IconCheckbox({
  checked,
  onChange,
  ariaLabel,
  readOnly,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  ariaLabel?: string;
  readOnly?: boolean;
}) {
  const { theme } = useTheme();
  const baseEmpty = theme === "dark" ? checkboxBlack : checkboxIcon;
  if (readOnly) {
    return (
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
        aria-label={ariaLabel}
        role="img"
      >
        <Image
          src={checked ? checkboxComplete : baseEmpty}
          alt=""
          width={16}
          height={16}
          unoptimized
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange?.(!checked)}
      className="group relative inline-flex h-4 w-4 shrink-0 items-center justify-center"
    >
      {!checked ? (
        <>
          <Image
            src={baseEmpty}
            alt=""
            width={16}
            height={16}
            unoptimized
            className="transition-opacity duration-200 group-hover:opacity-0"
          />
          <Image
            src={checkboxNav}
            alt=""
            width={16}
            height={16}
            unoptimized
            className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        </>
      ) : (
        <>
          <Image
            src={checkboxComplete}
            alt=""
            width={16}
            height={16}
            unoptimized
            className="transition-opacity duration-200 group-hover:opacity-0"
          />
          <Image
            src={checkboxCompleteNav}
            alt=""
            width={16}
            height={16}
            unoptimized
            className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        </>
      )}
    </button>
  );
}
