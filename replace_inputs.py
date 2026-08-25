import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # check if <input is in content
    if not re.search(r'<input\b', content):
        return

    # Don't replace inside the Input component itself!
    if filepath.endswith('components\\ui\\input.tsx') or filepath.endswith('components/ui/input.tsx'):
        return

    # Replace <input and </input>
    new_content = re.sub(r'<input\b', '<Input', content)
    new_content = re.sub(r'</input>', '</Input>', new_content)

    # Add import if not present
    if 'import { Input }' not in new_content:
        # find the last import
        import_match = list(re.finditer(r'^import\s+.*?;?\s*$', new_content, re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            insert_pos = last_import.end()
            new_content = new_content[:insert_pos] + '\nimport { Input } from "@/components/ui/input";' + new_content[insert_pos:]
        else:
            new_content = 'import { Input } from "@/components/ui/input";\n' + new_content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Updated {filepath}")

def main():
    src_dir = os.path.join(os.getcwd(), 'src')
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.jsx')):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
