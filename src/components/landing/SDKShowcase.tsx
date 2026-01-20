import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Wallet, 
  Zap, 
  Shield, 
  Globe, 
  Users, 
  ArrowRightLeft,
  Clock,
  ListChecks,
  Eye
} from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Wallet Management",
    description: "Create agent wallets and user wallets with a single method. Each wallet gets its own USDC balance.",
    code: `wallet_set, wallet = client.wallet.create_agent_wallet(
    agent_name="Agent-007"
)`,
    highlight: "Agent-Native"
  },
  {
    icon: Zap,
    title: "Universal pay() Method",
    description: "One method for everything: direct transfers, x402 invoices, and cross-chain payments.",
    code: `result = await client.pay(
    wallet_id=wallet.id,
    recipient="0xVendor...",
    amount=25.50
)`,
    highlight: "Unified API"
  },
  {
    icon: ArrowRightLeft,
    title: "Automatic Routing",
    description: "Pass an address for direct transfer, a URL for x402 negotiation, or specify destination_chain for cross-chain.",
    code: `# Routes based on recipient format:
# 0x742d... → Direct Transfer
# https://api.com → x402 Protocol
# + destination_chain → CCTP`,
    highlight: "Smart Routing"
  },
  {
    icon: Shield,
    title: "Guard System",
    description: "Budget, rate limit, single transaction, and recipient guards. Applied atomically before signing.",
    code: `await client.add_budget_guard(
    wallet.id,
    daily_limit="100.00"
)`,
    highlight: "Safety Kernel"
  },
  {
    icon: Users,
    title: "Wallet-Set Guards",
    description: "Apply guards to ALL wallets in a set. Perfect for agent swarms needing unified policies.",
    code: `await client.add_budget_guard_for_set(
    wallet_set.id,
    daily_limit="1000.00"
)`,
    highlight: "Swarm Control"
  },
  {
    icon: Clock,
    title: "Payment Intents",
    description: "Create intents for high-value transactions. Human approves, then agent confirms.",
    code: `intent = await client.create_payment_intent(
    wallet_id=wallet.id,
    amount=1000.00
)`,
    highlight: "Human-in-Loop"
  },
  {
    icon: ListChecks,
    title: "Batch Payments",
    description: "Process multiple payments concurrently with configurable parallelism.",
    code: `batch = await client.batch_pay(
    requests=[...],
    concurrency=5
)`,
    highlight: "Parallel Ops"
  },
  {
    icon: Globe,
    title: "Cross-Chain Gateway",
    description: "Move USDC across blockchains via Circle's Cross-Chain Transfer Protocol.",
    code: `result = await client.pay(
    recipient="0x...",
    destination_chain=Network.BASE
)`,
    highlight: "Multi-Chain"
  },
  {
    icon: Eye,
    title: "Full Observability",
    description: "DEBUG logs expose every decision. Ledger tracks all transactions with blockchain hashes.",
    code: `client = OmniAgentPay(log_level=DEBUG)
history = await client.ledger.get_history(wallet.id)`,
    highlight: "Audit Trail"
  },
];

const SDKShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-wider mb-2">SDK Features</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Everything Your Agents Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From wallet creation to cross-chain transfers — complete payment infrastructure.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className="group"
            >
              <div className="h-full bg-card border border-border rounded-xl p-5 card-hover flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-1 rounded uppercase tracking-wider">
                    {feature.highlight}
                  </span>
                </div>
                
                <h3 className="text-base font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-grow">
                  {feature.description}
                </p>
                
                <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <pre className="text-slate-400 whitespace-pre-wrap">
                    {feature.code}
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SDKShowcase;
