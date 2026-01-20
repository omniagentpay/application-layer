import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Shield, 
  Gauge, 
  Lock, 
  Filter,
  AlertTriangle,
  Check
} from "lucide-react";

const guards = [
  {
    icon: Shield,
    name: "Budget Guard",
    description: "Set daily, hourly, and total spending limits. Automatic reset at configured intervals.",
    code: `await client.add_budget_guard(
    wallet.id,
    daily_limit="100.00",
    hourly_limit="20.00",
    total_limit="1000.00"
)`,
    protects: "Prevents runaway costs"
  },
  {
    icon: Gauge,
    name: "Rate Limit Guard",
    description: "Limit transactions per minute and per hour. Rolling window calculations.",
    code: `await client.add_rate_limit_guard(
    wallet.id,
    max_per_minute=5,
    max_per_hour=100
)`,
    protects: "Stops rapid transactions"
  },
  {
    icon: Lock,
    name: "Single Transaction Guard",
    description: "Cap the maximum amount per individual payment. Set minimum thresholds too.",
    code: `await client.add_single_tx_guard(
    wallet.id,
    max_amount="50.00",
    min_amount="0.01"
)`,
    protects: "Blocks oversized payments"
  },
  {
    icon: Filter,
    name: "Recipient Guard",
    description: "Whitelist trusted addresses/domains or blacklist malicious ones. Supports regex patterns.",
    code: `await client.add_recipient_guard(
    wallet.id,
    mode="whitelist",
    addresses=["0xTrusted..."],
    domains=["api.openai.com"]
)`,
    protects: "Controls destinations"
  },
];

const GuardSystem = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            Safety-Critical System
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Guards Prevent Runaway Spending
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Multiple layers of protection enforced <span className="text-primary font-medium">atomically before any transaction is signed</span>.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {guards.map((guard, index) => (
            <motion.div
              key={guard.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <div className="bg-card border border-border rounded-xl p-5 h-full card-hover">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <guard.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{guard.name}</h3>
                    <p className="text-sm text-muted-foreground">{guard.description}</p>
                  </div>
                </div>
                
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
                  <pre className="text-slate-400 whitespace-pre-wrap">
                    {guard.code}
                  </pre>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-muted-foreground">{guard.protects}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom info box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 max-w-3xl mx-auto"
        >
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
            <h4 className="font-semibold text-foreground mb-2">Wallet-Set Guards</h4>
            <p className="text-muted-foreground text-sm mb-3">
              Apply guards to ALL wallets in a set with <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">add_*_guard_for_set()</code> methods.
            </p>
            <code className="bg-slate-900 text-slate-400 px-4 py-2 rounded-lg text-sm font-mono inline-block">
              await client.list_guards_for_set(wallet_set.id)
            </code>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GuardSystem;
