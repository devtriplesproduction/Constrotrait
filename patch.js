const fs = require('fs');
const filePath = 'c:/Users/VICTUS/Downloads/constrotrait-project-fixed/src/components/modules/eod/EODSubmissionForm.tsx';

let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update imports
content = content.replace("import { ImagePlus, X } from 'lucide-react';", "import { ImagePlus, X, Plus } from 'lucide-react';");

// 2. Update state definitions
const old_state = "const [jobCardNumbers, setJobCardNumbers] = useState('');";
const new_state = `const [jobCardNumbers, setJobCardNumbers] = useState<string[]>([]);
  const [jobCardInput, setJobCardInput] = useState('');

  const addJobCard = (e?: any) => {
    if (e && e.key && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const val = jobCardInput.trim();
    if (val && !jobCardNumbers.includes(val)) {
      setJobCardNumbers([...jobCardNumbers, val]);
      setJobCardInput('');
    }
  };

  const removeJobCard = (card: string) => {
    setJobCardNumbers(jobCardNumbers.filter(c => c !== card));
  };`;
content = content.replace(old_state, new_state);

// 3. Update initialization logic
const old_init = "setJobCardNumbers((res.data as Record<string, unknown>).job_card_numbers as string || '');";
const new_init = `const jcn = (res.data as Record<string, unknown>).job_card_numbers as string || '';
          setJobCardNumbers(jcn ? jcn.split(',').map(s => s.trim()).filter(Boolean) : []);`;
content = content.replace(old_init, new_init);

// 4. Update clear logic
content = content.replace(/setJobCardNumbers\(''\);/g, "setJobCardNumbers([]);");

// 5. Replace the Input element for Job Card
const old_input = `<Input
          label="Job Card/UID Numbers"
          type="text"
          name="job_card_numbers"
          value={jobCardNumbers}
          onChange={(e) => setJobCardNumbers(e.target.value)}
          placeholder="Enter Job Cards or UID numbers"
        />`;
const new_input = `<div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Job Card/UID Numbers</label>
          {jobCardNumbers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {jobCardNumbers.map((card, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20">
                  {card}
                  <button type="button" onClick={() => removeJobCard(card)} className="text-primary hover:text-primary/70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={jobCardInput}
              onChange={(e) => setJobCardInput(e.target.value)}
              onKeyDown={addJobCard}
              className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Type number and press Enter"
            />
            <Button type="button" variant="outline" onClick={addJobCard} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <input type="hidden" name="job_card_numbers" value={jobCardNumbers.join(',')} />
        </div>`;
content = content.replace(old_input, new_input);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("File patched!");
