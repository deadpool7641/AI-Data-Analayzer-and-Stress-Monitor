export default function HRAalerts() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-900/20 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl text-center">
          HR Alerts
        </h1>

        <div className="bg-gradient-to-br from-gray-900/80 to-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-10 shadow-2xl max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/40 rounded-2xl p-8">
            <h3 className="font-black text-xl text-red-300 mb-4">High Stress Alert</h3>
            <p className="text-gray-200 text-lg">
              Employee ID 123 • Score 85 • 2:30 PM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
