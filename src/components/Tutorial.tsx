import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, GraduationCap } from 'lucide-react';
import { SimulationState } from '../lib/renderer';

interface TutorialProps {
  onClose: () => void;
  setSimState: React.Dispatch<React.SetStateAction<SimulationState>>;
}

const TUTORIAL_STEPS = [
  {
    title: "Welcome to TON 618",
    content: "You are looking at one of the most massive black holes ever discovered, weighing 66 billion times the mass of our Sun. This interactive simulation renders relativistic physics in real-time.",
    action: (set: any) => set((s: any) => ({ ...s, viewMode: 0, wavelength: 0, showMilkyWay: false }))
  },
  {
    title: "Camera Controls",
    content: "Click and drag anywhere on the screen to rotate your view around the black hole. Scroll your mouse wheel to zoom in and out. Try looking at it from the top down!",
  },
  {
    title: "The Accretion Disk",
    content: "The glowing ring is the accretion disk—superheated gas swirling at relativistic speeds. Notice how one side is brighter? That's Doppler beaming: gas moving toward you appears brighter and bluer.",
  },
  {
    title: "Gravitational Lensing",
    content: "The immense gravity bends light itself. The ring you see over the top and bottom is actually the back of the accretion disk, visually warped by curved spacetime.",
  },
  {
    title: "Visualization Modes",
    content: "Let's look at the underlying physics. We've switched your view to 'Gravity / Spacetime' to visualize the topological distortion of the gravitational well.",
    action: (set: any) => set((s: any) => ({ ...s, viewMode: 1 }))
  },
  {
    title: "Multi-Wavelength",
    content: "Astrophysicists use different wavelengths to study black holes. Here is the X-Ray view, highlighting the most energetic particles in the accretion disk and polar jets.",
    action: (set: any) => set((s: any) => ({ ...s, viewMode: 0, wavelength: 1 }))
  },
  {
    title: "Galactic Scale",
    content: "To truly understand its size, let's zoom out. A holographic projection of the Milky Way galaxy is shown below TON 618. Notice that even at this massive scale, the black hole is still visible!",
    action: (set: any) => set((s: any) => ({ ...s, wavelength: 0, showMilkyWay: true, cameraDistance: 150.0, cameraAngleX: 0.8 }))
  },
  {
    title: "Explore",
    content: "You're now ready to explore TON 618. Use the telemetry panel and controls to experiment with the simulation. Enjoy your journey through spacetime!",
    action: (set: any) => set((s: any) => ({ ...s, showMilkyWay: false, cameraDistance: 12.0 }))
  }
];

export function Tutorial({ onClose, setSimState }: TutorialProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const currentStep = TUTORIAL_STEPS[step];
    if (currentStep.action) {
      currentStep.action(setSimState);
    }
  }, [step, setSimState]);

  const next = () => setStep(s => Math.min(TUTORIAL_STEPS.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="absolute top-24 right-6 w-80 bg-black/60 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="bg-indigo-500/20 px-4 py-3 flex justify-between items-center border-b border-indigo-500/30">
        <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
          <GraduationCap size={18} />
          Interactive Guide
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-2">{TUTORIAL_STEPS[step].title}</h3>
        <p className="text-sm text-gray-300 leading-relaxed min-h-[80px]">
          {TUTORIAL_STEPS[step].content}
        </p>
      </div>

      <div className="px-5 py-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
        <div className="flex gap-1">
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-indigo-400' : 'bg-gray-600'}`} />
          ))}
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={prev} 
            disabled={step === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          {step < TUTORIAL_STEPS.length - 1 ? (
            <button 
              onClick={next}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
