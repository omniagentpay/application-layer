import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  BookOpen, 
  Plane, 
  TrendingUp, 
  Cpu,
  Newspaper,
  Cloud,
  Stethoscope,
  Scale,
  ShoppingCart
} from "lucide-react";

const stories = [
  {
    icon: BookOpen,
    category: "Research",
    title: "Academic Research Assistant",
    story: "AI research assistant accesses 47 paywalled papers for thesis review, paying $0.50–$3 each via x402. Completed in 2 hours.",
    metrics: { cost: "$89", papers: "47", time: "2hrs" },
  },
  {
    icon: TrendingUp,
    category: "Finance",
    title: "Hedge Fund Data Pipeline",
    story: "200+ AI agents collect real-time market data. Each has $50/day budget guard. 50,000 paid API calls daily, zero manual intervention.",
    metrics: { daily: "$2.4k", calls: "50k", agents: "200" },
  },
  {
    icon: Cpu,
    category: "AI-to-AI",
    title: "Agent Swarm Collaboration",
    story: "Research agent pays ImageAnalysis agent $0.02/image for structured data. 200ms latency. Seamless agent economy.",
    metrics: { cost: "$0.02", latency: "200ms", format: "JSON" },
  },
  {
    icon: Plane,
    category: "Travel",
    title: "Autonomous Travel Booking",
    story: "Executive's AI assistant books flight, hotel, restaurant. Payment intents require approval for >$100. Total: $1,847.",
    metrics: { total: "$1.8k", bookings: "4", approval: "1-click" },
  },
  {
    icon: Cloud,
    category: "Infrastructure",
    title: "Dynamic Cloud Scaling",
    story: "ML training agent spins up GPU instances, pays hourly compute fees. Single transaction guard caps at $50/hour.",
    metrics: { hourly: "$47", gpus: "8", duration: "12hrs" },
  },
  {
    icon: Newspaper,
    category: "Media",
    title: "Content Aggregation",
    story: "News AI accesses 200 paywalled articles daily. Recipient guard whitelists trusted news domains only.",
    metrics: { monthly: "$800", sources: "40", articles: "6k" },
  },
  {
    icon: ShoppingCart,
    category: "Commerce",
    title: "Inventory Replenishment",
    story: "Inventory AI monitors 3 warehouses. Auto-reorders from approved vendors using batch payments with 5x concurrency.",
    metrics: { weekly: "$12k", vendors: "15", orders: "200" },
  },
  {
    icon: Stethoscope,
    category: "Healthcare",
    title: "Medical Records Access",
    story: "Diagnostic AI retrieves patient history from 3 hospital systems. Cross-chain payments. Unified summary for physician.",
    metrics: { cost: "$4.50", sources: "3", latency: "8s" },
  },
  {
    icon: Scale,
    category: "Legal",
    title: "Contract Analysis",
    story: "Legal AI reviews 500 contracts monthly, accessing premium legal databases. Budget guard ensures <$1k/month.",
    metrics: { monthly: "$900", contracts: "500", saved: "400hrs" },
  },
];

const UserStories = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="use-cases" ref={ref} className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-wider mb-2">Use Cases</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            The Agent Economy in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From research assistants to hedge funds — real-world applications.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
          {stories.map((story, index) => (
            <motion.div
              key={story.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <div className="h-full bg-card border border-border rounded-xl p-5 card-hover flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <story.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-1 rounded uppercase tracking-wider">
                    {story.category}
                  </span>
                </div>
                
                <h3 className="text-base font-semibold text-foreground mb-2">{story.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-grow">
                  {story.story}
                </p>
                
                {/* Metrics */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(story.metrics).map(([key, value]) => (
                    <div key={key} className="bg-secondary px-2 py-1 rounded text-xs border border-border">
                      <span className="text-muted-foreground capitalize">{key}: </span>
                      <span className="text-foreground font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserStories;
