"use client";

import React, { useState } from "react";
import RotationalMap from "./RotationalMap";
import Dashboard from "./Dashboard";
import geoJsonData from "./minified_farms.json";

export default function Page() {
  const [selectedPlot, setSelectedPlot] = useState<any>(null);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <RotationalMap onPlotSelect={setSelectedPlot} />
      </div>

      {/* Dashboard Overlay */}
      <Dashboard data={geoJsonData} selectedPlot={selectedPlot} />
    </main>
  );
}
