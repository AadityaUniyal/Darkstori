import * as React from "react"
import { cn } from "../../lib/utils"
import { useSocketStore } from "../../stores/socketStore"

const statusConfig = {
  connected: {
    color: "bg-emerald-500",
    text: "Connected to live stream",
  },
  reconnecting: {
    color: "bg-amber-500",
    text: "Reconnecting...",
  },
  disconnected: {
    color: "bg-rose-500",
    text: "Offline (Demo Fallback)",
  },
}

export function ConnectionStatus({ status, className }) {
  const storeStatus = useSocketStore((state) => state.connectionStatus)
  const currentStatus = status || storeStatus || "disconnected"
  const config = statusConfig[currentStatus] || statusConfig.disconnected

  return (
    <div className={cn("group relative flex items-center justify-center cursor-pointer px-1.5 py-1", className)} title={config.text}>
      <span className="relative flex h-2.5 w-2.5">
        {currentStatus === "connected" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", config.color, {
          "animate-pulse": currentStatus === "reconnecting"
        })} />
      </span>
      
      {/* Tooltip */}
      <div className="absolute top-full mt-2 hidden w-max rounded-md bg-card border border-border px-2.5 py-1 text-xs text-foreground shadow-lg group-hover:block z-50 pointer-events-none">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", config.color)}></span>
          {config.text}
        </div>
      </div>
    </div>
  )
}

export default ConnectionStatus
