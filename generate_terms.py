import re
import markdown
import os

with open('TERMINOS_Y_CONDICIONES.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

html_content = markdown.markdown(md_content)

html_page = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Términos y Condiciones - mipos</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<style>
  .terms-container {{ max-width: 800px; margin: 120px auto 80px; padding: 0 20px; }}
  .terms-container h1 {{ font-family: 'Sora', sans-serif; font-size: 32px; margin-bottom: 24px; }}
  .terms-container h2 {{ font-family: 'Sora', sans-serif; font-size: 24px; margin-top: 40px; margin-bottom: 16px; }}
  .terms-container h3 {{ font-family: 'Sora', sans-serif; font-size: 20px; margin-top: 32px; margin-bottom: 12px; }}
  .terms-container p, .terms-container li {{ font-family: 'DM Sans', sans-serif; font-size: 16px; line-height: 1.6; color: var(--text-color); margin-bottom: 16px; }}
  .terms-container ul {{ padding-left: 20px; margin-bottom: 16px; }}
  .terms-container a {{ color: var(--brand-color); text-decoration: underline; }}
</style>
</head>
<body class="js">
<nav id="nav" class="nav" style="border-bottom: 1px solid rgba(0,0,0,0.05); background: white;">
  <div class="nav-container">
    <a href="/" class="logo-link">
      <div style="background:#fff; padding:4px; border-radius:8px;">
        <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="17" fill="#2563EB"/>
          <polyline points="17,32 27,43 47,22" stroke="white" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="logo-name" style="font-family:var(--font-display); font-size:20px; letter-spacing: -1px; margin-left: 4px; font-weight: bold;">mipos</span>
    </a>
    <div class="nav-actions" style="margin-left:auto;">
      <a href="/" class="btn btn-ghost" style="padding: 8px 16px;">Volver al inicio</a>
    </div>
  </div>
</nav>

<div class="terms-container">
  {html_content}
</div>

</body>
</html>"""

with open('terminos.html', 'w', encoding='utf-8') as f:
    f.write(html_page)

def add_link(filename):
    if not os.path.exists(filename): return
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'terminos.html' not in content:
        # insert under <li><a href="#demo">Demo</a></li>
        content = content.replace('<li><a href="#demo">Demo</a></li>', '<li><a href="#demo">Demo</a></li>\n        <li><a href="terminos.html">Términos y Condiciones</a></li>')
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)

add_link('index.html')
add_link('indexuy.html')
