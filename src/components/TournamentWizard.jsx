import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const RocketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const UploadCloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0012 0V2z" />
  </svg>
);

const DollarSignIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_TYPES = [
  "Cricket", "Football", "Basketball", "Kabaddi", "Badminton",
  "Tennis", "Hockey", "Volleyball", "Table Tennis", "Esports",
];

const STEPS = [
  { id: 1, label: "Identity",    Icon: TrophyIcon    },
  { id: 2, label: "Financials",  Icon: DollarSignIcon },
  { id: 3, label: "Franchises",  Icon: UsersIcon      },
  { id: 4, label: "Player Pool", Icon: ListIcon       },
];

const INITIAL_FORM_DATA = {
  tournamentName: "",
  sportType: "",
  startingPurse: "",
  maxPlayers: "",
  teams: [{ name: "", owner: "" }],
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white " +
  "placeholder-white/30 outline-none transition-all duration-200 " +
  "focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 " +
  "hover:border-white/20 text-sm";

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-white/50 mb-2";

// ─── Step Header ──────────────────────────────────────────────────────────────

const StepHeader = ({ title, subtitle }) => (
  <div className="mb-6">
    <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
    <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>
  </div>
);

// ─── Step 1 – Identity ────────────────────────────────────────────────────────

const StepIdentity = ({ formData, onChange }) => (
  <div className="space-y-5">
    <StepHeader
      title="Tournament Identity"
      subtitle="Give your tournament a name and define the sport."
    />
    <div>
      <label className={labelClass}>Tournament Name</label>
      <input
        type="text"
        className={inputClass}
        placeholder="e.g. Premier Auction League Season 3"
        value={formData.tournamentName}
        onChange={e => onChange("tournamentName", e.target.value)}
        autoFocus
      />
    </div>
    <div>
      <label className={labelClass}>Sport Type</label>
      <div className="relative">
        <select
          className={
            inputClass + " appearance-none cursor-pointer pr-10 " +
            (formData.sportType ? "text-white" : "text-white/30")
          }
          value={formData.sportType}
          onChange={e => onChange("sportType", e.target.value)}
        >
          <option value="" disabled className="bg-[#0f0f24] text-white/30">
            Select a sport…
          </option>
          {SPORT_TYPES.map(sport => (
            <option key={sport} value={sport} className="bg-[#0f0f24] text-white">
              {sport}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </div>
  </div>
);

// ─── Step 2 – Financials ──────────────────────────────────────────────────────

const StepFinancials = ({ formData, onChange }) => (
  <div className="space-y-5">
    <StepHeader
      title="Financial Setup"
      subtitle="Configure the bidding purse and squad size limits."
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div>
        <label className={labelClass}>Starting Purse (₹)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">₹</span>
          <input
            type="number"
            min={0}
            className={inputClass + " pl-8"}
            placeholder="e.g. 1000000"
            value={formData.startingPurse}
            onChange={e => onChange("startingPurse", e.target.value)}
          />
        </div>
        <p className="mt-1.5 text-xs text-white/30">Budget per franchise owner.</p>
      </div>
      <div>
        <label className={labelClass}>Max Players Per Team</label>
        <input
          type="number"
          min={1}
          max={100}
          className={inputClass}
          placeholder="e.g. 15"
          value={formData.maxPlayers}
          onChange={e => onChange("maxPlayers", e.target.value)}
        />
        <p className="mt-1.5 text-xs text-white/30">Maximum squad size per franchise.</p>
      </div>
    </div>

    {(formData.startingPurse || formData.maxPlayers) && (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-4 pt-2"
      >
        {formData.startingPurse && (
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
            <p className="text-xs text-purple-400/70 uppercase tracking-widest mb-1">Purse</p>
            <p className="text-xl font-bold text-purple-300">
              ₹{Number(formData.startingPurse).toLocaleString("en-IN")}
            </p>
          </div>
        )}
        {formData.maxPlayers && (
          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4">
            <p className="text-xs text-cyan-400/70 uppercase tracking-widest mb-1">Squad Cap</p>
            <p className="text-xl font-bold text-cyan-300">{formData.maxPlayers} players</p>
          </div>
        )}
      </motion.div>
    )}
  </div>
);

// ─── Step 3 – Franchises ──────────────────────────────────────────────────────

const StepFranchises = ({ formData, onTeamChange, onAddTeam, onRemoveTeam }) => (
  <div className="space-y-5">
    <StepHeader
      title="Franchise Setup"
      subtitle="Register each franchise team and their owner."
    />
    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {formData.teams.map((team, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 border border-white/10
              flex items-center justify-center text-xs font-bold text-white/40">
              {idx + 1}
            </span>
            <input
              type="text"
              className={inputClass + " flex-1"}
              placeholder="Team Name"
              value={team.name}
              onChange={e => onTeamChange(idx, "name", e.target.value)}
            />
            <input
              type="text"
              className={inputClass + " flex-1"}
              placeholder="Owner"
              value={team.owner}
              onChange={e => onTeamChange(idx, "owner", e.target.value)}
            />
            <button
              onClick={() => onRemoveTeam(idx)}
              disabled={formData.teams.length === 1}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                text-white/20 hover:text-red-400 hover:bg-red-500/10 border border-white/5
                hover:border-red-500/30 transition-all duration-200
                disabled:opacity-20 disabled:cursor-not-allowed"
              title="Remove team"
            >
              <TrashIcon />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
    <button
      onClick={onAddTeam}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl
        border border-dashed border-white/20 text-white/50
        hover:border-purple-500/50 hover:text-purple-300 hover:bg-purple-500/5
        transition-all duration-200 text-sm font-medium w-full justify-center"
    >
      <PlusIcon />
      Add Franchise
    </button>
  </div>
);

// ─── Step 4 – Player Pool ─────────────────────────────────────────────────────

const StepPlayerPool = ({ onFileDrop, onFileSelect, dragActive, setDragActive, csvFile }) => {
  const handleDragOver = e => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);
  const handleDrop = e => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileDrop(file);
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="Player Pool"
        subtitle="Upload a CSV file to populate the auction player pool."
      />
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "flex flex-col items-center justify-center gap-4 rounded-2xl",
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          "min-h-[200px] px-8 text-center select-none",
          dragActive
            ? "border-purple-500/70 bg-purple-500/10 scale-[1.01]"
            : csvFile
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-white/15 bg-white/[0.02] hover:border-purple-500/40 hover:bg-purple-500/5",
        ].join(" ")}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
        />
        {csvFile ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30
              flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                className="w-7 h-7 text-emerald-400">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-emerald-300 font-semibold text-sm">{csvFile.name}</p>
              <p className="text-white/30 text-xs mt-0.5">
                {(csvFile.size / 1024).toFixed(1)} KB · Click to change
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            <div className={[
              "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300",
              dragActive ? "text-purple-400 bg-purple-500/20" : "text-white/20 bg-white/5",
            ].join(" ")}>
              <UploadCloudIcon />
            </div>
            <div>
              <p className="text-white/60 font-medium text-sm">
                {dragActive ? "Drop it here!" : "Drag & drop your CSV here"}
              </p>
              <p className="text-white/30 text-xs mt-1">or click to browse files</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/20">
              <span className="h-px w-12 bg-white/10" />
              .csv format only
              <span className="h-px w-12 bg-white/10" />
            </div>
          </>
        )}
      </label>

      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
          Expected CSV Columns
        </p>
        <div className="flex flex-wrap gap-2">
          {["player_name", "role", "base_price", "nationality", "rating"].map(col => (
            <span key={col}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8
                text-xs font-mono text-purple-300/70">
              {col}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Progress Stepper ─────────────────────────────────────────────────────────

const ProgressBar = ({ currentStep }) => (
  <div className="px-8 pt-7 pb-5">
    <div className="flex items-center justify-between mb-4">
      {STEPS.map((step, i) => {
        const isCompleted = currentStep > step.id;
        const isCurrent   = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={[
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                isCompleted
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                  : isCurrent
                  ? "bg-purple-500/20 border-2 border-purple-500 text-purple-300"
                  : "bg-white/5 border border-white/10 text-white/25",
              ].join(" ")}>
                {isCompleted ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <step.Icon />
                )}
              </div>
              <span className={[
                "text-[10px] font-semibold uppercase tracking-widest transition-colors duration-300",
                isCurrent ? "text-purple-300" : isCompleted ? "text-white/50" : "text-white/20",
              ].join(" ")}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 mb-5">
                <div className="h-px bg-white/8 relative overflow-hidden rounded-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-purple-500"
                    initial={false}
                    animate={{ width: currentStep > step.id ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
    <p className="text-center text-xs text-white/30 font-medium">
      Step <span className="text-white/60">{currentStep}</span> of{" "}
      <span className="text-white/60">{STEPS.length}</span>
    </p>
  </div>
);

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * TournamentWizard
 *
 * A 4-step glassmorphism modal wizard for creating a new tournament.
 *
 * @param {boolean}  isOpen    – Controls modal visibility
 * @param {Function} onClose   – Called when the modal should close
 * @param {Function} onSubmit  – Called with { ...formData, csvFile } on Launch
 */
export default function TournamentWizard({ isOpen, onClose, onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData]       = useState(INITIAL_FORM_DATA);
  const [dragActive, setDragActive]   = useState(false);
  const [csvFile, setCsvFile]         = useState(null);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTeamChange = useCallback((idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      teams: prev.teams.map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }));
  }, []);

  const handleAddTeam = useCallback(() => {
    setFormData(prev => ({ ...prev, teams: [...prev.teams, { name: "", owner: "" }] }));
  }, []);

  const handleRemoveTeam = useCallback(idx => {
    setFormData(prev => ({ ...prev, teams: prev.teams.filter((_, i) => i !== idx) }));
  }, []);

  const handleClose = () => {
    onClose?.();
    setTimeout(() => {
      setCurrentStep(1);
      setFormData(INITIAL_FORM_DATA);
      setCsvFile(null);
    }, 300);
  };

  const goNext = () => {
    if (currentStep < 4) {
      setCurrentStep(s => s + 1);
    } else {
      onSubmit?.({ ...formData, csvFile });
      handleClose();
    }
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const isLastStep = currentStep === 4;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="wizard-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            key="wizard-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/10 rounded-2xl
              w-full max-w-3xl min-h-[500px] flex flex-col relative overflow-hidden
              shadow-[0_0_80px_-20px_rgba(168,85,247,0.25)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Ambient top glow line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r
              from-transparent via-purple-500/40 to-transparent pointer-events-none" />

            {/* Corner glows */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64
              rounded-full bg-purple-600/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64
              rounded-full bg-violet-600/8 blur-3xl" />

            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close wizard"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg
                flex items-center justify-center text-white/30 hover:text-white
                hover:bg-white/10 border border-transparent hover:border-white/10
                transition-all duration-200"
            >
              <XIcon />
            </button>

            {/* Progress stepper */}
            <ProgressBar currentStep={currentStep} />

            {/* Divider */}
            <div className="mx-8 h-px bg-white/5" />

            {/* Step content – animated */}
            <div className="flex-1 px-8 py-7 overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {currentStep === 1 && (
                    <StepIdentity formData={formData} onChange={handleChange} />
                  )}
                  {currentStep === 2 && (
                    <StepFinancials formData={formData} onChange={handleChange} />
                  )}
                  {currentStep === 3 && (
                    <StepFranchises
                      formData={formData}
                      onTeamChange={handleTeamChange}
                      onAddTeam={handleAddTeam}
                      onRemoveTeam={handleRemoveTeam}
                    />
                  )}
                  {currentStep === 4 && (
                    <StepPlayerPool
                      csvFile={csvFile}
                      dragActive={dragActive}
                      setDragActive={setDragActive}
                      onFileDrop={file => setCsvFile(file)}
                      onFileSelect={file => setCsvFile(file)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer navigation */}
            <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between gap-4">
              {/* Back */}
              <button
                onClick={goBack}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10
                  text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5
                  disabled:opacity-0 disabled:pointer-events-none
                  transition-all duration-200 text-sm font-medium"
              >
                <ChevronLeftIcon />
                Back
              </button>

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map(step => (
                  <div
                    key={step.id}
                    className={[
                      "rounded-full transition-all duration-300",
                      currentStep === step.id
                        ? "w-5 h-1.5 bg-purple-500"
                        : currentStep > step.id
                        ? "w-1.5 h-1.5 bg-purple-600/60"
                        : "w-1.5 h-1.5 bg-white/10",
                    ].join(" ")}
                  />
                ))}
              </div>

              {/* Next / Launch */}
              {isLastStep ? (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm
                    bg-gradient-to-r from-purple-600 to-violet-600 text-white
                    hover:from-purple-500 hover:to-violet-500
                    shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50
                    hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200 hover:ring-2 hover:ring-purple-500/40"
                >
                  <RocketIcon />
                  Launch Tournament
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm
                    bg-white/8 border border-white/10 text-white
                    hover:bg-white/12 hover:border-white/20
                    hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200"
                >
                  Next
                  <ChevronRightIcon />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
