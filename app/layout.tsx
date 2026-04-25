import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chatbot educativo de farmacia comunitaria",
  description:
    "Simulador educativo sobre abastecimiento de medicamentos con respuestas guiadas para estudiantes."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
