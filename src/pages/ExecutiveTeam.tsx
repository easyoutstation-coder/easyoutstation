import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Send, Loader2, ChevronDown, ChevronUp, BarChart2,
  ArrowLeft, Trash2, Copy, Check, RefreshCw,
} from "lucide-react";

// ─── Agent Config ────────────────────────────────────────────────────────────

type AgentId = "board" | "ceo" | "marketing" | "finance" | "operations" | "seo" | "support";

interface Agent {
  id: AgentId;
  name: string;
  role: string;
  initials: string;
  color: string;           // Tailwind bg class for avatar
  ring: string;            // Tailwind ring class for selected state
  textColor: string;       // Tailwind text class for agent label
  description: string;
}

const AGENTS: Agent[] = [
  {
    id: "board",
    name: "Executive Board",
    role: "All Executives",
    initials: "EB",
    color: "bg-slate-700",
    ring: "ring-slate-500",
    textColor: "text-slate-300",
    description: "Full board response — all executives weigh in",
  },
  {
    id: "ceo",
    name: "Arjun Sharma",
    role: "CEO",
    initials: "AS",
    color: "bg-blue-600",
    ring: "ring-blue-500",
    textColor: "text-blue-400",
    description: "Strategy, priorities & risk",
  },
  {
    id: "marketing",
    name: "Priya Patel",
    role: "Marketing Manager",
    initials: "PP",
    color: "bg-purple-600",
    ring: "ring-purple-500",
    textColor: "text-purple-400",
    description: "Growth, campaigns & acquisition",
  },
  {
    id: "finance",
    name: "Vikram Gupta",
    role: "Finance Manager",
    initials: "VG",
    color: "bg-emerald-600",
    ring: "ring-emerald-500",
    textColor: "text-emerald-400",
    description: "Revenue, margins & pricing",
  },
  {
    id: "operations",
    name: "Rahul Verma",
    role: "Operations Manager",
    initials: "RV",
    color: "bg-orange-600",
    ring: "ring-orange-500",
    textColor: "text-orange-400",
    description: "Drivers, trips & reliability",
  },
  {
    id: "seo",
    name: "Ananya Singh",
    role: "SEO & Growth Manager",
    initials: "AN",
    color: "bg-pink-600",
    ring: "ring-pink-500",
    textColor: "text-pink-400",
    description: "Organic traffic & content",
  },
  {
    id: "support",
    name: "Deepika Nair",
    role: "Customer Support Manager",
    initials: "DN",
    color: "bg-teal-600",
    ring: "ring-teal-500",
    textColor: "text-teal-400",
    description: "Customer experience & automation",
  },
];

// ─── Quick Data Templates ────────────────────────────────────────────────────

const DATA_TEMPLATES = [
  {
    label: "Monthly Bookings",
    icon: "📊",
    template: "Monthly trips: [e.g. 45]\nRevenue estimate: ₹[e.g. 3,60,000]\nTop route: [e.g. Delhi-Manali]\n2nd route: [e.g. Delhi-Jaipur]\nCancellations: [e.g. 3]\nNew customers: [e.g. 38]\nRepeat customers: [e.g. 7]",
  },
  {
    label: "Traffic & Leads",
    icon: "📈",
    template: "Monthly website visitors: [e.g. 2,400]\nTop traffic source: [e.g. WhatsApp referrals]\n2nd source: [e.g. Google organic]\nConversion rate: [e.g. 2%]\nWhatsApp enquiries/month: [e.g. 80]\nEnquiries converted to bookings: [e.g. 45]",
  },
  {
    label: "Operations Data",
    icon: "⚙️",
    template: "Active drivers: [e.g. 12]\nDriver assignment avg time: [e.g. 45 mins]\nTrips with complaints: [e.g. 2 this month]\nCommon complaint: [e.g. driver late]\nCancellations this month: [e.g. 3]\nCancellation reasons: [e.g. plans changed / driver not assigned]",
  },
  {
    label: "Finance Snapshot",
    icon: "💰",
    template: "Avg booking value: ₹[e.g. 8,000]\nDriver payout per trip avg: ₹[e.g. 5,500]\nRazorpay advance collected: ₹[e.g. 36,000]\nFixed monthly costs: ₹[e.g. 8,000 — hosting, SMS, email]\nProfit estimate this month: ₹[e.g. 40,000]\nGST filing: [yes/no/pending]",
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
  timestamp: Date;
}

type ConversationMap = Record<AgentId, Message[]>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExecutiveTeam() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "super_admin";

  const [activeAgent, setActiveAgent] = useState<AgentId>("board");
  const [conversations, setConversations] = useState<ConversationMap>({
    board: [], ceo: [], marketing: [], finance: [], operations: [], seo: [], support: [],
  });
  const [input, setInput] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [dataInput, setDataInput] = useState("");
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.executive.chat.useMutation();

  const agent = AGENTS.find(a => a.id === activeAgent)!;
  const messages = conversations[activeAgent];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">Executive Access Only</h2>
          <p className="text-slate-400 mb-6">This panel is restricted to admin users.</p>
          <Button onClick={() => navigate("/admin")} variant="outline" className="border-slate-700 text-slate-300">
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    const updatedMsgs = [...messages, userMsg];
    setConversations(prev => ({ ...prev, [activeAgent]: updatedMsgs }));
    setInput("");

    const apiMessages = updatedMsgs.map(m => ({ role: m.role, content: m.content }));

    try {
      const result = await chatMutation.mutateAsync({
        agentId: activeAgent,
        messages: apiMessages,
        businessContext: businessContext || undefined,
      });
      const assistantMsg: Message = {
        role: "assistant",
        content: result.text,
        agentId: activeAgent,
        timestamp: new Date(),
      };
      setConversations(prev => ({
        ...prev,
        [activeAgent]: [...updatedMsgs, assistantMsg],
      }));
    } catch (err: any) {
      const errorMsg: Message = {
        role: "assistant",
        content: `⚠️ Error: ${err.message ?? "Failed to get response. Check ANTHROPIC_API_KEY in Railway."}`,
        agentId: activeAgent,
        timestamp: new Date(),
      };
      setConversations(prev => ({
        ...prev,
        [activeAgent]: [...updatedMsgs, errorMsg],
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setConversations(prev => ({ ...prev, [activeAgent]: [] }));
  };

  const copyMessage = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const applyDataContext = () => {
    if (dataInput.trim()) {
      setBusinessContext(prev => prev ? `${prev}\n\n---\n${dataInput.trim()}` : dataInput.trim());
      setDataInput("");
      setShowDataPanel(false);
    }
  };

  const switchAgent = (id: AgentId) => {
    setActiveAgent(id);
    setMobileSidebarOpen(false);
  };

  // ── Format message content ─────────────────────────────────────────────────
  const formatContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });
      // Bullet lines
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ") || line.trim().match(/^\d+\./);
      return (
        <p key={i} className={`${isBullet ? "pl-3" : ""} ${line === "" ? "h-3" : "leading-relaxed"}`}>
          {parts}
        </p>
      );
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-72 bg-slate-900 border-r border-slate-800
        flex flex-col
        transition-transform duration-200
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
              <span className="text-lg">🏢</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Executive Team</p>
              <p className="text-xs text-slate-500">EasyOutstation AI Board</p>
            </div>
          </div>
        </div>

        {/* Agent List */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => switchAgent(a.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
                ${activeAgent === a.id
                  ? "bg-slate-800 ring-1 " + a.ring
                  : "hover:bg-slate-800/60"
                }`}
            >
              <div className={`w-9 h-9 rounded-lg ${a.color} flex items-center justify-center shrink-0 text-xs font-bold text-white`}>
                {a.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{a.id === "board" ? a.name : a.name.split(" ")[0]}</p>
                <p className="text-xs text-slate-500 truncate">{a.role}</p>
              </div>
              {conversations[a.id].length > 0 && (
                <span className="ml-auto shrink-0 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Business Context Indicator */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => { setShowDataPanel(!showDataPanel); setMobileSidebarOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors text-sm"
          >
            <BarChart2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 flex-1 text-left">Business Data</span>
            {businessContext && (
              <span className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-1.5 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
          {businessContext && (
            <button
              onClick={() => setBusinessContext("")}
              className="w-full mt-1 text-xs text-slate-600 hover:text-red-400 transition-colors px-3 py-1 text-left"
            >
              Clear context
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Chat Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className={`w-9 h-9 rounded-lg ${agent.color} flex items-center justify-center shrink-0 text-xs font-bold text-white`}>
            {agent.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">{agent.name}</p>
            <p className={`text-xs ${agent.textColor}`}>{agent.role} · {agent.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowDataPanel(!showDataPanel)}
              className={`p-1.5 rounded-lg transition-colors ${showDataPanel ? "bg-slate-700 text-emerald-400" : "hover:bg-slate-800 text-slate-500 hover:text-emerald-400"}`}
              title="Share business data"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Data Panel ── */}
        {showDataPanel && (
          <div className="border-b border-slate-800 bg-slate-900/80 p-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                Share Business Data — executives will use this context in every response
              </p>
              {/* Quick templates */}
              <div className="flex flex-wrap gap-2 mb-3">
                {DATA_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setDataInput(t.template)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={dataInput}
                onChange={e => setDataInput(e.target.value)}
                placeholder="Paste your business data here (monthly trips, revenue, cancellations, top routes, driver count, ad spend, etc.)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-600 resize-none font-mono"
                rows={5}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={applyDataContext}
                  disabled={!dataInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 h-8"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" /> Add to Context
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDataPanel(false)}
                  className="border-slate-700 text-slate-400 hover:text-slate-200 text-sm h-8"
                >
                  Cancel
                </Button>
                {businessContext && (
                  <span className="ml-auto text-xs text-emerald-400 self-center flex items-center gap-1">
                    <Check className="w-3 h-3" /> Context active ({businessContext.length} chars)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className={`w-16 h-16 rounded-2xl ${agent.color} flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg`}>
                {agent.initials}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{agent.name}</h3>
              <p className={`text-sm ${agent.textColor} mb-1`}>{agent.role}</p>
              <p className="text-sm text-slate-500 mb-6">{agent.description}</p>
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-3">Try asking</p>
                {getStarterPrompts(agent.id).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sm text-slate-300 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
              {/* Avatar */}
              {msg.role === "assistant" ? (
                <div className={`w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5`}>
                  {agent.initials}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-xs font-semibold text-blue-400 shrink-0 mt-0.5">
                  {(user?.name || "U")[0].toUpperCase()}
                </div>
              )}

              {/* Bubble */}
              <div className={`group relative max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {msg.role === "assistant" && (
                  <p className={`text-xs font-medium ${agent.textColor} px-1`}>{agent.name}</p>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed space-y-1 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50"
                }`}>
                  {msg.role === "assistant"
                    ? formatContent(msg.content)
                    : <p>{msg.content}</p>
                  }
                </div>
                {/* Timestamp + copy */}
                <div className={`flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-slate-600">
                    {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyMessage(msg.content, idx)}
                      className="text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {copiedMsgIdx === idx
                        ? <Check className="w-3 h-3 text-emerald-400" />
                        : <Copy className="w-3 h-3" />
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-3 max-w-3xl">
              <div className={`w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                {agent.initials}
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800 border border-slate-700/50">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input Area ── */}
        <div className="border-t border-slate-800 bg-slate-900/50 p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl focus-within:border-slate-600 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${agent.name}... (Enter to send, Shift+Enter for new line)`}
                  className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none min-h-[44px] max-h-40"
                  rows={1}
                  style={{ height: "auto" }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 160) + "px";
                  }}
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <span className="text-[10px] text-slate-700">
                    {businessContext ? "📊 Business context active" : "No business context set"}
                  </span>
                  <span className="text-[10px] text-slate-700">⏎ send · ⇧⏎ newline</span>
                </div>
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || chatMutation.isPending}
                className={`h-11 w-11 rounded-xl p-0 shrink-0 ${agent.color} hover:opacity-90 disabled:opacity-40 transition-opacity`}
              >
                {chatMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </Button>
            </div>
            {chatMutation.isError && (
              <p className="text-xs text-red-400 mt-2 px-1">
                ⚠️ {(chatMutation.error as any)?.message ?? "Request failed. Ensure ANTHROPIC_API_KEY is set in Railway."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Starter Prompts ─────────────────────────────────────────────────────────

function getStarterPrompts(agentId: AgentId): string[] {
  const prompts: Record<AgentId, string[]> = {
    board: [
      "Give me a full business health check for this month",
      "What are our top 3 priorities to increase revenue in the next 30 days?",
      "We're getting 50 bookings a month. How do we get to 200?",
    ],
    ceo: [
      "What's the biggest strategic risk we face right now?",
      "Should I focus on growing routes or deepening Delhi first?",
      "Create a 90-day OKR framework for EasyOutstation",
    ],
    marketing: [
      "Write me a WhatsApp broadcast to re-engage past customers",
      "How should I set up my first Google Ads campaign for ₹10,000?",
      "Design a referral program that works for outstation travel",
    ],
    finance: [
      "Model my per-trip margins if driver payout is ₹5,500 avg",
      "Should I add a ₹99 convenience fee? What's the risk?",
      "What's my working capital exposure with the 10% advance model?",
    ],
    operations: [
      "How do I reduce driver assignment time from 60 mins to 20 mins?",
      "Build me an SOP for handling a driver no-show",
      "What's the minimum driver network I need to handle 200 trips/month?",
    ],
    seo: [
      "Which 5 route pages should I build next for maximum traffic?",
      "Write an SEO brief for 'Delhi to Manali cab' blog post",
      "Why is our Delhi to Manali page not ranking despite having FAQs?",
    ],
    support: [
      "Write WhatsApp quick-reply templates for the top 5 customer questions",
      "Design a post-trip SMS flow to collect Google reviews",
      "How should I handle a customer complaining the driver asked for extra cash?",
    ],
  };
  return prompts[agentId] ?? [];
}
