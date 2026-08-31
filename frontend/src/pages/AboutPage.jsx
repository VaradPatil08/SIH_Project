import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Cpu, 
  Layers, 
  Database, 
  CheckCircle2, 
  ShieldCheck, 
  Code2, 
  LineChart, 
  GitBranch, 
  Sparkles,
  Server
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] font-sans text-foreground transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Back Link & Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 min-h-[36px] text-xs sm:text-sm font-semibold text-muted hover:text-navy transition-colors rounded p-1 group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Live Trains</span>
          </Link>

          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-navy border border-blue-200 font-semibold">
            System Architecture & Methodology
          </span>
        </div>

        {/* Hero Header */}
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-navy border border-blue-200 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-transit-green inline-block animate-pulse" />
            <span>PredicTrack ML ETA Architecture</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-navy tracking-tight leading-tight">
            Dynamic Machine Learning ETA Engine
          </h1>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Standard Indian Railways passenger tracking relies on static timetable extrapolation or basic linear speed averages. PredicTrack applies section-level Machine Learning to model live track block clearance, precedence conflicts, and corridor recovery.
          </p>
        </div>

        {/* Section: Evaluation Scope & Transparency */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="p-5 sm:p-6 rounded-xl border border-border bg-white shadow-card space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2 font-bold text-sm text-navy">
              <ShieldCheck className="w-4 h-4 text-transit-green" />
              <span>Demonstration & Evaluation Disclosure</span>
            </div>
            <span className="text-xs text-muted font-medium">Smart India Hackathon 2026</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Active Architecture */}
            <div className="p-4 rounded-lg bg-slate-50 border border-border space-y-2">
              <div className="font-semibold text-xs text-navy flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-transit-green" />
                <span>Implemented Architecture (Active)</span>
              </div>
              <ul className="space-y-1.5 text-muted leading-relaxed pl-1">
                <li>• FastAPI REST service exposing live query and telemetry endpoints.</li>
                <li>• Leaflet GIS spatial coordinate routing with speed metrics.</li>
                <li>• Reactive client polling loop updating telemetry state every 6s.</li>
                <li>• Station-level root-cause diagnostic mapping engine.</li>
              </ul>
            </div>

            {/* Simulated Factors */}
            <div className="p-4 rounded-lg bg-slate-50 border border-border space-y-2">
              <div className="font-semibold text-xs text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-navy" />
                <span>Simulated Factors (Demonstration)</span>
              </div>
              <ul className="space-y-1.5 text-muted leading-relaxed pl-1">
                <li>• Block section occupancy feeds are simulated from historical corridor patterns.</li>
                <li>• Synthetic GPS coordinate interpolation is animated for smooth motion.</li>
                <li>• Client offline fallback data guarantees demo resilience if local backend is stopped.</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Section: ML Pipeline Stages */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-navy" />
              <h2 className="font-bold text-base text-navy">
                Machine Learning Pipeline
              </h2>
            </div>
            <span className="text-xs text-muted">4-Stage Pipeline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stage 1 */}
            <div className="p-5 rounded-xl border border-border bg-white shadow-card space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-navy border border-blue-200 inline-block">
                  Stage 01
                </span>
                <h3 className="font-bold text-sm text-navy">
                  Section Ingestion
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Ingests live coordinate streams, sectional velocity, origin elapsed minutes, and base timetable offsets.
                </p>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="p-5 rounded-xl border border-border bg-white shadow-card space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-navy border border-blue-200 inline-block">
                  Stage 02
                </span>
                <h3 className="font-bold text-sm text-navy">
                  Precedence Matrix
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Factors in preceding rake occupancy, freight vs superfast precedence, and temporary speed restrictions (TSR).
                </p>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="p-5 rounded-xl border border-border bg-white shadow-card space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-navy border border-blue-200 inline-block">
                  Stage 03
                </span>
                <h3 className="font-bold text-sm text-navy">
                  Delay Regression
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Gradient Boosted Regressor estimates compound delay propagation and quad-track buffer recovery curves.
                </p>
              </div>
            </div>

            {/* Stage 4 */}
            <div className="p-5 rounded-xl border border-border bg-white shadow-card space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-navy border border-blue-200 inline-block">
                  Stage 04
                </span>
                <h3 className="font-bold text-sm text-navy">
                  Attribution Mapping
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Maps feature importance vectors to human-readable station delay reasons (platform wait, maintenance block).
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Section: Feature Weighting Set */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-navy" />
              <h2 className="font-bold text-base text-navy">
                Model Feature Set
              </h2>
            </div>
            <span className="text-xs text-muted">Corridor Variables</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            <div className="p-4 rounded-xl border border-border bg-white shadow-card space-y-1.5">
              <div className="font-mono font-bold text-xs text-navy">HEADWAY_DELTA_MIN</div>
              <p className="text-muted leading-relaxed">Time headway gap to preceding rake in active block section.</p>
            </div>
            
            <div className="p-4 rounded-xl border border-border bg-white shadow-card space-y-1.5">
              <div className="font-mono font-bold text-xs text-navy">QUAD_TRACK_BUFFER_RECOVERY</div>
              <p className="text-muted leading-relaxed">Statistical probability of recovering slack time along quad-line corridors.</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-white shadow-card space-y-1.5">
              <div className="font-mono font-bold text-xs text-navy">PLATFORM_DWELL_INDEX</div>
              <p className="text-muted leading-relaxed">Expected terminus yard interlocking hold time and platform clearing delay.</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-white shadow-card space-y-1.5">
              <div className="font-mono font-bold text-xs text-navy">VISIBILITY_RESTRICTION_FLAG</div>
              <p className="text-muted leading-relaxed">Fog and monsoon speed reduction cautions along Northern/Western rail zones.</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-white shadow-card space-y-1.5">
              <div className="font-mono font-bold text-xs text-navy">OHE_VOLTAGE_STABILITY</div>
              <p className="text-muted leading-relaxed">Substation power block clearances and overhead catenary maintenance.</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-white shadow-card space-y-1.5">
              <div className="font-mono font-bold text-xs text-navy">RAKE_CLASS_PRECEDENCE</div>
              <p className="text-muted leading-relaxed">Vande Bharat & Rajdhani priority weights against freight and passenger services.</p>
            </div>
          </div>
        </section>

        {/* Section: REST API Contract */}
        <section className="space-y-4 pb-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-navy" />
              <h2 className="font-bold text-base text-navy">
                REST API Endpoints Contract
              </h2>
            </div>
            <span className="text-xs text-muted">FastAPI Service</span>
          </div>

          <div className="rounded-xl border border-border bg-white shadow-card divide-y divide-border overflow-hidden text-xs">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-navy font-mono font-bold text-xs border border-blue-200">GET</span>
                <span className="font-mono font-semibold text-navy">/trains</span>
              </div>
              <span className="text-muted">Returns all available coaching trains in network</span>
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-navy font-mono font-bold text-xs border border-blue-200">GET</span>
                <span className="font-mono font-semibold text-navy">/trains/{'{train_number}'}/route</span>
              </div>
              <span className="text-muted">Returns full station list with GIS coordinates</span>
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-navy font-mono font-bold text-xs border border-blue-200">GET</span>
                <span className="font-mono font-semibold text-navy">/trains/{'{train_number}'}/eta</span>
              </div>
              <span className="text-muted">Returns dynamic delay predictions and current GPS position</span>
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-navy font-mono font-bold text-xs border border-blue-200">GET</span>
                <span className="font-mono font-semibold text-navy">/trains/{'{train_number}'}/eta/{'{station_code}'}/reasons</span>
              </div>
              <span className="text-muted">Returns station root cause diagnostic reasons</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

