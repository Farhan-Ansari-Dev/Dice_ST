#!/usr/bin/env python3
"""
Generate PDF and PNG exports for DICE by Sanyog documentation.
"""

import os
import subprocess
import markdown
import weasyprint
from pathlib import Path

DOCS_DIR = Path("/Users/sanyogpc/Desktop/Dice_ST/mobile-app/docs")
EXPORT_DIR = DOCS_DIR / "exports"
EXPORT_DIR.mkdir(exist_ok=True)

DOCS = [
    ("PRD.md",               "PRD — Product Requirements"),
    ("TRD.md",               "TRD — Technical Requirements"),
    ("AppFlow.md",           "App Flow — User Journey"),
    ("UIUXDesignBrief.md",   "UI/UX Design Brief"),
    ("BackendSchema.md",     "Backend Schema"),
    ("ImplementationPlan.md","Implementation Plan"),
]

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

@page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-right {
        content: "DICE by Sanyog  |  Page " counter(page) " of " counter(pages);
        font-size: 9px;
        color: #94A3B8;
        font-family: 'Inter', sans-serif;
    }
    @top-left {
        content: "CONFIDENTIAL — Internal Use Only";
        font-size: 9px;
        color: #EF4444;
        font-family: 'Inter', sans-serif;
    }
}

* {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    line-height: 1.7;
    color: #0F172A;
    background: #FFFFFF;
    margin: 0;
    padding: 0;
}

/* ── Cover strip ── */
body::before {
    content: "";
    display: block;
    height: 6px;
    background: linear-gradient(90deg, #6C63FF 0%, #00D4FF 100%);
    margin-bottom: 32px;
}

/* ── Headings ── */
h1 {
    font-size: 26px;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 4px 0;
    padding-bottom: 12px;
    border-bottom: 3px solid #6C63FF;
    line-height: 1.2;
}

h2 {
    font-size: 18px;
    font-weight: 700;
    color: #1E293B;
    margin: 32px 0 10px 0;
    padding: 8px 12px;
    background: linear-gradient(135deg, #F0EEFF 0%, #E8F4FF 100%);
    border-left: 4px solid #6C63FF;
    border-radius: 0 6px 6px 0;
    page-break-after: avoid;
}

h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1E293B;
    margin: 24px 0 8px 0;
    page-break-after: avoid;
}

h4 {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin: 16px 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    page-break-after: avoid;
}

/* ── Paragraphs & lists ── */
p {
    margin: 0 0 12px 0;
    color: #334155;
}

ul, ol {
    margin: 8px 0 12px 0;
    padding-left: 22px;
    color: #334155;
}

li {
    margin-bottom: 4px;
}

li > ul, li > ol {
    margin: 4px 0;
}

/* ── Tables ── */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 12px;
    page-break-inside: avoid;
}

thead {
    background: linear-gradient(135deg, #6C63FF 0%, #5A52E0 100%);
    color: #FFFFFF;
}

thead th {
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: none;
}

tbody tr:nth-child(even) {
    background: #F8FAFF;
}

tbody tr:nth-child(odd) {
    background: #FFFFFF;
}

tbody tr:hover {
    background: #EEF2FF;
}

tbody td {
    padding: 9px 12px;
    border-bottom: 1px solid #E2E8F0;
    vertical-align: top;
    color: #334155;
}

/* ── Code blocks ── */
pre {
    background: #0F172A;
    color: #E2E8F0;
    border-radius: 8px;
    padding: 16px 20px;
    font-size: 11px;
    line-height: 1.6;
    overflow-x: auto;
    margin: 12px 0;
    border-left: 4px solid #6C63FF;
    page-break-inside: avoid;
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

code {
    background: #F1F5F9;
    color: #6C63FF;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11.5px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-weight: 500;
}

pre code {
    background: transparent;
    color: #E2E8F0;
    padding: 0;
    border-radius: 0;
    font-size: 11px;
}

/* ── Blockquotes ── */
blockquote {
    border-left: 4px solid #00D4FF;
    background: #F0FDFF;
    margin: 12px 0;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    color: #0F172A;
}

/* ── Horizontal rule ── */
hr {
    border: none;
    border-top: 2px solid #E2E8F0;
    margin: 24px 0;
}

/* ── Strong / em ── */
strong {
    font-weight: 700;
    color: #0F172A;
}

em {
    color: #475569;
}

/* ── Badges/checkmarks in text ── */
p:has(> strong:first-child) {
    background: #F8FAFC;
    padding: 4px 8px;
    border-radius: 4px;
}

/* ── Page breaks ── */
h2 {
    page-break-before: auto;
}

/* First h2 should not break */
h1 + h2 {
    page-break-before: avoid;
}
"""

def md_to_pdf(md_path: Path, title: str):
    """Convert a markdown file to styled PDF."""
    md_content = md_path.read_text(encoding="utf-8")

    # Convert markdown → HTML
    html_body = markdown.markdown(
        md_content,
        extensions=["tables", "fenced_code", "codehilite", "toc", "attr_list"]
    )

    # Full HTML document
    html_full = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title>{title}</title>
<style>
{CSS}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

    # Write temp HTML
    html_path = EXPORT_DIR / f"{md_path.stem}.html"
    html_path.write_text(html_full, encoding="utf-8")

    # Generate PDF
    pdf_path = EXPORT_DIR / f"{md_path.stem}.pdf"
    doc = weasyprint.HTML(filename=str(html_path))
    doc.write_pdf(str(pdf_path), stylesheets=[weasyprint.CSS(string=CSS)])

    print(f"  ✅ PDF: {pdf_path.name}")
    return pdf_path, html_path


def pdf_to_png(pdf_path: Path):
    """Convert PDF pages to PNG using ImageMagick or PyMuPDF."""
    stem = pdf_path.stem
    png_dir = EXPORT_DIR / stem
    png_dir.mkdir(exist_ok=True)

    # Try ImageMagick (convert)
    result = subprocess.run(
        ["which", "convert"], capture_output=True, text=True
    )
    if result.returncode == 0:
        out = subprocess.run([
            "convert",
            "-density", "150",
            "-quality", "92",
            "-background", "white",
            "-alpha", "remove",
            str(pdf_path),
            str(png_dir / f"{stem}-%02d.png")
        ], capture_output=True, text=True)
        if out.returncode == 0:
            pngs = sorted(png_dir.glob("*.png"))
            print(f"  ✅ PNG: {len(pngs)} page(s) → {png_dir.name}/")
            return pngs

    # Fallback: PyMuPDF (fitz)
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(pdf_path))
        for i, page in enumerate(doc):
            mat = fitz.Matrix(2, 2)  # 2x zoom = ~150dpi
            pix = page.get_pixmap(matrix=mat, alpha=False)
            out_path = png_dir / f"{stem}-{i:02d}.png"
            pix.save(str(out_path))
        pngs = sorted(png_dir.glob("*.png"))
        print(f"  ✅ PNG: {len(pngs)} page(s) → {png_dir.name}/ (via PyMuPDF)")
        return pngs
    except ImportError:
        pass

    print(f"  ⚠️  PNG skipped (no ImageMagick or PyMuPDF) — install with: brew install imagemagick")
    return []


def main():
    print(f"\n🎨 DICE by Sanyog — Doc Export")
    print(f"{'─' * 50}")
    print(f"Output: {EXPORT_DIR}\n")

    for filename, title in DOCS:
        md_path = DOCS_DIR / filename
        if not md_path.exists():
            print(f"  ⚠️  Skipping {filename} (not found)")
            continue

        print(f"📄 {title}")
        try:
            pdf_path, html_path = md_to_pdf(md_path, title)
            pdf_to_png(pdf_path)
            # Clean up temp HTML
            html_path.unlink()
        except Exception as e:
            print(f"  ❌ Error: {e}")
        print()

    print(f"{'─' * 50}")
    print(f"✨ Done! Files in: {EXPORT_DIR}")

    # List generated files
    pdfs = sorted(EXPORT_DIR.glob("*.pdf"))
    print(f"\n📁 PDFs ({len(pdfs)}):")
    for p in pdfs:
        size_kb = p.stat().st_size // 1024
        print(f"   {p.name} ({size_kb} KB)")

    png_dirs = [d for d in EXPORT_DIR.iterdir() if d.is_dir()]
    total_pngs = sum(len(list(d.glob("*.png"))) for d in png_dirs)
    if total_pngs:
        print(f"\n🖼️  PNGs ({total_pngs} total across {len(png_dirs)} folders):")
        for d in sorted(png_dirs):
            pngs = list(d.glob("*.png"))
            print(f"   {d.name}/ — {len(pngs)} page(s)")


if __name__ == "__main__":
    main()
