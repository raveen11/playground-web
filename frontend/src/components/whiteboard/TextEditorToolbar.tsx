"use client";

/**
 * Text Editor Toolbar
 * Provides formatting controls for text editing
 */

import React from "react";

export interface TextFormattingState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bullet: boolean;
  fontSize: number;
}

interface TextEditorToolbarProps {
  formatting: TextFormattingState;
  onFormatChange: (format: keyof TextFormattingState, value: boolean | number) => void;
  isActive: boolean;
}

export function TextEditorToolbar({
  formatting,
  onFormatChange,
  isActive,
}: TextEditorToolbarProps) {
  if (!isActive) return null;

  const buttonClass = (isActive: boolean) =>
    `px-3 py-2 rounded border ${
      isActive
        ? "bg-blue-500 text-white border-blue-600"
        : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
    } transition`;

  return (
    <div className="flex gap-1 rounded-lg border border-slate-300 bg-white p-2 shadow-md">
      {/* Bold */}
      <button
        onClick={() => onFormatChange("bold", !formatting.bold)}
        className={buttonClass(formatting.bold)}
        title="Bold (Ctrl+B)"
        type="button"
      >
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button
        onClick={() => onFormatChange("italic", !formatting.italic)}
        className={buttonClass(formatting.italic)}
        title="Italic (Ctrl+I)"
        type="button"
      >
        <em>I</em>
      </button>

      {/* Underline */}
      <button
        onClick={() => onFormatChange("underline", !formatting.underline)}
        className={buttonClass(formatting.underline)}
        title="Underline (Ctrl+U)"
        type="button"
      >
        <u>U</u>
      </button>

      {/* Separator */}
      <div className="mx-1 w-px bg-slate-300" />

      {/* Bullet List */}
      <button
        onClick={() => onFormatChange("bullet", !formatting.bullet)}
        className={buttonClass(formatting.bullet)}
        title="Bullet List"
        type="button"
      >
        ●
      </button>

      {/* Separator */}
      <div className="mx-1 w-px bg-slate-300" />

      {/* Font Size */}
      <select
        value={formatting.fontSize}
        onChange={(e) => onFormatChange("fontSize", parseInt(e.target.value))}
        className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
        title="Font Size"
      >
        <option value={12}>12px</option>
        <option value={14}>14px</option>
        <option value={16}>16px</option>
        <option value={18}>18px</option>
        <option value={20}>20px</option>
        <option value={24}>24px</option>
        <option value={28}>28px</option>
        <option value={32}>32px</option>
      </select>
    </div>
  );
}
