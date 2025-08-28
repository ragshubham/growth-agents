// components/StreakWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { Shield, TrendingUp, Target } from 'lucide-react';

type Props = {
  critFreeDays: number;
  pacingDays: number;
  checkinDays: number;
};

export default function StreakWidget({ critFreeDays, pacingDays, checkinDays }: Props) {
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    setJustUpdated(true);
    const t = setTimeout(() => setJustUpdated(false), 1200);
    return () => clearTimeout(t);
  }, [critFreeDays, pacingDays, checkinDays]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <StreakTile
        label="CRIT-free"
        value={critFreeDays}
        ok={critFreeDays > 0}
        icon={<Shield className="h-4 w-4" />}
        justUpdated={justUpdated}
      />
      <StreakTile
        label="On-budget"
        value={pacingDays}
        ok={pacingDays > 0}
        icon={<Target className="h-4 w-4" />}
        justUpdated={justUpdated}
      />
      <StreakTile
        label="Daily check-in"
        value={checkinDays}
        ok={checkinDays > 0}
        icon={<TrendingUp className="h-4 w-4" />}
        justUpdated={justUpdated}
      />
    </div>
  );
}

function StreakTile({
  label,
  value,
  ok,
  icon,
  justUpdated,
}: {
  label: string;
  value: number;
  ok: boolean;
  icon: React.ReactNode;
  justUpdated: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 text-center shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
        <span className="text-xs text-neutral-600">{label}</span>
      </div>
      <div
        className={`mt-1 text-lg font-semibold ${
          ok ? 'text-emerald-700' : 'text-rose-700'
        } ${justUpdated ? 'animate-bounce' : ''}`}
      >
        {value}d
      </div>
      <div className="mt-1 text-[11px] text-neutral-500">{icon}</div>
    </div>
  );
}
