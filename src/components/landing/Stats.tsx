import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: "100M+", label: "AI Agents in Production by 2026" },
  { value: "$45B", label: "Agent Economy Market Size (2029)" },
  { value: "<5min", label: "Time to First Payment" },
  { value: "99.99%", label: "Circle Platform Uptime" },
];

const features = [
  "Automatic x402 negotiation",
  "Cross-chain via CCTP",
  "Atomic guard enforcement",
  "Full DEBUG observability",
  "Payment intent approvals",
  "Batch processing"
];

const Stats = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="border border-border rounded-2xl bg-card p-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="border-t border-border pt-6"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1.5 bg-secondary rounded-full text-sm text-muted-foreground border border-border"
                >
                  {feature}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
