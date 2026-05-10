import re

with open('src/app/(marketing)/page.tsx', 'r') as f:
    content = f.read()

# Typography
content = content.replace('tracking-normal', 'tracking-tight')
content = content.replace('leading-8', 'leading-relaxed')
content = content.replace('leading-7', 'leading-relaxed')

# Colors
content = content.replace('#d7ff35', '#8B5CF6')
content = content.replace('bg-[#080808]', 'bg-transparent')
content = content.replace('bg-[#111111]', 'bg-[#09090B]')
content = content.replace('bg-[#0c0c0c]', 'bg-[#09090B]/50')
content = content.replace('bg-[#0d0d0d]', 'bg-[#09090B]/50')
content = content.replace('bg-black', 'bg-[#09090B]')
content = content.replace('bg-[#050505]', 'bg-[#000000]')

# Red/Yellow glowing backgrounds removal
content = content.replace('bg-red-400/80', 'bg-white/20')
content = content.replace('bg-yellow-300/80', 'bg-white/20')
content = content.replace('bg-emerald-300/80', 'bg-white/20')

# Card styling
content = content.replace('home-window', 'glass-card')

# CTA Box
cta_old = 'bg-gradient-to-br from-white via-[#e9f0ff] to-[#8B5CF6] p-8 text-black md:p-12'
cta_new = 'bg-gradient-to-br from-[#09090B] via-[#1a0b2e] to-[#4c1d95] p-8 text-white md:p-12'
content = content.replace(cta_old, cta_new)
content = content.replace('fill-black', 'fill-white') # For the Play icon in CTA

# Animations - adding fade-in
content = re.sub(r'(<section[^>]*className="[^"]*)(")', r'\1 animate-fade-in-up\2', content)

with open('src/app/(marketing)/page.tsx', 'w') as f:
    f.write(content)
