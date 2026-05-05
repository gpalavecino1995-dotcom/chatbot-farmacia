import type { AppSettings, SaleRecord } from "../types";
import { formatMoney } from "./format";

type ReceiptPayload = {
  id: string;
  createdAt: string;
  pharmacyName: string;
  cashierName: string;
  patientRut?: string;
  healthProvider?: "FONASA" | "ISAPRE";
  currency: string;
  total: number;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

type CompactReceiptPayload = {
  i: string;
  d: string;
  f: string;
  c: string;
  r?: string;
  s?: "FONASA" | "ISAPRE";
  m: string;
  t: number;
  p: Array<[string, string, number, number, number]>;
};

export function createReceiptPayload(
  sale: SaleRecord,
  settings: AppSettings
): ReceiptPayload {
  return {
    id: sale.id,
    createdAt: sale.createdAt,
    pharmacyName: settings.pharmacyName,
    cashierName: sale.sellerName || settings.cashierName,
    patientRut: sale.patientRut,
    healthProvider: sale.healthProvider,
    currency: settings.currency,
    total: sale.total,
    items: sale.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal
    }))
  };
}

export function buildReceiptUrl(payload: ReceiptPayload) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("b", encodePayload(payload));
  return url.toString();
}

export function parseReceiptPayload(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const decoded = JSON.parse(decodePayload(value)) as
      | ReceiptPayload
      | CompactReceiptPayload;
    return expandPayload(decoded);
  } catch {
    return null;
  }
}

export function createReceiptJpg(payload: ReceiptPayload) {
  const width = 520;
  const lineHeight = 22;
  const itemHeight = 68;
  const height = Math.max(720, 390 + payload.items.length * itemHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#ffb600";
  context.fillRect(0, 0, width, 18);

  context.fillStyle = "#111111";
  context.font = "700 34px Arial";
  context.fillText("Duoc UC", 28, 62);
  context.font = "700 22px Arial";
  context.fillText("Boleta ficticia POS Farmacia", 28, 96);

  context.font = "14px Arial";
  let y = 136;
  drawLine(context, `Farmacia: ${payload.pharmacyName}`, 28, y);
  y += lineHeight;
  drawLine(context, `Cajero: ${payload.cashierName}`, 28, y);
  y += lineHeight;
  if (payload.patientRut) {
    drawLine(context, `RUT paciente: ${payload.patientRut}`, 28, y);
    y += lineHeight;
  }
  if (payload.healthProvider) {
    drawLine(context, `Prestador de salud: ${payload.healthProvider}`, 28, y);
    y += lineHeight;
  }
  drawLine(context, `Folio ficticio: ${payload.id.slice(0, 8).toUpperCase()}`, 28, y);
  y += lineHeight;
  drawLine(context, `Fecha: ${new Date(payload.createdAt).toLocaleString("es-CL")}`, 28, y);
  y += 30;

  context.strokeStyle = "#111111";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(28, y);
  context.lineTo(width - 28, y);
  context.stroke();
  y += 28;

  context.font = "700 15px Arial";
  drawLine(context, "Detalle de productos", 28, y);
  y += 28;

  context.font = "14px Arial";
  payload.items.forEach((item) => {
    context.font = "700 14px Arial";
    drawLine(context, `${item.quantity} x ${item.name}`, 28, y, 430);
    y += lineHeight;
    context.font = "12px Arial";
    drawLine(context, `SKU: ${item.sku}`, 28, y);
    y += 18;
    drawLine(
      context,
      `Unitario: ${formatMoney(item.unitPrice, payload.currency)}   Subtotal: ${formatMoney(item.subtotal, payload.currency)}`,
      28,
      y
    );
    y += 30;
  });

  context.beginPath();
  context.moveTo(28, y);
  context.lineTo(width - 28, y);
  context.stroke();
  y += 42;

  context.font = "700 26px Arial";
  drawLine(context, "TOTAL FICTICIO", 28, y);
  context.textAlign = "right";
  drawLine(context, formatMoney(payload.total, payload.currency), width - 28, y);
  context.textAlign = "left";

  y += 54;
  context.fillStyle = "#f7f7f4";
  context.fillRect(28, y - 20, width - 56, 88);
  context.fillStyle = "#111111";
  context.font = "12px Arial";
  drawLine(context, "Documento educativo sin validez tributaria.", 42, y);
  y += 18;
  drawLine(context, "No corresponde a venta real, pago real, boleta electronica", 42, y);
  y += 18;
  drawLine(context, "real, receta electronica ni sistema sanitario real.", 42, y);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function drawLine(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth = 465
) {
  context.fillText(value, x, y, maxWidth);
}

function encodePayload(payload: ReceiptPayload) {
  const compact: CompactReceiptPayload = {
    i: payload.id,
    d: payload.createdAt,
    f: payload.pharmacyName,
    c: payload.cashierName,
    r: payload.patientRut,
    s: payload.healthProvider,
    m: payload.currency,
    t: payload.total,
    p: payload.items.map((item) => [
      item.name,
      item.sku,
      item.quantity,
      item.unitPrice,
      item.subtotal
    ])
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function expandPayload(
  payload: ReceiptPayload | CompactReceiptPayload
): ReceiptPayload {
  if ("items" in payload) {
    return payload;
  }

  return {
    id: payload.i,
    createdAt: payload.d,
    pharmacyName: payload.f,
    cashierName: payload.c,
    patientRut: payload.r,
    healthProvider: payload.s,
    currency: payload.m,
    total: payload.t,
    items: payload.p.map(([name, sku, quantity, unitPrice, subtotal]) => ({
      name,
      sku,
      quantity,
      unitPrice,
      subtotal
    }))
  };
}

function decodePayload(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
