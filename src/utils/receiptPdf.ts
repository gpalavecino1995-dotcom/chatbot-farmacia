import type { AppSettings, SaleRecord } from "../types";
import { formatMoney } from "./format";

export function downloadSimulatedReceipt(
  sale: SaleRecord,
  settings: AppSettings
) {
  const lines = [
    "DUOC UC",
    "Boleta simulada POS Farmacia",
    "",
    `Farmacia: ${settings.pharmacyName}`,
    `Cajero: ${settings.cashierName}`,
    `Folio simulado: ${sale.id.slice(0, 8).toUpperCase()}`,
    `Fecha: ${new Date(sale.createdAt).toLocaleString("es-CL")}`,
    `Correo cliente: ${sale.customerEmail}`,
    "",
    "Productos",
    "----------------------------------------------",
    ...sale.items.flatMap((item) => [
      `${item.quantity} x ${item.name}`,
      `SKU: ${item.sku}`,
      `Unitario: ${formatMoney(item.unitPrice, settings.currency)} | Subtotal: ${formatMoney(item.subtotal, settings.currency)}`,
      ""
    ]),
    "----------------------------------------------",
    `TOTAL SIMULADO: ${formatMoney(sale.total, settings.currency)}`,
    "",
    "Documento educativo sin validez tributaria.",
    "No corresponde a boleta electronica real, pago real ni receta electronica.",
    `Envio simulado registrado para ${sale.customerEmail}.`
  ];

  const pdf = createSimplePdf(lines);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `boleta-simulada-${sale.id.slice(0, 8)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function createSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    textLine(lines[0]),
    "/F1 13 Tf",
    "0 -24 Td",
    textLine(lines[1]),
    "/F1 10 Tf",
    ...lines.slice(2).map((line) => ["0 -15 Td", textLine(line)]).flat(),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function textLine(value: string) {
  return `(${escapePdfText(value)}) Tj`;
}

function escapePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
