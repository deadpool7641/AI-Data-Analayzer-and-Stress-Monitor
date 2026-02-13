import React, {
  useMemo,
  useCallback,
  useRef,
  memo,
  useState,
  useEffect,
} from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  TrendingUp,
  DollarSign,
  Wifi,
  WifiOff,
  Zap,
  BrainCircuit,
  ArrowUpRight,
  Loader2,
  Play,
  BarChart3,
  PieChart as PieIcon,
} from "lucide-react";

// NEW: browser-side model hook
import { useStressModel } from "../hooks/useStressModel";

// --- CONSTANTS & HELPERS ---

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const RAD = Math.PI / 180;

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RAD);
  const y = cy + radius * Math.sin(-midAngle * RAD);

  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      fontSize={10}
      textAnchor="middle"
      dominantBaseline="central"
      className="pointer-events-none fill-slate-600 dark:fill-slate-300"
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// --- 1. SHARED UTILITIES ---

const CustomTooltip = memo(({ active, payload, label, prefix = "", suffix = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
          {label}
        </p>
        <p className="text-slate-900 dark:text-white font-bold text-sm">
          {prefix}
          {Number(payload[0].value).toFixed(2)}
          {suffix}
        </p>
      </div>
    );
  }
  return null;
});

const StatCard = memo(({ title, value, subtext, icon: Icon, colorClass, trend }) => (
  <div className="relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 group">
    <div
      className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 ${colorClass}`}
    >
      <Icon size={80} />
    </div>
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {subtext && (
          <p
            className={`text-xs mt-2 font-medium ${
              trend === "up"
                ? "text-emerald-600 dark:text-green-400"
                : trend === "down"
                ? "text-rose-600 dark:text-red-400"
                : "text-slate-500"
            }`}
          >
            {subtext}
          </p>
        )}
      </div>
      <div
        className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 ${colorClass} bg-opacity-10 dark:bg-opacity-10`}
      >
        <Icon
          size={24}
          className={colorClass.replace("text-", "text-current ")}
        />
      </div>
    </div>
  </div>
));

const ChartContainer = ({ title, icon: Icon, children, subtitle }) => (
  <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all h-full flex flex-col">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
    <div className="flex-1 w-full min-h-[300px] relative">{children}</div>
  </div>
);

// --- 2. WIDGETS ---

const StressWidget = ({ liveStress }) => {
  const stressValue = Number(liveStress) || 0;
  const getStressColor = (level) => {
    if (level > 0.7) return "text-rose-600 dark:text-rose-400";
    if (level > 0.4) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  return (
    <div className="relative overflow-hidden p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Activity size={80} className="text-blue-500 rotate-12" />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
          <Activity size={20} />
        </div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">
          Live Stress
        </h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-4xl font-mono font-bold ${getStressColor(
            stressValue
          )}`}
        >
          {(stressValue * 100).toFixed(0)}%
        </span>
        <span className="text-xs text-slate-400 uppercase font-bold">
          Current Load
        </span>
      </div>
      <div className="mt-4 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            stressValue > 0.7 ? "bg-rose-500" : "bg-emerald-500"
          }`}
          style={{ width: `${stressValue * 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {stressValue > 0.7
          ? "Warning: High levels detected."
          : "State: Optimal performance."}
      </p>
    </div>
  );
};

const AiWidget = ({ socket }) => {
  const [prediction, setPrediction] = useState(null);
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    if (!socket) return;
    const handleResult = (data) => {
      setLoading(false);
      if (data.status === "success") {
        setPrediction(data.predicted_price);
        if (data.graph_data) setGraphData(data.graph_data);
      }
    };
    socket.on("ai_prediction_result", handleResult);
    return () => socket.off("ai_prediction_result", handleResult);
  }, [socket]);

  const runPrediction = () => {
    if (!socket) return;
    setLoading(true);
    setPrediction(null);
    setGraphData([]);
    setStatusText("Initializing...");
    setTimeout(() => setStatusText("Fetching Market Data..."), 1000);
    setTimeout(() => setStatusText("Training Neural Network..."), 2500);
    socket.emit("request_ai_prediction", { symbol: "BTC-USD" });
  };

  return (
    <div className="relative overflow-hidden p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all group col-span-1 md:col-span-2 lg:col-span-1">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <BrainCircuit size={80} className="text-purple-500 -rotate-12" />
      </div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
            <BrainCircuit size={20} />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">
            Market AI
          </h3>
        </div>
        <button
          onClick={runPrediction}
          disabled={loading}
          className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-colors shadow-lg shadow-purple-500/20 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
          {loading ? "RUNNING" : "RUN MODEL"}
        </button>
      </div>

      <div className="mt-2 relative z-10 min-h-[100px] flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-purple-500 animate-[progress_1s_ease-in-out_infinite]" />
            </div>
            <span className="text-xs font-mono text-purple-500 animate-pulse">
              {statusText}
            </span>
          </div>
        ) : prediction ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 w-full">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  BTC Forecast
                </span>
                <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
                  ${Number(prediction).toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-500 font-bold flex items-center justify-end gap-1">
                  <ArrowUpRight size={14} /> 87% Conf.
                </span>
              </div>
            </div>

            <div className="h-24 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graphData}>
                  <defs>
                    <linearGradient
                      id="colorPrice"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#8b5cf6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={<CustomTooltip prefix="$" />}
                    cursor={{ stroke: "#8b5cf6", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-slate-400 text-xs text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <Activity size={24} className="mb-2 opacity-50" />
            Click &apos;RUN MODEL&apos; to train neural network and predict
            Bitcoin price.
          </div>
        )}
      </div>
    </div>
  );
};

const PortfolioWidget = () => (
  <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
        <DollarSign size={20} />
      </div>
      <h3 className="font-semibold text-slate-700 dark:text-slate-200">
        Portfolio
      </h3>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold text-slate-900 dark:text-white">
        $124,592
      </span>
      <span className="text-sm font-bold text-emerald-500">+12.5%</span>
    </div>
    <div className="h-16 mt-4 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={[
            { v: 4000 },
            { v: 3000 },
            { v: 5000 },
            { v: 4500 },
            { v: 6000 },
            { v: 5500 },
            { v: 7000 },
          ]}
        >
          <Area
            type="monotone"
            dataKey="v"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// NEW: Browser visual stress monitor (uses useStressModel)
const VisualStressWidget = () => {
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    let stream;
    const enableCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Webcam error:", err);
        setCameraError(
          "Could not access webcam. Check permissions or if another app is using the camera."
        );
      }
    };
    enableCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const { isModelLoading, prediction } = useStressModel(videoRef);
  const stress = prediction?.stress ?? 0;
  const label = prediction?.label ?? "No Data";
  const conf = prediction?.confidence ?? 0;

  return (
    <div className="relative overflow-hidden p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all group col-span-1 md:col-span-2 lg:col-span-1">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Activity size={80} className="text-sky-500 rotate-12" />
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl">
            <Activity size={20} />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">
            Visual Stress (Browser)
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {isModelLoading
            ? "Loading model…"
            : `${Math.round(conf * 100)}% conf`}
        </span>
      </div>

      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
        {cameraError ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 px-4 text-center">
            {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-3xl font-mono font-bold text-emerald-400">
            {(stress * 100).toFixed(0)}
            <span className="text-lg ml-1">%</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Emotion:{" "}
            <span className="font-semibold text-slate-200">{label}</span>
          </div>
        </div>
        <div className="px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide bg-slate-800/80 flex items-center gap-2">
          {stress > 0.7 ? (
            <>
              <Zap size={14} className="text-rose-400" /> High
            </>
          ) : stress > 0.4 ? (
            <>
              <Zap size={14} className="text-amber-400" /> Elevated
            </>
          ) : (
            <>
              <Activity size={14} className="text-emerald-400" /> Optimal
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Runs locally in your browser using TensorFlow.js; backend model and HR
        alerts continue to run in parallel.
      </p>
    </div>
  );
};

// --- 3. CHART COMPONENTS ---

const QuickStats = memo(({ symbolData = {}, stressHistory = [] }) => {
  const symbols = Object.values(symbolData);
  const avgPrice =
    symbols.length > 0
      ? symbols.reduce((acc, curr) => acc + (curr.price || 0), 0) /
        symbols.length
      : 0;

  const lastStress =
    stressHistory.length > 0
      ? stressHistory[stressHistory.length - 1].level
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Market Average"
        value={`$${avgPrice.toFixed(2)}`}
        icon={TrendingUp}
        colorClass="text-blue-500"
        subtext="Across active tickers"
        trend="up"
      />
      <StatCard
        title="Active Feeds"
        value={symbols.length}
        icon={Activity}
        colorClass="text-purple-500"
        subtext="Real-time socket connections"
      />
      <StatCard
        title="Avg Stress"
        value={`${(lastStress * 100).toFixed(0)}%`}
        icon={Zap}
        colorClass="text-amber-500"
        subtext="Biometric baseline"
        trend={lastStress > 0.5 ? "up" : "down"}
      />
      <StatCard
        title="Net Volume"
        value="2.4M"
        icon={BarChart3}
        colorClass="text-emerald-500"
        subtext="Daily total traded"
        trend="up"
      />
    </div>
  );
});

const StressChart = memo(({ stressHistory, isConnected }) => {
  return (
    <ChartContainer
      title="Biometric Stress Analysis"
      icon={Activity}
      subtitle="Real-time physiological monitoring"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={stressHistory}>
          <defs>
            <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            opacity={0.2}
          />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickFormatter={(unix) =>
              new Date(unix * 1000).toLocaleTimeString([], {
                minute: "2-digit",
                second: "2-digit",
              })
            }
            stroke="#475569"
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="#475569"
          />
          <Tooltip content={<CustomTooltip prefix="Stress Level: " />} />
          <Area
            type="monotone"
            dataKey="level"
            stroke="#f43f5e"
            fillOpacity={1}
            fill="url(#colorStress)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

const MarketDistributionChart = memo(({ symbolData, isConnected }) => {
  const data = useMemo(() => {
    return Object.values(symbolData)
      .slice(0, 5)
      .map((item) => ({
        name: item.symbol,
        value: item.price || 0,
      }));
  }, [symbolData]);

  return (
    <ChartContainer
      title="Market Distribution"
      icon={PieIcon}
      subtitle="Volume by asset class"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderPieLabel}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={5}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip prefix="$" />} />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

const TopStocksList = memo(({ stocks }) => {
  return (
    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 h-full shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
          <TrendingUp size={20} />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
          Top Movers
        </h3>
      </div>
      <div className="space-y-4">
        {stocks.map((stock, i) => (
          <div
            key={stock.symbol}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {stock.symbol}
                </p>
                <p className="text-xs text-slate-500">
                  Vol: {(Math.random() * 1000).toFixed(0)}K
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-emerald-500">
                ${stock.price?.toFixed(2)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                <ArrowUpRight size={12} />
                {(Math.random() * 5).toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// --- 4. MAIN DASHBOARD ---

const Dashboard = () => {
  const dataContext = useData();
  const authContext = useAuth();

  const { symbolData, stressHistory, isConnected, socket } = dataContext || {
    symbolData: {},
    stressHistory: [],
    isConnected: false,
    socket: null,
  };

  const user = authContext?.user || { name: "Guest" };

  const [liveStress, setLiveStress] = useState(0);

  // backend stress from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleStress = (data) => {
      if (
        !data ||
        typeof data.level !== "number" ||
        data.level < 0 ||
        data.level > 1
      )
        return;

      if (data.face_detected === false || data.emotion === "NO FACE") {
        setLiveStress(0);
        return;
      }

      setLiveStress(data.level);
    };

    socket.on("stress_update", handleStress);
    return () => socket.off("stress_update", handleStress);
  }, [socket]);

  const dataCacheRef = useRef({});
  const lastUpdateRef = useRef(0);

  const topStocks = useMemo(() => {
    const stocks = [
      "AAPL",
      "GOOGL",
      "MSFT",
      "TSLA",
      "AMZN",
      "META",
      "NVDA",
      "AMD",
    ];
    return stocks
      .map((s) => ({ symbol: s, ...symbolData?.[s] }))
      .filter((s) => s.price)
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);
  }, [symbolData]);

  const throttledTopStocks = useMemo(() => {
    const now = Date.now();
    if (
      now - lastUpdateRef.current > 3000 ||
      !dataCacheRef.current.topStocks
    ) {
      lastUpdateRef.current = now;
      dataCacheRef.current.topStocks = topStocks;
    }
    return dataCacheRef.current.topStocks || [];
  }, [topStocks]);

  const renderEmptyState = useCallback(
    () => (
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 text-center py-20 text-slate-400">
        Waiting for market data stream...
      </div>
    ),
    []
  );

  if (!dataContext) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Initializing Dashboard Context...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-8 space-y-8 font-sans transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 tracking-tight">
            Market Command
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time analysis & biometric monitoring for {user?.name}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
            isConnected
              ? "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span className="text-xs font-bold uppercase tracking-wider">
            {isConnected ? "System Online" : "System Offline"}
          </span>
          {isConnected && (
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>
      </div>

      {/* Top row: backend stress + browser visual + AI + portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StressWidget liveStress={liveStress} />
        <VisualStressWidget />
        <AiWidget socket={socket} />
        <PortfolioWidget />
      </div>

      <QuickStats symbolData={symbolData} stressHistory={stressHistory} />

      <MarketDistributionChart
        symbolData={symbolData}
        isConnected={isConnected}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <StressChart
            stressHistory={stressHistory}
            isConnected={isConnected}
          />
        </div>
        <div className="xl:col-span-1">
          {throttledTopStocks.length > 0 ? (
            <TopStocksList stocks={throttledTopStocks} />
          ) : (
            renderEmptyState()
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(Dashboard);