import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  BarChart2, 
  RefreshCw, 
  Layout, 
  Zap,
  Globe,
  Smartphone,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Timer,
  Calendar,
  ChevronDown,
  Upload,
  X as XIcon,
} from 'lucide-react';

const useAuth = () => {
  return {
    user: { name: 'Portfolio Manager', tier: 'PRO_TIER_V2' }
  };
};

const formatCurrency = (value) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatCompactNumber = (number) => {
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
};

// ---------- CSV parser ----------
const parseCsvToData = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const dateIdx = header.findIndex(h => h === 'date' || h === 'time' || h === 'datetime');
  const priceIdx = header.findIndex(h => h === 'price' || h === 'close');
  const volumeIdx = header.findIndex(h => h === 'volume' || h === 'vol');
  const symbolIdx = header.findIndex(h => h === 'symbol' || h === 'asset' || h === 'ticker');

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const rawDate = cols[dateIdx] || '';
    const rawPrice = parseFloat(cols[priceIdx] || '0');
    const rawVolume = parseFloat(cols[volumeIdx] || '0');
    const rawSymbol = symbolIdx >= 0 ? (cols[symbolIdx] || '').trim().toUpperCase() : '';

    const d = new Date(rawDate || Date.now());
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      date: d.toISOString(),
      displayDate,
      price: isNaN(rawPrice) ? 0 : rawPrice,
      volume: isNaN(rawVolume) ? 0 : rawVolume,
      symbol: rawSymbol || null,
    };
  }).filter(r => r.price > 0);
};

// ---------- placeholder "trained model" scoring ----------
const scoreSentimentFromSeries = (series) => {
  if (!series || series.length < 2) return 50;
  const first = series[0].price;
  const last = series[series.length - 1].price;
  if (!first) return 50;
  const pct = ((last - first) / first) * 100;
  return Math.min(100, Math.max(0, 50 + pct * 5));
};

// ---------- chart data generator for ONLINE mode ----------
const generateMarketData = (symbol, range) => {
  const data = [];
  const volatility = symbol === 'BTC' || symbol === 'ETH' ? 0.06 : 0.025;
  let price =
    symbol === 'BTC'
      ? 45000
      : symbol === 'AAPL'
      ? 180
      : symbol === 'TSLA'
      ? 240
      : symbol === 'NVDA'
      ? 460
      : 2000;

  const now = new Date();
  let points = 30;
  let intervalMinutes = 60 * 24;

  if (range === '1D') { points = 24; intervalMinutes = 60; }
  if (range === '1W') { points = 7; intervalMinutes = 60 * 24; }
  if (range === '1M') { points = 30; intervalMinutes = 60 * 24; }
  if (range === '1Y') { points = 52; intervalMinutes = 60 * 24 * 7; }

  for (let i = points; i >= 0; i--) {
    const date = new Date(now);
    date.setMinutes(date.getMinutes() - (i * intervalMinutes));
    
    const trend = Math.random() > 0.48 ? 1.002 : 0.998; 
    const change = price * (Math.random() - 0.5) * volatility;
    price = price * trend + change;
    price = Math.max(0.01, price);

    let displayDate;
    if (range === '1D') {
      displayDate = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (range === '1Y') {
      displayDate = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    data.push({
      date: date.toISOString(),
      displayDate,
      price,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      symbol,
    });
  }
  return data;
};

const StatCard = ({ title, value, subValue, icon: Icon, trend, colorClass = "text-blue-400" }) => (
  <div className="relative group overflow-hidden rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-6 transition-all duration-300 hover:bg-slate-800/60 hover:border-slate-600 hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-1">
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-sm font-medium text-slate-400 mb-1 tracking-wide">{title}</p>
        <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2">{value}</h3>
        {subValue && (
          <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full w-fit ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
            trend === 'down' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
            'bg-slate-700/30 text-slate-400 border border-slate-600/30'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={14} className="mr-1" /> : trend === 'down' ? <ArrowDownRight size={14} className="mr-1" /> : null}
            {subValue}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 ${colorClass} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 p-4 rounded-xl shadow-2xl min-w-[160px]">
        <p className="text-slate-400 text-xs mb-2 font-medium border-b border-slate-700/50 pb-2">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-white font-bold text-xl">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Volume</span>
          <span className="font-mono text-slate-200">{formatCompactNumber(payload[0].payload.volume)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const EmptyChart = ({ isLoading, mode }) => (
  <div className="flex flex-col items-center justify-center h-[450px] py-12 px-6 text-center">
    {isLoading ? (
      <>
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse rounded-full w-20 h-20"></div>
          <RefreshCw className="relative z-10 animate-spin text-emerald-400 w-12 h-12" />
        </div>
        <p className="text-slate-200 text-xl font-bold mb-2">
          {mode === 'online' ? 'Loading Market Data' : 'Loading CSV Data'}
        </p>
        <p className="text-slate-500 text-sm">
          {mode === 'online' ? 'Connecting to data stream...' : 'Parsing your file...'}
        </p>
      </>
    ) : (
      <>
        <BarChart2 className="text-slate-700 w-20 h-20 mb-6" />
        <p className="text-slate-300 text-xl font-bold mb-2">
          {mode === 'online' ? 'Select Asset' : 'Upload a CSV'}
        </p>
        <p className="text-slate-500 text-sm">
          {mode === 'online' ? 'Choose from sidebar to view chart' : 'Use your own file to analyze with the model'}
        </p>
      </>
    )}
  </div>
);

const RecentAnalysisFeed = () => {
  const [events, setEvents] = useState([
    { id: 1, time: '14:23:05', symbol: 'BTC', msg: 'Large buy order detected', value: '+125.5 BTC', type: 'success' },
    { id: 2, time: '14:21:12', symbol: 'AAPL', msg: 'Resistance level testing', value: '$182.50', type: 'info' },
    { id: 3, time: '14:15:45', symbol: 'NVDA', msg: 'Volume divergence', value: '2.1M Vol', type: 'alert' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false });
      const symbols = ['BTC', 'ETH', 'TSLA', 'AAPL', 'NVDA'];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];

      const scenarios = [
        { msg: 'Price Breakout', type: 'success', getValue: () => `+${(Math.random() * 5).toFixed(2)}%` },
        { msg: 'High Volatility Alert', type: 'alert', getValue: () => `${(Math.random() * 2 + 1).toFixed(1)}x Avg` },
        { msg: 'Large Block Trade', type: 'info', getValue: () => `$${(Math.random() * 5 + 1).toFixed(1)}M` },
        { msg: 'Support Level Hold', type: 'success', getValue: () => `$${(Math.random() * 1000 + 100).toFixed(2)}` },
        { msg: 'Selling Pressure', type: 'alert', getValue: () => `-${(Math.random() * 3).toFixed(2)}%` }
      ];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

      const newEvent = {
        id: Date.now(),
        time: timeString,
        symbol,
        msg: scenario.msg,
        value: scenario.getValue(),
        type: scenario.type
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 4)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      {events.map((e) => (
        <div key={e.id} className="relative overflow-hidden p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 animate-in fade-in slide-in-from-top-2 duration-500 group hover:bg-slate-800/50 transition-colors">
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
            e.type === 'alert' ? 'bg-amber-500' : e.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
          }`} />
          <div className="flex justify-between items-start pl-2">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-lg ${
                e.type === 'alert' ? 'bg-amber-500/10 text-amber-500' : e.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
              }`}>
                {e.type === 'alert' ? <AlertCircle size={14} /> : e.type === 'success' ? <TrendingUp size={14} /> : <Activity size={14} />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-white">{e.symbol}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Timer size={10} /> {e.time}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{e.msg}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold font-mono px-2 py-1 rounded-md ${
                 e.type === 'alert' ? 'bg-amber-500/10 text-amber-400' : e.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
              }`}>
                {e.value}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MarketAnalyzer = () => {
  const { user } = useAuth();
  
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeRange, setTimeRange] = useState('1M'); 
  const [isLoading, setIsLoading] = useState(true);

  const [rawCsvData, setRawCsvData] = useState([]);  // full CSV rows
  const [data, setData] = useState([]);              // data actually shown in chart
  const [livePrice, setLivePrice] = useState(0);
  const [prevPrice, setPrevPrice] = useState(0);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState('online'); // 'online' | 'csv'
  const [csvAssets, setCsvAssets] = useState([]); // dynamic asset list from CSV

  const baseAssets = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock', icon: Smartphone },
    { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'Stock', icon: Zap },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'Stock', icon: Cpu },
    { symbol: 'BTC', name: 'Bitcoin', type: 'Crypto', icon: Globe },
    { symbol: 'ETH', name: 'Ethereum', type: 'Crypto', icon: Activity },
  ];

  const timeOptions = [
    { label: 'Today', value: '1D' },
    { label: '1 Week', value: '1W' },
    { label: '1 Month', value: '1M' },
    { label: '1 Year', value: '1Y' },
  ];

  // asset list: base in online mode, CSV-derived in csv mode
  const assets = mode === 'online'
    ? baseAssets
    : (csvAssets.length ? csvAssets : baseAssets);

  // ONLINE data loading
  const fetchOnlineData = useCallback(() => {
    setIsLoading(true);
    const newData = generateMarketData(selectedSymbol, timeRange);
    setRawCsvData([]);
    setCsvAssets([]);
    setData(newData);
    const latest = newData[newData.length - 1];
    const previous = newData[newData.length - 2] || latest;
    setLivePrice(latest.price);
    setPrevPrice(previous.price);
    setIsLoading(false);
  }, [selectedSymbol, timeRange]);

  useEffect(() => {
    if (mode !== 'online') return;
    fetchOnlineData();
  }, [mode, fetchOnlineData]);

  // Filter function for CSV mode based on selectedSymbol
  const applyCsvFilterForSymbol = useCallback((allRows, symbol) => {
    const upperSymbol = symbol.toUpperCase();
    const filtered = allRows.filter(row => {
      if (row.symbol) {
        return row.symbol.toUpperCase() === upperSymbol;
      }
      return true;
    });
    const MAX_POINTS = 1500;
    let downsampled = filtered;
    if (filtered.length > MAX_POINTS) {
      const step = Math.ceil(filtered.length / MAX_POINTS);
      downsampled = filtered.filter((_, idx) => idx % step === 0);
    }
    return downsampled;
  }, []);

  // CSV upload handler (switch mode, build dynamic csvAssets)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setFileName(file.name);
    setMode('csv');

    const text = await file.text();
    const parsed = parseCsvToData(text);
    setRawCsvData(parsed);

    // build symbol list from CSV
    const symbolsFromCsv = Array.from(
      new Set(
        parsed
          .map(r => r.symbol)
          .filter(Boolean)
      )
    );
    const csvAssetObjects = symbolsFromCsv.map(sym => {
      // try to reuse icon/type from baseAssets if symbol matches
      const base = baseAssets.find(a => a.symbol === sym);
      return base || {
        symbol: sym,
        name: sym,
        type: 'Asset',
        icon: Globe,
      };
    });
    setCsvAssets(csvAssetObjects);

    // if current selectedSymbol is not in CSV, switch to first CSV symbol
    let effectiveSymbol = selectedSymbol;
    if (symbolsFromCsv.length > 0 && !symbolsFromCsv.includes(selectedSymbol)) {
      effectiveSymbol = symbolsFromCsv[0];
      setSelectedSymbol(effectiveSymbol);
    }

    const filteredForSymbol = applyCsvFilterForSymbol(parsed, effectiveSymbol);
    if (filteredForSymbol.length > 0) {
      setData(filteredForSymbol);
      const latest = filteredForSymbol[filteredForSymbol.length - 1];
      const previous = filteredForSymbol[filteredForSymbol.length - 2] || latest;
      setLivePrice(latest.price);
      setPrevPrice(previous.price);
    } else {
      setData([]);
      setLivePrice(0);
      setPrevPrice(0);
    }
    setIsLoading(false);
  };

  // Live price animation only in online mode
  useEffect(() => {
    if (mode !== 'online' || !livePrice) return;
    const interval = setInterval(() => {
      setLivePrice(prev => {
        const volatility = 0.002;
        const change = prev * (Math.random() - 0.5) * volatility;
        return Math.max(0.01, prev + change);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [mode, livePrice]);

  const priceChange = livePrice - prevPrice;
  const percentChange = prevPrice ? (priceChange / prevPrice) * 100 : 0;
  const isPositive = percentChange >= 0;
  
  const sentimentScore = useMemo(() => {
    if (!data || data.length < 2) return 50;
    return scoreSentimentFromSeries(data);
  }, [data]);

  const hasData = data.length > 1;

  // close CSV and reset to online mode
  const handleCloseCsvMode = () => {
    setMode('online');
    setFileName('');
    setRawCsvData([]);
    setCsvAssets([]);
    setData([]);
    setLivePrice(0);
    setPrevPrice(0);
    setIsLoading(true);
    fetchOnlineData();
  };

  // when switching asset, in CSV mode refilter CSV rows; in online, refetch
  const handleAssetClick = (asset) => {
    const isActive = selectedSymbol === asset.symbol;
    if (isActive) return;

    setSelectedSymbol(asset.symbol);

    if (mode === 'online') {
      setIsLoading(true);
      fetchOnlineData();
    } else {
      if (!rawCsvData.length) return;
      setIsLoading(true);
      const filtered = applyCsvFilterForSymbol(rawCsvData, asset.symbol);
      if (filtered.length > 0) {
        setData(filtered);
        const latest = filtered[filtered.length - 1];
        const previous = filtered[filtered.length - 2] || latest;
        setLivePrice(latest.price);
        setPrevPrice(previous.price);
      } else {
        setData([]);
        setLivePrice(0);
        setPrevPrice(0);
      }
      setIsLoading(false);
    }
  };

  const handleTimeChange = (value) => {
    setTimeRange(value);
    setIsTimeMenuOpen(false);
    if (mode === 'online') {
      setIsLoading(true);
      fetchOnlineData();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] opacity-40 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[0%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px] opacity-30" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-slate-900/50 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-slate-900 p-3 rounded-2xl border border-slate-700">
                <BarChart2 className="text-white w-8 h-8" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
                Market<span className="font-light text-indigo-400">Analyzer</span>
              </h1>
              <p className="text-slate-500 text-sm font-medium tracking-wide">
                {mode === 'csv' ? 'Upload your CSV and analyze with the model' : 'Professional Trading Dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode === 'csv' && (
              <button
                onClick={handleCloseCsvMode}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <XIcon size={14} className="text-slate-400" />
                Back to Online
              </button>
            )}

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm cursor-pointer hover:bg-slate-800 transition-colors">
              <Upload size={16} className="text-indigo-400" />
              <span>{fileName || 'Upload CSV file'}</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe size={14} /> Market Assets
              </h2>
              <div className="space-y-3">
                {assets.map((asset) => {
                  const isActive = selectedSymbol === asset.symbol;
                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => handleAssetClick(asset)}
                      className={`w-full group relative overflow-hidden p-3 rounded-2xl transition-all duration-300 border flex items-center gap-4 text-left ${
                        isActive 
                          ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                          : 'bg-slate-800/20 border-transparent hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl transition-colors duration-300 ${
                        isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                      }`}>
                        <asset.icon size={20} />
                      </div>
                      <div className="flex-1 z-10">
                        <p className={`font-bold text-base ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                          {asset.symbol}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{asset.name}</p>
                      </div>
                      {isActive && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} /> Live Analysis
                </h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </div>
              <RecentAnalysisFeed />
            </div>
            
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Model Ready</p>
                <p className="text-[10px] text-emerald-500/70 font-mono">
                  {mode === 'csv'
                    ? (hasData ? 'Using uploaded dataset' : 'Waiting for CSV')
                    : 'Online simulation active'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatCard 
                title="Live Price" 
                value={formatCurrency(livePrice)} 
                subValue={prevPrice ? `${isPositive ? '+' : ''}${percentChange.toFixed(2)}%` : 'N/A'}
                trend={prevPrice ? (isPositive ? 'up' : 'down') : undefined}
                icon={DollarSign}
                colorClass="text-indigo-400"
              />
              <StatCard 
                title={mode === 'csv' ? "Last Volume" : "24h Volume"} 
                value={formatCompactNumber(data[data.length-1]?.volume || 0)} 
                subValue={mode === 'csv'
                  ? (hasData ? "From uploaded data" : "No file")
                  : "Very High"}
                trend={hasData ? 'up' : undefined}
                icon={Activity}
                colorClass="text-violet-400"
              />
              <StatCard 
                title="Sentiment Score" 
                value={`${sentimentScore.toFixed(0)}`} 
                subValue={sentimentScore > 60 ? "Bullish" : sentimentScore < 40 ? "Bearish" : "Neutral"}
                trend={sentimentScore > 50 ? 'up' : 'down'}
                icon={Layout}
                colorClass="text-amber-400"
              />
            </div>

            {/* CHART */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    {selectedSymbol} <span className="text-slate-600 text-xl font-light">/ {mode === 'csv' ? 'CSV' : 'USD'}</span>
                  </h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                      {mode === 'csv' ? 'Uploaded data' : (assets.find(a => a.symbol === selectedSymbol)?.type || 'Asset')}
                    </span>
                    <span className="text-slate-500">
                      {mode === 'csv' ? (fileName || 'No file loaded') : 'Live Data'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                      <RefreshCw size={14} className="animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-wider">Loading</span>
                    </div>
                  )}
                  
                  <div className="relative">
                    <button 
                      onClick={() => setIsTimeMenuOpen(!isTimeMenuOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <Calendar size={16} className="text-indigo-400"/>
                      {timeOptions.find(o => o.value === timeRange)?.label || timeRange}
                      <ChevronDown size={14} className="text-slate-500" />
                    </button>
                    {isTimeMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        {timeOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleTimeChange(opt.value)}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                              timeRange === opt.value 
                                ? 'bg-indigo-600 text-white' 
                                : 'text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full h-[450px]">
                {hasData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.4}/>
                          <stop offset="80%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#475569" 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        tickLine={false}
                        axisLine={false}
                        minTickGap={40}
                        dy={10}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        stroke="#475569" 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val.toFixed(0)}`}
                        width={60}
                        dx={-5}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke={isPositive ? "#10b981" : "#ef4444"} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                      />
                      <ReferenceLine 
                        y={livePrice || 0} 
                        stroke={isPositive ? "#10b981" : "#ef4444"} 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{
                          value: formatCurrency(livePrice || 0),
                          position: 'top',
                          fill: isPositive ? '#10b981' : '#ef4444',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart isLoading={isLoading} mode={mode} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-center shadow-lg backdrop-blur-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                  {mode === 'csv' ? 'Previous Value' : 'Previous Close'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl text-white font-mono font-bold">
                    {prevPrice ? formatCurrency(prevPrice) : 'N/A'}
                  </span>
                  <span className="text-xs text-slate-500">{mode === 'csv' ? 'CSV' : 'USD'}</span>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-center shadow-lg backdrop-blur-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Daily Range</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl text-white font-mono font-bold">
                      {livePrice ? formatCurrency(livePrice * 0.98) : 'N/A'}
                    </span>
                  </div>
                  <div className="h-1 flex-1 mx-4 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500 w-1/2 mx-auto rounded-full opacity-50"></div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl text-white font-mono font-bold">
                      {livePrice ? formatCurrency(livePrice * 1.02) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketAnalyzer;
