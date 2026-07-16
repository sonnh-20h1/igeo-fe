import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatCompactDate(date: Date, locale: string = "vi") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}
