import os

md_path = r"f:\Final Mentor Mentee\nexus\docs\NEXUS_SRS_v4.5_PLATINUM.md"
out_path = r"f:\Final Mentor Mentee\nexus\docs\NEXUS_SRS_v4.5_PLATINUM.html"

with open(md_path, 'r', encoding='utf-8') as f:
    md_content = f.read()

line_count = len(md_content.splitlines())

# HTML-escape the markdown content for safe embedding in a hidden <textarea>
# Using textarea is the safest — browser decodes all HTML entities perfectly
md_escaped = (md_content
    .replace('&', '&amp;')
    .replace('<', '&lt;')
    .replace('>', '&gt;'))

header = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEXUS SRS v4.5.0-PLATINUM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked@4/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@9/dist/mermaid.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #1e40af; --secondary: #1e3a8a; --accent: #3b82f6;
            --slate-50: #f8fafc; --slate-100: #f1f5f9; --slate-200: #e2e8f0;
            --slate-700: #334155; --slate-800: #1e293b; --slate-900: #0f172a;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #f0f4ff 0%, #f8fafc 60%, #f0fdf4 100%);
            color: var(--slate-900); line-height: 1.7; min-height: 100vh;
        }}
        #report-container {{
            max-width: 1040px; margin: 48px auto 80px;
            background: white; padding: 80px 88px;
            border-radius: 24px;
            box-shadow: 0 32px 64px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
        }}
        .prose h1 {{
            font-size: 2.5rem; font-weight: 900; color: var(--primary);
            border-bottom: 4px solid var(--slate-200);
            padding-bottom: 24px; margin: 0 0 48px; letter-spacing: -0.02em;
        }}
        .prose h2 {{
            font-size: 1.85rem; font-weight: 800; color: var(--secondary);
            margin: 64px 0 28px; border-left: 8px solid var(--accent); padding-left: 22px;
        }}
        .prose h3 {{
            font-size: 1.35rem; font-weight: 700; color: var(--slate-800);
            margin: 48px 0 18px;
        }}
        .prose h4 {{
            font-size: 1.1rem; font-weight: 700; color: var(--slate-700);
            margin: 32px 0 12px; background: var(--slate-50);
            padding: 10px 16px; border-radius: 8px; border-left: 4px solid #cbd5e1;
        }}
        .prose p {{
            margin-bottom: 1.4rem; font-size: 1.04rem;
            color: var(--slate-700); text-align: justify; line-height: 1.85;
        }}
        .prose strong {{ color: var(--slate-900); font-weight: 700; }}
        .prose em {{ color: #4338ca; font-style: italic; }}
        .prose code {{
            font-family: 'JetBrains Mono', monospace;
            background: #eff6ff; color: #1d4ed8;
            padding: 2px 6px; border-radius: 4px;
            font-size: 0.87em; border: 1px solid #dbeafe;
        }}
        .prose pre {{
            background: #0f172a; padding: 24px; border-radius: 12px;
            overflow-x: auto; margin: 24px 0;
        }}
        .prose pre code {{
            background: none; color: #e2e8f0; border: none; font-size: 0.9em; padding: 0;
        }}
        .prose table {{
            width: 100%; border-collapse: collapse; margin: 36px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-radius: 12px; overflow: hidden;
        }}
        .prose th {{
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white; padding: 14px 18px; text-align: left;
            font-weight: 700; font-size: 0.93rem; letter-spacing: 0.02em;
            border: 1px solid #1e3a8a;
        }}
        .prose td {{ border: 1px solid var(--slate-200); padding: 12px 18px; font-size: 0.97rem; }}
        .prose tr:nth-child(even) {{ background: #f8fafc; }}
        .prose tr:hover {{ background: #eff6ff; transition: background 0.15s; }}
        .prose ul, .prose ol {{ margin: 0 0 28px 28px; }}
        .prose li {{ margin-bottom: 10px; font-size: 1rem; color: var(--slate-700); }}
        .prose ul li::marker {{ color: var(--accent); font-size: 1.2em; }}
        .prose hr {{
            margin: 64px 0; border: 0; height: 2px;
            background: linear-gradient(90deg, transparent, var(--slate-200), transparent);
        }}
        /* Mermaid diagram wrapper */
        .mermaid-wrap {{
            background: linear-gradient(145deg, #f8fafc, #ffffff);
            padding: 36px 28px; border: 1.5px solid var(--slate-200);
            border-radius: 20px; margin: 44px 0;
            display: flex; justify-content: center; align-items: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.05); overflow-x: auto;
        }}
        .mermaid-wrap svg {{ min-width: 650px; max-width: none; height: auto; }}
        .diagram-error {{
            background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
            padding: 16px 20px; border-radius: 12px; margin: 24px 0;
            font-family: 'JetBrains Mono', monospace; font-size: 0.82rem;
        }}
        /* Buttons */
        .btn-group {{
            position: fixed; top: 28px; right: 28px;
            display: flex; flex-direction: column; gap: 10px; z-index: 9999;
        }}
        .action-btn {{
            background: var(--primary); color: white;
            padding: 13px 26px; border-radius: 12px;
            font-weight: 700; font-size: 0.88rem;
            box-shadow: 0 8px 20px -4px rgba(30,64,175,0.4);
            transition: all 0.2s; border: none; cursor: pointer;
            display: flex; align-items: center; gap: 9px;
        }}
        .action-btn:hover {{ background: var(--secondary); transform: translateY(-2px); }}
        .action-btn-sec {{
            background: white; color: var(--primary);
            border: 2px solid var(--accent);
            box-shadow: 0 4px 12px rgba(59,130,246,0.15);
        }}
        .action-btn-sec:hover {{ background: #eff6ff; transform: translateY(-2px); }}
        .doc-meta {{
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 48px; padding: 18px 24px;
            background: linear-gradient(135deg, #eff6ff, #f0fdf4);
            border-radius: 12px; border: 1px solid #dbeafe;
        }}
        .badge {{
            padding: 8px 18px; border-radius: 9999px;
            font-size: 0.8rem; font-weight: 800; text-transform: uppercase;
            letter-spacing: 0.08em;
            background: linear-gradient(135deg, #fef3c7, #fffbeb);
            color: #92400e; border: 1px solid #fde68a;
        }}
        #loader {{
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; padding: 100px 0;
        }}
        .spinner {{
            width: 52px; height: 52px;
            border: 4px solid #dbeafe; border-top-color: var(--primary);
            border-radius: 50%; animation: spin 0.8s linear infinite;
        }}
        @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
        @media print {{
            body {{ background: white; }}
            #report-container {{
                margin: 0; padding: 40px 56px;
                box-shadow: none; max-width: 100%; border-radius: 0;
            }}
            .no-print {{ display: none !important; }}
            .prose h2 {{ page-break-before: always; }}
            .prose h1 {{ page-break-after: avoid; }}
            .mermaid-wrap {{ break-inside: avoid; box-shadow: none; border: 1px solid #e2e8f0; overflow: visible !important; }}
            .mermaid-wrap svg {{ min-width: 0 !important; max-width: 100% !important; height: auto !important; }}
            .prose h3, .prose h4 {{ break-after: avoid; }}
            .prose table {{ break-inside: avoid; }}
        }}
    </style>
</head>
<body>

<div class="btn-group no-print">
    <button class="action-btn" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
            <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
        </svg>
        Save / Export as PDF
    </button>
    <button class="action-btn action-btn-sec" onclick="window.scrollTo({{top:0,behavior:'smooth'}})">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
        </svg>
        Back to Top
    </button>
</div>

<div id="report-container">
    <div class="doc-meta no-print">
        <span class="badge">&#11088; Platinum Edition &bull; v4.5.0</span>
        <span style="color:#64748b;font-weight:600;font-size:0.88rem;">NEXUS Platform &bull; SRS_NEXUS_V4.5_May_2025</span>
    </div>
    <div id="prose-content" class="prose">
        <div id="loader">
            <div class="spinner"></div>
            <p style="margin-top:24px;color:#94a3b8;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.85rem;">Initialising Document</p>
            <p style="color:#94a3b8;font-size:.82rem;margin-top:8px;">Rendering {line_count} lines &amp; 12 Architectural Diagrams&hellip;</p>
        </div>
    </div>
</div>

<!-- Markdown source stored safely in a textarea — browser decodes all entities automatically -->
<textarea id="srs-source" style="display:none">{md_escaped}</textarea>

<script>
mermaid.initialize({{
    startOnLoad: false,
    theme: 'base',
    themeVariables: {{
        primaryColor: '#dbeafe',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#f0fdf4',
        tertiaryColor: '#fef3c7',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif'
    }},
    flowchart: {{ curve: 'basis', htmlLabels: true }},
    sequence: {{ actorFontWeight: 600, messageFontWeight: 500 }},
    er: {{ diagramPadding: 24 }}
}});

marked.setOptions({{ gfm: true, breaks: false }});

async function main() {{
    try {{
        // 1. Read the raw markdown (textarea decodes HTML entities automatically)
        var rawMd = document.getElementById('srs-source').value;

        // 2. Normalize line endings to \\n
        rawMd = rawMd.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');

        // 3. Parse with marked — mermaid blocks become <pre><code class="language-mermaid">
        var html = marked.parse(rawMd);

        // 4. Inject into DOM
        document.getElementById('prose-content').innerHTML = html;

        // 5. Find all mermaid code blocks that marked.js created
        //    marked v4 produces: <pre><code class="language-mermaid">...</code></pre>
        var preBlocks = document.querySelectorAll('pre code.language-mermaid');

        for (var i = 0; i < preBlocks.length; i++) {{
            var codeEl = preBlocks[i];
            var preEl = codeEl.parentElement;

            // Get the raw mermaid code text
            var mermaidCode = codeEl.textContent || codeEl.innerText;

            // Clean up stroke-width from classDef (compatibility fix)
            mermaidCode = mermaidCode.replace(
                /(classDef \\w+\\s+)([^\\n]+)/g,
                function(match, prefix, props) {{
                    return prefix + props.replace(/,?\\s*stroke-width:[^,;\\n]+/g, '');
                }}
            );

            // Also strip fill from classDef if it uses CSS vars (can cause issues)
            // But keep fill with hex colors

            // Create the wrapper div
            var wrap = document.createElement('div');
            wrap.className = 'mermaid-wrap';

            try {{
                var uid = 'mermaid-' + i + '-' + Date.now();
                var svgCode = await mermaid.render(uid, mermaidCode.trim());
                // mermaid v9 render returns svg string directly
                var svgStr = (typeof svgCode === 'object') ? svgCode.svg : svgCode;
                wrap.innerHTML = svgStr;
            }} catch (diagErr) {{
                console.warn('Diagram', i, 'error:', diagErr.message);
                wrap.innerHTML = '<div class="diagram-error"><b>Diagram error:</b> ' + diagErr.message + '</div>';
            }}

            // Replace the <pre> with our diagram wrapper
            preEl.parentNode.replaceChild(wrap, preEl);
        }}

    }} catch(err) {{
        console.error('Fatal error:', err);
        document.getElementById('prose-content').innerHTML =
            '<div style="padding:60px;text-align:center;">' +
            '<h2 style="color:#dc2626;margin-bottom:16px;">&#9888; Render Error</h2>' +
            '<p style="color:#64748b;">' + err.message + '</p></div>';
    }}
}}

main();
</script>
</body>
</html>"""

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(header)

size_kb = os.path.getsize(out_path) / 1024
print(f"SUCCESS: {out_path}")
print(f"Size: {size_kb:.1f} KB | Lines: {line_count}")
