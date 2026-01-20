import type { GuardPreset } from '@/types';

export const guardPresets: GuardPreset[] = [
  {
    id: 'preset_1',
    name: 'Hackathon Mode',
    description: 'Ultra-conservative limits for demos and testing',
    philosophy: 'Maximum safety with minimal risk exposure. Perfect for public demos and hackathons where you want to showcase capabilities without financial risk.',
    thresholds: {
      dailyBudget: 100,
      singleTxLimit: 25,
      autoApproveThreshold: 5,
      rateLimit: 10,
    },
    guards: [
      { type: 'budget', config: { limit: 100, period: 'day' } },
      { type: 'single_tx', config: { limit: 25 } },
      { type: 'auto_approve', config: { threshold: 5 } },
      { type: 'rate_limit', config: { limit: 10, period: 'hour' } },
    ],
  },
  {
    id: 'preset_2',
    name: 'Enterprise Safe',
    description: 'Strict controls for enterprise production environments',
    philosophy: 'Balanced security and operational efficiency. Designed for organizations that need strong oversight while maintaining workflow velocity.',
    thresholds: {
      dailyBudget: 5000,
      singleTxLimit: 2000,
      autoApproveThreshold: 100,
      rateLimit: 50,
    },
    guards: [
      { type: 'budget', config: { limit: 5000, period: 'day' } },
      { type: 'single_tx', config: { limit: 2000 } },
      { type: 'auto_approve', config: { threshold: 100 } },
      { type: 'rate_limit', config: { limit: 50, period: 'hour' } },
    ],
  },
  {
    id: 'preset_3',
    name: 'Autonomous Agent',
    description: 'Optimized for high-frequency agent operations',
    philosophy: 'Enable autonomous agents to operate efficiently with reasonable safeguards. Higher limits with rate limiting to prevent runaway spending.',
    thresholds: {
      dailyBudget: 10000,
      singleTxLimit: 500,
      autoApproveThreshold: 200,
      rateLimit: 200,
    },
    guards: [
      { type: 'budget', config: { limit: 10000, period: 'day' } },
      { type: 'single_tx', config: { limit: 500 } },
      { type: 'auto_approve', config: { threshold: 200 } },
      { type: 'rate_limit', config: { limit: 200, period: 'hour' } },
    ],
  },
  {
    id: 'preset_4',
    name: 'Finance Audit',
    description: 'Maximum visibility and control for financial compliance',
    philosophy: 'Every transaction requires approval. Complete audit trail with no auto-approvals. Designed for finance teams requiring full oversight.',
    thresholds: {
      dailyBudget: 20000,
      singleTxLimit: 5000,
      autoApproveThreshold: 0,
      rateLimit: 100,
    },
    guards: [
      { type: 'budget', config: { limit: 20000, period: 'day' } },
      { type: 'single_tx', config: { limit: 5000 } },
      { type: 'auto_approve', config: { threshold: 0 } },
      { type: 'rate_limit', config: { limit: 100, period: 'hour' } },
    ],
  },
];
