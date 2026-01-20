import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

const technologies = [
  {
    name: "Circle Platform",
    description: "Developer-controlled wallets with MPC cryptography",
    category: "Infrastructure",
  },
  {
    name: "Arc Blockchain",
    description: "Circle's payment-optimized L1 for instant USDC",
    category: "Blockchain",
  },
  {
    name: "USDC Stablecoin",
    description: "1 USDC = $1 USD, fully-reserved and audited",
    category: "Currency",
  },
  {
    name: "x402 Protocol",
    description: "HTTP 402 standard for machine-to-machine payments",
    category: "Protocol",
  },
  {
    name: "CCTP Gateway",
    description: "Cross-Chain Transfer Protocol for multi-chain",
    category: "Multi-Chain",
  },
  {
    name: "MCP Integration",
    description: "Native support for AI assistants like Claude",
    category: "AI Native",
  },
];

const accessMethods = [
  {
    name: "Python SDK",
    description: "Full async SDK with type hints",
    example: "pip install omniagentpay"
  },
  {
    name: "MCP Server",
    description: "Natural language in Claude Desktop",
    example: "npx omniagentpay-mcp"
  },
  {
    name: "CLI Tool",
    description: "Terminal commands for testing",
    example: "omniagentpay pay --to 0x..."
  },
];

const TechStack = () => {
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
          <p className="text-primary text-sm font-medium uppercase tracking-wider mb-2">Technology</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Enterprise-Grade Infrastructure
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built on battle-tested technologies that power billions in transactions daily.
          </p>
        </motion.div>

        {/* Tech grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto mb-12">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <div className="bg-card border border-border rounded-xl p-4 text-center card-hover h-full">
                <span className="text-[10px] font-medium text-primary uppercase tracking-wider block mb-2">
                  {tech.category}
                </span>
                <h4 className="font-semibold text-sm text-foreground mb-1">{tech.name}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {tech.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Access methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <h3 className="text-lg font-semibold text-center mb-4 text-foreground">Three Ways to Access</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {accessMethods.map((method) => (
              <div
                key={method.name}
                className="bg-card border border-border rounded-xl p-4 text-center card-hover"
              >
                <h4 className="font-semibold text-foreground mb-1">{method.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                <code className="text-xs bg-slate-900 text-slate-400 px-3 py-1.5 rounded block font-mono">
                  {method.example}
                </code>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Architecture flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 max-w-4xl mx-auto"
        >
          <div className="border border-border rounded-xl bg-card p-6">
            <h4 className="text-center text-sm font-medium text-muted-foreground mb-6">Request Flow</h4>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {[
                { label: "Your Agent", primary: true },
                { label: "SDK" },
                { label: "Guards" },
                { label: "Router" },
                { label: "Circle" },
                { label: "Blockchain", accent: true },
              ].map((item, index, arr) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    item.primary 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : item.accent 
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "bg-secondary text-foreground border border-border"
                  }`}>
                    {item.label}
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TechStack;
