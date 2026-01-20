import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { XCircle, ArrowRight, CheckCircle2, Zap, Clock, DollarSign } from "lucide-react";

const Problem = () => {
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            The <span className="text-destructive">Broken</span> Agent Economy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every time an AI agent encounters a paid service, everything stops.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-xl border border-destructive/20 bg-destructive/5 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-foreground">Without OmniAgentPay</h3>
            </div>
            
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-start gap-2">
                <span className="text-primary font-medium w-16 flex-shrink-0">Agent:</span>
                <span className="text-muted-foreground">"I need weather data..."</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-medium w-16 flex-shrink-0">API:</span>
                <span className="text-muted-foreground">"HTTP 402 - Payment Required"</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-destructive font-medium w-16 flex-shrink-0">Agent:</span>
                <span className="text-destructive">"Workflow halted. Awaiting human..."</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-destructive/10">
              <ul className="space-y-2">
                {[
                  { icon: Clock, text: "Minutes lost per interruption" },
                  { icon: XCircle, text: "Context switching overhead" },
                  { icon: DollarSign, text: "No spending controls" }
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2 text-muted-foreground text-sm">
                    <item.icon className="w-4 h-4 text-destructive/60" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">With OmniAgentPay</h3>
            </div>
            
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-start gap-2">
                <span className="text-primary font-medium w-16 flex-shrink-0">Agent:</span>
                <span className="text-muted-foreground">"I need weather data..."</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-medium w-16 flex-shrink-0">API:</span>
                <span className="text-muted-foreground">"HTTP 402 - Payment Required"</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-medium w-16 flex-shrink-0">Agent:</span>
                <span className="text-emerald-600">"Paid! Data received. Continuing..."</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-primary/10">
              <ul className="space-y-2">
                {[
                  { icon: Zap, text: "Zero human intervention" },
                  { icon: CheckCircle2, text: "Full workflow completion" },
                  { icon: DollarSign, text: "Guards prevent overspending" }
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2 text-muted-foreground text-sm">
                    <item.icon className="w-4 h-4 text-primary/60" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Flow diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="border border-border rounded-xl bg-card p-6">
            <h4 className="text-center text-sm font-medium text-muted-foreground mb-6">Payment Flow</h4>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <div className="px-4 py-2 bg-primary/10 rounded-lg text-primary font-medium border border-primary/20">
                Agent calls pay()
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <div className="px-4 py-2 bg-secondary rounded-lg text-foreground border border-border">
                Guards validate
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <div className="px-4 py-2 bg-secondary rounded-lg text-foreground border border-border">
                Auto-route
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <div className="px-4 py-2 bg-accent/10 rounded-lg text-accent font-medium border border-accent/20">
                Complete ✓
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Problem;
