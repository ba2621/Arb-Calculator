
import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";

// --- Conversion utility functions (unchanged) ---
const americanToProb = (odds) => {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
};
const decimalToProb = (decimal) => 1 / decimal;
const fractionalToProb = (numerator, denominator) => denominator / (numerator + denominator);
const probToAmerican = (prob) => {
  if (prob >= 0.5) return -(prob * 100) / (1 - prob);
  return 100 * (1 - prob) / prob;
};
const probToDecimal = (prob) => 1 / prob;
const probToFractional = (prob) => {
  const decimal = probToDecimal(prob);
  const fractional = decimal - 1;
  const tolerance = 1.0E-9;
  let h1 = 1;let h2 = 0;
  let k1 = 0;let k2 = 1;
  let b = fractional;
  let i = 0;
  while (i < 100) {
    let a = Math.floor(b);
    let aux = h1;h1 = a * h1 + h2;h2 = aux;
    aux = k1;k1 = a * k1 + k2;k2 = aux;
    if (Math.abs(fractional - h1 / k1) <= fractional * tolerance) break;
    if (b - a === 0) break;
    b = 1 / (b - a);
    i++;
  }
  return { numerator: h1, denominator: k1 };
};

// Component definitions OUTSIDE main component to prevent recreation
const LatexInput = ({ label, value, onChange, unit }) =>
<div className="flex items-baseline">
    <label className="w-44 md:w-48 text-lg flex-shrink-0">{label}</label>
    <Input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="text-lg text-center bg-transparent border-0 border-b-2 border-dotted border-gray-400 rounded-none focus:ring-0 focus:border-solid focus:border-gray-800 w-24 px-1" />

    {unit && <span className="text-lg ml-2">{unit}</span>}
  </div>;

const Formula = ({ children }) =>
<pre className="text-sm md:text-base bg-gray-100 p-2 md:p-3 my-2 rounded-sm border border-gray-200 whitespace-pre-wrap overflow-x-auto">
    <code>{children}</code>
  </pre>;

export default function OddsConverter() {
  // Display states - these control what shows in the inputs
  const [probability, setProbability] = useState('52.38');
  const [american, setAmerican] = useState('-110');
  const [decimal, setDecimal] = useState('1.91');
  const [fractional, setFractional] = useState('10/11');
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

  // Refs to avoid re-renders during calculation
  const timeoutRef = useRef(null);

  // Update date at midnight every day
  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    };

    // Calculate milliseconds until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Set timeout for midnight, then interval for every 24 hours
    const midnightTimeout = setTimeout(() => {
      updateDate();
      // Set up daily interval after the first midnight update
      const dailyInterval = setInterval(updateDate, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, []);

  // Function to update all other fields based on a probability value
  const updateOtherFields = (sourceField, prob) => {
    if (sourceField !== 'probability') {
      setProbability((prob * 100).toFixed(2));
    }
    if (sourceField !== 'american') {
      setAmerican(probToAmerican(prob).toFixed(0));
    }
    if (sourceField !== 'decimal') {
      setDecimal(probToDecimal(prob).toFixed(2));
    }
    if (sourceField !== 'fractional') {
      const { numerator, denominator } = probToFractional(prob);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        setFractional(`${numerator}/${denominator}`);
      }
    }
  };

  // Debounced calculation function
  const debouncedCalculate = (sourceField, sourceValue) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      let prob = 0;

      switch (sourceField) {
        case 'probability':
          const probVal = parseFloat(sourceValue);
          if (!isNaN(probVal) && probVal > 0 && probVal < 100) {
            prob = probVal / 100;
          } else return;
          break;
        case 'american':
          const americanVal = parseFloat(sourceValue);
          if (!isNaN(americanVal) && americanVal !== 0) {
            prob = americanToProb(americanVal);
          } else return;
          break;
        case 'decimal':
          const decimalVal = parseFloat(sourceValue);
          if (!isNaN(decimalVal) && decimalVal >= 1) {
            prob = decimalToProb(decimalVal);
          } else return;
          break;
        case 'fractional':
          const parts = sourceValue.split('/');
          if (parts.length === 2) {
            const num = parseFloat(parts[0]);
            const den = parseFloat(parts[1]);
            if (!isNaN(num) && !isNaN(den) && num > 0 && den > 0) {
              prob = fractionalToProb(num, den);
            } else return;
          } else return;
          break;
        default:
          return;
      }

      if (isNaN(prob) || prob <= 0 || prob >= 1) return;

      updateOtherFields(sourceField, prob);
    }, 300);
  };

  // Simple handlers that only update their own field and trigger calculation
  const handleProbabilityChange = (value) => {
    setProbability(value);
    debouncedCalculate('probability', value);
  };

  const handleAmericanChange = (value) => {
    setAmerican(value);
    debouncedCalculate('american', value);
  };

  const handleDecimalChange = (value) => {
    setDecimal(value);
    debouncedCalculate('decimal', value);
  };

  const handleFractionalChange = (value) => {
    setFractional(value);
    debouncedCalculate('fractional', value);
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8 pt-12 md:pt-0">
        <h1 className="text-2xl md:text-3xl tracking-wider">An Odds Conversion Tool</h1>
        <p className="mt-2 text-lg">by Bayes</p>
        <p className="text-md mt-1">{currentDate}</p>
      </div>
      <hr className="my-6 border-gray-400" />
      
      <div className="md:grid md:grid-cols-2 md:gap-12">
        <div className="md:border-r md:pr-12 border-gray-300 mb-8 md:mb-0">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Interactive Converter</h2>
          
          <div className="space-y-6 max-w-md mx-auto">
            <LatexInput
              label="Implied Probability:"
              value={probability}
              onChange={handleProbabilityChange}
              unit="%" />

            <LatexInput
              label="American Odds:"
              value={american}
              onChange={handleAmericanChange} />

            <LatexInput
              label="Decimal Odds:"
              value={decimal}
              onChange={handleDecimalChange} />

            <LatexInput
              label="Fractional Odds:"
              value={fractional}
              onChange={handleFractionalChange} />
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-xl font-bold text-center md:text-2xl">Conversion Formulae</h2>
          
          <h3 className="mt-5 text-lg md:text-xl font-bold">From Odds to Probability</h3>
          <p className="mb-2 text-base md:text-lg">For American odds (o):</p>
          <Formula>
            {`if o > 0: p = 100 / (o + 100)
if o < 0: p = |o| / (|o| + 100)`}
          </Formula>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <p className="mb-2 text-base md:text-lg">For Decimal odds (d):</p>
              <Formula>p = 1 / d</Formula>
            </div>
            <div>
              <p className="mb-2 text-base md:text-lg">For Fractional odds (n/d):</p>
              <Formula>p = d / (n + d)</Formula>
            </div>
          </div>

          <h3 className="mt-4 mb-2 text-lg md:text-xl font-bold">From Probability to Odds</h3>
          <p className="mb-2 text-base md:text-lg">To American odds (o):</p>
          <Formula>
            {`if p ≥ 0.5: o = -(p * 100) / (1 - p)
if p < 0.5:  o = (100 * (1 - p)) / p`}
          </Formula>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <p className="mb-2 text-base md:text-lg">To Decimal odds (d):</p>
              <Formula>d = 1 / p</Formula>
            </div>
            <div>
              <p className="mb-2 text-base md:text-lg">To Fractional odds (n/d):</p>
              <Formula>n/d = (1/p) - 1</Formula>
            </div>
          </div>
        </div>
      </div>
    </div>);

}