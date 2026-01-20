import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, Shield, Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const codeExamples = [
  {
    title: "Zero Config",
    code: `from omniagentpay import OmniAgentPay

# Just provide your API key - that's it!
client = OmniAgentPay(
    circle_api_key="YOUR_API_KEY"
)

# Entity Secret auto-generated ✨`,
  },
  {
    title: "Universal pay()",
    code: `# One method handles everything
result = await client.pay(
    wallet_id=wallet.id,
    recipient="0xVendor...",  # or URL
    amount=25.50,
    purpose="API subscription"
)`,
  },
  {
    title: "Auto Routing",
    code: `# Direct transfer
await client.pay(recipient="0x742d...")

# x402 invoice (auto-negotiates)
await client.pay(recipient="https://api.com")

# Cross-chain via CCTP
await client.pay(
    recipient="0x...",
    destination_chain=Network.BASE
)`,
  },
];

const Hero = () => {
  const [activeExample, setActiveExample] = useState(0);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveExample((prev) => (prev + 1) % codeExamples.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText("pip install omniagentpay");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGetStarted = () => {
    navigate("/login");
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary text-sm font-medium mb-6"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">The Payment Layer for AI Agents</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] text-foreground"
            >
              Agents think.{" "}
              <span className="text-gradient">We handle the money.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Zero-config payment infrastructure. One <code className="text-primary font-mono bg-secondary px-1.5 py-0.5 rounded">pay()</code> method. 
              Automatic routing for transfers, x402, and cross-chain.
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8"
            >
              {[
                { icon: Zap, label: "Zero Config" },
                { icon: Code2, label: "One Method" },
                { icon: Shield, label: "Safety Guards" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm"
                >
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-foreground">{item.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 group"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-border hover:bg-secondary"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 w-4 h-4" />
                    pip install omniagentpay
                  </>
                )}
              </Button>
            </motion.div>
          </div>

          {/* Right: Code Demo */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-lg">
              {/* Tab navigation */}
              <div className="flex border-b border-border bg-secondary/50">
                {codeExamples.map((example, index) => (
                  <button
                    key={example.title}
                    onClick={() => setActiveExample(index)}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeExample === index
                        ? "border-primary text-foreground bg-background"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {example.title}
                  </button>
                ))}
              </div>

              {/* Code display */}
              <div className="p-5 bg-slate-900 min-h-[280px]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-xs text-slate-500 ml-2 font-mono">agent.py</span>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.pre
                    key={activeExample}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-mono overflow-x-auto"
                  >
                    <code className="text-slate-300 whitespace-pre-wrap">
                      {codeExamples[activeExample].code.split('\n').map((line, i) => (
                        <span key={i} className="block">
                          {line.includes('#') ? (
                            <span className="text-slate-500">{line}</span>
                          ) : line.includes('from') || line.includes('import') || line.includes('await') ? (
                            <>
                              <span className="text-blue-400">{line.split(' ')[0]}</span>
                              <span className="text-slate-300">{' ' + line.split(' ').slice(1).join(' ')}</span>
                            </>
                          ) : line.includes('=') ? (
                            <>
                              <span className="text-cyan-400">{line.split('=')[0]}</span>
                              <span className="text-slate-300">=</span>
                              <span className="text-emerald-400">{line.split('=').slice(1).join('=')}</span>
                            </>
                          ) : (
                            line
                          )}
                        </span>
                      ))}
                    </code>
                  </motion.pre>
                </AnimatePresence>
              </div>

              {/* Progress indicators */}
              <div className="flex gap-1.5 p-3 justify-center bg-secondary/30 border-t border-border">
                {codeExamples.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveExample(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeExample === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
