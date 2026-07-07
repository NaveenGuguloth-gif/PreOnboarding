import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import Header  from "../components/dashboard/Header";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-theme flex h-dvh min-h-screen overflow-hidden bg-[#F5F7FB]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="dashboard-readable flex-1 overflow-y-auto bg-[#F5F7FB] p-4 sm:p-5 md:p-6 xl:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
