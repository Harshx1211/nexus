import os

html_path = 'docs/NEXUS_SRS_Sharable_Report_PREMIUM.html'
md_path = 'docs/NEXUS_SRS_v3_Premium.md'
out_path = 'docs/NEXUS_SRS_Sharable_Report_v3_PREMIUM.html'

# Check for existence of required files
if not os.path.exists(md_path):
    print(f"Error: Markdown file missing: {md_path}")
    exit(1)

# If the template (v2) is missing, try using v3 as the template (self-update mode)
if not os.path.exists(html_path):
    if os.path.exists(out_path):
        print(f"Template missing, using {out_path} as template.")
        html_path = out_path
    else:
        print(f"Error: No HTML template found at {html_path} or {out_path}")
        exit(1)

with open(html_path, 'r', encoding='utf-8') as f:
    html_content: str = f.read()

with open(md_path, 'r', encoding='utf-8') as f:
    md_content: str = f.read()

# Update versions and titles
html_content = html_content.replace('Enterprise SRS v2.1-PRO', 'Enterprise SRS v3.0-PREMIUM')
html_content = html_content.replace('Version 2.1.0-PRO', 'Version 3.0.0-PREMIUM')

# Replace the markdown content within the script tag
start_tag = '<script id="master-srs-source" type="text/markdown">'
end_tag = '</script>'

start_pos = html_content.find(start_tag)
if start_pos == -1:
    print(f"Error: Start tag {start_tag} not found in {html_path}")
    exit(1)

start_idx = start_pos + len(start_tag)
end_idx = html_content.find(end_tag, start_idx)

if end_idx == -1:
    print(f"Error: End tag {end_tag} not found after start tag")
    exit(1)

start_part: str = html_content[:start_idx]
end_part: str = html_content[end_idx:]
new_html: str = start_part + '\n' + md_content + '\n    ' + end_part

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f"Successfully generated {out_path}")
