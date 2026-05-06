import os

files = [
    'app/admin/page.tsx',
    'app/admin/session/[sessionId]/page.tsx',
    'app/assessment/[sessionId]/page.tsx'
]

replacements = {
    'bg-ams-bg': 'bg-[#000000]',
    'text-ams-heading': 'text-white',
    'text-ams-muted': 'text-white/60',
    'text-ams-ink': 'text-white/80',
    'border-ams-border': 'border-white/10',
    'text-ams-cyan': 'text-purple-400',
    'bg-ams-cyan/10': 'bg-purple-500/10',
    'border-ams-cyan/30': 'border-purple-500/30',
    'hover:border-ams-cyan/50': 'hover:border-purple-500/50',
    'hover:border-ams-cyan/60': 'hover:border-purple-500/60',
    'focus:border-ams-cyan/60': 'focus:border-purple-500/60',
    'focus:ring-ams-cyan/10': 'focus:ring-purple-500/10',
    'bg-ams-cyan': 'bg-[#7C3AED]',
    'hover:bg-ams-cyan': 'hover:bg-[#7C3AED]',
    'bg-ams-blue': 'bg-[#8B5CF6]',
    'bg-ams-blue/40': 'bg-[#8B5CF6]/40',
    'border-ams-cyan': 'border-[#8B5CF6]',
    'border-ams-cyan/40': 'border-[#8B5CF6]/40',
    'rounded-lg border border-ams-border bg-ams-panel shadow-glass backdrop-blur-xl': 'glass-card',
    'rounded-lg border border-white/10 bg-ams-panel p-5 shadow-glass backdrop-blur-xl': 'glass-card p-5',
    'bg-ams-panel': 'glass-card',
    'bg-ams-surface': 'glass-card',
    'bg-gradient-to-r from-ams-blue to-ams-cyan': 'bg-[#8B5CF6]',
    'shadow-glow': 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
    'opacity-60': 'opacity-20', # For ams-grid
}

# Typography
typography = {
    'font-semibold': 'font-semibold tracking-tight',
    'leading-6': 'leading-relaxed',
    'leading-7': 'leading-relaxed',
    'leading-8': 'leading-relaxed',
}

for filepath in files:
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()

    # Apply typography
    for k, v in typography.items():
        # Avoid duplicate tracking-tight if already present
        if v not in content:
            content = content.replace(k, v)

    for k, v in replacements.items():
        content = content.replace(k, v)

    # Some manual fixes for exact strings that didn't catch
    content = content.replace('rounded-lg border border-white/10 glass-card p-5 shadow-glass backdrop-blur-xl', 'glass-card p-5')
    content = content.replace('rounded-lg border border-white/10 glass-card p-5', 'glass-card p-5')
    content = content.replace('rounded-lg border border-white/10 glass-card shadow-glass backdrop-blur-xl', 'glass-card')
    content = content.replace('rounded-lg border border-white/10 glass-card', 'glass-card')
    
    with open(filepath, 'w') as f:
        f.write(content)

print("Updated files.")
