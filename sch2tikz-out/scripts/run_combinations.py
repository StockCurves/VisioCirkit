import os
import subprocess
import shutil

base_file = r"C:\Users\iMonet\Projects\antigravity\VisioCirkit\sch2tikz-out\2026-0703-0830.tikz"
with open(base_file, "r", encoding="utf-8") as f:
    base_tikz = f.read()

def apply_A(tikz):
    # Align M16
    tikz = tikz.replace('(12.5, 8.5)', '(16.0, 8.5)')
    tikz = tikz.replace('(12.5, 9.3)', '(16.0, 9.3)')
    tikz = tikz.replace('(12.5, 9.27) -- (12.5, 10.0)', '(16.0, 9.27) -- (16.0, 10.0)')
    tikz = tikz.replace('(12.5, 10.0)', '(16.0, 10.0)')
    tikz = tikz.replace('(1.52, 8.5) -- (11.52, 8.5)', '(1.52, 8.5) -- (15.02, 8.5)')
    tikz = tikz.replace('(11.52, 8.5)', '(15.02, 8.5)')
    tikz = tikz.replace('(12.5, 7.73) -- (12.5, 7.2) -- (17.5, 7.2) -- (17.5, 6.77)', '(16.0, 7.73) -- (16.0, 7.2) -- (17.5, 7.2) -- (17.5, 6.77)')
    # Fix the crossing horizontal wire which originally went from 12.5 to 17.5.
    # Now it goes from 16.0 to 17.5. We need to add the piece from 14.5 to 16.0 so M1 connects properly.
    # Actually, the original was:
    # \draw (12.5, 7.73) -- (12.5, 7.2) -- (17.5, 7.2) -- (17.5, 6.77);
    # \draw (14.5, 7.2) -- (14.5, 6.77);
    # With A:
    # \draw (16.0, 7.73) -- (16.0, 7.2) -- (17.5, 7.2) -- (17.5, 6.77);
    # And we add a line connecting 14.5 to 16.0 so M1 connects to the network!
    tikz = tikz.replace('\\draw (14.5, 7.2) -- (14.5, 6.77);', '\\draw (14.5, 7.2) -- (14.5, 6.77);\n\\draw (14.5, 7.2) -- (16.0, 7.2);')
    return tikz

def apply_B(tikz):
    # Scale X by stretching the environment
    # Originally: \begin{circuitikz}[american, scale=1.0, every node/.style={transform shape}]
    # We change it to include xscale=1.3
    tikz = tikz.replace('\\begin{circuitikz}[american, scale=1.0, every node/.style={transform shape}]',
                        '\\begin{circuitikz}[american, scale=1.0, xscale=1.3, every node/.style={transform shape}]')
    return tikz

def apply_C(tikz):
    # Change label placement
    tikz = tikz.replace('l_=$R_{17}$', 'l=$R_{17}$')
    tikz = tikz.replace('l_=$C_{11}$', 'l=$C_{11}$')
    tikz = tikz.replace('l_=$R_{18}$', 'l=$R_{18}$')
    tikz = tikz.replace('l_=$C_{12}$', 'l=$C_{12}$')
    return tikz

combinations = {
    "A": [apply_A],
    "B": [apply_B],
    "C": [apply_C],
    "AB": [apply_A, apply_B],
    "AC": [apply_A, apply_C],
    "BC": [apply_B, apply_C],
    "ABC": [apply_A, apply_B, apply_C]
}

out_dir = r"C:\Users\iMonet\Projects\antigravity\VisioCirkit\sch2tikz-out"
script_path = r"C:\Users\iMonet\Projects\antigravity\VisioCirkit\.agents\skills\sch2tikz\scripts\verify_tikz.py"

for name, funcs in combinations.items():
    res = base_tikz
    for f in funcs:
        res = f(res)
    
    file_path = os.path.join(out_dir, f"comb_{name}.tikz")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(res)
    
    print(f"Verifying {name}...")
    subprocess.run(["python", script_path, file_path], check=True)
    print(f"Generated comb_{name}_rendered.svg")
