export interface RuleRecord {
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
  createdAt: string;
  updatedAt: string;
  executions?: ExecutionRecord[];
}

export interface ExecutionRecord {
  id: string;
  ruleId: string;
  status: string;
  amount: string;
  token: string;
  recipient: string;
  txHash?: string | null;
  attributionTag?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

// Global in-memory fallback store for serverless environments
const globalStore = global as unknown as {
  inMemoryRules: RuleRecord[];
  inMemoryExecutions: ExecutionRecord[];
};

if (!globalStore.inMemoryRules) {
  globalStore.inMemoryRules = [];
}
if (!globalStore.inMemoryExecutions) {
  globalStore.inMemoryExecutions = [];
}

export const memoryStore = {
  getRules: () => {
    return globalStore.inMemoryRules.map((r) => ({
      ...r,
      executions: globalStore.inMemoryExecutions
        .filter((e) => e.ruleId === r.id)
        .slice(0, 5),
    }));
  },
  getRuleById: (id: string) => {
    return globalStore.inMemoryRules.find((r) => r.id === id) || null;
  },
  createRule: (data: Omit<RuleRecord, "id" | "totalExecuted" | "totalValueMoved" | "createdAt" | "updatedAt">) => {
    const newRule: RuleRecord = {
      ...data,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      totalExecuted: 0,
      totalValueMoved: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executions: [],
    };
    globalStore.inMemoryRules.unshift(newRule);
    return newRule;
  },
  updateRule: (id: string, updates: Partial<RuleRecord>) => {
    const idx = globalStore.inMemoryRules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      globalStore.inMemoryRules[idx] = {
        ...globalStore.inMemoryRules[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return globalStore.inMemoryRules[idx];
    }
    return null;
  },
  deleteRule: (id: string) => {
    globalStore.inMemoryRules = globalStore.inMemoryRules.filter((r) => r.id !== id);
    globalStore.inMemoryExecutions = globalStore.inMemoryExecutions.filter((e) => e.ruleId !== id);
    return true;
  },
  createExecution: (data: Omit<ExecutionRecord, "id" | "createdAt">) => {
    const exec: ExecutionRecord = {
      ...data,
      id: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    globalStore.inMemoryExecutions.unshift(exec);

    // Update rule metadata
    const rule = globalStore.inMemoryRules.find((r) => r.id === data.ruleId);
    if (rule && data.status === "SUCCESS") {
      const num = parseFloat(data.amount.replace("%", "")) || 0;
      rule.totalExecuted += 1;
      rule.totalValueMoved += num;
      rule.lastExecutedAt = new Date().toISOString();
    }
    return exec;
  },
};

