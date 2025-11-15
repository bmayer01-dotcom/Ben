
import React from 'react';

interface HighlightCardProps {
  label: string;
  value: string;
}

export const HighlightCard: React.FC<HighlightCardProps> = ({ label, value }) => {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-teal-500 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
      <span className="text-base font-medium opacity-80">{label}</span>
      <span className="text-3xl md:text-4xl font-extrabold mt-1">{value}</span>
    </div>
  );
};
