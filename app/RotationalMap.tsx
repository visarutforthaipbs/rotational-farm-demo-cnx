"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Map, { Source, Layer, Popup, MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  Layers,
  BarChart3,
  Play,
  Pause,
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  Info,
} from "lucide-react";
import geoJsonData from "./minified_farms.json";
import villageData from "./all-village-cnx.json";

const data = geoJsonData as any;
const villages = villageData as any;

// Constants
const CARBON_PER_RAI = 1.2; // Estimated tons of carbon per Rai
const COLORS = {
  "Carbon Sink": "#22c55e",
  "Active Farm": "#f97316",
  Other: "#cbd5e1",
};

// Define tile URLs for different base maps
const TILE_URLS = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

const mapStyle = {
  version: 8,
  sources: {
    "raster-tiles": {
      type: "raster",
      tiles: [TILE_URLS.satellite],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    "terrain-source": {
      type: "raster-dem",
      tiles: [
        "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      ],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
      minzoom: 0,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#020617",
      },
    },
    {
      id: "simple-tiles",
      type: "raster",
      source: "raster-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
  terrain: {
    source: "terrain-source",
    exaggeration: 1.5,
  },
  fog: {
    range: [0.5, 10],
    color: "#1e293b", // Dark Slate Horizon
    "horizon-blend": 0.2,
    "high-color": "#020617", // Deep Night Sky
    "space-color": "#020617",
  },
};

// Types
type RotationalMapProps = {
  onPlotSelect?: (plot: any) => void;
};

type HoverInfo = {
  feature: any;
  x: number;
  y: number;
} | null;

type VillageSelectInfo = {
  feature: any;
  lng: number;
  lat: number;
} | null;

type DashboardData = {
  carbonSinkCount: number;
  activeFarmCount: number;
  totalRai: number;
  cropDistribution: { name: string; count: number }[];
};

// Style layers
const lineLayerStyle: any = {
  id: "rotational-lines",
  type: "line",
  paint: {
    "line-color": "#ffffff",
    "line-width": 0.5,
  },
};

const highlightLayerStyle: any = {
  id: "rotational-highlight",
  type: "fill",
  paint: {
    "fill-color": [
      "match",
      ["get", "status"],
      "Carbon Sink",
      "#22c55e",
      "Active Farm",
      "#f97316",
      "#ccc",
    ],
    "fill-opacity": 1.0,
  },
};

const villageLayerStyle: any = {
  id: "village-lines",
  type: "line",
  paint: {
    "line-color": "#facc15", // Yellow
    "line-width": 1.5,
    "line-opacity": 0.8,
  },
};

const villageFillLayerStyle: any = {
  id: "village-fills",
  type: "fill",
  paint: {
    "fill-color": "#facc15",
    "fill-opacity": 0, // Transparent for hit detection
  },
};

const TOUR_STOPS = [
  "บ้านแม่ทะลบ",
  "บ้านห้วยต้นตอง",
  "บ้านป่าแดง",
  "บ้านดง",
  "บ้านห้วยน้ำริน",
];

export default function RotationalMap({ onPlotSelect }: RotationalMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null);
  const [selectedPlot, setSelectedPlot] = useState<any>(null);
  const [selectedVillage, setSelectedVillage] =
    useState<VillageSelectInfo>(null);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showVillages, setShowVillages] = useState(true);
  const [visibleCarbon, setVisibleCarbon] = useState(0);

  // New State
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    carbonSinkCount: 0,
    activeFarmCount: 0,
    totalRai: 0,
    cropDistribution: [],
  });
  const [filterStatus, setFilterStatus] = useState<
    "all" | "Carbon Sink" | "Active Farm"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTouring, setIsTouring] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);

  // Calculate initial bounds based on data centers
  const initialViewState = useMemo(() => {
    if (!data.features || data.features.length === 0) {
      return { longitude: 98.98, latitude: 18.79, zoom: 10 }; // Default to Chiang Mai
    }

    let minLng = 180,
      minLat = 90,
      maxLng = -180,
      maxLat = -90;

    data.features.forEach((f: any) => {
      const lat = f.properties.lat;
      const lng = f.properties.lng;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    return {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom: 11,
      pitch: 60,
      bearing: 0,
    };
  }, []);

  const currentMapStyle = useMemo(() => {
    const style = { ...mapStyle };
    if (!showTerrain) {
      const { terrain, ...rest } = style;
      return rest;
    }
    return style;
  }, [showTerrain]);

  // Dynamic Filter Layer
  const fillLayerStyle = useMemo(() => {
    const baseStyle: any = {
      id: "rotational-fills",
      type: "fill",
      paint: {
        "fill-color": [
          "match",
          ["get", "status"],
          "Carbon Sink",
          "#22c55e",
          "Active Farm",
          "#f97316",
          "#ccc",
        ],
        "fill-opacity": [
          "match",
          ["get", "status"],
          "Carbon Sink",
          0.6,
          "Active Farm",
          0.8,
          0.5,
        ],
      },
    };

    if (filterStatus !== "all") {
      baseStyle.filter = ["==", "status", filterStatus];
    }

    return baseStyle;
  }, [filterStatus]);

  const onHover = useCallback((event: MapLayerMouseEvent) => {
    const {
      features,
      point: { x, y },
    } = event;
    const hoveredFeature = features && features[0];

    setHoverInfo(hoveredFeature ? { feature: hoveredFeature, x, y } : null);
  }, []);

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const { features } = event;
      const clickedFeature = features && features[0];

      if (clickedFeature) {
        if (clickedFeature.layer.id === "rotational-fills") {
          setSelectedPlot(clickedFeature.properties);
          setSelectedVillage(null);
          if (onPlotSelect) {
            onPlotSelect(clickedFeature.properties);
          }
        } else if (clickedFeature.layer.id === "village-fills") {
          setSelectedVillage({
            feature: clickedFeature,
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          });
          setSelectedPlot(null);
        }
      } else {
        setSelectedPlot(null);
        setSelectedVillage(null);
      }
    },
    [onPlotSelect]
  );

  const onMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures(undefined, {
      layers: ["rotational-fills"],
    });

    // Carbon Calculation
    const carbonSinkFeatures = features.filter(
      (f) => f.properties?.status === "Carbon Sink"
    );
    let totalRai = 0;
    carbonSinkFeatures.forEach((f) => {
      totalRai += f.properties?.RAI || 0;
    });
    setVisibleCarbon(Math.round(totalRai * CARBON_PER_RAI));

    // Dashboard Data Calculation
    const activeFarmFeatures = features.filter(
      (f) => f.properties?.status === "Active Farm"
    );

    const cropCounts: Record<string, number> = {};
    features.forEach((f) => {
      const crop = f.properties?.crop_type || "Unknown";
      cropCounts[crop] = (cropCounts[crop] || 0) + 1;
    });

    const cropDistribution = Object.entries(cropCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 crops

    setDashboardData({
      carbonSinkCount: carbonSinkFeatures.length,
      activeFarmCount: activeFarmFeatures.length,
      totalRai: Math.round(totalRai),
      cropDistribution,
    });
  }, []);

  const flyToVillage = (villageName: string) => {
    const village = villages.features.find(
      (v: any) => v.properties.Vill_Th === villageName
    );
    if (village && mapRef.current) {
      // Fix: Access the first ring of the polygon correctly
      // village.geometry.coordinates is [[[lng, lat], ...]] for Polygon
      const coords = village.geometry.coordinates[0];

      if (!coords || coords.length === 0) return;

      let lngSum = 0;
      let latSum = 0;
      coords.forEach((c: number[]) => {
        lngSum += c[0];
        latSum += c[1];
      });
      const centerLng = lngSum / coords.length;
      const centerLat = latSum / coords.length;

      if (isNaN(centerLng) || isNaN(centerLat)) return;

      mapRef.current.flyTo({
        center: [centerLng, centerLat],
        zoom: 13,
        pitch: 60,
        duration: 3000,
      });
    }
  };

  // Tour Logic
  useEffect(() => {
    let tourTimeout: NodeJS.Timeout;

    if (isTouring) {
      flyToVillage(TOUR_STOPS[tourIndex]);
      tourTimeout = setTimeout(() => {
        setTourIndex((prev) => (prev + 1) % TOUR_STOPS.length);
      }, 8000); // 8 seconds per stop
    }

    return () => clearTimeout(tourTimeout);
  }, [isTouring, tourIndex]);

  const toggleTour = () => {
    if (isTouring) {
      setIsTouring(false);
    } else {
      setTourIndex(0);
      setIsTouring(true);
    }
  };

  // Search Logic
  const filteredVillages = useMemo(() => {
    if (!searchQuery) return [];
    return villages.features
      .filter((v: any) => v.properties.Vill_Th.includes(searchQuery))
      .slice(0, 5);
  }, [searchQuery]);

  const highlightFilter = useMemo(() => {
    return ["in", "id", hoverInfo?.feature?.properties?.id || ""];
  }, [hoverInfo]);

  return (
    <div className="w-full h-full min-h-[600px] relative rounded-lg overflow-hidden shadow-lg bg-slate-900">
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle={currentMapStyle as any}
        interactiveLayerIds={["rotational-fills", "village-fills"]}
        onMouseMove={onHover}
        onClick={onClick}
        onMouseLeave={() => setHoverInfo(null)}
        onMoveEnd={onMoveEnd}
        cursor={hoverInfo ? "pointer" : "auto"}
        maxPitch={85}
      >
        {showVillages && (
          <Source id="village-data" type="geojson" data={villages}>
            <Layer {...villageFillLayerStyle} />
            <Layer {...villageLayerStyle} />
          </Source>
        )}

        <Source id="rotational-data" type="geojson" data={data}>
          <Layer {...fillLayerStyle} />
          <Layer {...lineLayerStyle} />
          {hoverInfo && (
            <Layer {...highlightLayerStyle} filter={highlightFilter} />
          )}
        </Source>

        {/* Popups */}
        {selectedVillage && (
          <Popup
            longitude={selectedVillage.lng}
            latitude={selectedVillage.lat}
            offset={[0, -10]}
            onClose={() => setSelectedVillage(null)}
            closeButton={true}
            className="text-black"
          >
            <div className="p-3 min-w-[200px] backdrop-blur-md bg-white/90 rounded-lg shadow-lg border border-yellow-500/30">
              <h3 className="font-bold text-lg text-yellow-700 border-b border-yellow-200 pb-1 mb-2">
                {selectedVillage.feature.properties.Vill_Th}
              </h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">พื้นที่ทั้งหมด:</span>
                  <span className="font-medium">
                    {selectedVillage.feature.properties.A_Rai.toLocaleString()}{" "}
                    ไร่
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}

        {hoverInfo && hoverInfo.feature.layer.id === "rotational-fills" && (
          <Popup
            longitude={hoverInfo.feature.properties.lng}
            latitude={hoverInfo.feature.properties.lat}
            offset={[0, -10]}
            closeButton={false}
            className="text-black"
          >
            <div className="p-4 backdrop-blur-md bg-white/80 rounded-lg shadow-lg border border-white/20">
              <h3 className="font-bold text-lg text-slate-800">
                {hoverInfo.feature.properties.crop_type}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-slate-600">
                  {hoverInfo.feature.properties.RAI} ไร่
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span
                  className={`text-sm font-medium ${
                    hoverInfo.feature.properties.status === "Carbon Sink"
                      ? "text-emerald-600"
                      : "text-orange-600"
                  }`}
                >
                  {hoverInfo.feature.properties.status === "Carbon Sink"
                    ? "พื้นที่พักฟื้น"
                    : "พื้นที่ทำกิน"}
                </span>
              </div>
              {hoverInfo.feature.properties.status === "Carbon Sink" && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold w-fit">
                    กำลังดูดซับคาร์บอน
                  </div>
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      การกักเก็บคาร์บอน
                    </div>
                    <div className="text-lg font-bold text-emerald-600">
                      {(
                        hoverInfo.feature.properties.RAI * CARBON_PER_RAI
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ตันคาร์บอน
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* --- UI OVERLAYS --- */}

      {/* Top Right: Search & Tour (Moved from Left to avoid overlap) */}
      <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 flex flex-col gap-2 z-10 md:w-72 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur rounded-lg shadow-lg border border-slate-700 p-2 pointer-events-auto">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาหมู่บ้าน..."
              className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-200 placeholder-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredVillages.length > 0 && (
            <div className="mt-2 border-t border-slate-700 pt-2">
              {filteredVillages.map((v: any) => (
                <button
                  key={v.properties.Vill_Th}
                  onClick={() => {
                    flyToVillage(v.properties.Vill_Th);
                    setSearchQuery("");
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-emerald-900/30 hover:text-emerald-400 rounded flex items-center gap-2"
                >
                  <MapPin className="h-3 w-3" />
                  {v.properties.Vill_Th}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters & Layers (Stacked below Search) */}
        <div className="bg-slate-900/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2 text-slate-400 font-bold text-xs uppercase">
            <Filter className="h-3 w-3" /> ตัวกรองข้อมูล
          </div>
          <div className="flex flex-col gap-1">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "Carbon Sink", label: "พื้นที่พักฟื้น (Carbon Sink)" },
              { id: "Active Farm", label: "พื้นที่ทำกิน (Active Farm)" },
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setFilterStatus(status.id as any)}
                className={`text-left px-3 py-1.5 text-xs rounded transition-colors ${
                  filterStatus === status.id
                    ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2 text-slate-400 font-bold text-xs uppercase">
            <Layers className="h-3 w-3" /> ชั้นข้อมูล
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTerrain}
                onChange={(e) => setShowTerrain(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-600"
              />
              <span className="text-xs text-slate-300">ภูมิประเทศ 3 มิติ</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showVillages}
                onChange={(e) => setShowVillages(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-600"
              />
              <span className="text-xs text-slate-300">ขอบเขตหมู่บ้าน</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Right: Dashboard & Legend (Moved from Left to avoid overlap) */}
      <div className="absolute bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-4 z-10 flex flex-col gap-2 md:max-w-sm w-auto items-end pointer-events-none">
        {/* Carbon Counter */}
        <div className="bg-slate-900/90 backdrop-blur p-4 rounded-lg shadow-lg border border-emerald-500/30 w-full pointer-events-auto">
          <h4 className="text-xs font-bold text-emerald-400 uppercase mb-1">
            ปริมาณคาร์บอนสะสม (Visible)
          </h4>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {visibleCarbon.toLocaleString()}
            </span>
            <span className="text-sm text-slate-400">ตันคาร์บอน</span>
          </div>
        </div>

        {/* Analytics Panel */}
        <div className="bg-slate-900/90 backdrop-blur rounded-lg shadow-lg border border-slate-700 overflow-hidden transition-all w-full pointer-events-auto">
          <button
            onClick={() => setIsDashboardOpen(!isDashboardOpen)}
            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <BarChart3 className="h-4 w-4" /> สถิติพื้นที่ (Analytics)
            </div>
            {isDashboardOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {isDashboardOpen && (
            <div className="p-4 space-y-4">
              {/* Pie Chart */}
              <div>
                <h5 className="text-xs font-bold text-slate-400 mb-2">
                  สัดส่วนการใช้ที่ดิน
                </h5>
                <div className="h-32 w-full min-w-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Carbon Sink",
                            value: dashboardData.carbonSinkCount,
                          },
                          {
                            name: "Active Farm",
                            value: dashboardData.activeFarmCount,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={COLORS["Carbon Sink"]} />
                        <Cell fill={COLORS["Active Farm"]} />
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          color: "#f1f5f9",
                          fontSize: "12px",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "#f1f5f9" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-400">พักฟื้น</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-slate-400">ทำกิน</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div>
                <h5 className="text-xs font-bold text-slate-400 mb-2">
                  พืชเศรษฐกิจ 5 อันดับแรก
                </h5>
                <div className="h-32 w-full min-w-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.cropDistribution}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={40}
                        stroke="#475569"
                      />
                      <YAxis hide />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          color: "#f1f5f9",
                          fontSize: "12px",
                          borderRadius: "8px",
                        }}
                        cursor={{ fill: "#334155", opacity: 0.4 }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-slate-900/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-700 w-full pointer-events-auto">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
            <Info className="h-3 w-3" /> สัญลักษณ์
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500 opacity-60 border border-emerald-600"></div>
              <span className="text-slate-300">
                พื้นที่พักฟื้น (Carbon Sink)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500 opacity-80 border border-orange-600"></div>
              <span className="text-slate-300">พื้นที่ทำกิน (Active Farm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-yellow-400"></div>
              <span className="text-slate-300">ขอบเขตหมู่บ้าน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
