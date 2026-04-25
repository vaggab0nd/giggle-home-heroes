import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { MyProjects } from "@/components/customer/MyProjects";
import Navbar from "@/components/Navbar";

const PAGE_META: Record<string, { title: string; description: string }> = {
  dashboard: { title: "My Projects", description: "Track your active and completed home projects." },
};

function PageHeader() {
  const location = useLocation();
  const segment = location.pathname.replace(/\/$/, "").split("/").pop() ?? "dashboard";
  const meta = PAGE_META[segment] ?? PAGE_META["dashboard"];
  return (
    <header className="h-16 flex items-center gap-4 border-b border-border px-6 bg-card shrink-0">
      <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />
      <div className="h-5 w-px bg-border" />
      <div>
        <h1 className="text-base font-heading font-bold text-foreground leading-tight">{meta.title}</h1>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </div>
    </header>
  );
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!user) return;

    // Contractors get their own dashboard
    supabase
      .from("contractors" as any)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: contractorData }) => {
        if (contractorData) {
          navigate("/contractor/profile", { replace: true });
          return;
        }

        // Check if customer setup is complete
        supabase
          .from("user_metadata")
          .select("setup_complete")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data && !data.setup_complete) {
              navigate("/setup", { replace: true });
            }
          });
      });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar variant="solid" />
      <SidebarProvider>
        <div className="flex-1 flex w-full page-bg">
          <CustomerSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <PageHeader />
            <Routes>
              <Route
                index
                element={
                  <main className="flex-1 p-6 md:p-8 max-w-5xl w-full">
                    <MyProjects />
                  </main>
                }
              />
            </Routes>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Dashboard;
