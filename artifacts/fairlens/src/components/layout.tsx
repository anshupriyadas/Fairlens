import { Link, useLocation } from "wouter";
import { useFairLensStore } from "@/lib/store";
import { useTheme } from "./theme-provider";
import { Moon, Sun, LayoutDashboard, UploadCloud, BarChart3, Search, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { dataset } = useFairLensStore();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/upload", label: "Data Ingestion", icon: UploadCloud },
    { href: "/metrics", label: "Bias Metrics", icon: BarChart3 },
    { href: "/archaeology", label: "Archaeology", icon: Search },
    { href: "/counterfactual", label: "Counterfactuals", icon: SlidersHorizontal },
    { href: "/risk", label: "Risk Report", icon: AlertTriangle },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
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
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  location === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
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
          <div className="text-sm font-medium text-muted-foreground">
            Contextual Bias Intelligence Platform
          </div>
          <div className="flex items-center gap-4">
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