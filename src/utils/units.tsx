import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SQLite from 'expo-sqlite';

/**
 * Weight units. Everything is STORED in kilograms; only what you see and type
 * changes. Use `useUnits()` in components:
 *
 *   const u = useUnits();
 *   u.fmt(82.2)          -> "82.2 kg" / "181.2 lb"
 *   u.toDisplay(100)     -> 100 / 220.5   (for inputs)
 *   u.fromDisplay(225)   -> 102.06 kg     (when saving)
 *   u.fmtVolume(157760)  -> "157.8 t" / "347.8k lb"
 */

export type WeightUnit = 'kg' | 'lb';
export const LB_PER_KG = 2.2046226218;
const KEY = 'weight_unit';

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface Units {
  unit: WeightUnit;
  label: WeightUnit;
  setUnit: (u: WeightUnit) => void;
  /** kg → number in the chosen unit (1 decimal). */
  toDisplay: (kg: number) => number;
  /** Number typed in the chosen unit → kg (kept precise). */
  fromDisplay: (v: number) => number;
  /** "82.2 kg" */
  fmt: (kg: number, opts?: { unit?: boolean; decimals?: 0 | 1 }) => string;
  /** Lifted volume: "12.3 t" / "950 kg" or "27.1k lb" / "950 lb". */
  fmtVolume: (kg: number) => { value: string; unit: string };
  /** Typical small step for weight buttons. */
  step: number;
  /** Bigger step (long press). */
  bigStep: number;
}

function build(unit: WeightUnit, setUnit: (u: WeightUnit) => void): Units {
  const lb = unit === 'lb';
  const toDisplay = (kg: number) => r1(lb ? kg * LB_PER_KG : kg);
  return {
    unit,
    label: unit,
    setUnit,
    toDisplay,
    fromDisplay: (v: number) => (lb ? v / LB_PER_KG : v),
    fmt: (kg, opts) => {
      const v = toDisplay(kg);
      const n = opts?.decimals === 0 ? Math.round(v).toLocaleString() : (Math.round(v * 10) / 10).toString();
      return opts?.unit === false ? n : `${n} ${unit}`;
    },
    fmtVolume: (kg) => {
      if (lb) {
        const v = kg * LB_PER_KG;
        return v >= 10000 ? { value: (Math.round(v / 100) / 10).toLocaleString(), unit: 'k lb' } : { value: Math.round(v).toLocaleString(), unit: 'lb' };
      }
      return kg >= 1000 ? { value: (Math.round(kg / 100) / 10).toLocaleString(), unit: 't' } : { value: Math.round(kg).toLocaleString(), unit: 'kg' };
    },
    step: lb ? 5 : 2.5,
    bigStep: lb ? 10 : 5,
  };
}

const UnitsContext = createContext<Units>(build('kg', () => {}));

export const UnitsProvider: React.FC<{ db: SQLite.SQLiteDatabase | null; children: React.ReactNode }> = ({ db, children }) => {
  const [unit, setUnitState] = useState<WeightUnit>('kg');

  useEffect(() => {
    if (!db) return;
    db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [KEY])
      .then((row) => {
        if (row?.value === 'lb' || row?.value === 'kg') setUnitState(row.value);
      })
      .catch(() => {});
  }, [db]);

  const setUnit = useCallback(
    (u: WeightUnit) => {
      setUnitState(u);
      db?.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [KEY, u]).catch(() => {});
    },
    [db]
  );

  const value = useMemo(() => build(unit, setUnit), [unit, setUnit]);
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
};

export function useUnits(): Units {
  return useContext(UnitsContext);
}
