import { Link, useLocation } from "wouter";
import { useFairLensStore } from "@/lib/store";
import { useTheme } from "./theme-provider";
import { Moon, Sun, LayoutDashboard, UploadCloud, BarChart3, Search, SlidersHorizontal, AlertTriangle, Activity, Wand2, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewMode } from "@/lib/types";
import { toast } from "sonner";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { dataset, alerts, viewMode, setViewMode, appliedMitigation, resetMitigation } = useFairLensStore();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/monitoring", label: "Live Monitor", icon: Activity },
    { href: "/upload", label: "Data Ingestion", icon: UploadCloud },
    { href: "/metrics", label: "Bias Metrics", icon: BarChart3 },
    { href: "/archaeology", label: "Archaeology", icon: Search },
    { href: "/counterfactual", label: "Counterfactuals", icon: SlidersHorizontal },
    { href: "/mitigation", label: "Mitigation", icon: Wand2 },
    { href: "/risk", label: "Risk Report", icon: AlertTriangle },
  ];
  
  const unseenAlerts = alerts.length;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary">
            <Search className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">FairLens</h1>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  location === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                {item.label === "Live Monitor" && unseenAlerts > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unseenAlerts}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Current Case</div>
          {dataset ? (
            <div>
              <div className="text-sm font-medium">Loan Approval Model v1.2</div>
              <div className="text-xs text-muted-foreground">{dataset.length} records loaded</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">No dataset loaded</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              Contextual Bias Intelligence Platform
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={viewMode} onValueChange={(val) => {
              setViewMode(val as ViewMode);
              if (val === "Technical") setLocation("/");
              else if (val === "Executive") setLocation("/executive");
              else if (val === "Legal") setLocation("/legal");
            }}>
              <TabsList className="h-9">
                <TabsTrigger value="Technical" data-testid="view-technical">Technical</TabsTrigger>
                <TabsTrigger value="Executive" data-testid="view-executive">Executive</TabsTrigger>
                <TabsTrigger value="Legal" data-testid="view-legal">Legal</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="btn-theme-toggle"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mitigation banner */}
        {appliedMitigation && (
          <div
            className="border-b border-primary/30 bg-primary/10 px-6 py-2 flex items-center justify-between gap-4 shrink-0"
            data-testid="banner-mitigation-applied"
          >
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-primary">Simulated:</span>
              <span className="text-foreground">{appliedMitigation.strategyLabel}</span>
              <span className="text-muted-foreground hidden md:inline">
                — all metrics, HPS, and risk views show post-mitigation values
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-7"
              onClick={() => {
                resetMitigation();
                toast.success("Restored original metrics");
              }}
              data-testid="btn-reset-mitigation-banner"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}