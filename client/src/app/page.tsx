'use client';

import React from 'react';
import RouteVisualizer from '../components/RouteVisualizer';
import BolAuditWorkspace from '../components/BolAuditWorkspace';

// Mock data to demonstrate BolAuditWorkspace on initial landing load
const mockBolData = {
  id: "bol-uuid-999-nexus",
  vendorName: "Nexus Freight Logistics",
  invoiceRef: "INV-2026-ALPHA",
  shippingDate: "2026-07-13",
  confidence: "MEDIUM" as const,
  items: [
    {
      sku: "SKU-DRY-ICE-99",
      description: "Dry Ice cooling agent block 10kg",
      quantity: 5,
      balanceCheck: true,
      dbSkuValidation: true,
      regexIntegrity: true
    },
    {
      sku: "SKU-THERMO-BOX-100",
      description: "Insulated temperature protective shipping box",
      quantity: 2,
      balanceCheck: true,
      dbSkuValidation: true,
      regexIntegrity: true
    },
    {
      sku: "SKU-UNKNOWN-PART-55",
      description: "Ad-hoc accessory component",
      quantity: 10,
      balanceCheck: false,
      dbSkuValidation: false,
      regexIntegrity: true
    }
  ]
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black tracking-tighter">
              LP
            </div>
            <span className="font-bold tracking-tight text-white">LogiPulse Control Panel</span>
          </div>
          <div className="text-xs text-slate-500">
            Tenant Active Scope: <span className="font-mono text-slate-400">Global Logistics Corp</span>
          </div>
        </div>
      </header>

      {/* Main Page Layout Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* Banner Section */}
        <section className="bg-gradient-to-r from-emerald-950/30 to-indigo-950/30 border border-slate-800/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Ingestion Pipeline & Operations Control
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Monitor real-time routing engines (Dijkstra vs A* heuristics), trace vehicle telemetry feeds, and audit incoming Bill of Ladings via strict OCR validation tables.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="h-2 w-2 bg-emerald-400 rounded-full animate-ping mt-1" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Live Hub</span>
          </div>
        </section>

        {/* Dashboard Grid Workspace */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* Bill of Lading Audit Desk */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Audit Operations
            </h2>
            <BolAuditWorkspace 
              documentData={mockBolData} 
              onAuditComplete={(docId) => console.log(`Audit complete: ${docId}`)}
            />
          </section>

          {/* Route Visualizer Module */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Optimal Freight Routing Path
            </h2>
            <RouteVisualizer orderId="c3a0d999-e789-6c0d-0716-bb003c376003" />
          </section>

        </div>
      </main>
    </div>
  );
}
