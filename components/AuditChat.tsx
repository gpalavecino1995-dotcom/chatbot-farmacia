"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { answerQuestion } from "@/lib/chatbot";
import type { ChatMessage, ChatbotConversationState, PharmacyCase } from "@/lib/types";

type Props = {
  pharmacyCase: PharmacyCase;
};

const exampleQuestions = [
  "¿Qué marcas hay?",
  "Muéstrame los precios mayoristas",
  "¿Cuánto se vendió en julio?",
  "Dame todo el historial de ventas",
  "No entiendo, ayúdame",
  "¿Cómo reviso el costo por comprimido?"
];

export default function AuditChat({ pharmacyCase }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-message",
      sender: "bot",
      text: pharmacyCase.openingStatement,
      responseLevel: "welcome"
    }
  ]);
  const [conversationState, setConversationState] = useState<ChatbotConversationState>({
    stage: "inicio"
  });
  const [question, setQuestion] = useState("");
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const askedCount = messages.filter((message) => message.sender === "student").length;

  const historyText = useMemo(() => {
    const lines = [
      pharmacyCase.title,
      `Farmacia: ${pharmacyCase.pharmacyName}`,
      `Producto: ${pharmacyCase.context.product}`,
      `Presentacion: ${pharmacyCase.context.presentation}`,
      "",
      "Historial de conversacion"
    ];

    messages.forEach((message, index) => {
      const role = message.sender === "student" ? "Estudiante" : "Chatbot";
      lines.push(`${index + 1}. ${role}: ${message.text}`);
    });

    return lines.join("\n");
  }, [messages, pharmacyCase]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    const studentMessage: ChatMessage = {
      id: createId(),
      sender: "student",
      text: cleanQuestion
    };
    const answer = answerQuestion(cleanQuestion, pharmacyCase, conversationState);
    const botMessage: ChatMessage = {
      id: createId(),
      sender: "bot",
      text: answer.text,
      matchedTopic: answer.matchedTopic,
      responseLevel: answer.responseLevel
    };

    setMessages((current) => [...current, studentMessage, botMessage]);
    setConversationState(answer.nextState);
    setQuestion("");
    setCopied(false);
  }

  async function copyHistory() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(historyText);
    }

    setCopied(true);
  }

  function downloadHistory() {
    const blob = new Blob([historyText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "historial-chat-farmacia-san-gabriel.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetChat() {
    setMessages([
      {
        id: "initial-message",
        sender: "bot",
        text: pharmacyCase.openingStatement,
        responseLevel: "welcome"
      }
    ]);
    setConversationState({
      stage: "inicio"
    });
    setQuestion("");
    setCopied(false);
    textAreaRef.current?.focus();
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Simulador web para GitHub Pages</p>
          <h1>Chatbot educativo de farmacia comunitaria</h1>
          <p className="hero-text">{pharmacyCase.context.summary}</p>
          <div className="hero-tags">
            <span>{pharmacyCase.context.product}</span>
            <span>{pharmacyCase.context.presentation}</span>
            <span>Respuestas breves y guiadas</span>
          </div>
        </div>

        <div className="hero-card">
          <h2>Como usarlo</h2>
          <p>{pharmacyCase.context.usageHint}</p>
          <p className="hero-note">
            El chatbot entrega datos del caso y te ayuda a pensar. No resuelve todo por ti.
          </p>
        </div>
      </section>

      <section className="case-strip" aria-label="Resumen del caso">
        <div>
          <span>Farmacia</span>
          <strong>{pharmacyCase.pharmacyName}</strong>
        </div>
        <div>
          <span>Producto</span>
          <strong>
            {pharmacyCase.context.product} · {pharmacyCase.context.presentation}
          </strong>
        </div>
        <div>
          <span>Preguntas</span>
          <strong>{askedCount}</strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="support-panel" aria-label="Apoyo para el caso">
          <div className="panel-block">
            <h2>Contexto del caso</h2>
            <p>{pharmacyCase.context.summary}</p>
          </div>

          <div className="panel-block">
            <h2>Datos base</h2>
            <ul>
              <li>{pharmacyCase.context.product}</li>
              <li>{pharmacyCase.context.presentation}</li>
              <li>{pharmacyCase.context.boxContent}</li>
            </ul>
          </div>

          <div className="panel-block">
            <h2>Objetivos</h2>
            <ul>
              {pharmacyCase.learningGoals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="chat-panel" aria-label="Chat educativo">
          <div className="chat-toolbar">
            <div>
              <p className="eyebrow">Caso guiado</p>
              <h2>{pharmacyCase.pharmacyName}</h2>
            </div>

            <div className="toolbar-actions">
              <button type="button" onClick={copyHistory}>
                {copied ? "Copiado" : "Copiar historial"}
              </button>
              <button type="button" onClick={downloadHistory}>
                Descargar
              </button>
              <button type="button" onClick={resetChat}>
                Reiniciar
              </button>
            </div>
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((message) => (
              <article className={`message ${message.sender}`} key={message.id}>
                <div className="message-meta">
                  <strong>{message.sender === "student" ? "Estudiante" : "Chatbot guia"}</strong>
                  {message.matchedTopic ? <span>{message.matchedTopic}</span> : null}
                </div>
                <p>{message.text}</p>
              </article>
            ))}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <label htmlFor="question">Escribe tu pregunta</label>
            <textarea
              id="question"
              ref={textAreaRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ej.: ¿Cuánto se vendió en julio?"
              rows={4}
            />
            <div className="composer-footer">
              <span>El chatbot responde solo con datos de este caso.</span>
              <button type="submit">Enviar</button>
            </div>
          </form>
        </section>
      </section>

      <section className="examples-band" aria-label="Preguntas sugeridas">
        <h2>Preguntas sugeridas</h2>
        <div className="example-grid">
          {exampleQuestions.map((item) => (
            <button type="button" key={item} onClick={() => setQuestion(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
