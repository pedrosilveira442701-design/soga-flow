import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Link do WhatsApp com DDI garantido: números brasileiros sem o 55 (10-11
 * dígitos com DDD) ganham o prefixo; números já internacionais passam direto.
 */
export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withDdi = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${withDdi}`;
}
