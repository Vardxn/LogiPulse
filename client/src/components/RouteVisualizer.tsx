'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Milestone, 
  Navigation, 
  Ship, 
  Train, 
  Truck 
} from 'lucide-react';

type OptimizationStrategy = 'dijkstra' | 'astar';

type TransportType = 'SEA' | 'RAIL' | 'ROAD';

interface RouteStep {
  id: string;
  from: string;
  to: string;
  transportType: TransportType;
  distanceKm: number;
  durationHours: number;
  cost: number;
  conditions: {
    congestion: 'LOW' | 'MEDIUM' | 'HIGH';
    weather: 'CLEAR' | 'CAUTION' | 'SEVERE';
  };
}

interface RoutePayload {
  strategy: OptimizationStrategy;
  totalDistanceKm: number;
  totalDurationHours: number;
  totalCost: number;
  path: RouteStep[];
}

interface RouteVisualizerProps {
  orderId: string;
}

export default function RouteVisualizer({ orderId }: RouteVisualizerProps) {
  const [strategy, setStrategy] = useState<OptimizationStrategy>('dijkstra');
  const [computedRoute, setComputedRoute] = useState<RoutePayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (currentStrategy: OptimizationStrategy) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5001/api/orders/${orderId}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: currentStrategy }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch route optimization details (${response.status})`);
      }

      const apiResponse = await response.json();
      
      // Perform data transformation
      const rawPath = JSON.parse(apiResponse.data.path); // Parses the stringified array

      const parsedPath = rawPath.map((leg: { nodeId: string; mode: string | null }, index: number) => ({
        id: leg.nodeId || index.toString(),
        from: index === 0 ? "Origin Node" : rawPath[index - 1].nodeId.substring(0, 8),
        to: leg.nodeId.substring(0, 8),
        transportType: leg.mode || 'ROAD', // Maps to Slate theme cleanly if null
        distanceKm: index === 0 ? 0 : Number(apiResponse.data.totalDistanceKm),
        durationHours: index === 0 ? 0 : Number(apiResponse.data.estimatedDurationHrs),
        cost: index === 0 ? 0 : Number(apiResponse.data.totalCost),
        conditions: {
          congestion: 'LOW', // System default fallback
          weather: 'CLEAR'
        }
      }));

      setComputedRoute({
        strategy: currentStrategy,
        totalDistanceKm: Number(apiResponse.data.totalDistanceKm),
        totalDurationHours: Number(apiResponse.data.estimatedDurationHrs),
        totalCost: Number(apiResponse.data.totalCost),
        path: parsedPath
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred calculations.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchRoute(strategy);
  }, [strategy, fetchRoute]);

  const getTransportStyles = (type: TransportType) => {
    switch (type) {
      case 'SEA':
        return {
          border: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
          icon: <Ship className="w-5 h-5" />,
          label: 'Sea Freight'
        };
      case 'RAIL':
        return {
          border: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
          icon: <Train className="w-5 h-5" />,
          label: 'Rail Network'
        };
      case 'ROAD':
        return {
          border: 'border-slate-500 bg-slate-50 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400',
          icon: <Truck className="w-5 h-5" />,
          label: 'Over-the-Road'
        };
    }
  };

  return (
    <div className="w-full space-y-6 p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-xl">
      {/* Header & Control Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            Route Network Visualizer
          </h2>
          <p className="text-xs text-slate-400 mt-1">Order Scope ID: <span className="font-mono text-slate-300">{orderId}</span></p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setStrategy('dijkstra')}
            disabled={isLoading}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              strategy === 'dijkstra'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white disabled:opacity-50'
            }`}
          >
            Dijkstra (Shortest)
          </button>
          <button
            onClick={() => setStrategy('astar')}
            disabled={isLoading}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              strategy === 'astar'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white disabled:opacity-50'
            }`}
          >
            A* (Heuristic Optimized)
          </button>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-900 rounded-lg flex items-start gap-3 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Route Topology Failure</h4>
            <p className="text-xs text-red-300/90 mt-1">{error}</p>
            <button 
              onClick={() => fetchRoute(strategy)} 
              className="mt-3 text-xs bg-red-900/60 border border-red-700 hover:bg-red-800 text-white px-3 py-1 rounded transition"
            >
              Retry Pipeline Execution
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-800/60 rounded-xl border border-slate-700/50" />
            ))}
          </div>
          <div className="space-y-4 pt-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-800/40 rounded-lg border border-slate-800" />
            ))}
          </div>
        </div>
      )}

      {/* Main Workspace Data */}
      {!isLoading && !error && computedRoute && (
        <>
          {/* Benchmarks metrics matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Milestone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Total Path Distance</span>
                <span className="text-xl font-bold text-white tracking-tight">{computedRoute.totalDistanceKm.toLocaleString()} km</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Estimated Transit Hours</span>
                <span className="text-xl font-bold text-white tracking-tight">{computedRoute.totalDurationHours} hrs</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Computed Financial Budget</span>
                <span className="text-xl font-bold text-white tracking-tight">${computedRoute.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Timeline Visualizer */}
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              Chronological Node Segment Leg Breakdown
            </h3>

            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[19px] sm:before:left-[23px] before:w-[2px] before:bg-slate-800">
              {computedRoute.path.map((step) => {
                const styles = getTransportStyles(step.transportType);
                const isHighCongestion = step.conditions.congestion === 'HIGH';
                const isSevereWeather = step.conditions.weather === 'SEVERE';

                return (
                  <div key={step.id} className="relative group">
                    {/* Node Icon Indicator */}
                    <div className={`absolute -left-[32px] sm:-left-[36px] top-1 p-1.5 rounded-full border-2 shadow-md z-10 transition-transform group-hover:scale-105 ${styles.border.split(' ')[0]} ${styles.border.split(' ')[1]} ${styles.border.split(' ')[2]}`}>
                      {styles.icon}
                    </div>

                    {/* Node Data Box */}
                    <div className={`p-4 rounded-lg border transition-all hover:border-slate-700 bg-slate-950/60 backdrop-blur-sm ${styles.border.split(' ')[0]}`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Routing Details */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                            <span>{step.from}</span>
                            <span className="text-slate-500 font-normal">➔</span>
                            <span>{step.to}</span>
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {styles.label}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                            <span>Dist: {step.distanceKm} km</span>
                            <span>Time: {step.durationHours} hrs</span>
                            <span>Cost: ${step.cost}</span>
                          </div>
                        </div>

                        {/* Condition Warnings Block */}
                        <div className="flex flex-wrap gap-2 items-center lg:justify-end">
                          {isHighCongestion && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 bg-amber-950/80 border border-amber-600/50 text-amber-400 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              High Congestion
                            </span>
                          )}
                          {isSevereWeather && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 bg-red-950/80 border border-red-600/50 text-red-400 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              Severe Weather
                            </span>
                          )}
                          {!isHighCongestion && !isSevereWeather && (
                            <span className="inline-flex items-center text-[10px] font-medium tracking-wide text-emerald-400 px-2 py-1 bg-emerald-950/20 border border-emerald-800/30 rounded">
                              Nominal Flow Status
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
