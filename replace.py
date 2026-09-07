import sys, re

path = r'C:\Users\VICTUS\Downloads\constrotrait-project-fixed\src\components\modules\eod\EODSubmissionForm.tsx'
content = open(path, 'r', encoding='utf-8').read()

target = r'''          <Input
            label="Hours Worked"
            type="number"
            name="office_hours"
            required
            min="0"
            max="12"
            step="0.5"
            value={officeHours}
            onChange={(e) => setOfficeHours(e.target.value)}
          />'''

replacement = r'''          <Input
            label="Hours Worked"
            type="number"
            name="office_hours"
            required
            min="0"
            max="12"
            step="0.5"
            placeholder="e.g. 8"
            value={officeHours}
            onChange={(e) => setOfficeHours(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                e.preventDefault();
              }
            }}
            className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />'''

norm_target = re.sub(r'\r\n?', '\n', target)
norm_content = re.sub(r'\r\n?', '\n', content)
norm_replacement = re.sub(r'\r\n?', '\n', replacement)

if norm_target in norm_content: 
    open(path, 'w', encoding='utf-8', newline='').write(norm_content.replace(norm_target, norm_replacement))
    print('Success')
else:
    print('Target not found')
