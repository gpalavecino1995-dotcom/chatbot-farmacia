import AuditChat from "@/components/AuditChat";
import caseData from "@/data/caso-auditoria-farmaceutica.json";
import type { PharmacyCase } from "@/lib/types";

export default function Home() {
  return <AuditChat pharmacyCase={caseData as PharmacyCase} />;
}
