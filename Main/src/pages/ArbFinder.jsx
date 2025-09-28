
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
"@/components/ui/popover";
import { Button } from "@/components/ui/button";

// --- Calculation Utilities ---
const toDecimal = (value, fallback = '0') => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? parseFloat(fallback) : parsed;
};

const americanToProb = (odds) => {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
};

const decimalToProb = (decimal) => 1 / decimal;

// fractionalToProb function removed as fractional odds input is removed

const probToAmerican = (prob) => {
  if (prob >= 0.5) return -(prob * 100) / (1 - prob);
  return 100 * (1 - prob) / prob;
};

const probToDecimal = (prob) => 1 / prob;

// probToFractional function removed as fractional odds input is removed

const costBook = (decimalOdds) => {
  if (!decimalOdds || decimalOdds <= 0) return Infinity;
  return 1 / decimalOdds;
};

const costPm = (price, notionalFee = 0, profitFee = 0) => {
  if (!price || price <= 0) return Infinity;
  const p = toDecimal(price);
  const fn = toDecimal(notionalFee);
  const fp = toDecimal(profitFee);
  const numerator = p * (1 + fn);
  const denominator = 1 - fp * (1 - p);
  if (denominator <= 0) return Infinity; // Avoid division by zero or negative
  return numerator / denominator;
};

const ArbInput = ({ label, value, onChange, placeholder, unit, className }) =>
<div className={`grid grid-cols-2 items-center gap-2 ${className}`}>
    <Label htmlFor={label} className="text-sm text-gray-600">{label}</Label>
    <div className="relative">
      <Input
      id={label}
      type="number"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 text-center" />

      {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">{unit}</span>}
    </div>
  </div>;


export default function ArbFinder() {
  // --- STATE MANAGEMENT ---
  const [bufferBps, setBufferBps] = useState("20");

  // Sportsbook odds (like odds converter)
  const [sbAmerican, setSbAmerican] = useState("-110");
  const [sbDecimal, setSbDecimal] = useState("1.91");
  // sbFractional state removed
  const [sbMaxStake, setSbMaxStake] = useState("2500");

  // Prediction Market
  const [pmNotionalFee, setPmNotionalFee] = useState("0");
  const [pmProfitFee, setPmProfitFee] = useState("0.02");
  const [pmYesPrice, setPmYesPrice] = useState("0.52");
  const [pmYesQty, setPmYesQty] = useState("6000");
  const [pmNoPrice, setPmNoPrice] = useState("0.48");
  const [pmNoQty, setPmNoQty] = useState("8000");

  const [result, setResult] = useState(null);

  // Odds conversion (similar to OddsConverter)
  const updateOtherOdds = (sourceField, prob) => {
    // NOTE: The outline provided removes the else blocks that clear the fields
    // if the *calculated* odds for other formats are invalid.
    // This means only if the *initial prob* is invalid (prob <= 0 or prob >= 1 or isNaN)
    // will all other fields be cleared. Otherwise, if a conversion results in NaN,
    // the field will simply not be updated.

    if (isNaN(prob) || prob <= 0 || prob >= 1) {
      if (sourceField !== 'american') setSbAmerican('');
      if (sourceField !== 'decimal') setSbDecimal('');
      // fractional odds removed
      return;
    }

    if (sourceField !== 'american') {
      const americanOdds = probToAmerican(prob);
      if (!isNaN(americanOdds)) {
        setSbAmerican(americanOdds.toFixed(0));
      }
    }
    if (sourceField !== 'decimal') {
      const decimalOdds = probToDecimal(prob);
      if (!isNaN(decimalOdds) && decimalOdds >= 1) {
        setSbDecimal(decimalOdds.toFixed(2));
      }
    }
    // Fractional odds update logic removed
  };

  const handleAmericanChange = (value) => {
    setSbAmerican(value);
    const americanVal = parseFloat(value);
    if (!isNaN(americanVal) && americanVal !== 0) {
      const prob = americanToProb(americanVal);
      updateOtherOdds('american', prob);
    }
  };

  const handleDecimalChange = (value) => {
    setSbDecimal(value);
    const decimalVal = parseFloat(value);
    if (!isNaN(decimalVal) && decimalVal >= 1) {
      const prob = decimalToProb(decimalVal);
      updateOtherOdds('decimal', prob);
    }
  };

  // handleFractionalChange removed as fractional odds input is removed

  // YES/NO price sync handlers with consistent decimal places
  const handleYesPriceChange = (value) => {
    setPmYesPrice(value);
    const yesPrice = parseFloat(value);
    if (!isNaN(yesPrice) && yesPrice >= 0 && yesPrice <= 1) {
      const decimalPlaces = value.includes('.') ? value.split('.')[1].length : 0;
      const noPrice = (1 - yesPrice).toFixed(decimalPlaces);
      setPmNoPrice(noPrice);
    }
  };

  const handleNoPriceChange = (value) => {
    setPmNoPrice(value);
    const noPrice = parseFloat(value);
    if (!isNaN(noPrice) && noPrice >= 0 && noPrice <= 1) {
      const decimalPlaces = value.includes('.') ? value.split('.')[1].length : 0;
      const yesPrice = (1 - noPrice).toFixed(decimalPlaces);
      setPmYesPrice(yesPrice);
    }
  };

  // --- Main Calculation Effect ---
  useEffect(() => {
    // Costs for Prediction Market
    const costPmYes = costPm(pmYesPrice, pmNotionalFee, pmProfitFee);
    const costPmNo = costPm(pmNoPrice, pmNotionalFee, pmProfitFee);

    // Costs for Sportsbook (user enters odds for the main side)
    const sbDecimalVal = toDecimal(sbDecimal, 1);
    const costSbYes = 1 / sbDecimalVal;

    // Only one strategy: Buy NO on PM, Bet YES on SB
    const totalCost = costPmNo + costSbYes;
    const edge = 1 - totalCost;
    const isArb = edge > toDecimal(bufferBps, 0) / 10000;

    let finalResult = {
      isArb,
      edge,
      sumCosts: totalCost,
      sideA: { venue: 'Pred. Market', cost: costPmNo, maxPayout: toDecimal(pmNoQty, Infinity) },
      sideNotA: { venue: 'Sportsbook', cost: costSbYes, maxPayout: toDecimal(sbMaxStake, Infinity) / costSbYes },
      K: 0,
      stakeA: 0,
      stakeNotA: 0,
      totalCash: 0,
      profit: 0
    };

    if (isArb && edge > 0) {
      // Sizing
      const maxK = Math.min(finalResult.sideA.maxPayout, finalResult.sideNotA.maxPayout);
      let K = maxK < 0 || isNaN(maxK) || maxK === Infinity ? 0 : maxK;

      finalResult.K = K;
      finalResult.stakeA = K * finalResult.sideA.cost;
      finalResult.stakeNotA = K * finalResult.sideNotA.cost;
      finalResult.totalCash = finalResult.stakeA + finalResult.stakeNotA;
      finalResult.profit = K * edge;
    }

    setResult(finalResult);

  }, [
  bufferBps,
  sbDecimal, sbMaxStake,
  pmNotionalFee, pmProfitFee, pmYesPrice, pmYesQty, pmNoPrice, pmNoQty]
  );

  const formatCurrency = (val) => isNaN(val) ? '$0.00' : val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const formatPercent = (val) => isNaN(val) ? '0.000%' : `${(val * 100).toFixed(3)}%`;

  return (
    <>
      <div className="text-center mb-4 pt-12 md:pt-0">
        <h1 className="text-2xl md:text-3xl tracking-wider">Arbitrage Finder</h1>
        <p className="mt-1 text-lg">Sportsbook vs. Prediction Market</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Prediction Market - Removed height stretching */}
        <Card className="rounded-none">
          <CardHeader className="p-4"><CardTitle className="text-lg">Prediction Market</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-3">
              <p className="font-medium text-sm text-center -mt-1 mb-2 text-gray-500">Fees (%)</p>
              <ArbInput label="Notional Fee" value={pmNotionalFee} onChange={setPmNotionalFee} placeholder="0.00" unit="%" />
              <ArbInput label="Profit Fee" value={pmProfitFee} onChange={setPmProfitFee} placeholder="0.02" unit="%" />
            </div>
            <hr />
            <div className="space-y-3">
              <p className="font-medium text-sm text-center -mt-1 mb-2 text-gray-500">Orderbook</p>
              <ArbInput label="YES Price" value={pmYesPrice} onChange={handleYesPriceChange} placeholder="0.52" />
              <ArbInput label="YES Quantity" value={pmYesQty} onChange={setPmYesQty} placeholder="6000" />
              <ArbInput label="NO Price" value={pmNoPrice} onChange={handleNoPriceChange} placeholder="0.48" />
              <ArbInput label="NO Quantity" value={pmNoQty} onChange={setPmNoQty} placeholder="8000" />
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Sportsbook & Payoff Matrix */}
        <div className="space-y-4">
            <Card className="rounded-none">
                <CardHeader className="p-4"><CardTitle className="text-lg">Sportsbook</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-3">
                    <p className="font-medium text-sm text-center -mt-1 mb-2 text-gray-500">Odds & Limits</p>
                    <ArbInput label="American" value={sbAmerican} onChange={handleAmericanChange} placeholder="-110" />
                    <ArbInput label="Decimal" value={sbDecimal} onChange={handleDecimalChange} placeholder="1.91" />
                    <ArbInput label="Max Stake" value={sbMaxStake} onChange={setSbMaxStake} placeholder="2500" unit="$" />
                </div>
                </CardContent>
            </Card>

            <Card className="rounded-none">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-lg">Payoff Matrix</CardTitle></CardHeader>
                <CardContent className="p-4 pt-2 text-sm space-y-4">
                    {result && result.isArb ? (
                        <>
                            {/* Scenario 1: PM Wins (Outcome is NO) */}
                            <div>
                                <p className="font-bold mb-2">If Outcome is NO (PM Wins):</p>
                                <div className="space-y-1 pl-2">
                                    <div className="flex justify-between"><span>Payout from PM:</span> <span>{formatCurrency(result.K)}</span></div>
                                    <div className="flex justify-between"><span>Total Investment:</span> <span className="text-red-600">-{formatCurrency(result.totalCash)}</span></div>
                                    <hr className="my-1"/>
                                    <div className="flex justify-between font-bold"><span>Net Profit:</span> <span className="text-green-700">{formatCurrency(result.profit)}</span></div>
                                </div>
                            </div>
                            {/* Scenario 2: SB Wins (Outcome is YES) */}
                            <div>
                                <p className="font-bold mb-2">If Outcome is YES (SB Wins):</p>
                                <div className="space-y-1 pl-2">
                                    <div className="flex justify-between"><span>Payout from SB:</span> <span>{formatCurrency(result.K)}</span></div>
                                    <div className="flex justify-between"><span>Total Investment:</span> <span className="text-red-600">-{formatCurrency(result.totalCash)}</span></div>
                                    <hr className="my-1"/>
                                    <div className="flex justify-between font-bold"><span>Net Profit:</span> <span className="text-green-700">{formatCurrency(result.profit)}</span></div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500 text-center">No arbitrage opportunity to calculate payoff.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        
        {/* Column 3: Results */}
        <div className="space-y-4">
          <Card className={`rounded-none ${result?.isArb ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-300'}`}>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {result?.isArb ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
                <p className="text-lg font-bold">
                  {result?.isArb ? 'Arbitrage Found' : 'No Arbitrage'}
                </p>
              </div>
              <p className="text-2xl font-bold mt-1">{result ? formatPercent(result.edge) : '...'}</p>
              <p className="text-sm text-gray-600 mb-2">Guaranteed Edge</p>
              <ArbInput label="Safety Buffer" value={bufferBps} onChange={setBufferBps} unit="bps" className="max-w-xs mx-auto" />
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Optimal Strategy</CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-4 w-4 text-gray-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 rounded-none font-latex">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Arbitrage Detection</h4>
                      <div className="text-sm text-gray-600 space-y-2">
                        <p><strong>Strategy:</strong> Buy NO on prediction market, bet YES on sportsbook.</p>
                        <p className="">Cost Calculation: We calculate the "cost per $1 of payout" for both sides by converting sportsbook odds to cent equivalents.</p>
                        <p><strong>Arbitrage Test:</strong> If Cost(NO_PM) + Cost(YES_SB) &lt; $1.00, an arbitrage exists.</p>
                        <p><strong>Edge:</strong> Your guaranteed profit margin = 1 - Total_Cost_Per_Dollar</p>
                        <p><strong>Buffer:</strong> Safety margin to account for price movements and execution risk.</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span>Buy NO @ <strong>Pred. Market</strong></span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{result ? result.sideA.cost.toFixed(4) : '...'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Bet YES @ <strong>Sportsbook</strong></span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{sbAmerican || '...'}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center font-bold">
                <span>Total Cost per $1:</span>
                <span className="font-mono">{result ? result.sumCosts.toFixed(4) : '...'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Position Sizing</CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-4 w-4 text-gray-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 rounded-none font-latex">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Position Sizing Methodology</h4>
                      <div className="text-sm text-gray-600 space-y-2">
                        <p><strong>Dutching Approach:</strong> We calculate stakes to guarantee the same profit regardless of outcome.</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Stake on YES = K × Cost_YES</li>
                          <li>Stake on NO = K × Cost_NO</li>
                          <li>Where K = target payout amount</li>
                        </ul>
                        <p><strong>K is limited by:</strong> Available liquidity and maximum stakes at each venue.</p>
                        <p><strong>Guaranteed Profit:</strong> K × (1 - Total_Cost_Per_Dollar)</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span>Stake on NO (PM):</span> {/* Clarified for specific leg */}
                <span className="font-bold">{result ? formatCurrency(result.stakeA) : '$0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Stake on YES (SB):</span> {/* Clarified for specific leg */}
                <span className="font-bold">{result ? formatCurrency(result.stakeNotA) : '$0.00'}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span>Total Cash:</span>
                <span className="font-bold">{result ? formatCurrency(result.totalCash) : '$0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Payout (K):</span>
                <span className="font-bold">{result ? formatCurrency(result.K) : '$0.00'}</span>
              </div>
              <div className="flex justify-between items-center text-green-700 font-bold">
                <span>Guaranteed Profit:</span>
                <span>{result ? formatCurrency(result.profit) : '$0.00'}</span>
              </div>
              <div className="flex justify-between items-center text-blue-700 font-bold">
                <span>Percent Gain:</span>
                <span>{result && result.totalCash > 0 ? `${(result.profit / result.totalCash * 100).toFixed(2)}%` : '0.00%'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>);

}
