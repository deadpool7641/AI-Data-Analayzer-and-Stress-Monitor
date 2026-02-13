import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const MarketOverview = () => {
  const { marketData, isConnected } = useData();

  useEffect(() => {
    console.log('MarketOverview: isConnected:', isConnected);
    console.log('MarketOverview: marketData:', marketData);
  }, [isConnected, marketData]);

  const hasData =
    marketData &&
    (Object.keys(marketData.crypto || {}).length > 0 ||
      Object.keys(marketData.stocks || {}).length > 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500">
            Market Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Real-time snapshot of your tracked markets across assets.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-gray-700/60 bg-gray-900/70 px-3 py-1.5 text-xs sm:text-sm shadow-lg shadow-black/40 backdrop-blur">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="font-medium text-gray-200">
            {isConnected ? 'Live Data Stream' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Content */}
      {isConnected && hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
          {/* Crypto Card */}
          {marketData.crypto && Object.keys(marketData.crypto).length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 shadow-xl shadow-black/40 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/20">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="relative h-full p-5 sm:p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">
                    Cryptocurrency
                  </h2>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-emerald-300">
                    Digital Assets
                  </span>
                </div>

                <div className="space-y-2.5 text-sm sm:text-base text-gray-300">
                  {Object.entries(marketData.crypto).map(([symbol, price]) => (
                    <div
                      key={symbol}
                      className="flex items-center justify-between rounded-lg bg-gray-900/60 px-3 py-2"
                    >
                      <span className="font-medium text-gray-200">
                        {symbol}
                      </span>
                      <span className="font-semibold text-amber-300">
                        ${Number(price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stocks Card */}
          {marketData.stocks && Object.keys(marketData.stocks).length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 shadow-xl shadow-black/40 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/20">
              <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="relative h-full p-5 sm:p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">
                    Stocks
                  </h2>
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-cyan-300">
                    Equities
                  </span>
                </div>

                <div className="space-y-2.5 text-sm sm:text-base text-gray-300">
                  {Object.entries(marketData.stocks).map(([symbol, price]) => (
                    <div
                      key={symbol}
                      className="flex items-center justify-between rounded-lg bg-gray-900/60 px-3 py-2"
                    >
                      <span className="font-medium text-gray-200">
                        {symbol}
                      </span>
                      <span className="font-semibold text-sky-300">
                        ${Number(price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for future categories */}
          {/* <div>…</div> */}
        </div>
      ) : (
        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-gray-700/80 bg-gray-900/60 px-4 text-center">
          <p className="text-sm sm:text-base text-gray-400">
            {isConnected
              ? 'Waiting for live market data…'
              : 'Disconnected from market stream. Ensure the backend server is running and reachable.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MarketOverview;
