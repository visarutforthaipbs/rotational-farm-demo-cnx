import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Menu, X } from "lucide-react";

type DashboardProps = {
  data: any;
  selectedPlot: any | null;
};

export default function Dashboard({ data, selectedPlot }: DashboardProps) {
  // 1. Calculate Stats
  const stats = useMemo(() => {
    if (!data || !data.features)
      return {
        totalArea: 0,
        carbonSinkArea: 0,
        activeFarmArea: 0,
        forestRatio: 0,
        ratioText: 0,
      };

    let totalArea = 0;
    let carbonSinkArea = 0;
    let activeFarmArea = 0;

    data.features.forEach((f: any) => {
      const rai = f.properties.RAI || 0;
      totalArea += rai;
      if (f.properties.status === "Carbon Sink") {
        carbonSinkArea += rai;
      } else if (f.properties.status === "Active Farm") {
        activeFarmArea += rai;
      }
    });

    const forestRatio = totalArea > 0 ? (carbonSinkArea / totalArea) * 100 : 0;
    // Avoid division by zero for the text ratio
    const ratioText =
      activeFarmArea > 0
        ? (carbonSinkArea / activeFarmArea).toFixed(1)
        : carbonSinkArea > 0
        ? "∞"
        : "0";

    return {
      totalArea,
      carbonSinkArea,
      activeFarmArea,
      forestRatio,
      ratioText,
    };
  }, [data]);

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden absolute top-20 left-4 z-20 bg-white/90 dark:bg-slate-900/90 p-2 rounded-lg shadow-lg border border-white/20 text-slate-800 dark:text-white"
      >
        {isMobileOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      <div
        className={`absolute left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-6 flex flex-col gap-6 z-10 max-h-[calc(100vh-2rem)] overflow-y-auto transition-all duration-300 ${
          isMobileOpen
            ? "top-32 w-[calc(100%-2rem)] opacity-100 pointer-events-auto"
            : "top-4 w-80 opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto md:w-96"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Wong Jorn
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              วัฏจักรไร่หมุนเวียน
            </p>
          </div>
          {/* Close button for mobile inside the panel as well */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. The "Real" Stats */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              ป่าฟื้นฟู
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.forestRatio.toFixed(0)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${stats.forestRatio}%` }}
            ></div>
          </div>

          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            {stats.forestRatio.toFixed(0)}% ของพื้นที่นี้คือป่าฟื้นฟู
          </p>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                พื้นที่พักฟื้น
              </div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                {stats.carbonSinkArea.toLocaleString()} ไร่
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                พื้นที่ทำกิน
              </div>
              <div className="font-semibold text-orange-700 dark:text-orange-400">
                {stats.activeFarmArea.toLocaleString()} ไร่
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        {/* 2. Plot Detail */}
        <div className="min-h-[120px]">
          {!selectedPlot ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-4 opacity-60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
                />
              </svg>
              <p className="text-sm text-slate-500">
                คลิกที่แปลงเพื่อดูบทบาทในระบบนิเวศ
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  {selectedPlot.crop_type}
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  #{selectedPlot.id || "N/A"}
                </span>
              </div>

              {selectedPlot.status === "Carbon Sink" ? (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    🌱 พื้นที่พักฟื้น
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    แปลงนี้กำลังพักฟื้น
                    กำลังดูดซับคาร์บอนและฟื้นฟูความหลากหลายทางชีวภาพในดิน
                  </p>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    🔥 พื้นที่ทำกิน
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    แปลงนี้กำลังผลิตอาหาร (ข้าว/ผัก) สำหรับ {selectedPlot.RAI}{" "}
                    ไร่
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. Action Section */}
        <div className="flex flex-col gap-3 mt-auto">
          <button className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2">
            <span>สนับสนุนผู้ดูแลป่า</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
