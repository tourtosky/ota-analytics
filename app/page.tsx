"use client";

import { useState, useEffect } from "react";
import AnalyzeForm from "@/components/AnalyzeForm";
import {
  LinkIcon,
  SearchIcon,
  FileTextIcon,
  TrendingUpIcon,
  BrainCircuitIcon,
  TargetIcon,
  MessageSquareIcon,
  ImageIcon,
  DollarSignIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      setCount(Math.floor(progress * end));

      if (now < endTime) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(updateCount);
  }, [end, duration, isInView]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass rounded-xl p-6 transition-all hover:bg-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-semibold text-white">{question}</h3>
        {isOpen ? (
          <ChevronUpIcon className="w-5 h-5 text-primary flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <p className="mt-4 text-gray-300 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20 noise overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-30" />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-2">
              TourBoost
            </h1>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-6xl font-display font-bold text-white mb-6 text-balance leading-tight"
          >
            Your Competitors Are Outranking You on Viator.{" "}
            <span className="text-primary">Find Out Why.</span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto text-balance leading-relaxed"
          >
            AI-powered listing analysis that compares your tour against top competitors. Get a score, see gaps, and get specific recommendations to increase bookings.
          </motion.p>

          {/* Analyze Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <AnalyzeForm />
          </motion.div>

          {/* Hero Visual - Mock Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-20 max-w-4xl mx-auto"
          >
            <div className="glass rounded-2xl p-8 shadow-2xl shadow-primary/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Overall Score</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-mono font-bold text-red-400">43</span>
                    <span className="text-2xl text-gray-400">/100</span>
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 1.2 }}
                      className="text-3xl text-gray-400 mx-4"
                    >
                      →
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 1.4 }}
                      className="text-6xl font-mono font-bold text-emerald-400"
                    >
                      87
                    </motion.span>
                    <span className="text-2xl text-gray-400">/100</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-left">
                <div className="glass rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Photos</p>
                  <p className="text-2xl font-mono font-bold text-red-400">3</p>
                  <p className="text-xs text-gray-500 mt-1">Median: 9.5</p>
                </div>
                <div className="glass rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Reviews</p>
                  <p className="text-2xl font-mono font-bold text-yellow-400">47</p>
                  <p className="text-xs text-gray-500 mt-1">Median: 156</p>
                </div>
                <div className="glass rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Rating</p>
                  <p className="text-2xl font-mono font-bold text-green-400">4.3</p>
                  <p className="text-xs text-gray-500 mt-1">Median: 4.6</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32 px-6 bg-dark-lighter relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400">Three simple steps to optimize your listing</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: LinkIcon,
                step: "01",
                title: "Paste Your URL",
                description: "Enter your Viator tour link and we'll fetch your listing data instantly",
              },
              {
                icon: SearchIcon,
                step: "02",
                title: "We Analyze Everything",
                description: "We compare your title, pricing, photos, reviews, and description against your top 10 competitors",
              },
              {
                icon: FileTextIcon,
                step: "03",
                title: "Get Your Report",
                description: "Receive a detailed score with AI-powered, actionable recommendations to climb the rankings",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className="glass rounded-2xl p-8 h-full hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-5xl font-display font-bold text-white/10">{item.step}</span>
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mb-4">
                    {item.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 text-primary/30">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 relative noise">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Everything You Need to Dominate Viator
            </h2>
            <p className="text-xl text-gray-400">Data-driven insights that actually move the needle</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUpIcon,
                title: "Competitor Intelligence",
                description: "See exactly how your listing stacks up against top tours in your category",
              },
              {
                icon: BrainCircuitIcon,
                title: "AI-Powered Recommendations",
                description: "Not generic tips — specific suggestions based on what's actually working for your competitors",
              },
              {
                icon: TargetIcon,
                title: "Listing Score (0-100)",
                description: "Get a quantified score across 6 dimensions: title, description, pricing, reviews, photos, and completeness",
              },
              {
                icon: MessageSquareIcon,
                title: "Review Sentiment Analysis",
                description: "Understand what travelers love about top competitors and where they complain — your opportunity",
              },
              {
                icon: FileTextIcon,
                title: "Keyword Gap Analysis",
                description: "Discover which high-converting keywords your competitors use that you're missing",
              },
              {
                icon: DollarSignIcon,
                title: "Data-Driven Pricing",
                description: "See where your price sits vs the market median and get pricing recommendations",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass rounded-2xl p-8 hover:bg-white/10 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 bg-dark-lighter">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            {[
              { value: 300000, suffix: "+", label: "Tours on Viator" },
              { value: 37, suffix: "%", label: "Bookings from OTAs" },
              { value: 254, suffix: "B", label: "Global Market Size" },
              { value: 0, suffix: "", label: "Tools Like This" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl md:text-6xl font-mono font-bold text-primary mb-3">
                  {stat.value > 0 ? (
                    <>
                      <AnimatedCounter end={stat.value} />
                      {stat.suffix}
                    </>
                  ) : (
                    `${stat.value}`
                  )}
                </div>
                <p className="text-gray-400 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12 text-gray-500 text-sm"
          >
            Market data from Arival research
          </motion.p>
        </div>
      </section>

      {/* Report Preview Section */}
      <section className="py-32 px-6 relative noise">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              See What You&apos;ll Get
            </h2>
            <p className="text-xl text-gray-400">Your complete listing audit in one detailed report</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass rounded-2xl p-8 md:p-12">
              {/* Score Circle */}
              <div className="flex items-center justify-center mb-12">
                <div className="relative">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-white/10"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (1 - 0.67)}`}
                      className="text-yellow-400 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-mono font-bold text-white">67</div>
                      <div className="text-gray-400 text-sm">/100</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Competitor Table Preview */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-gray-400 font-semibold">Tour</th>
                      <th className="text-right py-3 text-gray-400 font-semibold">Rating</th>
                      <th className="text-right py-3 text-gray-400 font-semibold">Reviews</th>
                      <th className="text-right py-3 text-gray-400 font-semibold">Photos</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    <tr className="border-b border-white/10 bg-primary/10">
                      <td className="py-3 text-white font-semibold">YOUR TOUR</td>
                      <td className="text-right py-3 text-yellow-400">4.3</td>
                      <td className="text-right py-3 text-red-400">47</td>
                      <td className="text-right py-3 text-red-400">3</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-3 text-gray-400">Competitor #1</td>
                      <td className="text-right py-3 text-gray-300">4.8</td>
                      <td className="text-right py-3 text-gray-300">312</td>
                      <td className="text-right py-3 text-gray-300">12</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-3 text-gray-400">Competitor #2</td>
                      <td className="text-right py-3 text-gray-300">4.7</td>
                      <td className="text-right py-3 text-gray-300">189</td>
                      <td className="text-right py-3 text-gray-300">9</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recommendations Preview */}
              <div className="space-y-4">
                <div className="glass rounded-xl p-6 border-l-4 border-red-500">
                  <div className="flex gap-3">
                    <span className="text-2xl">🔴</span>
                    <div>
                      <h4 className="text-white font-bold mb-2">Add 8+ photos (you have 3, median is 9.5)</h4>
                      <p className="text-gray-300 text-sm">Travelers who view 7+ images are 5x more likely to book. Upload action shots...</p>
                    </div>
                  </div>
                </div>
                <div className="glass rounded-xl p-6 border-l-4 border-yellow-500">
                  <div className="flex gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="text-white font-bold mb-2">Include &quot;private&quot; in your title</h4>
                      <p className="text-gray-300 text-sm">6 of 8 top competitors use this keyword. It increases click-through rate by...</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Frosted Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-dark-card to-transparent backdrop-blur-sm flex items-end justify-center pb-8">
                <button className="px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all shadow-lg shadow-primary/20">
                  Analyze your listing to see your full report →
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 bg-dark-lighter">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            <FAQItem
              question="Is this free?"
              answer="Yes, your first analysis is completely free. No credit card required, no hidden fees."
            />
            <FAQItem
              question="How does it work?"
              answer="We use the official Viator API to fetch your tour data and compare it against competitors in the same location and category. Our AI analyzes the data and generates specific, actionable recommendations."
            />
            <FAQItem
              question="What data do you analyze?"
              answer="We analyze your title, description, pricing, photos, reviews, ratings, inclusions, exclusions, cancellation policy, and more. We compare all of these against your top competitors to identify gaps and opportunities."
            />
            <FAQItem
              question="Do I need a Viator account?"
              answer="No. You just need the URL of your listing on Viator. Our tool works by analyzing publicly available data."
            />
            <FAQItem
              question="How long does the analysis take?"
              answer="About 30 seconds. We fetch data, run competitor analysis, and generate AI recommendations in real-time. You'll see your results immediately."
            />
            <FAQItem
              question="Will you support GetYourGuide?"
              answer="Coming soon! We're starting with Viator (the largest OTA for tours & activities) and will expand to GetYourGuide, Airbnb Experiences, and other platforms."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-display font-bold text-white mb-1">TourBoost</h3>
              <p className="text-gray-400">Built for tour operators</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-primary transition-colors">About</a>
              <a href="mailto:hello@tourboost.app" className="hover:text-primary transition-colors">Contact</a>
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-500 text-sm">
            © 2026 TourBoost. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
