# Reddit Promotion Post & Recommended Subreddits

## Recommended Subreddits

1. **[r/LaTeX](https://www.reddit.com/r/LaTeX/)**
    - **Reason**: The primary hub for LaTeX users. Since `circuitikz` coordinates and syntax are notoriously tedious to write manually, a WYSIWYG editor with AI image-to-code capabilities will be highly welcomed.
2. **[r/ElectricalEngineering](https://www.reddit.com/r/ElectricalEngineering/)** or **[r/EE](https://www.reddit.com/r/EE/)**
    - **Reason**: Core community of electrical engineers and hobbyists who draw schematics regularly.
3. **[r/EngineeringStudents](https://www.reddit.com/r/EngineeringStudents/)**
    - **Reason**: Engineering students frequently need to insert schematic diagrams into lab reports or graduation papers.
4. **[r/artificial](https://www.reddit.com/r/artificial/)** or **[r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/)**
    - **Reason**: To showcase the AI Agent integration (`sch2tikz`), highlighting a practical domain-specific application of LLMs.

---

## Post Draft

**Title:**
Show r/LaTeX: VisioCirkit – A WYSIWYG CircuiTikZ Editor with Two-Way Editing

**Body:**

![Agent Skills Showcase](https://raw.githubusercontent.com/StockCurves/VisioCirkit/main/examples/2026-agent-skills.png)

Hi everyone,

We've built **VisioCirkit** (a fork of _CircuiTikZ-Designer_), an open-source, WYSIWYG editor designed to take the pain out of creating LaTeX circuit diagrams.

- 🌐 **Live Demo (Vercel):** https://visio-cirkit.vercel.app/
- 💻 **GitHub Repo:** https://github.com/StockCurves/VisioCirkit

### Key Features

- **Custom Symbol Editor:** Duplicate and tweak built-in CircuiTikZ components to perfectly meet your design needs.
- **Visual Subcircuit Previews & Grouping:** Group multiple components into custom subcircuits, and see actual visual previews in the symbols panel.

### AI Schematic-to-TikZ (`sch2tikz`)

We also packaged an AI Agent skill, `sch2tikz`, that allows you to upload a schematic image (either from academic papers or hand-drawn sketches) and automatically converts it into clean, structured CircuiTikZ code.

- **Perfect Alignment:** It queries a built-in database of component pin coordinate offsets to ensure wires snap perfectly to pins (like op-amps or logic gates).
- **Auto-Verification:** It features an iterative LaTeX-to-SVG compilation script to verify code validity before outputting.

### Refine Code with Real-Time Two-Way Sync

Since AI-generated code isn't always 100% perfect, VisioCirkit offers a seamless way to refine it:

1. Paste the AI-generated TikZ code directly into VisioCirkit's editor.
2. Drag, drop, scale, or rewire components visually on the canvas.
3. Click "Apply" to instantly update and sync the changes, then export the clean, structured LaTeX code back to your `.tex` document.

---

### We'd Love Your Feedback!

The app is under active development, and we would love to hear your thoughts:

- What features or component categories are you missing for your work/research?
- Have you encountered any rendering discrepancies between our QuickLaTeX renderer and your local pdflatex?
- Do you have any suggestions for UI/UX improvements?

If this tool saves you time, please feel free to star the repo or buy us a coffee. Check out the demo and let us know what you think!
