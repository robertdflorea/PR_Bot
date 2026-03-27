'use client';
import { useState } from 'react';

export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={copy}
      className={`px-3 py-1 text-xs rounded border transition-colors ${
        copied
          ? 'bg-green-600 border-green-600 text-white'
          : 'bg-zinc-700 border-zinc-600 text-zinc-200 hover:bg-zinc-600'
      } ${className}`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
