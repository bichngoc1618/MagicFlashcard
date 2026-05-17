import os
import re
import glob

root = 'frontend/src'
pattern = re.compile(r'^(.*function .*\(|const .* = .*\(?\{).*\) => \{')
hook = re.compile(r'\b(useState|useEffect|useMemo|useCallback|useRef|useLayoutEffect|useImperativeHandle|useContext)\b')

for path in glob.glob(os.path.join(root, '**', '*.tsx'), recursive=True) + glob.glob(os.path.join(root, '**', '*.ts'), recursive=True):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    inside = False
    brace = 0
    func_lines = []
    for i, line in enumerate(lines):
        if not inside and pattern.search(line):
            inside = True
            brace = line.count('{') - line.count('}')
            func_lines = [line]
        elif inside:
            func_lines.append(line)
            brace += line.count('{') - line.count('}')
            if brace <= 0:
                body = ''.join(func_lines)
                first_hook_match = hook.search(body)
                if first_hook_match:
                    first_hook = body.index(first_hook_match.group(0))
                    first_return = body.find('return')
                    if 0 <= first_return < first_hook:
                        print(path, 'func start', i+1, 'first_return', first_return, 'first_hook', first_hook)
                inside = False
                func_lines = []
