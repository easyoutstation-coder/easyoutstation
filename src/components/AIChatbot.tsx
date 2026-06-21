import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User, Sparkles, Mic, MicOff } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! Welcome to EasyOutstation 🚗✨\n\nI'm your AI travel assistant. I can help you find the perfect car, check prices, get route recommendations, or assist with bookings.\n\nWhere would you like to travel today?",
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    },
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  // Also scroll when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    chatMutation.mutate({ message: userMsg, history: messages });
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice search is not supported in your browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => handleSend(), 100);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-36 right-5 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          open ? "bg-red-500 text-white rotate-90" : "bg-blue-600 text-white"
        }`}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div
          className="fixed z-50 bg-white shadow-2xl border border-slate-200 overflow-hidden animate-scale-in
            bottom-0 left-0 right-0 rounded-t-2xl
            md:bottom-24 md:right-6 md:left-auto md:rounded-2xl md:w-[380px]"
          style={{ height: "min(600px, calc(100vh - 80px))", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">EasyOutstation AI Assistant</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-400">Online · Replies instantly</span>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>

          {/* Messages — native scrollable div */}
          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: "scroll",
              WebkitOverflowScrolling: "touch",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              minHeight: 0,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-800 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about cars, prices, routes..."
                className="flex-1 text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleVoiceInput}
                className={isListening ? "bg-red-50 text-red-500 border-red-200" : ""}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={chatMutation.isPending || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
