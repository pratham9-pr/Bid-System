import React, { useState, useRef, useEffect, useCallback } from 'react';
import { addPlayer } from '../services/auctionService';
import { RoleBadge, FREE_FIRE_ROLES } from './RoleBadge';

// ─── Icons ────────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
       className="w-8 h-8 text-muted">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/>
    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
    <path className="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
       className="w-4 h-4">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, htmlFor, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="stat-label">{label}</label>
      {children}
      {error && (
        <p className="text-[10px] text-red-400 font-inter">{error}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AddPlayerForm
// ─────────────────────────────────────────────────────────────────────────────
export function AddPlayerForm({ onSuccess }) {
  // ── Form state ────────────────────────────────────────────────────────────
  const [name,       setName]       = useState('');
  const [basePrice,  setBasePrice]  = useState('');
  const [maxLimit,   setMaxLimit]   = useState('');
  const [role,       setRole]       = useState('');
  const [photoFile,  setPhotoFile]  = useState(null);
  const [imageUrl,   setImageUrl]   = useState('');
  const [preview,    setPreview]    = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Submission state ──────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [errors,     setErrors]     = useState({});
  const [submitError, setSubmitError] = useState('');

  const fileInputRef  = useRef(null);
  const previewUrlRef = useRef(null);

  // Clean up object URL on unmount / file change
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const applyFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPhotoFile(file);
    setPreview(url);
  }, []);

  // ── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true);  };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    applyFile(e.dataTransfer.files[0]);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!name.trim())          errs.name      = 'In-game name is required.';
    if (!basePrice || Number(basePrice) <= 0)
                               errs.basePrice = 'Enter a valid base price.';
    if (!maxLimit || Number(maxLimit) <= Number(basePrice))
                               errs.maxLimit  = 'Max limit must exceed base price.';
    if (!role)                 errs.role      = 'Select a role.';
    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const result = await addPlayer({
      name:             name.trim(),
      in_game_name:     name.trim(),
      base_price:       Number(basePrice),
      max_limit:        Number(maxLimit),
      role,
      photo_file:       photoFile,
      custom_card_file: photoFile,
      custom_card_url:  imageUrl.trim() || undefined,
      photo_url:        imageUrl.trim() || undefined,
    });
    setLoading(false);

    if (result.success) {
      // Flash success state, then reset form
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setBasePrice('');
        setMaxLimit('');
        setRole('');
        setPhotoFile(null);
        setImageUrl('');
        setPreview(null);
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
        onSuccess?.();
      }, 1800);
    } else {
      setSubmitError(result.error || 'Failed to add player. Try again.');
    }
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setPhotoFile(null);
    setPreview(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="card-elevated overflow-hidden">
      {/* Top accent */}
      <div className="h-0.5 w-full bg-fire-gradient" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-rajdhani font-bold text-base text-white tracking-wide">
              Add New Player
            </h3>
            <p className="text-[10px] text-muted font-inter mt-0.5">
              New players are added with <span className="text-slate-400">upcoming</span> status
            </p>
          </div>
          {success && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                            bg-emerald-500/15 border border-emerald-500/30 text-emerald-400
                            text-xs font-inter animate-fade-in">
              <CheckIcon />
              Player added!
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">

            {/* ── Left column ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 md:col-span-1">

              {/* In-game name */}
              <Field label="In-Game Name" htmlFor="player-name" error={errors.name}>
                <input
                  id="player-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SK_Sabir"
                  className="input-field font-rajdhani font-semibold text-base tracking-wide"
                  disabled={loading || success}
                  autoComplete="off"
                />
              </Field>

              {/* Price row */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base Price (₣)" htmlFor="player-base" error={errors.basePrice}>
                  <input
                    id="player-base"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="5000"
                    min="1"
                    className="input-field font-rajdhani font-semibold"
                    disabled={loading || success}
                  />
                </Field>
                <Field label="Max Limit (₣)" htmlFor="player-max" error={errors.maxLimit}>
                  <input
                    id="player-max"
                    type="number"
                    value={maxLimit}
                    onChange={(e) => setMaxLimit(e.target.value)}
                    placeholder="20000"
                    min="1"
                    className="input-field font-rajdhani font-semibold"
                    disabled={loading || success}
                  />
                </Field>
              </div>

              {/* Role */}
              <Field label="Role" htmlFor="player-role" error={errors.role}>
                <div className="relative">
                  <select
                    id="player-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading || success}
                    className={`input-field appearance-none pr-10 font-inter cursor-pointer
                      ${!role ? 'text-muted' : 'text-white'}`}
                  >
                    <option value="" disabled>Select a role…</option>
                    {FREE_FIRE_ROLES.map((r) => (
                      <option key={r} value={r} className="bg-surface-800 text-white">{r}</option>
                    ))}
                  </select>
                  {/* Chevron */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" className="w-4 h-4">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {/* Live badge preview */}
                {role && (
                  <div className="mt-1.5">
                    <RoleBadge role={role} size="sm" />
                  </div>
                )}
              </Field>
            </div>

            {/* ── Right column: Photo / Card Graphic upload ──────────── */}
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <span className="stat-label">Custom Card Graphic / Photo</span>

              {/* Drop zone */}
              <div
                onClick={() => !loading && !success && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex-1 min-h-[180px] rounded-xl border-2 border-dashed
                            overflow-hidden cursor-pointer transition-all duration-200 group
                  ${isDragging
                    ? 'border-fire-500/80 bg-fire-500/5 scale-[1.01]'
                    : preview
                      ? 'border-surface-500/40 hover:border-fire-500/40'
                      : 'border-surface-500/50 hover:border-fire-500/50 hover:bg-fire-500/3'
                  }
                  ${(loading || success) ? 'pointer-events-none opacity-60' : ''}`}
              >
                {preview ? (
                  <>
                    {/* Photo preview */}
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay with "Change" */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                                    transition-opacity duration-200 flex flex-col items-center
                                    justify-center gap-2">
                      <UploadIcon />
                      <span className="text-xs text-slate-300 font-inter">Click to change</span>
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70
                                 border border-white/20 flex items-center justify-center
                                 text-white/70 hover:text-white hover:bg-black/90
                                 transition-all duration-150 text-xs z-10"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                    {/* Filename strip */}
                    <div className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-black/60
                                    backdrop-blur-sm">
                      <p className="text-[9px] text-slate-400 font-inter truncate">
                        {photoFile?.name}
                      </p>
                    </div>
                  </>
                ) : (
                  /* Empty state */
                  <div className="absolute inset-0 flex flex-col items-center justify-center
                                  gap-3 p-4 text-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                     border border-dashed transition-colors duration-200
                      ${isDragging
                        ? 'border-fire-500/60 bg-fire-500/10'
                        : 'border-surface-500/50 group-hover:border-fire-500/40'}`}>
                      <UploadIcon />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-inter">
                        <span className={`font-semibold transition-colors
                          ${isDragging ? 'text-fire-400' : 'group-hover:text-fire-400'}`}>
                          {isDragging ? 'Drop to upload' : 'Click or drag & drop'}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted font-inter mt-0.5">
                        PNG, JPG, WEBP · max 5 MB
                      </p>
                    </div>
                    <p className="text-[10px] text-surface-400 font-inter">Optional</p>
                  </div>
                )}
              </div>

              {/* Direct image URL input */}
              <div className="mt-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (e.target.value && !preview) {
                      setPreview(e.target.value);
                    }
                  }}
                  placeholder="Or paste image URL (e.g. /players/custom.jpg)"
                  className="input-field text-xs py-2 text-slate-300 font-inter placeholder:text-muted placeholder:text-[10px]"
                  disabled={loading || success}
                />
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                id="player-photo-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => applyFile(e.target.files[0])}
              />
            </div>
          </div>

          {/* ── Submit row ──────────────────────────────────────────────── */}
          <div className="mt-5 flex items-center gap-3 pt-4 border-t border-surface-600/40">
            {submitError && (
              <p className="text-xs text-red-400 font-inter flex-1 leading-snug">
                {submitError}
              </p>
            )}
            <div className="ml-auto flex items-center gap-3">
              {loading && (
                <span className="text-xs text-muted font-inter flex items-center gap-2">
                  <SpinnerIcon /> Uploading photo…
                </span>
              )}
              <button
                id="add-player-submit"
                type="submit"
                disabled={loading || success}
                className={`btn-primary px-6 py-2.5 text-sm disabled:opacity-60
                            disabled:cursor-not-allowed disabled:shadow-none
                            ${success ? 'bg-emerald-600 !shadow-none' : ''}`}
              >
                {success ? (
                  <span className="flex items-center gap-2">
                    <CheckIcon /> Added
                  </span>
                ) : loading ? (
                  <span className="flex items-center gap-2">
                    <SpinnerIcon /> Adding…
                  </span>
                ) : (
                  'Add Player'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
