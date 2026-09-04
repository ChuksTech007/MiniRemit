"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Trash2,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Tag,
  Coins,
  Wallet,
  ExternalLink,
  Lock,
  LogOut,
  FlaskConical,
  Activity,
} from "lucide-react";
import { executeLiveClientTransfer, requestCeloNetwork, TREASURY_WALLET, PROTOCOL_FEE_PERCENT } from "@/lib/blockchain/clientTx";

interface Rule {
  id: string;
  userAddress: string;
  title: string;
  prompt: string;
  ruleType: string;
  token: string;
  amount: string;
  recipient: string;
  schedule?: string | null;
  condition?: string | null;
  status: string;
  totalExecuted: number;
  totalValueMoved: number;
  lastExecutedAt?: string | null;
  executions?: Execution[];
}

interface Execution {
  id: string;
  status: string;
  amount: string;
  token: string;
  recipient: string;
  txHash?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

interface ParsedRule {
  title: string;
  ruleType: "SCHEDULED" | "SPLIT_INCOMING" | "BALANCE_TRIGGER";
  token: "cUSD" | "USDC" | "USDT" | "CELO";
  amount: string;
  recipient: string;
  schedule?: string;
  condition?: string;
  summary: string;
  confidence: number;
}

export default function Dashboard() {
  // Mode: "SIMULATION" | "LIVE"
  const [mode, setMode] = useState<"SIMULATION" | "LIVE">("SIMULATION");
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState("0x5F88E4aEfD97c5bE5Fb88e56F07ca4105c3FA346");
  const [prompt, setPrompt] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedRule | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [executingRuleId, setExecutingRuleId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string; link?: string } | null>(null);

  // Check if wallet is already connected
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setConnectedWallet(accounts[0]);
            setUserAddress(accounts[0]);
          }
        })
        .catch(() => {});
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setActionMessage({
        type: "error",
        text: "No Web3 wallet found. Please install MetaMask or open inside MiniPay.",
      });
      return;
    }
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setConnectedWallet(accounts[0]);
        setUserAddress(accounts[0]);
        await requestCeloNetwork();
        setActionMessage({
          type: "success",
          text: `Connected wallet: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to connect wallet" });
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet(null);
    setUserAddress("0x5F88E4aEfD97c5bE5Fb88e56F07ca4105c3FA346");
    setActionMessage({
      type: "success",
      text: "Wallet disconnected successfully.",
    });
  };

  const fetchRules = async () => {
    try {
      setLoadingRules(true);
      const res = await fetch("/api/rules");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setRules(json.data);
          localStorage.setItem("miniremit_rules", JSON.stringify(json.data));
          return;
        }
      }
    } catch (e) {
      console.warn("Backend fetch failed, using local storage:", e);
    } finally {
      setLoadingRules(false);
    }

    try {
      const saved = localStorage.getItem("miniremit_rules");
      if (saved) {
        setRules(JSON.parse(saved));
      }
    } catch {}
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleParsePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsParsing(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userAddress }),
      });
      const json = await res.json();
      if (json.success) {
        setParsedResult(json.data);
      } else {
        setActionMessage({ type: "error", text: json.error || "Failed to parse intention." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Network error" });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveRule = async () => {
    if (!parsedResult) return;
    setIsSaving(true);
    setActionMessage(null);

    const fallbackRule: Rule = {
      id: `rule_${Date.now()}`,
      userAddress,
      title: parsedResult.title,
      prompt,
      ruleType: parsedResult.ruleType,
      token: parsedResult.token,
      amount: parsedResult.amount,
      recipient: parsedResult.recipient,
      schedule: parsedResult.schedule || null,
      condition: parsedResult.condition || null,
      status: "ACTIVE",
      totalExecuted: 0,
      totalValueMoved: 0,
      executions: [],
    };

    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallbackRule),
      });
      const json = await res.json();
      const savedRule = json.success ? json.data : fallbackRule;

      setRules((prev) => {
        const next = [savedRule, ...prev.filter((r) => r.id !== savedRule.id)];
        localStorage.setItem("miniremit_rules", JSON.stringify(next));
        return next;
      });

      setActionMessage({ type: "success", text: "Autonomous rule activated successfully!" });
      setParsedResult(null);
      setPrompt("");
    } catch (err: any) {
      setRules((prev) => {
        const next = [fallbackRule, ...prev];
        localStorage.setItem("miniremit_rules", JSON.stringify(next));
        return next;
      });
      setActionMessage({ type: "success", text: "Autonomous rule activated locally!" });
      setParsedResult(null);
      setPrompt("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteNow = async (ruleId: string) => {
    setExecutingRuleId(ruleId);
    setActionMessage(null);

    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    if (mode === "LIVE") {
      // Real on-chain transfer directly with connected wallet
      if (!connectedWallet) {
        await connectWallet();
      }

      const result = await executeLiveClientTransfer({
        recipient: rule.recipient,
        amount: rule.amount.replace("%", ""),
        token: rule.token,
      });

      if (result.success && result.txHash) {
        const numAmount = parseFloat(rule.amount.replace("%", "")) || 0;
        const newExec: Execution = {
          id: `exec_${Date.now()}`,
          status: "SUCCESS",
          amount: rule.amount,
          token: rule.token,
          recipient: rule.recipient,
          txHash: result.txHash,
          createdAt: new Date().toISOString(),
        };

        setRules((prev) => {
          const next = prev.map((r) => {
            if (r.id === ruleId) {
              return {
                ...r,
                totalExecuted: r.totalExecuted + 1,
                totalValueMoved: r.totalValueMoved + numAmount,
                lastExecutedAt: new Date().toISOString(),
                executions: [newExec, ...(r.executions || []).slice(0, 4)],
              };
            }
            return r;
          });
          localStorage.setItem("miniremit_rules", JSON.stringify(next));
          return next;
        });

        setActionMessage({
          type: "success",
          text: `Live Celo Transaction Confirmed! Tx Hash: ${result.txHash.slice(0, 12)}...`,
          link: result.explorerUrl,
        });
      } else {
        setActionMessage({
          type: "error",
          text: result.error || "On-chain transaction was rejected or failed.",
        });
      }
      setExecutingRuleId(null);
      return;
    }

    // SIMULATION MODE
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, simulate: true }),
      });
      const json = await res.json();

      const txHash = json.data?.txHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      const numAmount = parseFloat(rule.amount.replace("%", "")) || 0;

      const newExec: Execution = {
        id: `exec_${Date.now()}`,
        status: "SUCCESS",
        amount: rule.amount,
        token: rule.token,
        recipient: rule.recipient,
        txHash,
        createdAt: new Date().toISOString(),
      };

      setRules((prev) => {
        const next = prev.map((r) => {
          if (r.id === ruleId) {
            return {
              ...r,
              totalExecuted: r.totalExecuted + 1,
              totalValueMoved: r.totalValueMoved + numAmount,
              lastExecutedAt: new Date().toISOString(),
              executions: [newExec, ...(r.executions || []).slice(0, 4)],
            };
          }
          return r;
        });
        localStorage.setItem("miniremit_rules", JSON.stringify(next));
        return next;
      });

      setActionMessage({
        type: "success",
        text: `Simulation Executed! Attributed to celo_97f21f965c25. Tx: ${txHash.slice(0, 10)}...`,
      });
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Execution failed." });
    } finally {
      setExecutingRuleId(null);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await fetch(`/api/rules/${id}`, { method: "DELETE" });
    } catch {}
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      localStorage.setItem("miniremit_rules", JSON.stringify(next));
      return next;
    });
  };

  const quickPresets = [
    "Send 10 cUSD to 0x5F88E4aEfD97c5bE5Fb88e56F07ca4105c3FA346 every Friday at 9am",
    "Auto-split 25% of incoming cUSD to savings 0x5F88E4aEfD97c5bE5Fb88e56F07ca4105c3FA346",
    "Pay monthly electricity bill 20 USDC to 0x5F88E4aEfD97c5bE5Fb88e56F07ca4105c3FA346",
  ];

  const totalValue = rules.reduce((acc, r) => acc + (r.totalValueMoved || 0), 0);
  const totalExecs = rules.reduce((acc, r) => acc + (r.totalExecuted || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#22252A]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#35D07F] to-[#1E824C] flex items-center justify-center shadow-lg shadow-[#35D07F]/20">
            <Zap className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              MiniRemit
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#35D07F]/10 text-[#35D07F] border border-[#35D07F]/20">
                Agent v1.0
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Autonomous Stablecoin Remittance & Payment Agent on Celo
            </p>
          </div>
        </div>

        {/* Right Controls: Mode Switcher & Connect Wallet */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Large Segmented Mode Selector */}
          <div className="flex items-center p-1 bg-[#121417] border border-[#2B2F38] rounded-2xl shadow-inner">
            <button
              onClick={() => {
                setMode("SIMULATION");
                setActionMessage({
                  type: "success",
                  text: "🧪 Switched to Simulation Mode (Free sandbox testing - No wallet needed)",
                });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === "SIMULATION"
                  ? "bg-[#35D07F] text-black shadow-md shadow-[#35D07F]/20"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Simulation 🧪</span>
            </button>

            <button
              onClick={() => {
                setMode("LIVE");
                setActionMessage({
                  type: "success",
                  text: "⚡ Switched to Live On-Chain Mode (Connect wallet to execute real Celo transactions)",
                });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === "LIVE"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live On-Chain ⚡</span>
            </button>
          </div>

          {/* Wallet Actions - Only visible when in LIVE Mode */}
          {mode === "LIVE" ? (
            connectedWallet ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#141619] border border-[#35D07F]/40 text-xs font-medium text-white shadow-sm">
                <div className="w-2 h-2 rounded-full bg-[#35D07F] animate-pulse" />
                <span className="font-mono">
                  {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                </span>
                <button
                  onClick={disconnectWallet}
                  title="Disconnect Wallet"
                  className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition ml-1 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Disconnect</span>
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#35D07F] to-[#28A745] hover:from-[#2EB870] hover:to-[#218838] text-black text-xs font-bold shadow-lg shadow-[#35D07F]/20 transition"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect Wallet</span>
              </button>
            )
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#141619] border border-[#22252A] text-xs text-gray-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#35D07F]" />
              <span>Sandbox Mode (No Wallet Needed)</span>
            </div>
          )}
        </div>
      </header>

      {/* Badges Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap py-3 px-4 my-4 rounded-xl bg-[#121417] border border-[#202328] text-xs text-gray-400">
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="https://8004scan.io/agents/celo/9812"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#35D07F]" />
            <span>Agent ID: <strong className="text-white font-mono">#9812</strong></span>
            <ExternalLink className="w-3 h-3 text-gray-500" />
          </a>
          <span className="text-gray-600">•</span>
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#FBCC5C]" />
            <span>Tag: <strong className="text-white font-mono">celo_97f21f965c25</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#35D07F]" /> Non-Custodial Protocol Fee: 0.2%
          </span>
        </div>
      </div>

      {/* Metrics Banner */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="p-4 rounded-2xl bg-[#141619] border border-[#22252A] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#35D07F]/10 flex items-center justify-center text-[#35D07F]">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Value Moved</p>
            <p className="text-xl font-bold text-white">${totalValue.toFixed(2)} <span className="text-xs font-normal text-gray-400">cUSD/USDC</span></p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141619] border border-[#22252A] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#FBCC5C]/10 flex items-center justify-center text-[#FBCC5C]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Active Automations</p>
            <p className="text-xl font-bold text-white">{rules.filter((r) => r.status === "ACTIVE").length} <span className="text-xs font-normal text-gray-400">Running</span></p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141619] border border-[#22252A] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Attributed Executions</p>
            <p className="text-xl font-bold text-white">{totalExecs} <span className="text-xs font-normal text-gray-400">On-Chain Tagged</span></p>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {actionMessage && (
        <div
          className={`p-4 mb-6 rounded-xl flex items-center justify-between gap-3 border text-sm animate-fadeIn ${
            actionMessage.type === "success"
              ? "bg-[#35D07F]/10 border-[#35D07F]/30 text-[#35D07F]"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          {actionMessage.link && (
            <a
              href={actionMessage.link}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 rounded-lg bg-[#35D07F] text-black font-bold text-xs flex items-center gap-1 hover:bg-[#2EB870] transition flex-shrink-0"
            >
              View on CeloScan <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Natural Language AI Agent Input */}
      <section className="p-6 rounded-2xl bg-gradient-to-b from-[#181A1E] to-[#121417] border border-[#2B2F38] shadow-xl my-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#35D07F]" />
            <h2 className="text-lg font-bold text-white">Create Automation with Plain English</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#181A1D] border border-[#282C34] text-gray-400">
            {mode === "LIVE" ? "⚡ Live Mode Active" : "🧪 Free Simulation Active"}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Tell your agent what you want to automate. It translates your intent into an autonomous, tagged Celo payment rule.
        </p>

        <form onSubmit={handleParsePrompt} className="space-y-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Send 15 cUSD to 0x5F88... every Friday at 10am for Mom's upkeep"
              rows={3}
              className="w-full px-4 py-3 bg-[#0D0F12] border border-[#2B2F38] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#35D07F] text-sm resize-none"
            />
            <button
              type="submit"
              disabled={isParsing || !prompt.trim()}
              className="absolute right-3 bottom-3.5 px-4 py-1.5 rounded-lg bg-[#35D07F] hover:bg-[#2EB870] text-black font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Parse Intent</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Presets */}
        <div className="mt-4 pt-4 border-t border-[#22252A]">
          <p className="text-xs text-gray-400 mb-2">Or try an example:</p>
          <div className="flex flex-wrap gap-2">
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(preset)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#141619] hover:bg-[#202328] border border-[#25282F] text-gray-300 transition text-left"
              >
                "{preset}"
              </button>
            ))}
          </div>
        </div>

        {/* AI Parsed Intent Review Card */}
        {parsedResult && (
          <div className="mt-6 p-4 rounded-xl bg-[#0F1114] border border-[#35D07F]/30 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#22252A] mb-3">
              <span className="text-xs font-bold text-[#35D07F] uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Validated Agent Rule
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#35D07F]/10 text-[#35D07F]">
                {Math.round(parsedResult.confidence * 100)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
              <div>
                <p className="text-gray-400">Rule Type</p>
                <p className="font-semibold text-white">{parsedResult.ruleType}</p>
              </div>
              <div>
                <p className="text-gray-400">Amount & Token</p>
                <p className="font-semibold text-[#35D07F]">{parsedResult.amount} {parsedResult.token}</p>
              </div>
              <div>
                <p className="text-gray-400">Schedule</p>
                <p className="font-semibold text-white">{parsedResult.schedule || "Event Driven"}</p>
              </div>
              <div>
                <p className="text-gray-400">Recipient</p>
                <p className="font-mono text-white truncate">{parsedResult.recipient}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 italic mb-4">
              "{parsedResult.summary}"
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveRule}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#35D07F] hover:bg-[#2EB870] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#35D07F]/20 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Activate Autonomous Rule
              </button>
              <button
                onClick={() => setParsedResult(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1C1F24] hover:bg-[#25282F] text-gray-400 text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Active Rules List */}
      <section className="my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FBCC5C]" />
            Active Automation Rules ({rules.length})
          </h2>
          <button
            onClick={fetchRules}
            className="p-1.5 rounded-lg bg-[#141619] hover:bg-[#202328] border border-[#25282F] text-gray-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRules ? "animate-spin" : ""}`} />
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#121417] border border-[#22252A] text-gray-400 text-sm">
            <p>No automation rules configured yet.</p>
            <p className="text-xs text-gray-500 mt-1">Use the box above to create your first remittance rule.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-5 rounded-2xl bg-[#141619] border border-[#22252A] hover:border-[#2C3038] transition"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#1E2126]">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      {rule.title}
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#35D07F]/10 text-[#35D07F]">
                        {rule.status}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      To: {rule.recipient}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExecuteNow(rule.id)}
                      disabled={executingRuleId === rule.id}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 ${
                        mode === "LIVE"
                          ? "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
                          : "bg-[#35D07F]/10 hover:bg-[#35D07F]/20 text-[#35D07F] border border-[#35D07F]/30"
                      }`}
                    >
                      {executingRuleId === rule.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      {mode === "LIVE" ? "Send Live on Celo ⚡" : "Test Run (Simulate) 🧪"}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg bg-[#1F2228] hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <p className="font-semibold text-white">{rule.amount} {rule.token}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Schedule:</span>
                    <p className="font-semibold text-white">{rule.schedule || "Triggered"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Moved:</span>
                    <p className="font-semibold text-[#35D07F]">${rule.totalValueMoved.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Executions:</span>
                    <p className="font-semibold text-white">{rule.totalExecuted} times</p>
                  </div>
                </div>

                {/* Recent Execution Hash */}
                {rule.executions && rule.executions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1C1F24] flex items-center justify-between text-[11px] text-gray-400">
                    <span>Last run: {new Date(rule.executions[0].createdAt).toLocaleTimeString()}</span>
                    {rule.executions[0].txHash && (
                      <a
                        href={`https://celoscan.io/tx/${rule.executions[0].txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#35D07F] hover:underline flex items-center gap-1 font-mono"
                      >
                        Tx: {rule.executions[0].txHash.slice(0, 14)}...
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-[#1E2126] text-center text-xs text-gray-500 space-y-2">
        <p>Built for the Celo Agents at Work Hackathon • Powered by Celo L2, MiniPay & ERC-8021</p>
        <p className="text-[11px] text-gray-600">
          Treasury: <span className="font-mono text-gray-400">{TREASURY_WALLET}</span> • 100% Non-Custodial
        </p>
      </footer>
    </div>
  );
}
