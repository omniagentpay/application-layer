import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Package, Wallet, Shield, Zap, Eye, Settings } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "Install",
    description: "Just provide your Circle API key. Entity Secret is auto-generated.",
    code: `pip install omniagentpay`,
  },
  {
    number: "02",
    icon: Settings,
    title: "Initialize",
    description: "Async context manager handles cleanup automatically.",
    code: `async with OmniAgentPay() as client:
    # Ready to use!`,
  },
  {
    number: "03",
    icon: Wallet,
    title: "Create Wallet",
    description: "Each agent gets its own Circle-powered wallet with USDC.",
    code: `wallet_set, wallet = client.wallet.create_agent_wallet("my-agent")`,
  },
  {
    number: "04",
    icon: Shield,
    title: "Add Guards",
    description: "Budget limits, rate limits, transaction caps, whitelists.",
    code: `await client.add_budget_guard(wallet.id, daily_limit="100.00")`,
  },
  {
    number: "05",
    icon: Zap,
    title: "Call pay()",
    description: "One method handles transfers, x402, and cross-chain.",
    code: `result = await client.pay(wallet_id, recipient, amount)`,
  },
  {
    number: "06",
    icon: Eye,
    title: "Monitor",
    description: "DEBUG logs, transaction ledger, webhooks for events.",
    code: `history = await client.ledger.get_history(wallet.id)`,
  },
];

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-wider mb-2">Implementation</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            From Zero to Payments in 5 Minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Works with any AI framework — LangChain, OpenAI, Anthropic, or custom.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.08 * index }}
              >
                <div className="flex gap-4 items-start bg-card border border-border rounded-xl p-4 card-hover">
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <span className="text-primary font-mono text-sm font-medium">{step.number}</span>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                  </div>

                  <div className="hidden sm:block flex-shrink-0 bg-slate-900 rounded-lg px-4 py-2 font-mono text-xs">
                    <code className="text-slate-400 whitespace-nowrap">{step.code}</code>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* MCP Alternative */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 max-w-3xl mx-auto"
        >
          <div className="border border-border rounded-xl bg-card p-6">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Or Use MCP Server for Claude</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  No code needed! Connect OmniAgentPay as an MCP server in Claude Desktop.
                </p>
                <div className="flex flex-wrap gap-2">
                  <code className="bg-secondary px-3 py-1.5 rounded text-xs border border-border">"Pay $5 to api.openai.com"</code>
                  <code className="bg-secondary px-3 py-1.5 rounded text-xs border border-border">"Check my balance"</code>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
