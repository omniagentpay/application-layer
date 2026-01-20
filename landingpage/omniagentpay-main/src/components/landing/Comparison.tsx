import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, X } from "lucide-react";

const comparisonData = [
  {
    feature: "Zero-Config Setup",
    description: "Just API key, auto-generated secrets",
    omniagentpay: true,
    buildYourself: false,
    traditional: false,
    cryptoWallets: false,
  },
  {
    feature: "Universal pay() Method",
    description: "One method for all payment types",
    omniagentpay: true,
    buildYourself: "Custom logic",
    traditional: false,
    cryptoWallets: false,
  },
  {
    feature: "x402 Protocol Support",
    description: "HTTP 402 machine-to-machine payments",
    omniagentpay: true,
    buildYourself: "Months",
    traditional: false,
    cryptoWallets: false,
  },
  {
    feature: "Atomic Spending Guards",
    description: "Budget, rate, transaction limits",
    omniagentpay: true,
    buildYourself: "Complex",
    traditional: "Basic",
    cryptoWallets: false,
  },
  {
    feature: "Cross-Chain Transfers",
    description: "USDC across blockchains via CCTP",
    omniagentpay: true,
    buildYourself: "Very complex",
    traditional: false,
    cryptoWallets: "Limited",
  },
  {
    feature: "MCP Integration",
    description: "Natural language payments in Claude",
    omniagentpay: true,
    buildYourself: false,
    traditional: false,
    cryptoWallets: false,
  },
  {
    feature: "Integration Time",
    description: "Time to first payment",
    omniagentpay: "5 min",
    buildYourself: "Weeks",
    traditional: "N/A",
    cryptoWallets: "Hours",
  },
];

const Comparison = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const renderCell = (value: boolean | string) => {
    if (value === true) {
      return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
    } else if (value === false) {
      return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
    } else {
      return <span className="text-xs text-muted-foreground">{value}</span>;
    }
  };

  return (
    <section ref={ref} className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-wider mb-2">Comparison</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Why OmniAgentPay?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The missing layer that lets AI agents use any payment rail autonomously.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-5xl mx-auto overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-medium text-muted-foreground min-w-[180px]">Feature</th>
                <th className="text-center py-3 px-3 min-w-[100px]">
                  <span className="text-gradient font-bold">OmniAgentPay</span>
                </th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium min-w-[80px]">DIY</th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium min-w-[80px]">Stripe</th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium min-w-[80px]">Crypto</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, index) => (
                <motion.tr
                  key={row.feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.05 * index }}
                  className="border-b border-border/50 hover:bg-secondary/30"
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-foreground">{row.feature}</div>
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  </td>
                  <td className="py-3 px-3 text-center bg-primary/5">{renderCell(row.omniagentpay)}</td>
                  <td className="py-3 px-3 text-center">{renderCell(row.buildYourself)}</td>
                  <td className="py-3 px-3 text-center">{renderCell(row.traditional)}</td>
                  <td className="py-3 px-3 text-center">{renderCell(row.cryptoWallets)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-muted-foreground text-sm mt-6"
        >
          Traditional processors require human auth. Crypto wallets lack safety controls. OmniAgentPay bridges the gap.
        </motion.p>
      </div>
    </section>
  );
};

export default Comparison;
