import csv, html, re, tempfile
from pathlib import Path
from PIL import Image
from weasyprint import HTML
import fitz

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / 'clients.csv'
OUT_DIR = HERE / 'rendered'
OUT_DIR.mkdir(parents=True, exist_ok=True)
PROOF = ROOT / 'daa-savings' / 'production' / 'proofs' / 'Jeffrey_Rawlins_APPROVED_PROOF.jpg'

def num(v):
    s=str(v or '').strip().replace('$','').replace(',','')
    if not s or s.lower() in {'n/a','na','inquire'}:
        return None
    return float(s)

def money(v):
    return 'Inquire' if v is None else f'${v:,.2f}'

def safe(s):
    return re.sub(r'[^A-Za-z0-9._-]+','_',str(s)).strip('_')

def name_size(name):
    n=len(name)
    return 58 if n <= 18 else 50 if n <= 24 else 43 if n <= 30 else 36

def value_size(v, normal, small):
    if v is None: return small
    return small if abs(v) >= 100000 else normal

def payment_size(v):
    if v is None: return 30
    return 34 if abs(v) >= 10000 else 40

def render(row):
    name=str(row.get('name','')).strip()
    cid=str(row.get('client_id','')).strip()
    date=str(row.get('review_date','09/18/2026')).strip() or '09/18/2026'
    vals={k:num(row.get(k,'')) for k in ['debt','current','do_nothing','program_payment','monthly_savings','total_savings','p24','p36','p48','p54','p60']}
    term=int(float(row.get('program_term') or 60))

    with tempfile.TemporaryDirectory() as td:
        td=Path(td)
        base=Image.open(PROOF).convert('RGB').resize((1055,1491), Image.Resampling.LANCZOS)
        assets={
            'header':(0,0,1055,253),
            'footer':(0,1104,1055,1400),
            'current':(36,432,102,500),
            'nothing':(289,432,356,500),
            'program':(548,432,616,500),
            'savings':(801,432,868,500),
            'debt':(596,322,662,394),
            'pig':(620,986,701,1065),
        }
        uris={}
        for key,box in assets.items():
            p=td/f'{key}.png'
            base.crop(box).save(p)
            uris[key]=p.as_uri()

        terms=[24,36,48,54,60]
        pv=[vals['p24'],vals['p36'],vals['p48'],vals['p54'],vals['p60']]
        pay_html=''.join(
            f"""<div class="pay {'sel' if t==term or (term>60 and t==60) else ''}">
            <div class="term">{t} MONTHS</div>
            <div class="payval" style="font-size:{payment_size(v)}px">{html.escape(money(v))}</div></div>"""
            for t,v in zip(terms,pv)
        )

        doc=f"""<!doctype html><html><head><meta charset="utf-8"><style>
        @page{{size:1055px 1400px;margin:0}}*{{box-sizing:border-box}}body{{margin:0;background:#fff;font-family:'GFS Didot','Times New Roman',serif;color:#061635}}
        .canvas{{position:relative;width:1055px;height:1400px;overflow:hidden;background:#fff}}.header{{width:1055px;height:253px;display:block}}.footer{{position:absolute;left:0;top:1104px;width:1055px;height:296px;display:block}}
        .client{{position:absolute;left:0;top:253px;width:1055px;height:160px;background:#fff}}.client-left{{position:absolute;left:24px;top:8px;width:530px;height:145px;border-right:2px solid #c48c25;padding-right:14px}}
        .name{{font-weight:700;font-size:{name_size(name)}px;line-height:1;color:#05070b;white-space:nowrap;overflow:hidden}}.meta{{display:flex;align-items:center;gap:18px;margin-top:16px;font-size:22px;color:#173d74;white-space:nowrap}}.meta .sep{{height:35px;width:2px;background:#c48c25}}
        .debt-card{{position:absolute;left:574px;top:10px;width:457px;height:140px;border:1px solid #a88b59;border-radius:12px;background:linear-gradient(#fff,#fbf7ef);box-shadow:0 4px 10px rgba(0,0,0,.12);overflow:hidden}}
        .debt-head{{height:42px;background:#082955;color:#fff;font-size:26px;font-weight:700;text-align:center;line-height:42px}}.debt-body{{height:98px;display:flex;align-items:center;justify-content:center;gap:14px}}.debt-body img{{width:66px;height:72px;object-fit:contain}}.debt-val{{font-size:{value_size(vals['debt'],58,49)}px;font-weight:700;color:#030407;letter-spacing:-1px;white-space:nowrap}}
        .cards{{position:absolute;left:22px;top:422px;width:1011px;height:320px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px}}.card{{border:1px solid #dad4c8;border-radius:12px;background:linear-gradient(#fff,#fbf8f1);box-shadow:0 5px 12px rgba(0,0,0,.10);position:relative;padding:12px 10px 10px;text-align:center;overflow:hidden}}
        .card-top{{display:flex;align-items:center;justify-content:center;gap:9px;height:78px}}.card-top img{{width:68px;height:68px;object-fit:cover;flex:0 0 auto;border-radius:50%}}.card-title{{font-size:22px;font-weight:700;line-height:1;color:#a36200}}.sub{{font-size:21px;line-height:1.06;color:#193f78;margin-top:4px;min-height:50px}}.rule{{width:84px;height:2px;background:#d59627;margin:8px auto 5px}}
        .big{{font-size:52px;font-weight:700;line-height:1.05;color:#030407;white-space:nowrap}}.explain{{font-size:17px;line-height:1.08;color:#193f78;margin:8px auto 0;width:210px}}
        .payment-head{{position:absolute;left:22px;top:757px;width:1011px;height:53px;display:flex;align-items:center}}.payment-title{{font-size:36px;font-weight:700;color:#061635;white-space:nowrap}}.goldline{{height:2px;background:#d59627;flex:1;margin:0 16px}}.payment-sub{{font-size:21px;font-style:italic;color:#183e77;white-space:nowrap}}
        .paygrid{{position:absolute;left:22px;top:808px;width:1011px;height:140px;display:grid;grid-template-columns:repeat(5,1fr);gap:6px}}.pay{{border:1px solid #d8d1c4;border-radius:9px;background:linear-gradient(#fff,#faf6ed);box-shadow:0 4px 9px rgba(0,0,0,.10);text-align:center;padding:15px 7px}}.pay.sel{{background:linear-gradient(#f8dea1,#dfa53b);border-color:#aa6e0d}}.term{{font-size:24px;color:#173d74;line-height:1}}.pay.sel .term{{color:#101010}}.payval{{font-weight:700;color:#050505;line-height:1;margin-top:18px;white-space:nowrap}}
        .savings{{position:absolute;left:22px;top:963px;width:1011px;height:107px;border:1px solid #bc7a14;border-radius:10px;background:linear-gradient(#fff,#fbf7ef);box-shadow:0 3px 8px rgba(0,0,0,.08);display:flex;align-items:center;overflow:hidden}}.save-left{{width:575px;padding-left:16px}}.save-title{{font-size:34px;font-weight:700;line-height:1;color:#061635;white-space:nowrap}}.save-sub{{font-size:20px;color:#173d74;margin-top:6px;white-space:nowrap}}.save-right{{flex:1;height:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 14px}}.save-right img{{width:81px;height:79px;object-fit:contain}}.save-val{{font-size:{value_size(vals['total_savings'],52,44)}px;font-weight:700;color:#b26f00;white-space:nowrap;letter-spacing:-1px}}
        </style></head><body><div class="canvas">
        <img class="header" src="{uris['header']}">
        <section class="client"><div class="client-left"><div class="name">{html.escape(name)}</div><div class="meta"><span>Client ID: {html.escape(cid)}</span><span class="sep"></span><span>Review Date: {html.escape(date)}</span></div></div>
        <div class="debt-card"><div class="debt-head">TOTAL ELIGIBLE DEBT</div><div class="debt-body"><img src="{uris['debt']}"><div class="debt-val">{html.escape(money(vals['debt']))}</div></div></div></section>
        <section class="cards">
        <div class="card"><div class="card-top"><img src="{uris['current']}"><div class="card-title">YOUR CURRENT<br>SITUATION</div></div><div class="sub">Current Monthly<br>Payments</div><div class="rule"></div><div class="big" style="font-size:{value_size(vals['current'],52,46)}px">{html.escape(money(vals['current']))}</div></div>
        <div class="card"><div class="card-top"><img src="{uris['nothing']}"><div class="card-title">IF YOU DO<br>NOTHING</div></div><div class="sub">Estimated Do-Nothing<br>Payback</div><div class="big" style="font-size:{value_size(vals['do_nothing'],49,43)}px">{html.escape(money(vals['do_nothing']))}</div><div class="explain">You could end up paying<br>{html.escape(money(vals['do_nothing']))} over time<br>if you keep paying what<br>you’re paying now.</div></div>
        <div class="card"><div class="card-top"><img src="{uris['program']}"><div class="card-title">OUR<br>PROGRAM<br>CAN HELP</div></div><div class="sub">New Program<br>Payment</div><div class="rule"></div><div class="big" style="font-size:{value_size(vals['program_payment'],52,46)}px">{html.escape(money(vals['program_payment']))}</div></div>
        <div class="card"><div class="card-top"><img src="{uris['savings']}"><div class="card-title">ESTIMATED<br>MONTHLY<br>SAVINGS</div></div><div class="sub">You Could Save<br>Each Month</div><div class="rule"></div><div class="big" style="font-size:{value_size(vals['monthly_savings'],52,46)}px">{html.escape(money(vals['monthly_savings']))}</div></div>
        </section>
        <div class="payment-head"><div class="payment-title">PAYMENT OPTIONS</div><div class="goldline"></div><div class="payment-sub">Please select the option that best fits your budget.</div><div class="goldline" style="max-width:42px"></div></div>
        <div class="paygrid">{pay_html}</div>
        <div class="savings"><div class="save-left"><div class="save-title">TOTAL ESTIMATED SAVINGS</div><div class="save-sub">Compared with estimated do-nothing payback.</div></div><div class="save-right"><img src="{uris['pig']}"><div class="save-val">{html.escape(money(vals['total_savings']))}</div></div></div>
        <img class="footer" src="{uris['footer']}"></div></body></html>"""

        pdf=td/'out.pdf'
        HTML(string=doc, base_url=str(td)).write_pdf(pdf)
        page=fitz.open(pdf)[0]
        pix=page.get_pixmap(matrix=fitz.Matrix(96/72,96/72), alpha=False)
        png=td/'out.png'
        pix.save(png)
        out_img=Image.open(png).convert('RGB')
        if out_img.size != (1055,1400):
            out_img=out_img.resize((1055,1400), Image.Resampling.LANCZOS)
        out=OUT_DIR / f"{safe(cid)}_{safe(name)}_GENIE.jpg"
        out_img.save(out, quality=91, optimize=True, progressive=True)
        return out

if not PROOF.exists():
    raise SystemExit(f'Missing approved proof: {PROOF}')
with CSV_PATH.open(newline='', encoding='utf-8-sig') as f:
    rows=list(csv.DictReader(f))
if not rows:
    raise SystemExit('clients.csv has no rows')
for row in rows:
    render(row)
print(f'Rendered {len(rows)} DAA Genie image(s).')
