
import React from 'react';

interface ResultCardProps {
  label: string;
  value: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ label, value }) => {
  return (
    <div className="bg-gray-700/60 p-4 rounded-lg flex justify-between items-center">
      <span className="text-gray-300">{label}</span>
      <span className="text-xl font-bold text-white">{value}</span>
    </div>
  );
};
