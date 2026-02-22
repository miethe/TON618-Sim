import React, { useEffect, useRef, useState } from 'react';
import { BlackHoleRenderer, SimulationState } from './lib/renderer';
import { Settings, Eye, Activity, Clock, Maximize2, Info, GraduationCap } from 'lucide-react';
import { Tutorial } from './components/Tutorial';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BlackHoleRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  
  const [state, setState] = useState<SimulationState>({
    viewMode: 0,
    wavelength: 0,
    timeSpeed: 1.0,
    showMilkyWay: false,
    showJets: true,
    cameraDistance: 12.0,
    cameraAngleX: 0.3,
    cameraAngleY: 0.0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;

    const initRenderer = async () => {
      try {
        const renderer = new BlackHoleRenderer(canvasRef.current!);
        await renderer.init();
        rendererRef.current = renderer;
        renderer.state = state;
      } catch (err: any) {
        setError(err.message || 'Failed to initialize WebGPU.');
      }
    };

    initRenderer();

    return () => {
      rendererRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.state = state;
    }
  }, [state]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    setState(prev => ({
      ...prev,
      cameraAngleY: prev.cameraAngleY - dx * 0.01,
      cameraAngleX: Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, prev.cameraAngleX + dy * 0.01))
    }));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    setState(prev => ({
      ...prev,
      cameraDistance: Math.max(3.0, Math.min(300.0, prev.cameraDistance + e.deltaY * 0.05))
    }));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-red-500 font-mono p-4 text-center">
        <div>
          <h1 className="text-2xl mb-2">WebGPU Error</h1>
          <p>{error}</p>
          <p className="mt-4 text-sm text-gray-400">Please ensure you are using a WebGPU-compatible browser (e.g., Chrome 113+).</p>
        </div>
      </div>
    );
  }

  // Calculate dynamic metrics based on camera distance
  const currentRadius = state.cameraDistance;
  const timeDilation = Math.sqrt(Math.max(0, 1 - 1.0 / currentRadius)).toFixed(4);
  const distanceAU = (currentRadius * 1300).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white selection:bg-indigo-500/30">
      {/* WebGPU Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <header className="flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-indigo-400">
              TON 618
            </h1>
            <p className="text-xs font-mono text-gray-400 tracking-widest uppercase mt-1">
              Ultramassive Black Hole Simulation
            </p>
          </div>
          
          {/* Live Metrics Panel */}
          <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 w-64 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-300">
              <Activity size={16} className="text-orange-400" />
              Telemetry
            </div>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Mass</span>
                <span>6.6×10¹⁰ M☉</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Schwarzschild (Rs)</span>
                <span>1,300 AU</span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between">
                <span className="text-gray-500">Observer Dist.</span>
                <span>{distanceAU} AU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time Dilation</span>
                <span className={Number(timeDilation) < 0.5 ? 'text-red-400' : 'text-emerald-400'}>
                  {timeDilation}x
                </span>
              </div>
              {state.showMilkyWay && (
                <>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between text-indigo-300">
                    <span>Hologram Scale</span>
                    <span>1 : 2.4 Million</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Controls Dashboard */}
        <div className="pointer-events-auto flex gap-4 items-end">
          
          {/* Main Controls */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl flex gap-8">
            
            {/* View Mode */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Eye size={14} /> View Mode
              </label>
              <div className="flex flex-col gap-2">
                {['Classic (Visible)', 'Gravity / Spacetime', 'Matter Density', 'Time / Energy'].map((mode, idx) => (
                  <button
                    key={mode}
                    onClick={() => setState(s => ({ ...s, viewMode: idx }))}
                    className={`text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                      state.viewMode === idx 
                        ? 'bg-white/20 text-white font-medium' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px bg-white/10" />

            {/* Wavelength */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Settings size={14} /> Wavelength
              </label>
              <div className="flex flex-col gap-2">
                {['Visible Light', 'X-Ray', 'Radio', 'Infrared'].map((wave, idx) => (
                  <button
                    key={wave}
                    onClick={() => setState(s => ({ ...s, wavelength: idx }))}
                    className={`text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                      state.wavelength === idx 
                        ? 'bg-white/20 text-white font-medium' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    {wave}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px bg-white/10" />

            {/* Sliders & Toggles */}
            <div className="space-y-6 min-w-[200px] flex flex-col justify-center">
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Clock size={14} /> Time Speed
                  </label>
                  <span className="text-xs font-mono">{state.timeSpeed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="5" step="0.1"
                  value={state.timeSpeed}
                  onChange={(e) => setState(s => ({ ...s, timeSpeed: parseFloat(e.target.value) }))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <button
                onClick={() => setState(s => ({ ...s, showJets: !s.showJets }))}
                className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-all ${
                  state.showJets 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' 
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Activity size={16} />
                {state.showJets ? 'Hide Polar Jets' : 'Show Polar Jets'}
              </button>

              <button
                onClick={() => setState(s => ({ 
                  ...s, 
                  showMilkyWay: !s.showMilkyWay,
                  cameraDistance: !s.showMilkyWay ? 150.0 : 12.0,
                  cameraAngleX: !s.showMilkyWay ? 0.8 : 0.3
                }))}
                className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-all ${
                  state.showMilkyWay 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' 
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Maximize2 size={16} />
                {state.showMilkyWay ? 'Return to Local View' : 'Milky Way Scale'}
              </button>

            </div>
          </div>
          
          {/* Info Tooltip & Tutorial Button */}
          <div className="flex gap-3">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-3 text-gray-400 hover:text-white transition-colors cursor-help group relative">
              <Info size={20} />
              <div className="absolute bottom-full left-0 mb-4 w-64 p-4 bg-zinc-900 border border-white/10 rounded-xl text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                <p className="mb-2"><strong className="text-white">Drag</strong> to rotate camera.</p>
                <p><strong className="text-white">Scroll</strong> to zoom in/out.</p>
                <p className="mt-2 text-gray-500 italic">Raymarching uses approximate null geodesics for real-time gravitational lensing.</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowTutorial(true)}
              className="bg-indigo-500/20 backdrop-blur-md border border-indigo-500/50 rounded-full p-3 text-indigo-300 hover:bg-indigo-500/40 hover:text-white transition-colors shadow-lg shadow-indigo-500/20 pointer-events-auto"
              title="Start Tutorial"
            >
              <GraduationCap size={20} />
            </button>
          </div>

        </div>

        {/* Tutorial Overlay */}
        {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} setSimState={setState} />}
      </div>
    </div>
  );
}
