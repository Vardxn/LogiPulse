'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  FileCheck2, 
  FileText, 
  HelpCircle, 
  ShieldAlert 
} from 'lucide-react';

type ConfidenceStatus = 'HIGH' | 'MEDIUM' | 'LOW';

interface LineItem {
  sku: string;
  description: string;
  quantity: number;
  balanceCheck: boolean; // 40% weight
  dbSkuValidation: boolean; // 30% weight
  regexIntegrity: boolean; // 30% weight
}

interface BolDocument {
  id: string;
  vendorName: string;
  invoiceRef: string;
  shippingDate: string;
  confidence: ConfidenceStatus;
  items: LineItem[];
}

interface BolAuditWorkspaceProps {
  documentData: BolDocument;
  onAuditComplete?: (documentId: string) => void;
}

export default function BolAuditWorkspace({ documentData, onAuditComplete }: BolAuditWorkspaceProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const needsManualVerification = documentData.confidence !== 'HIGH';
  const allItems = documentData.items;

  const handleCheckboxChange = (sku: string, checked: boolean) => {
    setCheckedItems((prev) => ({
      ...prev,
      [sku]: checked,
    }));
  };

  const isOverrideDisabled = 
    needsManualVerification && 
    allItems.some((item) => !checkedItems[item.sku]);

  const handleOverrideAndCommit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/bol/${documentData.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedSkuList: Object.keys(checkedItems).filter((k) => checkedItems[k]),
          auditPassed: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Audit linking target failed with system status: ${response.status}`);
      }

      setIsSuccess(true);
      if (onAuditComplete) {
        onAuditComplete(documentData.id);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred committing ledger change overrides.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidenceBadge = (status: ConfidenceStatus) => {
    switch (status) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-wide rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            HIGH (Auto-Committed)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-wide rounded-full bg-amber-950 border border-amber-500 text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" />
            MEDIUM (Awaiting Review)
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-wide rounded-full bg-red-950 border border-red-500 text-red-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            LOW (Exception Target)
          </span>
        );
    }
  };

  // Heuristic custom visual evaluator (0.4 / 0.3 / 0.3 matrix weight calculation)
  const calculateHeuristicScore = (item: LineItem): number => {
    let score = 0;
    if (item.balanceCheck) score += 40;
    if (item.dbSkuValidation) score += 30;
    if (item.regexIntegrity) score += 30;
    return score;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-slate-100">
      
      {/* Workspace Header */}
      <div className="bg-slate-950 p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Bill of Lading Audit Workspace</h2>
            <p className="text-xs text-slate-400">Automated Parser ingestion pipelines verification node</p>
          </div>
        </div>
        <div>
          {getConfidenceBadge(documentData.confidence)}
        </div>
      </div>

      {/* Split Screen Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* Left Pane: Document Details Card */}
        <div className="lg:col-span-4 p-6 space-y-6 bg-slate-900/40">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Document Metadata
            </h3>
            
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 uppercase">Vendor Consignor</label>
                <div className="text-sm font-semibold text-white mt-0.5">{documentData.vendorName}</div>
              </div>
              
              <div>
                <label className="block text-[11px] font-medium text-slate-500 uppercase">Invoice Manifest Reference</label>
                <div className="text-sm font-mono font-medium text-indigo-300 mt-0.5">{documentData.invoiceRef}</div>
              </div>
              
              <div>
                <label className="block text-[11px] font-medium text-slate-500 uppercase">Recognized Shipping Date</label>
                <div className="text-sm font-medium text-slate-300 mt-0.5">{documentData.shippingDate}</div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 uppercase">Unique Ingestion ID</label>
                <div className="text-xs font-mono text-slate-500 mt-0.5 break-all">{documentData.id}</div>
              </div>
            </div>
          </div>

          {/* Context Advisory block context */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">Parser Logic Heuristics</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              System flags criteria mapping weight criteria dynamically: Balance Checks comprise 40% threshold metric, SKU validation matching acts as 30%, regex validation parses 30%.
            </p>
          </div>
        </div>

        {/* Right Pane: Operational Audit Matrix Ledger */}
        <div className="lg:col-span-8 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Operational Verification Audit Ledger Matrix
            </h3>

            {/* Matrix Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {needsManualVerification && <th className="p-3 w-12 text-center">Verify</th>}
                    <th className="p-3">SKU Identifier</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3 text-center">Balance (40%)</th>
                    <th className="p-3 text-center">DB SKU (30%)</th>
                    <th className="p-3 text-center">Regex (30%)</th>
                    <th className="p-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {allItems.map((item) => {
                    const totalScore = calculateHeuristicScore(item);
                    return (
                      <tr key={item.sku} className="hover:bg-slate-900/40 transition">
                        
                        {/* Interactive Manual Checkbox */}
                        {needsManualVerification && (
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!checkedItems[item.sku]}
                              onChange={(e) => handleCheckboxChange(item.sku, e.target.checked)}
                              className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:ring-offset-slate-950 focus:ring-2"
                            />
                          </td>
                        )}

                        <td className="p-3 font-mono font-medium text-slate-300">
                          <div>{item.sku}</div>
                          <div className="text-[10px] text-slate-500 font-sans truncate max-w-[150px]">{item.description}</div>
                        </td>

                        <td className="p-3 font-semibold text-slate-300">{item.quantity}</td>

                        {/* Heuristic Matrix Column Metrics */}
                        <td className="p-3 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.balanceCheck ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.dbSkuValidation ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.regexIntegrity ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </td>

                        {/* Dynamic Computed Scoring Metric */}
                        <td className="p-3 text-right font-bold font-mono">
                          <span className={totalScore === 100 ? 'text-emerald-400' : totalScore >= 70 ? 'text-amber-400' : 'text-red-400'}>
                            {totalScore}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Commit Operational Action Footbar */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {needsManualVerification ? (
                <p className="text-xs text-slate-400">
                  {allItems.filter(i => checkedItems[i.sku]).length} of {allItems.length} exceptions evaluated manually.
                </p>
              ) : (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Document auto-validated. Ready to target.
                </p>
              )}
              {submitError && <p className="text-xs text-red-400 font-medium mt-1">{submitError}</p>}
              {isSuccess && <p className="text-xs text-emerald-400 font-medium mt-1">Order linked confirmed successfully.</p>}
            </div>

            <button
              onClick={handleOverrideAndCommit}
              disabled={isOverrideDisabled || isSubmitting || isSuccess}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all uppercase ${
                isOverrideDisabled || isSubmitting || isSuccess
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 border border-indigo-500/40 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? 'Processing Commit...' : 'Override & Commit to Order'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
