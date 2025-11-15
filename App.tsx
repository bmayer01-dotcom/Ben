
import React, { useState, useMemo } from 'react';
import { SectionCard } from './components/SectionCard';
import { InputGroup } from './components/InputGroup';
import { ResultCard } from './components/ResultCard';
import { HighlightCard } from './components/HighlightCard';

const Logo = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400">
        <path d="M11 19.5C15.6944 19.5 19.5 15.6944 19.5 11C19.5 6.30558 15.6944 2.5 11 2.5C6.30558 2.5 2.5 6.30558 2.5 11C2.5 15.6944 6.30558 19.5 11 19.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.9998 21.5L18.4998 19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


function App() {
  // --- STATE FOR USER INPUTS ---
  const [searchesPerMonth, setSearchesPerMonth] = useState(150000);
  const [searchConversion, setSearchConversion] = useState(5);
  const [aov, setAov] = useState(100);
  const [searchConversionUplift, setSearchConversionUplift] = useState(10);
  const [aovUplift, setAovUplift] = useState(5);

  // --- DERIVED VALUES: IMPACT ON REVENUE ---
  const revenueMonthBefore = useMemo(() => {
    const ordersPerMonth = searchesPerMonth * (searchConversion / 100);
    return aov * ordersPerMonth;
  }, [aov, searchesPerMonth, searchConversion]);

  const revenueYearBefore = useMemo(() => {
    return revenueMonthBefore * 12;
  }, [revenueMonthBefore]);
  
  const revenueMonthWith = useMemo(() => {
    const newSearchConversion = (searchConversion / 100) * (1 + searchConversionUplift / 100);
    const newAov = aov * (1 + aovUplift / 100);
    const newOrdersPerMonth = searchesPerMonth * newSearchConversion;
    return newAov * newOrdersPerMonth;
  }, [searchesPerMonth, searchConversion, searchConversionUplift, aov, aovUplift]);

  const revenueYearWith = useMemo(() => {
    return revenueMonthWith * 12;
  }, [revenueMonthWith]);

  const additionalRevenueMonth = useMemo(() => {
    return revenueMonthWith - revenueMonthBefore;
  }, [revenueMonthWith, revenueMonthBefore]);

  const additionalRevenueYear = useMemo(() => {
    return revenueYearWith - revenueYearBefore;
  }, [revenueYearWith, revenueYearBefore]);


  // --- FORMATTERS ---
  const formatCurrency = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-gray-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-2">
                <Logo />
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                    FactFinder Uplift Calculator
                </h1>
            </div>
          <p className="text-lg text-gray-400">Estimate the revenue impact of AI-powered search on your online shop.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            <SectionCard title="Status Quo">
              <InputGroup label="Searches per month" type="number" value={searchesPerMonth} onChange={e => setSearchesPerMonth(Number(e.target.value))} step={1000} />
              <InputGroup label="Search Conversion" type="number" value={searchConversion} onChange={e => setSearchConversion(Number(e.target.value))} unit="%" step={0.1} />
              <InputGroup label="AOV (Average Order Value)" type="number" value={aov} onChange={e => setAov(Number(e.target.value))} unit="€" step={0.01} />
            </SectionCard>
            
            <SectionCard title="FactFinder Effect">
              <InputGroup label="Search Conversion Uplift" type="number" value={searchConversionUplift} onChange={e => setSearchConversionUplift(Number(e.target.value))} unit="%" step={0.1} />
              <InputGroup label="AOV Uplift" type="number" value={aovUplift} onChange={e => setAovUplift(Number(e.target.value))} unit="%" step={0.1} />
            </SectionCard>
          </div>
          
          <div className="lg:col-span-1">
            <SectionCard title="Impact on Revenue" fullHeight>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                    <div className="flex flex-col gap-4 p-4 bg-gray-800/50 rounded-lg justify-center">
                        <h3 className="font-bold text-lg text-gray-300 border-b border-gray-700 pb-2">Before FactFinder</h3>
                        <ResultCard label="Revenue p.a." value={formatCurrency(revenueYearBefore)} />
                    </div>
                    <div className="flex flex-col gap-4 p-4 bg-gray-800/50 rounded-lg justify-center">
                        <h3 className="font-bold text-lg text-gray-300 border-b border-gray-700 pb-2">With FactFinder</h3>
                        <ResultCard label="Revenue p.a." value={formatCurrency(revenueYearWith)} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2 flex flex-col gap-4 mt-4">
                         <h3 className="font-bold text-xl text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Additional Revenue</h3>
                        <HighlightCard label="Additional Revenue/ month" value={formatCurrency(additionalRevenueMonth)} />
                        <HighlightCard label="Additional Revenue p.a." value={formatCurrency(additionalRevenueYear)} />
                    </div>
                </div>
            </SectionCard>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
