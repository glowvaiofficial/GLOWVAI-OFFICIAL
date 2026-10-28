"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Zap, 
  Camera, 
  Truck, 
  Gift, 
  ChevronRight,
  RefreshCw
} from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  actions?: { label: string; href?: string; onClickQuick?: string }[];
}

const QUICK_QUESTIONS = [
  "How does the AI Skin Scan work?",
  "Tell me about 15-Min Dark Store delivery",
  "How does the Referral Program pay ₹10 UPI?",
  "Who are the founders of Glow VAI?"
];

export function GlowVaiBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I'm GLOW VAI AI Assistant. Ask me anything about our 30-second AI Skin Scan, 15-Minute Vijayawada Dark Store delivery, or Referral UPI earnings!",
      timestamp: "Just now"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Knowledge Base response engine grounded in GLOW VAI data
  const generateBotResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes("scan") || q.includes("face") || q.includes("ai") || q.includes("skin") || q.includes("telemetry")) {
      return "GLOW VAI's AI Skin Scan takes 30 seconds right in your browser! It evaluates 12 micro-nodes, hydration levels, pore depth, barrier health, and your 30-day radiance score. It is completely free, private (processed on-device), and recommends exact Minimalist & Derma Co routines.";
    }

    if (q.includes("delivery") || q.includes("dark store") || q.includes("15 min") || q.includes("quick") || q.includes("vijayawada")) {
      return "GLOW VAI operates hyperlocal Dark Stores (micro-fulfillment hubs) across Vijayawada! Once your AI face scan matches your skin needs, our express couriers deliver your routine directly to your doorstep in 15 minutes.";
    }

    if (q.includes("referral") || q.includes("upi") || q.includes("earn") || q.includes("auto") || q.includes("ambassador") || q.includes("money")) {
      return "Our Partner Referral Network pays ₹10 per verified referral scan directly to your PhonePe or Google Pay UPI! Plus, hit 100 scans a month for an extra ₹1,000 cash bonus. Auto Drivers get durable seatback QR posters, and students get custom Campus Ambassador badges.";
    }

    if (q.includes("founder") || q.includes("sardhar") || q.includes("sathveek") || q.includes("satvik") || q.includes("rahimath") || q.includes("rehmat") || q.includes("team")) {
      return "GLOW VAI was founded by three visionaries in Andhra Pradesh:\n\n1. Sardar Musthafa (Founder & CEO) - Sparked the vision on Feb 18, 2025.\n2. Nalla Satvik (Co-Founder & Technical Lead) - Joined Sep 15, 2026, building our high-speed AI engine & platform.\n3. Rehmit (Marketing Lead & Market Explorer) - Drives customer research and regional expansion.";
    }

    if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("help")) {
      return "Hey there! How can I help with your skin today? You can try our free AI Face Scan or learn how our Vijayawada 15-Minute Dark Store delivers dermatologically matched routines!";
    }

    return "GLOW VAI is an AI-powered Quick-Commerce Skincare Dark Store network. We offer free 30-second AI camera skin checks and 15-minute doorstep express delivery in Vijayawada! You can test your skin now or join our ₹10/scan UPI referral program.";
  };

  const handleSendMessage = (textToSend?: string) => {
    const userText = textToSend || input.trim();
    if (!userText) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const replyText = generateBotResponse(userText);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* 1. FLOATING CHATBOT TRIGGER BUTTON (Bottom-Right Corner) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 select-none">
        
        {/* Floating Tooltip Label when collapsed */}
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-ink/90 hover:bg-ink text-white text-xs font-bold shadow-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all hover:scale-105"
          >
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            <span>GLOW VAI AI Bot</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open GLOW VAI AI Assistant Chatbot"
          className="relative w-14 h-14 rounded-full bg-brand hover:bg-brand-dark text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group border-2 border-white cursor-pointer"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-yellow animate-bounce" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-mint border-2 border-white animate-pulse" />
            </>
          )}
        </button>
      </div>

      {/* 2. CHATBOT WINDOW MODAL */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] h-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border-2 border-skymist flex flex-col overflow-hidden animate-fadeIn backdrop-blur-2xl">

          {/* Chatbot Header */}
          <div className="bg-gradient-to-r from-brand to-brand-dark p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-white flex items-center gap-1.5">
                  GLOW VAI AI Assistant
                  <span className="w-2 h-2 rounded-full bg-mint" />
                </h3>
                <p className="text-[10px] text-white/80 font-medium">Quick-Commerce & Skin Telemetry</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Nav Bar inside Chat */}
          <div className="bg-skymist px-3 py-2 border-b border-skymist flex items-center justify-between text-[11px] font-bold text-brand">
            <Link href="/face-analysis" onClick={() => setIsOpen(false)} className="hover:underline flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              <span>Face Scan</span>
            </Link>
            <span className="text-ink-light">•</span>
            <Link href="/our-story" onClick={() => setIsOpen(false)} className="hover:underline flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Dark Store</span>
            </Link>
            <span className="text-ink-light">•</span>
            <Link href="/referral" onClick={() => setIsOpen(false)} className="hover:underline flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
              <span>₹10 Referral</span>
            </Link>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-ink-subtle/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1 shadow-xs">
                    AI
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-brand text-white font-medium rounded-br-none shadow-sm"
                      : "bg-white text-ink border border-ink/10 rounded-bl-none shadow-sm whitespace-pre-line"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`block text-[9px] mt-1 ${
                      msg.sender === "user" ? "text-white/70 text-right" : "text-ink-light"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-xs text-ink-light italic pl-9">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" />
                <span>GLOW VAI AI is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 py-2 bg-white border-t border-ink/10 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="shrink-0 text-[10px] font-semibold bg-skymist hover:bg-brand text-brand hover:text-white px-2.5 py-1 rounded-full border border-skymist transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-ink/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask GLOW VAI Assistant..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-ink-subtle border border-ink/10 focus:outline-none focus:ring-2 focus:ring-brand text-ink placeholder:text-ink-light"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-40 text-white transition-colors cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
