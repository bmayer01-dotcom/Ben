
import React from 'react';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children, fullHeight = false }) => {
  return (
    <div className={`bg-gray-800/50 rounded-xl shadow-2xl backdrop-blur-sm border border-gray-700/50 p-6 ${fullHeight ? 'h-full' : ''}`}>
      <h2 className="text-2xl font-bold text-gray-100 mb-6 border-b-2 border-blue-500 pb-3">{title}</h2>
      <div className="flex flex-col gap-5">
        {children}
      </div>
    </div>
  );
};
