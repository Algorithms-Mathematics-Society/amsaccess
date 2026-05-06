import re
import os

filepath = 'app/assessment/[sessionId]/page.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# Safe replacements for backgrounds and borders
content = content.replace('bg-[#000000]/95', 'bg-ams-bg/95')
content = content.replace('bg-[#000000]', 'bg-ams-bg')
content = content.replace('border-white/10', 'border-ams-border')
content = content.replace('bg-white/[0.04]', 'bg-ams-surface')
content = content.replace('bg-black/20', 'bg-ams-surface')
content = content.replace('bg-black/25', 'bg-ams-surface')

# Text replacements
content = content.replace('text-white/60', 'text-ams-muted')
content = content.replace('text-white/80', 'text-ams-ink')

# Replace `text-white` with `text-ams-heading` ONLY when it is NOT inside a purple button
# Purple buttons have `bg-[#8B5CF6]` or `bg-[#8B5CF6]/40`.
# We'll replace all text-white, then fix the buttons.
content = content.replace('text-white', 'text-ams-heading')

# Fix buttons to be forced white regardless of theme
content = content.replace('bg-[#8B5CF6]/40 text-ams-heading', 'bg-[#8B5CF6]/40 text-white')
content = content.replace('text-ams-heading transition hover:bg-[#7C3AED]', 'text-white transition hover:bg-[#7C3AED]')
content = content.replace('bg-[#8B5CF6] px-5 py-3 text-sm font-semibold tracking-tight text-ams-heading', 'bg-[#8B5CF6] px-5 py-3 text-sm font-semibold tracking-tight text-white')

# There is a timer that might use text-white... 
# Let's write the file.
with open(filepath, 'w') as f:
    f.write(content)

print("Restored theme variables.")
