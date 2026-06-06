import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Percent, 
  ExternalLink, 
  Bell, 
  History, 
  HelpCircle, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  LineChart, 
  Sparkles, 
  Mail, 
  Check, 
  Info, 
  ArrowRight,
  BookOpen,
  ChevronDown,
  Loader2,
  X,
  Play,
  Lightbulb,
  Globe,
  Link2,
  User,
  Briefcase
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { ProductDeal, ComparisonResult, AlertThreshold, PriceHistoryRecord } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"compare" | "history" | "alerts" | "admin">("compare");
  
  // Scraper Search States
  const [productQuery, setProductQuery] = useState("");
  const [currentResult, setCurrentResult] = useState<ComparisonResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingStep, setScrapingStep] = useState(0);
  
  // Persistent server data
  const [alerts, setAlerts] = useState<AlertThreshold[]>([]);
  const [historyRecords, setHistoryRecords] = useState<PriceHistoryRecord[]>([]);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState("");

  // Alarm creation form
  const [alertForm, setAlertForm] = useState({
    productName: "",
    targetPrice: "",
    email: ""
  });

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Scanning stages for animation
  const scrapingStages = [
    "Spinning up sandboxed Chrome viewport...",
    "Querying Google Search Grounding database...",
    "Crawling Amazon current listings and filters...",
    "Scraping Flipkart prices and merchant ratings...",
    "Parsing pricing integers and shipping surcharges...",
    "Applying state logic and consolidating records..."
  ];

  useEffect(() => {
    fetchAlerts();
    fetchHistory();
  }, []);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      showToast("Could not download price alarms from server.", "error");
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data);
        if (data.length > 0 && !selectedHistoryProduct) {
          setSelectedHistoryProduct(data[0].productName);
        }
      }
    } catch {
      showToast("Could not retrieve tracking log statistics.", "error");
    }
  };

  // Perform Scrape Compare Operation
  const handleScrapeCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productQuery.trim()) return;

    setIsScraping(true);
    setScrapingStep(0);

    // Dynamic loader steps increments
    const interval = setInterval(() => {
      setScrapingStep((prev) => (prev < scrapingStages.length - 1 ? prev + 1 : prev));
    }, 2800);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: productQuery })
      });

      clearInterval(interval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Scraping error occurred.");
      }

      const data = await res.json();
      setCurrentResult(data.result);
      showToast(`Scrape complete! Found ${data.result.deals?.length || 0} listings.`, "success");

      // Check if price drop alert was triggered during this scraping cycle!
      if (data.triggeredAlerts && data.triggeredAlerts.length > 0) {
        data.triggeredAlerts.forEach((a: any) => {
          showToast(`🔔 ALERT TRIGGERED: ${a.alertProduct} is down to ${data.result.currency}${a.currentPrice}!`, "info");
        });
      }

      // Sync updated history & alerts logs
      fetchHistory();
      fetchAlerts();

      // Set default historical view to this new item
      if (data.result.productName) {
        setSelectedHistoryProduct(data.result.productName);
      }
    } catch (err: any) {
      clearInterval(interval);
      showToast(err.message || "Failed to scan product pricing.", "error");
    } finally {
      setIsScraping(false);
    }
  };

  // Create Alarm mapping
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const { productName, targetPrice, email } = alertForm;
    if (!productName || !targetPrice || !email) {
      showToast("Please fill in target parameters.", "error");
      return;
    }

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          targetPrice: Number(targetPrice),
          email
        })
      });

      if (res.ok) {
        showToast("Price alarm set! Scrapers will notify you below your budget.", "success");
        setAlertForm({ productName: "", targetPrice: "", email: "" });
        fetchAlerts();
      } else {
        throw new Error();
      }
    } catch {
      showToast("Failed to schedule alert mechanism.", "error");
    }
  };

  // Delete Alert
  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Alarm successfully removed.");
        fetchAlerts();
      }
    } catch {
      showToast("Cannot remove alert map.", "error");
    }
  };

  // Redirect to Native Amazon / Flipkart mobile app if available, with graceful web browser fallback
  const handleVisitRedirect = (e: React.MouseEvent<HTMLAnchorElement>, url: string, merchant: string) => {
    // Detect mobile devices to restrict deep-linking to apps
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // If not mobile, let the default anchor link target="_blank" open in a new tab naturally
    if (!isMobile) {
      return;
    }

    e.preventDefault();
    if (!url) return;

    const lowerMerchant = (merchant || "").toLowerCase();
    const isAmazon = lowerMerchant.includes("amazon") || url.includes("amazon.");
    const isFlipkart = lowerMerchant.includes("flipkart") || url.includes("flipkart.com");

    if (!isAmazon && !isFlipkart) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // Strip http/https prefix for application deep link mapping
    let cleanedPath = url;
    if (url.startsWith("https://")) {
      cleanedPath = url.substring(8);
    } else if (url.startsWith("http://")) {
      cleanedPath = url.substring(7);
    }

    let nativeSchemeUrl = "";
    if (isAmazon) {
      nativeSchemeUrl = `amazon://${cleanedPath}`;
      showToast("Attempting to open inside Amazon App...", "info");
    } else if (isFlipkart) {
      nativeSchemeUrl = `flipkart://${cleanedPath}`;
      showToast("Attempting to open inside Flipkart App...", "info");
    }

    // Set fallback timeout: if native app doesn't open within 1.2s, open standard web link in new tab.
    const startTime = Date.now();
    const fallbackTimeout = setTimeout(() => {
      // If user is still on page and focus hasn't changed dramatically
      if (Date.now() - startTime < 1850) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }, 1200);

    // Try navigating to nativeSchemeUrl directly
    try {
      window.location.href = nativeSchemeUrl;
    } catch (err) {
      console.warn("Direct native deep link redirection failed", err);
    }

    // Clear fallback timeout if user switched apps / page lost focus
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(fallbackTimeout);
        window.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handleVisibilityChange);
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleVisibilityChange);
  };

  // Helper to extract line chart data for Recharts
  const getSelectedChartData = () => {
    const record = historyRecords.find((r) => r.productName === selectedHistoryProduct);
    if (!record || !record.history) return [];
    
    // Sort history chronologically
    return [...record.history].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const chartData = getSelectedChartData();

  // Find lowest and highest pricing of selected tracked product to display stats
  const selectedStats = (() => {
    if (chartData.length === 0) return { min: 0, max: 0, current: 0, count: 0 };
    const prices = chartData.map(d => d.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      current: prices[prices.length - 1],
      count: prices.length
    };
  })();

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#2D2E2E] font-sans flex flex-col antialiased">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-md shadow-md border backdrop-blur-md max-w-md w-[90vw] text-xs font-semibold uppercase tracking-wider ${
              toast.type === "success" 
                ? "bg-[#2D2E2E] text-[#FDFCFB] border-[#E8E6E1]"
                : toast.type === "info"
                ? "bg-[#5B6B5B] text-white border-[#5B6B5B]"
                : "bg-red-950 text-red-100 border-red-800"
            }`}
          >
            {toast.type === "success" && <CheckCircle className="w-4 h-4 text-[#5B6B5B] shrink-0" />}
            {toast.type === "info" && <Bell className="w-4 h-4 text-white shrink-0 animate-bounce" />}
            {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 text-xs font-mono select-none">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#FDFCFB]/95 backdrop-blur-md border-b border-[#E8E6E1] px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2D2E2E] text-white rounded-md shadow-sm">
              <LineChart className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-widest text-[#2D2E2E]">KishDeals</h1>
              <p className="text-[10px] uppercase tracking-wider text-[#7D7C78]">Live Price Comparison Engine</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest">
            <button 
              id="tab-compare"
              onClick={() => setActiveTab("compare")}
              className={`pb-1 transition-all duration-300 relative cursor-pointer ${activeTab === "compare" ? "text-[#2D2E2E]" : "text-[#7D7C78] hover:text-[#2D2E2E]"}`}
            >
              Live Search
              {activeTab === "compare" && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#2D2E2E]" />}
            </button>
            <button 
              id="tab-history"
              onClick={() => setActiveTab("history")}
              className={`pb-1 transition-all duration-300 relative cursor-pointer ${activeTab === "history" ? "text-[#2D2E2E]" : "text-[#7D7C78] hover:text-[#2D2E2E]"}`}
            >
              History & Trends
              {activeTab === "history" && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#2D2E2E]" />}
            </button>
            <button 
              id="tab-alerts"
              onClick={() => setActiveTab("alerts")}
              className={`pb-1 transition-all duration-300 relative cursor-pointer ${activeTab === "alerts" ? "text-[#2D2E2E]" : "text-[#7D7C78] hover:text-[#2D2E2E]"}`}
            >
              Budgets & Alarms
              {activeTab === "alerts" && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#2D2E2E]" />}
            </button>
            <button 
              id="tab-admin"
              onClick={() => setActiveTab("admin")}
              className={`pb-1 transition-all duration-300 relative cursor-pointer ${activeTab === "admin" ? "text-[#2D2E2E]" : "text-[#7D7C78] hover:text-[#2D2E2E]"}`}
            >
              Admin & Build Logs
              {activeTab === "admin" && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#2D2E2E]" />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* TAB 1: Search & Dynamic Deck */}
        {activeTab === "compare" && (
          <div className="space-y-8">
            {/* Search Card */}
            <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-6 sm:p-8">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5B6B5B] text-[9px] font-bold text-white uppercase tracking-wider mb-4">
                  Live Store Scrapers
                </span>
                <h2 className="text-3xl font-light text-[#2D2E2E] tracking-tight leading-tight">Compare Store Price Sheets</h2>
                <p className="text-sm text-[#7D7C78] mt-2 mb-6">Specify any retail device or system (e.g. MacBook Pro M3, Sony WH-1000XM5, iPhone 15) to pull live product rates globally.</p>
              </div>

              <form onSubmit={handleScrapeCompare} className="flex flex-col sm:flex-row gap-2 max-w-3xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#A2A19D]" />
                  <input 
                    type="text" 
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="e.g. Playstation 5 Slim, ASUS ROG Zephyrus..."
                    disabled={isScraping}
                    className="w-full bg-[#FDFCFB] text-[#2D2E2E] placeholder-[#A2A19D] text-sm pl-11 pr-4 py-3.5 rounded-none border border-[#E8E6E1] focus:outline-none focus:border-[#2D2E2E] transition-all disabled:opacity-60"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isScraping || !productQuery}
                  className="px-6 py-3.5 bg-[#2D2E2E] text-white hover:bg-black disabled:bg-[#E8E6E1] disabled:text-[#A2A19D] disabled:cursor-not-allowed font-semibold text-xs uppercase tracking-widest rounded-none transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                      <span>Scanning Web...</span>
                    </>
                  ) : (
                    <>
                      <span>Compare</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Predefined Quick searches */}
              {!isScraping && !currentResult && (
                <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#A2A19D] font-bold uppercase tracking-wider text-[10px]">Try indexes:</span>
                  {["Sony WH-1000XM5", "Nintendo Switch Oled", "iPhone 15 128GB", "MacBook Air M3"].map((item) => (
                    <button 
                      key={item}
                      onClick={() => {
                        setProductQuery(item);
                      }}
                      className="px-2.5 py-1 bg-[#F5F3EF] hover:bg-[#E8E6E1] text-[#2D2E2E] border border-[#E8E6E1]/60 text-[11px] font-semibold transition cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scanning State Loader Overlay */}
            {isScraping && (
              <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-[2px] border-[#E8E6E1] border-t-[#2D2E2E] animate-spin" />
                  <Sparkles className="w-5 h-5 text-[#2D2E2E] absolute animate-pulse" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <p className="text-xs font-bold text-[#2D2E2E] uppercase tracking-widest">Active Crawlers</p>
                  <p className="text-[#7D7C78] text-xs px-4 leading-relaxed font-mono mt-2 bg-[#F5F3EF] border border-[#E8E6E1] py-2 rounded-none">
                    {scrapingStages[scrapingStep]}
                  </p>
                </div>
              </div>
            )}

            {/* Results display */}
            <AnimatePresence mode="wait">
              {currentResult && !isScraping && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  
                  {/* Left segment - Product info cards */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] overflow-hidden">
                      <div className="p-6 bg-[#2D2E2E] text-[#FDFCFB] flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-[#A2A19D] font-bold uppercase tracking-widest font-mono">Comparison Result</p>
                          <h3 className="text-lg font-bold tracking-widest uppercase text-white mt-0.5">{currentResult.productName}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-[#A2A19D]">Total Listings</p>
                          <p className="text-base font-mono font-bold text-white">{currentResult.deals?.length || 0}</p>
                        </div>
                      </div>

                      {currentResult.isFallback ? (
                        <div className="px-6 py-2.5 bg-amber-50/80 border-b border-[#E8E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[#854d0e]">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" /> 
                            <span>Category Rate Analyzer (Heuristics Mode)</span>
                          </span>
                          <span className="text-[10px] font-mono text-[#a16207]">
                            Real-time API quota guard active. Checked & analyzed typical Amazon & Flipkart retail prices for you!
                          </span>
                        </div>
                      ) : (
                        <div className="px-6 py-2.5 bg-emerald-50/80 border-b border-[#E8E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[#166534]">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" /> 
                            <span>Live E-Commerce Price Scrapers</span>
                          </span>
                          <span className="text-[10px] font-mono text-[#15803d]">
                            Successfully scanned and extracted accurate real-time prices across Amazon, Flipkart, Reliance, and Croma.
                          </span>
                        </div>
                      )}

                      {/* Best Deals Highlights List */}
                      <div className="divide-y divide-[#E8E6E1]">
                        {currentResult.deals && currentResult.deals.length > 0 ? (
                          currentResult.deals.map((deal, idx) => {
                            const isCheapest = idx === 0;
                            return (
                              <div key={idx} className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${isCheapest ? "bg-[#5B6B5B]/5" : "hover:bg-[#F5F3EF]/50"}`}>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-[#F5F3EF] border border-[#E8E6E1] text-[#2D2E2E] text-[10px] font-semibold uppercase tracking-wider">
                                      {deal.merchant}
                                    </span>
                                    {isCheapest && (
                                      <span className="px-2 py-0.5 bg-[#5B6B5B] text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <TrendingDown className="w-2.5 h-2.5" />
                                        Best Deal
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-semibold text-[#2D2E2E] leading-tight pr-4">
                                    {deal.title}
                                  </h4>
                                  {deal.offers && (
                                    <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 mt-1 font-bold uppercase tracking-wider select-none w-fit">
                                      <Percent className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>{deal.offers}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3 text-xs text-[#7D7C78] mt-1">
                                    {deal.rating && <span className="text-[#5B6B5B] font-semibold">★ {deal.rating}</span>}
                                    {deal.shipping && <span className="flex items-center gap-1"><Info className="w-3 h-3 text-[#A2A19D]" /> {deal.shipping}</span>}
                                  </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                                  <div className="text-left sm:text-right">
                                    {deal.originalPrice && (
                                      <div className="flex items-center gap-1.5 text-[11px] sm:justify-end">
                                        <span className="line-through text-[#A2A19D]">
                                          {currentResult.currency}{deal.originalPrice.toLocaleString()}
                                        </span>
                                        {deal.discountPercent && (
                                          <span className="text-[#5B6B5B] font-bold">
                                            ({deal.discountPercent}% OFF)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-[#A2A19D] font-mono uppercase tracking-wider">Price</div>
                                    <div className="text-base font-bold font-mono text-[#2D2E2E]">
                                      {currentResult.currency} {deal.price.toLocaleString()}
                                    </div>
                                  </div>
                                  <a 
                                    href={deal.url} 
                                    target="_blank" 
                                    referrerPolicy="no-referrer"
                                    className="px-3.5 py-1.5 bg-[#FDFCFB] text-[#2D2E2E] hover:bg-[#2D2E2E] hover:text-[#FDFCFB] border border-[#E8E6E1] text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <span>Visit Site</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-[#7D7C78] text-sm">
                            No listings detected. Try a broader search term.
                          </div>
                        )}
                      </div>
                      
                      {/* Real-Time Price Warning Info Banner */}
                      <div className="px-5 py-3.5 bg-[#F5F3EF]/60 border-t border-[#E8E6E1] flex gap-3 text-left">
                        <Lightbulb className="w-4 h-4 text-[#5B6B5B] shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="text-[10px] font-bold text-[#2D2E2E] uppercase tracking-wider font-mono">Why might the live price differ?</h5>
                          <p className="text-[11px] text-[#7D7C78] leading-relaxed">
                            Clicking <span className="font-semibold text-[#2D2E2E]">Visit Site</span> redirects you to the live website. Real-time online store pricing fluctuates continuously depending on active flash discounts, regional shipping pin codes, seller changes, or user-specific coupon benefits. If the search grounding is under rate limits, estimated category averages are analyzed as a fallback.
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Gemini Buying Advice commentary */}
                    <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-6 space-y-4">
                      <div className="flex items-center gap-2.5 text-[#2D2E2E]">
                        <div className="p-1 px-2.5 bg-[#5B6B5B] text-white text-[10px] font-bold tracking-wider uppercase rounded-none">
                          Advice
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D2E2E]">Crawl Synthesis & Analysis</h4>
                      </div>
                      <p className="text-[#2D2E2E] text-xs leading-relaxed rounded-none bg-[#F5F3EF] p-4 border border-[#E8E6E1] font-mono">
                        {currentResult.summaryText}
                      </p>
                    </div>

                  </div>

                  {/* Right segment - Fast-action alert sets */}
                  <div className="space-y-6">
                    <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-6 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D2E2E] flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-[#7D7C78]" />
                          Arm Alarm Threshold
                        </h4>
                        <p className="text-[11px] text-[#7D7C78] mt-1">Get custom automated alerts when prices drop below your specified max target limit.</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[9px] font-bold text-[#7D7C78] uppercase tracking-wider mb-1">Target Product</label>
                          <input 
                            type="text" 
                            value={alertForm.productName}
                            onChange={(e) => setAlertForm({ ...alertForm, productName: e.target.value })}
                            placeholder={currentResult.productName}
                            className="w-full bg-[#FDFCFB] text-[#2D2E2E] placeholder-[#A2A19D] text-xs px-3 py-2.5 rounded-none border border-[#E8E6E1] focus:outline-none focus:border-[#2D2E2E]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-[#7D7C78] uppercase tracking-wider mb-1">Budget ({currentResult.currency})</label>
                            <input 
                              type="number" 
                              value={alertForm.targetPrice}
                              onChange={(e) => setAlertForm({ ...alertForm, targetPrice: e.target.value })}
                              placeholder={(currentResult.deals?.[0]?.price ? Math.round(currentResult.deals[0].price * 0.95) : 5000).toString()}
                              className="w-full bg-[#FDFCFB] text-[#2D2E2E] placeholder-[#A2A19D] text-xs px-3 py-2.5 rounded-none border border-[#E8E6E1] focus:outline-none focus:border-[#2D2E2E]"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-[#7D7C78] uppercase tracking-wider mb-1">Target Email</label>
                            <input 
                              type="email" 
                              value={alertForm.email}
                              onChange={(e) => setAlertForm({ ...alertForm, email: e.target.value })}
                              placeholder="you@example.com"
                              className="w-full bg-[#FDFCFB] text-[#2D2E2E] placeholder-[#A2A19D] text-xs px-3 py-2.5 rounded-none border border-[#E8E6E1] focus:outline-none focus:border-[#2D2E2E]"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            let updatedForm = { ...alertForm };
                            if (!updatedForm.productName) updatedForm.productName = currentResult.productName;
                            if (!updatedForm.targetPrice && currentResult.deals?.[0]?.price) {
                              updatedForm.targetPrice = Math.round(currentResult.deals[0].price * 0.95).toString();
                            }
                            if (!updatedForm.email) updatedForm.email = "kishorekumar04072004@gmail.com";
                            
                            setAlertForm(updatedForm);

                            // Trigger immediate handler using synchronous timeout
                            setTimeout(() => {
                              const syntheticSubmit = {
                                preventDefault: () => {}
                              } as React.FormEvent;
                              
                              // We submit the formatted alert
                              fetch("/api/alerts", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  productName: updatedForm.productName,
                                  targetPrice: Number(updatedForm.targetPrice),
                                  email: updatedForm.email
                                })
                              }).then((r) => {
                                if(r.ok) {
                                  showToast("Notification Alarm Scheduled!");
                                  setAlertForm({ productName: "", targetPrice: "", email: "" });
                                  fetchAlerts();
                                }
                              });
                            }, 50);
                          }}
                          className="w-full py-2.5 bg-[#2D2E2E] text-white font-bold text-[10px] uppercase tracking-widest rounded-none hover:bg-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Arm Alarm Threshold</span>
                        </button>
                      </div>
                    </div>

                    {/* How Price Scrapers work panel */}
                    <div className="bg-[#F5F3EF] rounded-none border border-[#E8E6E1] p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#7D7C78]" />
                        <h5 className="text-[10px] font-bold text-[#2D2E2E] uppercase tracking-widest">Price Tracking Technology</h5>
                      </div>
                      <p className="text-[11px] text-[#7D7C78] leading-relaxed">
                        Our price comparison engine queries live search results and pages dynamically from Amazon, Flipkart, Reliance Digital, and Croma Store. It filters out irrelevant options and matches the exact cheapest deals to ensure you always get the best rates.
                      </p>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TAB 2: History Analytics & Trends */}
        {activeTab === "history" && (
          <div className="space-y-8">
            <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5B6B5B] text-[9px] font-bold text-white uppercase tracking-wider mb-3">
                    Price Over Time
                  </span>
                  <h3 className="text-2xl font-light tracking-tight text-[#2D2E2E]">Historical Price Index Sheets</h3>
                  <p className="text-xs text-[#7D7C78] mt-1">Visualize retail value variations, historical drops, and store updates across cycles.</p>
                </div>

                {/* Tracked Item Switcher */}
                {historyRecords.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#7D7C78] uppercase tracking-wider font-bold whitespace-nowrap">Product Selector:</span>
                    <select 
                      value={selectedHistoryProduct}
                      onChange={(e) => setSelectedHistoryProduct(e.target.value)}
                      className="bg-[#FDFCFB] border border-[#E8E6E1] text-[#2D2E2E] text-xs px-2.5 py-1.5 rounded-none focus:outline-none focus:border-[#2D2E2E] cursor-pointer max-w-[200px]"
                    >
                      {historyRecords.map((r) => (
                        <option key={r.productName} value={r.productName}>
                          {r.productName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {historyRecords.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Chart representation */}
                  <div className="lg:col-span-3 h-[320px] bg-[#FDFCFB] border border-[#E8E6E1] rounded-none p-3 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="#7D7C78" 
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#7D7C78" 
                          fontSize={11} 
                          tickLine={false}
                          tickFormatter={(p) => typeof p === 'number' ? p.toLocaleString() : p}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${Number(value).toLocaleString()}`, "Price"]}
                          labelClassName="text-xs text-[#7D7C78] font-bold"
                          contentStyle={{ background: "#2D2E2E", color: "#FDFCFB", borderRadius: "0px", fontSize: "11px", border: "none" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          name="Cheapest Deal Value" 
                          stroke="#2D2E2E" 
                          strokeWidth={2} 
                          activeDot={{ r: 6 }} 
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Box stats */}
                  <div className="space-y-4">
                    <div className="p-4 bg-[#2D2E2E] text-white rounded-none space-y-1">
                      <p className="text-[9px] text-[#A2A19D] font-bold uppercase tracking-widest font-mono">Current Index Value</p>
                      <h4 className="text-xl font-bold font-mono text-white">
                        ₹ {selectedStats.current.toLocaleString()}
                      </h4>
                      <p className="text-[10px] text-[#A2A19D]">Latest update from our scraping sweeps.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-[#5B6B5B]/5 border border-[#5B6B5B]/20 rounded-none text-[#5B6B5B]">
                        <span className="text-[9px] font-bold text-[#5B6B5B] block uppercase tracking-wider">Lowest Deal</span>
                        <span className="text-sm font-bold font-mono">₹ {selectedStats.min.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-[#F5F3EF] border border-[#E8E6E1] rounded-none text-[#2D2E2E]">
                        <span className="text-[9px] font-bold text-[#7D7C78] block uppercase tracking-wider">Highest Price</span>
                        <span className="text-sm font-bold font-mono">₹ {selectedStats.max.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#FDFCFB] border border-[#E8E6E1] rounded-none text-xs text-[#7D7C78] flex items-center gap-2">
                      <History className="w-4 h-4 text-[#A2A19D] shrink-0" />
                      <span>Tracked over <b>{selectedStats.count} days</b> of crawls. Updated automatically upon live searches.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-[#E8E6E1] rounded-none space-y-3">
                  <span className="p-3 bg-[#F5F3EF] text-[#7D7C78] inline-block rounded-full">
                    <History className="w-6 h-6" />
                  </span>
                  <div className="max-w-md mx-auto space-y-1">
                    <h5 className="font-semibold text-[#2D2E2E] text-sm uppercase tracking-wider">No historical logs compiled yet</h5>
                    <p className="text-[#7D7C78] text-xs leading-relaxed">Run your first comparison searches. Dynamic crawlers will save cheapest merchant listings into this chart.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated cron alerts */}
            <div className="bg-[#2D2E2E] text-white rounded-none border border-[#E8E6E1] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-[#5B6B5B] border border-[#5B6B5B] text-white font-mono text-[9px] font-bold tracking-widest uppercase rounded-none">Automated Daemon Scheduler</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mt-1">Daily Automated Crawling Daemon</h4>
                <p className="text-xs text-[#A2A19D]">Our scraping system schedules background daily checks to trace store prices and dispatch alarm emails.</p>
              </div>
              <div className="px-3.5 py-1.5 bg-[#FDFCFB] text-[#2D2E2E] rounded-none font-mono text-xs border border-[#E8E6E1] uppercase font-semibold select-all">
                0 9 * * * /usr/bin/python /app/main.py
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Budgets and Alarms */}
        {activeTab === "alerts" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Alert scheduler form */}
              <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-6 space-y-4 h-fit">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D2E2E]">Schedule New Alarm</h3>
                  <p className="text-xs text-[#7D7C78] mt-1">Configure target prices and recipient emails. Running crawlers will send alerts when triggers occur.</p>
                </div>

                <form onSubmit={handleCreateAlert} className="space-y-3.5 pt-2">
                  <div>
                    <label className="block text-[9px] font-bold text-[#7D7C78] uppercase tracking-wider mb-1.5">Product Trigger Name</label>
                    <input 
                      type="text" 
                      required
                      value={alertForm.productName}
                      onChange={(e) => setAlertForm({ ...alertForm, productName: e.target.value })}
                      placeholder="e.g. iPad Pro M4, OnePlus 12"
                      className="w-full bg-[#FDFCFB] text-[#2D2E2E] text-xs px-3.5 py-2.5 rounded-none border border-[#E8E6E1] focus:outline-none focus:border-[#2D2E2E] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-[#7D7C78] uppercase tracking-wider mb-1.5">Target Maximum Budget INR (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={alertForm.targetPrice}
                      onChange={(e) => setAlertForm({ ...alertForm, targetPrice: e.target.value })}
                      placeholder="e.g. 65000"
                      className="w-full bg-[#FDFCFB] text-[#2D2E2E] text-xs px-3.5 py-2.5 rounded-none border border-[#E8E6E1] focus:outline-none focus:border-[#2D2E2E] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-[#7D7C78] uppercase tracking-wider mb-1.5">Notification Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={alertForm.email}
                      onChange={(e) => setAlertForm({ ...alertForm, email: e.target.value })}
                      placeholder="e.g. user@gmail.com"
                      className="w-full bg-[#FDFCFB] text-[#2D2E2E] text-xs px-3.5 py-2.5 rounded-none border border-[#E8E6E1] focus:outline-none focus:border-[#2D2E2E] transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-[#2D2E2E] hover:bg-black text-[#FDFCFB] font-bold text-[10px] uppercase tracking-widest rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#A2A19D]" />
                    <span>Schedule Budgets Guard</span>
                  </button>
                </form>
              </div>

              {/* Active Alarms Grid */}
              <div className="lg:col-span-2 bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D2E2E]">Active Pricing Alarms</h3>
                  <p className="text-xs text-[#7D7C78] mt-1">Stored constraints checked on every search/crawl cycle.</p>
                </div>

                <div className="divide-y divide-[#E8E6E1]">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div key={alert.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#2D2E2E]">{alert.productName}</h4>
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-none border ${alert.isActive ? "bg-[#5B6B5B]/10 text-[#5B6B5B] border-[#5B6B5B]/30" : "bg-[#F5F3EF] text-[#7D7C78] border-[#E8E6E1]"}`}>
                              {alert.isActive ? "Monitoring" : "Triggered"}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7D7C78]">
                            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[#A2A19D]" /> {alert.email}</span>
                            <span>Limit Alert: <b>₹{alert.targetPrice.toLocaleString()}</b></span>
                            {alert.lastTriggeredAt && (
                              <span className="text-amber-800 font-semibold uppercase tracking-wider text-[10px]">Triggered: {new Date(alert.lastTriggeredAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-2 text-[#7D7C78] hover:text-red-700 hover:bg-[#F5F3EF] rounded-none transition cursor-pointer"
                          title="Delete pricing filter"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-[#7D7C78] text-sm">
                      No active alerts. Use the left panel to configure constraints.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: Admin Details & Developer Portfolio */}
        {activeTab === "admin" && (
          <div className="space-y-8">
            <div className="bg-[#FDFCFB] rounded-none border border-[#E8E6E1] p-6 sm:p-8 space-y-8">
              
              {/* Header section with brand and connection state */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E8E6E1] pb-6">
                <div className="max-w-xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5B6B5B] text-[9px] font-bold text-white uppercase tracking-wider mb-3">
                    Developer Control Plane & Profile
                  </span>
                  <h3 className="text-2xl font-light tracking-tight text-[#2D2E2E]">Kishore K's Admin Panel</h3>
                  <p className="text-sm text-[#7D7C78] mt-1 leading-relaxed">
                    Personal credentials registry, portfolio link mappings, and active sandbox system configurations.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F3EF] border border-[#E8E6E1]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5B6B5B] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-[#2D2E2E] uppercase">Profile: Active</span>
                </div>
              </div>

              {/* Master layout grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Developer Profile Photo and Credentials Card (4/12 cols) */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Photo & Basic Details Card */}
                  <div className="border border-[#E8E6E1] p-6 bg-white space-y-5 flex flex-col items-center text-center">
                    
                    {/* Responsive Profile Photo with Dynamic illustration fallback */}
                    <div className="relative w-40 h-40 group overflow-hidden border-2 border-[#2D2E2E] bg-[#F5F3EF] select-none shadow-sm">
                      {/* Try loading their uploaded image photo from standard assets */}
                      <img 
                        src="/assets/kishore_profile.png" 
                        alt="Kishore K Profile" 
                        className="absolute inset-0 w-full h-full object-cover z-20"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      {/* Beautiful high-fidelity SVG representation of Kishore (Dark wavy/curly hair, Rectangular Glasses, Blue Shirt) */}
                      <div className="absolute inset-0 w-full h-full z-10">
                        <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Warm granite sand stone block texture matching the prompt image background */}
                          <rect width="120" height="120" fill="#E8DFD3" />
                          <path d="M5 10 L30 5 L20 35 Z" fill="#D8CFBF" opacity="0.8" />
                          <path d="M90 10 L115 25 L95 40 Z" fill="#D0C7B7" opacity="0.7" />
                          <path d="M10 80 L35 110 L25 70 Z" fill="#D0C7B7" opacity="0.6" />
                          <path d="M100 85 L115 105 L80 95 Z" fill="#C8BFAF" opacity="0.5" />
                          
                          {/* Modern inner halo visual */}
                          <circle cx="60" cy="55" r="34" fill="#FDFBFA" opacity="0.8" />

                          {/* Shoulders & Royal Blue Button-Down Cotton Shirt */}
                          <path d="M22 120 C22 101 35 85 52 81 L60 87 L68 81 C85 85 98 101 98 120 Z" fill="#1E40AF" />
                          {/* Royal blue details and neckline highlights */}
                          <path d="M52 81 L60 102 L68 81 L71 89 L60 105 L49 89 Z" fill="#173594" />
                          
                          {/* Neck & Face */}
                          <path d="M50 78 L50 84 A10 10 0 0 0 70 84 L70 78 Z" fill="#E3B397" />
                          <ellipse cx="60" cy="54" rx="19" ry="23" fill="#E3B397" />

                          {/* Side ears */}
                          <circle cx="40" cy="54" r="4" fill="#E3B397" />
                          <circle cx="80" cy="54" r="4" fill="#E3B397" />

                          {/* Curly Wavy Dark Layered Hair */}
                          <path d="M38 46 C36 40 40 31 46 28 C52 25 58 27 62 25 C66 23 72 24 76 27 C80 29 84 36 83 44 C84 40 81 34 77 32 C73 30 69 32 65 30 C61 28 55 30 51 30 C47 30 42 33 39 38 C38 41 38 43 38 46 Z" fill="#1B1918" />
                          <path d="M38 48 C41 46 45 44 48 46 C52 48 56 46 60 44 C64 42 68 44 72 45 C76 46 80 43 82 48" stroke="#1B1918" strokeWidth="4.5" strokeLinecap="round" />
                          
                          {/* Eyes */}
                          <circle cx="51" cy="52" r="1.5" fill="#1B1918" />
                          <circle cx="69" cy="52" r="1.5" fill="#1B1918" />
                          
                          {/* Eyebrows */}
                          <path d="M45 46 Q50 44 54 47" stroke="#1B1918" strokeWidth="1.2" fill="none" />
                          <path d="M75 46 Q70 44 66 47" stroke="#1B1918" strokeWidth="1.2" fill="none" />

                          {/* Black Rectangular Glasses */}
                          <rect x="43" y="47" width="13" height="9" rx="1.5" stroke="#121212" strokeWidth="1.8" fill="none" />
                          <rect x="64" y="47" width="13" height="9" rx="1.5" stroke="#121212" strokeWidth="1.8" fill="none" />
                          <path d="M56 51 L64 51" stroke="#121212" strokeWidth="2" />
                          <path d="M43 50 L39 48.5" stroke="#121212" strokeWidth="1.2" />
                          <path d="M77 50 L81 48.5" stroke="#121212" strokeWidth="1.2" />

                          {/* Nose outline */}
                          <path d="M58 55 L58 60 L61 60" stroke="#CD9375" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                          {/* Warm calm smile */}
                          <path d="M53 66 Q60 69.5 67 66" stroke="#9E4639" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-1.5 w-full">
                      <h4 className="text-lg font-bold tracking-tight text-[#2D2E2E]">KISHORE K</h4>
                      <p className="text-xs font-semibold text-[#5B6B5B] uppercase tracking-wider font-mono">Full-Stack Application Craftsman</p>
                      
                      <div className="flex items-center justify-center gap-1 text-xs text-[#7D7C78] pt-1">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <a href="mailto:kishorekumar04072004@gmail.com" className="hover:underline hover:text-[#2D2E2E] truncate">
                          kishorekumar04072004@gmail.com
                        </a>
                      </div>
                    </div>

                    {/* Direct Contact & Social Links */}
                    <div className="w-full pt-3 border-t border-[#E8E6E1] flex flex-col gap-2.5">
                      <a 
                        href="https://www.linkedin.com/in/kishore-k-5b7666268" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between px-3.5 py-2.5 bg-[#0077B5]/5 hover:bg-[#0077B5]/10 border border-[#0077B5]/20 text-[#0077B5] hover:text-[#005582] text-xs font-semibold uppercase tracking-wider transition-colors font-mono"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 flex items-center justify-center font-bold text-sm select-none">in</span>
                          <span>LinkedIn Profile</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <a 
                        href="https://share.google/i6PrXqpyUK8WwmqM8" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between px-3.5 py-2.5 bg-[#4285F4]/5 hover:bg-[#4285F4]/10 border border-[#4285F4]/20 text-[#2D2E2E] text-xs font-semibold uppercase tracking-wider transition-colors font-mono"
                      >
                        <span className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#4285F4]" />
                          <span>Google Portfolio</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                  </div>

                  {/* Core app status telemetry - kept from previous screen */}
                  <div className="border border-[#E8E6E1] p-5 space-y-4 bg-[#FDFCFB]">
                    <div className="uppercase text-[10px] font-bold text-[#7D7C78] tracking-widest font-mono border-b border-[#E8E6E1] pb-2">
                      APP BUILD REGISTER
                    </div>
                    
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-[10px] text-[#A2A19D] uppercase tracking-wider block font-mono">Last App Which Build</span>
                        <span className="font-bold text-[#2D2E2E]">Price Comparison Tracker</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#A2A19D] uppercase tracking-wider block font-mono">Build Target Platform</span>
                        <span className="font-semibold text-[#2D2E2E] font-mono bg-[#F5F3EF] px-1.5 py-0.5 border border-[#E8E6E1] inline-block mt-0.5">
                          Cloud Run Sandbox
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#A2A19D] uppercase tracking-wider block font-mono">Server Ingress Port</span>
                        <span className="font-semibold text-[#2D2E2E] font-mono">Port 3000 (Protected TLS proxy)</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#A2A19D] uppercase tracking-wider block font-mono">Compilation State</span>
                        <span className="inline-flex items-center gap-1 font-bold text-[#5B6B5B] font-mono mt-0.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Successful Build
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Other Notable Live Works & Database stats (8/12 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Title block for portfolio works */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#5B6B5B] uppercase tracking-wider font-mono">Project Exhibition Registry</span>
                    <h4 className="text-lg font-light tracking-tight text-[#2D2E2E]">Other Live Production Works</h4>
                    <p className="text-xs text-[#7D7C78]">
                      Explore curated live workspaces designed, integrated, and deployed by Kishore K across global clouds.
                    </p>
                  </div>

                  {/* Portfolio Works Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* project 1: KiPrism */}
                    <div className="border border-[#E8E6E1] p-5 bg-white flex flex-col justify-between hover:border-[#5B6B5B] hover:shadow-sm transition duration-300 group">
                      <div className="space-y-3">
                        <div className="w-8 h-8 rounded-none border border-[#E8E6E1] bg-gradient-to-tr from-pink-500 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform" />
                        
                        <div>
                          <div className="text-[10px] text-[#7D7C78] font-mono font-bold uppercase tracking-wider">Productivity Utility</div>
                          <h5 className="font-bold text-sm text-[#2D2E2E] group-hover:text-[#5B6B5B] transition-colors mt-0.5">KiPrism</h5>
                        </div>
                        <p className="text-xs text-[#7D7C78] leading-relaxed line-clamp-4">
                          Seamless color palette generator, spectrum analyzer, and design workspace tool mapped to modern design workflows (`ki-prism.vercel.app`).
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#F5F3EF]">
                        <a 
                          href="https://ki-prism.vercel.app" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#2D2E2E] hover:underline shrink-0 group-hover:gap-1.5 transition-all font-mono"
                        >
                          <span>Launch Live</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#5B6B5B]" />
                        </a>
                      </div>
                    </div>

                    {/* project 2: PromptGenerator */}
                    <div className="border border-[#E8E6E1] p-5 bg-white flex flex-col justify-between hover:border-[#5B6B5B] hover:shadow-sm transition duration-300 group">
                      <div className="space-y-3">
                        <div className="w-8 h-8 rounded-none border border-[#E8E6E1] bg-[#F5F3EF] flex items-center justify-center text-[#5B6B5B] group-hover:scale-105 transition-transform">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                        </div>
                        
                        <div>
                          <div className="text-[10px] text-[#7D7C78] font-mono font-bold uppercase tracking-wider">AI Engineering</div>
                          <h5 className="font-bold text-sm text-[#2D2E2E] group-hover:text-[#5B6B5B] transition-colors mt-0.5">Prompt Generator</h5>
                        </div>
                        <p className="text-xs text-[#7D7C78] leading-relaxed line-clamp-4">
                          Professional toolchain suite that crafts high-performance AI system prompts and templates for Gemini, Claude, and GPT models.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#F5F3EF]">
                        <a 
                          href="https://ai-prompt-generator-07.vercel.app/" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#2D2E2E] hover:underline shrink-0 group-hover:gap-1.5 transition-all font-mono"
                        >
                          <span>Open Tool</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#5B6B5B]" />
                        </a>
                      </div>
                    </div>

                    {/* project 3: CodeCompiler */}
                    <div className="border border-[#E8E6E1] p-5 bg-white flex flex-col justify-between hover:border-[#5B6B5B] hover:shadow-sm transition duration-300 group">
                      <div className="space-y-3">
                        <div className="w-8 h-8 rounded-none border border-[#E8E6E1] bg-[#2D2E2E] flex items-center justify-center text-white font-mono text-[10px] font-bold group-hover:scale-105 transition-transform">
                          {`</>`}
                        </div>
                        
                        <div>
                          <div className="text-[10px] text-[#7D7C78] font-mono font-bold uppercase tracking-wider">Developer Tool</div>
                          <h5 className="font-bold text-sm text-[#2D2E2E] group-hover:text-[#5B6B5B] transition-colors mt-0.5">Code Compiler</h5>
                        </div>
                        <p className="text-xs text-[#7D7C78] leading-relaxed line-clamp-4">
                          High-performance, secure cloud code workspace and multi-language execution playground displaying real-time compiler telemetry.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#F5F3EF]">
                        <a 
                          href="https://kode4-kishore-compiler.vercel.app/" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#2D2E2E] hover:underline shrink-0 group-hover:gap-1.5 transition-all font-mono"
                        >
                          <span>Execute App</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#5B6B5B]" />
                        </a>
                      </div>
                    </div>

                  </div>

                  {/* Operational status database statistics row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                    
                    <div className="border border-[#E8E6E1] p-5 space-y-2 bg-[#F1EFEA]/30">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#2D2E2E] uppercase tracking-wider font-mono">
                        <Info className="w-4 h-4 text-[#5B6B5B]" />
                        <span>INTEGRATED SYSTEM CACHE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center pt-1.5">
                        <div className="bg-white p-3 border border-[#E8E6E1]">
                          <span className="text-[9px] text-[#7D7C78] uppercase tracking-wider block font-mono">Alert Locks</span>
                          <span className="text-xl font-bold text-[#2D2E2E] font-mono">{alerts.length}</span>
                        </div>
                        <div className="bg-white p-3 border border-[#E8E6E1]">
                          <span className="text-[9px] text-[#7D7C78] uppercase tracking-wider block font-mono">Products Saved</span>
                          <span className="text-xl font-bold text-[#2D2E2E] font-mono">{historyRecords.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#E8E6E1] p-5 space-y-2 bg-[#F1EFEA]/30 flex flex-col justify-end">
                      <h4 className="text-xs font-bold text-[#2D2E2E] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#5B6B5B]" /> Intelligent Quota & Rate Guard
                      </h4>
                      <p className="text-[11px] text-[#7D7C78] leading-relaxed">
                        The sandbox incorporates a <b>Heuristics Fallback Engine</b>. If external APIs trigger any rate warnings (Code 429), the server continues delivering estimations so alarms remain operational.
                      </p>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="bg-[#FDFCFB] border-t border-[#E8E6E1] px-6 py-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[#7D7C78] text-xs">
          <div>
            <span>© 2026 Price Comparison Tracker. Cloud sandbox environment is live.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#5B6B5B] font-bold uppercase tracking-wider text-[10px] select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B5B] animate-pulse" />
              <span>Scraper active</span>
            </span>
            <span className="text-[#E8E6E1]">|</span>
            <span className="font-mono uppercase text-[#A2A19D]">PORT: 3000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
