const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/hr/payroll/PayrollClient.tsx', 'utf8');

const stateBlock = `  const [adjType, setAdjType] = useState("Bonus");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);`;
const newStateBlock = `  const [adjType, setAdjType] = useState("Bonus");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjKilometers, setAdjKilometers] = useState("");
  const [adjVehicleType, setAdjVehicleType] = useState("Two-wheeler");
  const [adjTdsApplied, setAdjTdsApplied] = useState(false);
  const [adjTdsRate, setAdjTdsRate] = useState("1");
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);`;
content = content.replace(stateBlock, newStateBlock);

const handleAdd = `  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmployeeId || !adjAmount || isNaN(Number(adjAmount))) {
      toast({ title: "Error", description: "Please enter valid adjustment details.", variant: "error" });
      return;
    }
    setIsSubmittingAdj(true);
    try {
      const res = await addManualLedgerEntryAction(adjEmployeeId, adjType, Number(adjAmount), adjDesc);`;
const newHandleAdd = `  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalAmount = Number(adjAmount);
    if (adjType === "Travel Expense" && adjVehicleType === "Two-wheeler") {
      finalAmount = Number(adjKilometers) * 4.50;
    } else if (adjType === "TDS") {
      finalAmount = 0;
    }
    
    if (!adjEmployeeId || isNaN(finalAmount) || (adjType !== "TDS" && finalAmount <= 0)) {
      toast({ title: "Error", description: "Please enter valid adjustment details.", variant: "error" });
      return;
    }
    setIsSubmittingAdj(true);
    try {
      const res = await addManualLedgerEntryAction(
        adjEmployeeId, 
        adjType, 
        finalAmount, 
        adjDesc,
        adjType === "Travel Expense" ? Number(adjKilometers) : undefined,
        adjType === "Travel Expense" ? adjVehicleType : undefined,
        adjType === "TDS" ? adjTdsApplied : undefined,
        adjType === "TDS" ? Number(adjTdsRate) : undefined
      );`;
content = content.replace(handleAdd, newHandleAdd);

const typeSelect = `                  <SelectItem value="Bonus">Bonus</SelectItem>
                  <SelectItem value="Damage Recovery">Damage Recovery</SelectItem>
                  <SelectItem value="Salary Advance">Salary Advance Deduction</SelectItem>
                  <SelectItem value="Other Deduction">Other Deduction</SelectItem>`;
const newTypeSelect = `                  <SelectItem value="Bonus">Bonus</SelectItem>
                  <SelectItem value="Medical Allowance">Medical Allowance</SelectItem>
                  <SelectItem value="Travel Expense">Travel Expense</SelectItem>
                  <SelectItem value="Performance Incentive">Performance Incentive</SelectItem>
                  <SelectItem value="Food Allowance">Food Allowance</SelectItem>
                  <SelectItem value="TDS">TDS</SelectItem>
                  <SelectItem value="Damage Recovery">Damage Recovery</SelectItem>
                  <SelectItem value="Salary Advance">Salary Advance Deduction</SelectItem>
                  <SelectItem value="Other Deduction">Other Deduction</SelectItem>`;
content = content.replace(typeSelect, newTypeSelect);

const amountBlock = `              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Amount (₹)</label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </div>`;
const newAmountBlock = `              {adjType === "Travel Expense" && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Vehicle Type</label>
                    <Select value={adjVehicleType} onValueChange={setAdjVehicleType}>
                      <SelectItem value="Two-wheeler">Two-wheeler</SelectItem>
                      <SelectItem value="Car">Car</SelectItem>
                    </Select>
                  </div>
                  {adjVehicleType === "Two-wheeler" && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Kilometers</label>
                      <Input
                        type="number"
                        required
                        value={adjKilometers}
                        onChange={(e) => setAdjKilometers(e.target.value)}
                        placeholder="e.g. 10"
                      />
                      <p className="text-xs text-slate-500 mt-1">Amount: ₹{(Number(adjKilometers) * 4.50).toFixed(2)} (Auto-calculated)</p>
                    </div>
                  )}
                </>
              )}
              {adjType === "TDS" && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Apply TDS</label>
                    <input type="checkbox" checked={adjTdsApplied} onChange={e => setAdjTdsApplied(e.target.checked)} className="w-4 h-4" />
                  </div>
                  {adjTdsApplied && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">TDS Rate (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        required
                        value={adjTdsRate}
                        onChange={(e) => setAdjTdsRate(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </div>
                  )}
                </>
              )}
              {adjType !== "TDS" && (adjType !== "Travel Expense" || adjVehicleType === "Car") && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="e.g. 5000"
                  />
                </div>
              )}`;
content = content.replace(amountBlock, newAmountBlock);

const earningsBlock = `                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                      <p className="text-emerald-700 font-medium text-xs mb-1">Bonus</p>
                      <p className="font-black text-emerald-700">+₹{(selectedEmployee.bonus || 0).toLocaleString()}</p>
                    </div>`;
const newEarningsBlock = `                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                      <p className="text-emerald-700 font-medium text-xs mb-1">Bonus</p>
                      <p className="font-black text-emerald-700">+₹{(selectedEmployee.bonus || 0).toLocaleString()}</p>
                    </div>
                    {!!selectedEmployee.medical_allowance && (
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                        <p className="text-emerald-700 font-medium text-xs mb-1">Medical Allowance</p>
                        <p className="font-black text-emerald-700">+₹{selectedEmployee.medical_allowance.toLocaleString()}</p>
                      </div>
                    )}
                    {!!selectedEmployee.travel_expense && (
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                        <p className="text-emerald-700 font-medium text-xs mb-1">Travel Expense</p>
                        <p className="font-black text-emerald-700">+₹{selectedEmployee.travel_expense.toLocaleString()}</p>
                      </div>
                    )}
                    {!!selectedEmployee.performance_incentive && (
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                        <p className="text-emerald-700 font-medium text-xs mb-1">Perf. Incentive</p>
                        <p className="font-black text-emerald-700">+₹{selectedEmployee.performance_incentive.toLocaleString()}</p>
                      </div>
                    )}
                    {!!selectedEmployee.food_allowance && (
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                        <p className="text-emerald-700 font-medium text-xs mb-1">Food Allowance</p>
                        <p className="font-black text-emerald-700">+₹{selectedEmployee.food_allowance.toLocaleString()}</p>
                      </div>
                    )}`;
content = content.replace(earningsBlock, newEarningsBlock);

const deductionsBlock = `                    <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100/50">
                      <p className="text-red-700 font-medium text-xs mb-1">Total Deductions</p>
                      <p className="font-black text-red-700">-₹{(selectedEmployee.total_deductions || 0).toLocaleString()}</p>
                    </div>`;
const newDeductionsBlock = `                    {!!selectedEmployee.tds && (
                      <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100/50">
                        <p className="text-red-700 font-medium text-xs mb-1">TDS</p>
                        <p className="font-black text-red-700">-₹{selectedEmployee.tds.toLocaleString()}</p>
                      </div>
                    )}
                    <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100/50">
                      <p className="text-red-700 font-medium text-xs mb-1">Total Deductions</p>
                      <p className="font-black text-red-700">-₹{(selectedEmployee.total_deductions || 0).toLocaleString()}</p>
                    </div>`;
content = content.replace(deductionsBlock, newDeductionsBlock);

fs.writeFileSync('src/app/(dashboard)/hr/payroll/PayrollClient.tsx', content);
