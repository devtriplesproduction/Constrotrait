import re

file_path = r'c:\Users\VICTUS\Downloads\constrotrait-project-fixed\src\components\modules\eod\EODSubmissionForm.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace("import { ImagePlus, X } from 'lucide-react';", "import { ImagePlus, X, Plus } from 'lucide-react';")

# 2. Update state definitions
old_state = "const [jobCardNumbers, setJobCardNumbers] = useState('');"
new_state = '''const [jobCardNumbers, setJobCardNumbers] = useState<string[]>([]);
  const [jobCardInput, setJobCardInput] = useState('');

  const addJobCard = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const val = jobCardInput.trim();
    if (val && !jobCardNumbers.includes(val)) {
      setJobCardNumbers([...jobCardNumbers, val]);
      setJobCardInput('');
    }
  };

  const removeJobCard = (card: string) => {
    setJobCardNumbers(jobCardNumbers.filter(c => c !== card));
  };'''
content = content.replace(old_state, new_state)

# 3. Update initialization logic
old_init = "setJobCardNumbers((res.data as Record<string, unknown>).job_card_numbers as string || '');"
new_init = '''const jcn = (res.data as Record<string, unknown>).job_card_numbers as string || '';
          setJobCardNumbers(jcn ? jcn.split(',').map(s => s.trim()).filter(Boolean) : []);'''
content = content.replace(old_init, new_init)

# 4. Update clear logic
content = re.sub(r"setJobCardNumbers\('');", "setJobCardNumbers([]);", content)

# 5. Replace the Input element for Job Card
old_input = '''<Input
          label="Job Card/UID Numbers"
          type="text"
          name="job_card_numbers"
          value={jobCardNumbers}
          onChange={(e) => setJobCardNumbers(e.target.value)}
          placeholder="Enter Job Cards or UID numbers"
        />'''
new_input = '''<div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Job Card/UID Numbers</label>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={jobCardInput}
              onChange={(e) => setJobCardInput(e.target.value)}
              onKeyDown={addJobCard}
              className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Type number and press Enter"
            />
            <Button type="button" variant="outline" onClick={() => addJobCard()} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <input type="hidden" name="job_card_numbers" value={jobCardNumbers.join(', ')} />
        </div>'''
content = content.replace(old_input, new_input)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
