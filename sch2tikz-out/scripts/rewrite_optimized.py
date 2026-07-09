import re
import os
import subprocess

base_file = r"C:\Users\iMonet\Projects\antigravity\VisioCirkit\sch2tikz-out\2026-0703-0830.tikz"
with open(base_file, "r", encoding="utf-8") as f:
    tikz = f.read()

# 1. Apply Strategy A (Alignment of M16) BEFORE scaling
tikz = tikz.replace('(12.5, 8.5)', '(16.0, 8.5)')
tikz = tikz.replace('(12.5, 9.3)', '(16.0, 9.3)')
tikz = tikz.replace('(12.5, 9.27) -- (12.5, 10.0)', '(16.0, 9.27) -- (16.0, 10.0)')
tikz = tikz.replace('(12.5, 10.0)', '(16.0, 10.0)')
tikz = tikz.replace('(1.52, 8.5) -- (11.52, 8.5)', '(1.52, 8.5) -- (15.02, 8.5)')
tikz = tikz.replace('(11.52, 8.5)', '(15.02, 8.5)')
tikz = tikz.replace('(12.5, 7.73) -- (12.5, 7.2) -- (17.5, 7.2) -- (17.5, 6.77)', '(16.0, 7.73) -- (16.0, 7.2) -- (17.5, 7.2) -- (17.5, 6.77)')
tikz = tikz.replace('\\draw (14.5, 7.2) -- (14.5, 6.77);', '\\draw (14.5, 7.2) -- (14.5, 6.77);\n\\draw (14.5, 7.2) -- (16.0, 7.2);')

# 2. Apply Strategy C (Label optimization)
tikz = tikz.replace('l_=$R_{17}$', 'l=$R_{17}$')
tikz = tikz.replace('l_=$C_{11}$', 'l=$C_{11}$')
tikz = tikz.replace('l_=$R_{18}$', 'l=$R_{18}$')
tikz = tikz.replace('l_=$C_{12}$', 'l=$C_{12}$')

# 3. Apply Strategy B (Topological Scaling without stretching components)
def map_x(x_val):
    for base_int in range(0, 100):
        for offset in [0.0, 0.5]:
            base = base_int + offset
            if abs(x_val - (base + 0.98)) < 0.01:
                return base * 1.5 + 0.98
            if abs(x_val - (base - 0.98)) < 0.01:
                return base * 1.5 - 0.98
    return x_val * 1.5

def map_y(y_val):
    # Handle negative bases as well
    for base_int in range(-20, 40):
        for offset in [0.0, 0.5]:
            base = base_int + offset
            if abs(y_val - (base + 0.77)) < 0.01:
                return base * 1.4 + 0.77
            if abs(y_val - (base - 0.77)) < 0.01:
                return base * 1.4 - 0.77
    return y_val * 1.4

def replacer(match):
    x = float(match.group(1))
    y = float(match.group(2))
    new_x = map_x(x)
    new_y = map_y(y)
    return f"({new_x:.3f}, {new_y:.3f})"

tikz = re.sub(r'\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)', replacer, tikz)

# We also need to fix rectange draw syntax which uses (x1, y1) rectangle (x2, y2)
# The regex above catches all (x, y), so the rectangle is correctly scaled!

# Wait, check if there are any specific things that shouldn't be scaled?
# The thick oxide box is: \draw[dashed, thick] (1.0, 7.3) rectangle (13.5, 10.6);
# 13.5 will scale to 20.25. 7.3 will scale to 10.22. This is perfectly fine.

out_file = r"C:\Users\iMonet\Projects\antigravity\VisioCirkit\sch2tikz-out\2026-0704-1050_optimized.tikz"
with open(out_file, "w", encoding="utf-8") as f:
    f.write(tikz)

print(f"Generated {out_file}")

# Verify using sch2tikz skill script
script_path = r"C:\Users\iMonet\Projects\antigravity\VisioCirkit\.agents\skills\sch2tikz\scripts\verify_tikz.py"
subprocess.run(["python", script_path, out_file], check=True)
