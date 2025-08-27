'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Shield, ChevronDown } from 'lucide-react';

export default function Topbar({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  const initials = (email || 'U?').slice(0, 2).toUpperCase();

  return (
    <div className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: brand */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5" />
          <span>Shield Agent</span>
        </Link>

        {/* Right: profile dropdown */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1.5 text-sm shadow-sm"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white text-xs">
              {initials}
            </span>
            <span className="hidden sm:block text-neutral-700">{email || 'user'}</span>
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border bg-white shadow-lg">
              <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-neutral-50">Dashboard</Link>
              <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-neutral-50">Settings</Link>
              <Link href="/settings/integrations" className="block px-4 py-2 text-sm hover:bg-neutral-50">Integrations</Link>
              <Link href="/help" className="block px-4 py-2 text-sm hover:bg-neutral-50">Help</Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
