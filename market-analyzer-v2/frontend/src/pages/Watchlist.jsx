import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { 
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
    TrendingUp, TrendingDown, Activity, Plus, X, 
    Search, Bitcoin, DollarSign, BarChart2, Zap 
} from 'lucide-react';

// --- Utility Components ---

const Card = ({ children, className = "" }) => (
    <div className={`relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl hover:border-slate-600 transition-all duration-300 ${className}`}>
        {children}
    </div>
);

const Badge = ({ children, type = 'neutral' }) => {
    const styles = {
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        neutral: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.neutral}`}>
            {children}
        </span>
    );
};

// --- Chart Components ---

// Mini sparkline for the main card view
const Sparkline = React.memo(({ data, color }) => (
    <div className="h-16 w-full opacity-70">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={color} 
                    strokeWidth={2} 
                    fill={`url(#gradient-${color})`} 
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
));

const DetailedPriceChart = React.memo(({ data }) => (
    <div className="h-64 w-full">
        <ResponsiveContainer>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis 
                    domain={['auto', 'auto']} 
                    orientation="right" 
                    tick={{fill: '#94a3b8', fontSize: 10}} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `$${val.toFixed(2)}`}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    itemStyle={{ color: '#3b82f6' }}
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff' }}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
));

// --- Main Watchlist Component ---

const Watchlist = () => {
    const { symbolData, isConnected } = useData();
    const [watchlistSymbols, setWatchlistSymbols] = useState(['AAPL', 'BTC', 'ETH', 'NVDA']);
    const [availableSymbols] = useState([
        'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD', 
        'BTC', 'ETH', 'XRP', 'ADA', 'SOL', 'DOGE'
    ]);
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const [expandedSymbol, setExpandedSymbol] = useState(null);
    
    // Throttled Data Logic (Preserved from original)
    const dataCacheRef = useRef({});
    const lastUpdateRef = useRef({});

    const getThrottledData = useCallback((symbol) => {
        const now = Date.now();
        
        // Return cached data if within 2 seconds (slightly faster updates for premium feel)
        if (lastUpdateRef.current[symbol] && now - lastUpdateRef.current[symbol] < 2000) {
            return dataCacheRef.current[symbol];
        }
        
        const data = symbolData[symbol] || {};
        const currentPrice = data.price || 100;
        const changePercent = data.changePercent || data.change24h || 0;
        
        // Generate trend data
        const historical = [];
        let trendPrice = currentPrice;
        for (let i = 0; i < 20; i++) {
            trendPrice = trendPrice * (1 + (Math.random() - 0.5) * 0.02);
            historical.unshift({
                time: i,
                price: trendPrice,
                volume: Math.random() * 1000
            });
        }
        // Ensure last point connects to current price
        historical.push({ time: 20, price: currentPrice, volume: Math.random() * 1000 });

        const chartData = {
            historical,
            currentData: data
        };
        
        dataCacheRef.current[symbol] = chartData;
        lastUpdateRef.current[symbol] = now;
        
        return chartData;
    }, [symbolData]);

    const handleAddSymbol = () => {
        if (selectedSymbol && !watchlistSymbols.includes(selectedSymbol)) {
            setWatchlistSymbols(prev => [...prev, selectedSymbol]);
            setSelectedSymbol('');
        }
    };

    const removeSymbol = (e, symbol) => {
        e.stopPropagation();
        setWatchlistSymbols(prev => prev.filter(s => s !== symbol));
        if (expandedSymbol === symbol) setExpandedSymbol(null);
    };

    // --- Renderers ---

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans selection:bg-blue-500/30">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto space-y-8">
                
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {isConnected ? 'System Operational' : 'Connection Lost'}
                            </span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                            Market Watch
                        </h1>
                    </div>

                    {/* Add Symbol Control */}
                    <div className="flex w-full md:w-auto gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 backdrop-blur-md">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                                value={selectedSymbol}
                                onChange={(e) => setSelectedSymbol(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-transparent text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">Add Asset...</option>
                                {availableSymbols.filter(s => !watchlistSymbols.includes(s)).map(s => (
                                    <option key={s} value={s} className="bg-slate-900">{s}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={handleAddSymbol}
                            disabled={!selectedSymbol}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {watchlistSymbols.map(symbol => {
                        const { currentData, historical } = getThrottledData(symbol);
                        const price = currentData.price || 0;
                        const change = currentData.changePercent || 0;
                        const isPositive = change >= 0;
                        const isCrypto = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'].includes(symbol);
                        const isExpanded = expandedSymbol === symbol;

                        return (
                            <Card 
                                key={symbol} 
                                className={`
                                    cursor-pointer group
                                    ${isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-slate-800/80 border-blue-500/50' : ''}
                                `}
                            >
                                <div onClick={() => setExpandedSymbol(isExpanded ? null : symbol)} className="h-full flex flex-col">
                                    
                                    {/* Card Header */}
                                    <div className="p-5 flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${isCrypto ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {isCrypto ? <Bitcoin className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white leading-none">{symbol}</h3>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {isCrypto ? 'Crypto Token' : 'Equity'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => removeSymbol(e, symbol)}
                                            className="text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Main Price Display */}
                                    <div className="px-5 pb-2">
                                        <div className="text-3xl font-mono font-bold text-white tracking-tighter">
                                            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge type={isPositive ? 'success' : 'danger'}>
                                                <div className="flex items-center gap-1">
                                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {Math.abs(change).toFixed(2)}%
                                                </div>
                                            </Badge>
                                            <span className="text-xs text-slate-500 font-mono">24h Vol: {(currentData.volume / 1000).toFixed(1)}k</span>
                                        </div>
                                    </div>

                                    {/* Sparkline (Always Visible) */}
                                    <div className="mt-auto pt-4">
                                        <Sparkline 
                                            data={historical} 
                                            color={isPositive ? '#10b981' : '#f43f5e'} 
                                        />
                                    </div>

                                    {/* Expanded Details Overlay */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-700/50 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Activity className="w-4 h-4" />
                                                    Detailed Analysis
                                                </div>
                                                <div className="flex gap-2">
                                                    <Badge type="blue">1H</Badge>
                                                    <Badge type="neutral">1D</Badge>
                                                    <Badge type="neutral">1W</Badge>
                                                </div>
                                            </div>
                                            
                                            <DetailedPriceChart data={historical} />
                                            
                                            <div className="grid grid-cols-3 gap-2 mt-4">
                                                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-slate-500 text-xs uppercase mb-1">High (24h)</div>
                                                    <div className="text-white font-mono text-sm">${(price * 1.02).toFixed(2)}</div>
                                                </div>
                                                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-slate-500 text-xs uppercase mb-1">Low (24h)</div>
                                                    <div className="text-white font-mono text-sm">${(price * 0.98).toFixed(2)}</div>
                                                </div>
                                                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-slate-500 text-xs uppercase mb-1">Mkt Cap</div>
                                                    <div className="text-white font-mono text-sm">{(price * 4.2).toFixed(1)}B</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                    
                    {/* Empty State / Add New Card */}
                    <button 
                        onClick={() => document.querySelector('select').focus()}
                        className="group flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-slate-900/40 transition-all"
                    >
                        <div className="p-4 rounded-full bg-slate-900 group-hover:bg-blue-500/20 transition-colors mb-3">
                            <Plus className="w-6 h-6 text-slate-600 group-hover:text-blue-400" />
                        </div>
                        <span className="text-slate-500 group-hover:text-slate-300 font-medium">Add Asset</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Re-export components for cleanliness if needed
import { CartesianGrid } from 'recharts';

export default Watchlist;