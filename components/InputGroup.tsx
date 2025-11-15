
import React from 'react';

interface InputGroupProps {
  label: string;
  value: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
  type?: string;
  isCalculated?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, unit, type = 'text', isCalculated = false }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <div className="relative">
        {isCalculated ? (
          <div className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 font-semibold text-lg">
            {value}
            {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{unit}</span>}
          </div>
        ) : (
          <>
            <input
              type={type}
              value={value}
              onChange={onChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
              step={type === 'number' ? '1' : undefined}
            />
            {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{unit}</span>}
          </>
        )}
      </div>
    </div>
  );
};
