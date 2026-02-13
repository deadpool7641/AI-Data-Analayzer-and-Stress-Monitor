import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Wifi,
  WifiOff,
  Zap,
  BrainCircuit,
  Bell,
  Cpu,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

const MAX_HISTORY_LENGTH = 50;

const getStressColor = (level, faceDetected) => {
  if (!faceDetected)
    return {
      text: "text-slate-400",
      bg: "bg-slate-500",
      border: "border-slate-500/20",
      stroke: "#64748b",
    };
  if (level > 0.7)
    return {
      text: "text-rose-400",
      bg: "bg-rose-500",
      border: "border-rose-500/30",
      stroke: "#f97373",
    };
  if (level > 0.4)
    return {
      text: "text-amber-400",
      bg: "bg-amber-500",
      border: "border-amber-500/30",
      stroke: "#fbbf24",
    };
  return {
    text: "text-emerald-400",
    bg: "bg-emerald-500",
    border: "border-emerald-500/30",
    stroke: "#10b981",
  };
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const row = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700 px-3 py-2 rounded-md shadow-xl backdrop-blur">
        <p className="text-slate-400 text-[10px] mb-1">{label}</p>
        <p className="text-xs text-white font-mono">
          Stress: {(row.level * 100).toFixed(1)}%
        </p>
        {row.emotion && (
          <div className="mt-1 text-[11px]">
            <p className="text-slate-500">Emotion:</p>
            <p className="text-indigo-400 font-semibold uppercase tracking-wide">
              {row.emotion}
            </p>
            <p className="text-slate-500 font-mono">
              Conf: {(row.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const StressMonitor = () => {
  const [stressLevel, setStressLevel] = useState(0);
  const [dominantEmotion, setDominantEmotion] = useState("No Data");
  const [modelConfidence, setModelConfidence] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [stressHistory, setStressHistory] = useState([]);
  const [lastInferenceTime, setLastInferenceTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  const { user } = useAuth();
  const {
    socket,
    isConnected,
    stressHistory: contextStressHistory,
    cameraStream,
  } = useData();

  const videoRef = useRef(null);
  const mountedRef = useRef(true);
  const lastAlertTime = useRef(0);

  const colors = getStressColor(stressLevel, faceDetected);

  useEffect(() => {
    if (socket && isConnected) {
      setConnectionStatus("Connected");
    } else {
      setConnectionStatus("Disconnected");
    }
  }, [socket, isConnected]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const checkAlerts = useCallback(() => {
    const alertsEnabled = localStorage.getItem("stressAlerts") === "true";

    if (
      faceDetected &&
      stressLevel > 0.7 &&
      modelConfidence > 0.6 &&
      Date.now() - lastAlertTime.current > 30000
    ) {
      if (alertsEnabled && Notification.permission === "granted") {
        new Notification("High Stress Detected", {
          body: `Model: ${dominantEmotion} (${(stressLevel * 100).toFixed(
            0
          )}%, Conf: ${(modelConfidence * 100).toFixed(0)}%)`,
        });
      }

      if (socket && isConnected) {
        const hrPhone = localStorage.getItem("hrPhoneNumber");
        socket.emit("report_high_stress", {
          userId: user?.email,
          userName: user?.name || "Unknown User",
          level: stressLevel,
          detectedEmotion: dominantEmotion,
          confidence: modelConfidence,
          timestamp: new Date().toISOString(),
          hrPhone,
          source: "FULL_FRAME_MINI_XCEPTION",
        });
      }

      lastAlertTime.current = Date.now();
    }
  }, [
    stressLevel,
    dominantEmotion,
    modelConfidence,
    socket,
    isConnected,
    user,
    faceDetected,
  ]);

  useEffect(() => {
    const id = setTimeout(checkAlerts, 150);
    return () => clearTimeout(id);
  }, [checkAlerts]);

  const handleStressUpdate = useCallback((data) => {
    if (!mountedRef.current) return;

    if (!data || typeof data.level !== "number" || data.level < 0 || data.level > 1) {
      return;
    }

    const hasFace = data.face_detected === true && data.emotion !== "NO FACE";
    setFaceDetected(hasFace);
    setLastInferenceTime(Date.now());

    if (hasFace) {
      setStressLevel(data.level);
      setDominantEmotion(data.emotion);
      setModelConfidence(data.confidence || 0);
    } else {
      setStressLevel(0);
      setDominantEmotion("NO FACE");
      setModelConfidence(0);
    }

    setStressHistory((prev) => {
      const timeLabel = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const next = [
        ...prev,
        {
          time: timeLabel,
          level: hasFace ? data.level : 0,
          emotion: hasFace ? data.emotion : "NO FACE",
          confidence: hasFace ? data.confidence || 0 : 0,
        },
      ];
      if (next.length > MAX_HISTORY_LENGTH) {
        return next.slice(next.length - MAX_HISTORY_LENGTH);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("stress_update", handleStressUpdate);
    return () => {
      socket.off("stress_update", handleStressUpdate);
    };
  }, [socket, handleStressUpdate]);

  const isStale = Date.now() - lastInferenceTime > 3000;

  const chartData = useMemo(
    () =>
      stressHistory.map((d) => ({
        time: d.time,
        level: d.level,
        emotion: d.emotion,
        confidence: d.confidence,
      })),
    [stressHistory]
  );

  const saveHRPhone = () => {
    const phone = prompt("Enter HR Phone Number (for SMS alerts):");
    if (phone) {
      localStorage.setItem("hrPhoneNumber", phone);
      alert("HR phone saved; alerts will use this number.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8 md:px-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
            <BrainCircuit className="text-indigo-500" size={28} />
            NeuroMetric
            <span className="text-indigo-400 font-normal">Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Model:{" "}
            <span className="font-mono bg-slate-900/80 border border-slate-700 px-2 py-[2px] rounded text-emerald-300 text-[10px]">
              FULL_FRAME_MINI_XCEPTION_FUSED
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveHRPhone}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-xs text-indigo-300 hover:bg-indigo-500/25 transition"
          >
            ⚙ HR Alerts
          </button>
          <div
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono flex items-center gap-2 border backdrop-blur ${
              isConnected
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            }`}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connectionStatus}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: video + small stats */}
        <div className="lg:col-span-5 space-y-5">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-xl">
            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full bg-black/70 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  !isStale ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              ></span>
              LIVE FEED
            </div>

            {cameraStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition ${
                  faceDetected
                    ? "opacity-95"
                    : "opacity-40 grayscale contrast-75"
                } scale-x-[-1]`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono px-4 text-center">
                <div className="h-8 w-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
                <p>Waiting for camera stream…</p>
                <p className="text-[10px] text-slate-600">
                  If you granted permission but still see this, another
                  application or the Python model may already be using the
                  camera.
                </p>
              </div>
            )}

            {!faceDetected && cameraStream && !isStale && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-amber-400/70 flex items-center justify-center animate-pulse">
                  <span className="text-[11px] text-amber-200 font-semibold">
                    ALIGN FACE
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} /> Confidence
                </span>
                <span className="font-mono text-slate-300">
                  {(modelConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${modelConfidence * 100}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Cpu size={14} /> State
                </span>
              </div>
              <div className="text-sm font-mono text-slate-100">
                {isStale
                  ? "Idle"
                  : faceDetected
                  ? "Analyzing Face"
                  : "Searching Face"}
              </div>
              <div className="text-[11px] text-slate-500">
                {lastInferenceTime
                  ? `Last: ${new Date(lastInferenceTime).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}`
                  : "No inference yet"}
              </div>
            </div>
          </div>
        </div>

        {/* Right: main meter + chart */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div
            className={`p-6 rounded-2xl bg-slate-900/80 border-2 ${colors.border} shadow-xl`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Live Stress Index
                </p>
                <div className={`mt-2 ${colors.text}`}>
                  <span className="text-5xl md:text-6xl font-mono font-bold">
                    {(stressLevel * 100).toFixed(0)}
                  </span>
                  <span className="text-2xl font-semibold ml-1">%</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.18em] text-slate-500">
                    Emotion
                  </span>
                  <span className="px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[11px] font-semibold tracking-wide uppercase">
                    {dominantEmotion}
                  </span>
                </div>
              </div>
              <div
                className={`px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${colors.bg} ${colors.border} text-slate-950 shadow-lg`}
              >
                {faceDetected ? (
                  stressLevel > 0.7 ? (
                    <>
                      <Bell size={16} />
                      High Stress
                    </>
                  ) : stressLevel > 0.4 ? (
                    <>
                      <Zap size={16} />
                      Elevated
                    </>
                  ) : (
                    <>
                      <Activity size={16} />
                      Optimal
                    </>
                  )
                ) : (
                  <>
                    <EyeOff size={16} />
                    No Face
                  </>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className="absolute left-[70%] inset-y-0 w-[1px] bg-rose-400/80"
                  style={{ boxShadow: "0 0 6px rgba(248,113,113,0.7)" }}
                />
                <div
                  className={`h-full ${colors.bg} transition-all duration-700`}
                  style={{ width: `${stressLevel * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[11px] text-slate-500 font-mono">
                <span>0%</span>
                <span className="text-rose-400 font-semibold">Alert 70%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm uppercase tracking-[0.18em] text-slate-400 flex items-center gap-2">
                <Cpu size={16} className="text-emerald-400" />
                Model Timeline
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {stressHistory.length}/{MAX_HISTORY_LENGTH} points
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="modelGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={colors.stroke}
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="80%"
                        stopColor={colors.stroke}
                        stopOpacity={0.05}
                      />
                      <stop
                        offset="100%"
                        stopColor={colors.stroke}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#6b7280"
                    tick={{
                      fill: "#6b7280",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 1]}
                    stroke="#6b7280"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "#6b7280",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="level"
                    stroke={colors.stroke}
                    strokeWidth={2}
                    fill="url(#modelGradient)"
                    isAnimationActive={!isStale}
                    animationDuration={750}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressMonitor;
