"use client";

import { useState } from "react";
import { RefreshCw, Bell, ChevronDown, Menu } from "lucide-react";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const [syncing, setSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      setSyncMessage(data.message ?? "Sync complete");
      // Auto-clear after 3s
      setTimeout(() => setSyncMessage(null), 3000);
      // Reload the page to show fresh data
      window.location.reload();
    } catch {
      setSyncMessage("Sync failed. Please try again.");
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sync message */}
        {syncMessage && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 animate-fade-in">
            {syncMessage}
          </div>
        )}

        <div className="flex-1" />

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className={cn("btn-secondary text-xs px-3 py-1.5", syncing && "opacity-70")}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          {syncing ? "Syncing…" : "Sync Now"}
        </button>

        {/* Notifications placeholder */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <Bell className="w-4.5 h-4.5" size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-gray-900 leading-tight">
              {user?.name ?? "Administrator"}
            </p>
            <p className="text-xs text-gray-500 leading-tight truncate max-w-[140px]">
              {user?.email ?? ""}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
        </button>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
