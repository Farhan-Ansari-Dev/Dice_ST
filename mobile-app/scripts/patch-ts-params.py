#!/usr/bin/env python3
"""
Strip TypeScript access modifiers (public/private/protected/readonly)
from constructor parameter properties in expo/src TS files.
These survive Babel transformation and cause Hermes parse errors.
"""
import os, re, sys

EXPO_SRC = os.path.join(os.path.dirname(__file__), '..', 'node_modules', 'expo', 'src')

def fix_constructor_params(content, filepath):
    """Remove public/private/protected/readonly from constructor parameter lists."""
    original = content

    # Pattern: constructor parameter with access modifier
    # e.g. constructor(message: string, public url: string, private foo: boolean)
    # Converts: public url: string -> url: string (keep the param, remove modifier)
    # Also handles: public readonly foo: T -> foo: T

    content = re.sub(
        r'\b(public|private|protected)\s+(readonly\s+)?(\w)',
        r'\3',
        content
    )

    if content != original:
        print(f'  Patched: {os.path.relpath(filepath)}')
    return content

patched = 0
for root, dirs, files in os.walk(EXPO_SRC):
    # Skip node_modules within expo
    dirs[:] = [d for d in dirs if d != 'node_modules']

    for fname in files:
        if not (fname.endswith('.ts') or fname.endswith('.tsx')):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Only process files that have access modifiers
            if not re.search(r'\b(public|private|protected)\b', content):
                continue

            new_content = fix_constructor_params(content, fpath)
            if new_content != content:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                patched += 1
        except Exception as e:
            print(f'  ERROR {fpath}: {e}')

print(f'✅ Patched {patched} files')
