import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Github, FileText, MessageSquare, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const quickLinks = [
  { icon: Book, label: "Quick Start Guide", href: "#" },
  { icon: FileText, label: "API Reference", href: "#" },
  { icon: MessageSquare, label: "MCP Server Setup", href: "#" },
  { icon: Github, label: "GitHub Examples", href: "#" },
];

const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/login");
  };

  return (
    <section id="docs" ref={ref} className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          {/* Main CTA Card */}
          <div className="border border-border rounded-2xl bg-card p-8 md:p-10 text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Ready to Build the <span className="text-gradient">Agent Economy</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Open source. Well documented. Production-ready.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6" onClick={handleGetStarted}>
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-border hover:bg-secondary">
                <Github className="mr-2 w-4 h-4" />
                View on GitHub
              </Button>
            </div>

            {/* Code example */}
            <div className="bg-slate-900 rounded-xl p-5 max-w-lg mx-auto text-left font-mono text-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-slate-500">quickstart.py</span>
              </div>
              <pre className="text-slate-400 whitespace-pre-wrap text-xs">
                <span className="text-blue-400">from</span> omniagentpay <span className="text-blue-400">import</span> OmniAgentPay{"\n"}
                {"\n"}
                <span className="text-blue-400">async with</span> OmniAgentPay() <span className="text-blue-400">as</span> client:{"\n"}
                {"    "}_, wallet = client.wallet.create_agent_wallet(<span className="text-emerald-400">"my-agent"</span>){"\n"}
                {"    "}result = <span className="text-blue-400">await</span> client.pay({"\n"}
                {"        "}wallet_id=wallet.id,{"\n"}
                {"        "}recipient=<span className="text-emerald-400">"https://api.service.com"</span>,{"\n"}
                {"        "}amount=<span className="text-cyan-400">0.05</span>{"\n"}
                {"    "})
              </pre>
            </div>
          </div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {quickLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl card-hover"
              >
                <link.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{link.label}</span>
              </a>
            ))}
          </motion.div>

          {/* Best practices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <h4 className="font-semibold text-foreground mb-3">Best Practices</h4>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              {[
                "Always add a BudgetGuard",
                "Use Intents for >$100",
                "Enable DEBUG logs",
                "Store metadata for audits"
              ].map((practice) => (
                <span
                  key={practice}
                  className="px-3 py-1.5 bg-secondary rounded-full text-muted-foreground border border-border"
                >
                  ✓ {practice}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
