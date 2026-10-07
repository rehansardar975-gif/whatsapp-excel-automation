# Builds case-study.html from ../CASE-STUDY.md (render.mjs turns it into CASE-STUDY.pdf). Needs: pip install markdown
import markdown, os
here = os.path.dirname(os.path.abspath(__file__))
body = markdown.markdown(open(os.path.join(here, "../CASE-STUDY.md")).read(), extensions=["tables"])
html = f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="brand.css"><style>
@page{{size:A4;margin:18mm 18mm 20mm}} body{{font-size:11pt;line-height:1.55;color:#1e293b}}
.head{{background:#0B0F17;color:#fff;padding:26px 30px;border-radius:12px;margin-bottom:18px}}
.head p{{font:600 9pt 'JetBrains Mono';letter-spacing:.18em;color:#5EEAD4}} .head h1{{font-size:24pt;margin-top:8px;line-height:1.15}}
h1{{display:none}} h2{{font-size:15pt;margin:20px 0 6px;color:#0F172A;border-bottom:2px solid #CCFBF1;padding-bottom:4px}}
p,li{{margin:5px 0}} ul{{padding-left:20px}} blockquote{{background:#F1F5F9;border-left:4px solid #14B8A6;padding:8px 12px;margin:10px 0;font-size:10pt}}
table{{border-collapse:collapse;width:100%;font-size:10pt;margin:8px 0}} td,th{{border:1px solid #E2E8F0;padding:6px 8px;text-align:left}} th{{background:#F8FAFC}}
code{{font-family:'JetBrains Mono';font-size:9pt;background:#F1F5F9;padding:1px 4px;border-radius:4px}}
img{{width:100%;border:1px solid #E2E8F0;border-radius:8px;margin:8px 0}}
</style></head><body><div class="head"><p>CASE STUDY</p><h1>SheetReach — Excel → WhatsApp campaign automation</h1></div>{body}
<h2>Screens</h2><img src="../screenshots/02-upload-validation.png"><img src="../screenshots/06-n8n-workflow-run.png"><img src="../screenshots/08-campaign-results.png"><img src="../assets/architecture-1600x1200.png"></body></html>'''
open(os.path.join(here, "case-study.html"), "w").write(html)
print("case-study.html")
