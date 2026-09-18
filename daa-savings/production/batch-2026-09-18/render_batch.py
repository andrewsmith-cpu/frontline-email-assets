import csv, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'daa-savings' / 'production' / 'DAA_SAVINGS_SUMMARY_PRODUCTION_MASTER_V3.png'
HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / 'clients.csv'
OUT_DIR = HERE / 'rendered'
OUT_DIR.mkdir(parents=True, exist_ok=True)

DIDOT = Path('/usr/share/fonts/opentype/gfs/GFSDidot.otf')
DIDOT_B = Path('/usr/share/fonts/opentype/gfs/GFSDidotBold.otf')
if not DIDOT.exists():
    DIDOT = Path('/usr/share/fonts/opentype/didot/GFSDidot.otf')
if not DIDOT_B.exists():
    DIDOT_B = Path('/usr/share/fonts/opentype/didot/GFSDidotBold.otf')
if not DIDOT.exists():
    DIDOT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSerifCondensed.ttf')
if not DIDOT_B.exists():
    DIDOT_B = Path('/usr/share/fonts/truetype/dejavu/DejaVuSerifCondensed-Bold.ttf')

CREAM=(249,248,245)
WHITE=(253,253,252)
NAVY=(8,42,91)
BLACK=(4,4,7)
GOLD=(167,103,0)
GOLD_CARD=(239,187,68)


def num(s):
    s = str(s or '').strip().replace('$','').replace(',','')
    if not s or s.lower() in {'inquire','n/a','na'}:
        return None
    return float(s)

def money(v):
    return 'Inquire' if v is None else f'${v:,.2f}'

def safe_name(s):
    return re.sub(r'[^A-Za-z0-9._-]+','_',s).strip('_')

def fit(draw, text, path, max_size, min_size, max_w, max_h=None):
    for size in range(max_size, min_size-1, -1):
        f=ImageFont.truetype(str(path), size)
        bb=draw.textbbox((0,0), text, font=f)
        if bb[2]-bb[0] <= max_w and (max_h is None or bb[3]-bb[1] <= max_h):
            return f
    return ImageFont.truetype(str(path), min_size)

def center(draw, text, rect, path, max_size, min_size=12, color=BLACK):
    x0,y0,x1,y1=rect
    f=fit(draw,text,path,max_size,min_size,x1-x0,y1-y0)
    bb=draw.textbbox((0,0),text,font=f)
    w,h=bb[2]-bb[0],bb[3]-bb[1]
    draw.text(((x0+x1-w)/2,(y0+y1-h)/2-bb[1]),text,font=f,fill=color)

def render(row):
    img=Image.open(BASE).convert('RGB')
    dr=ImageDraw.Draw(img)
    name=row['name'].strip(); cid=row['client_id'].strip(); date=row.get('review_date','09/18/2026').strip() or '09/18/2026'
    vals={k:num(row.get(k,'')) for k in ['debt','current','do_nothing','program_payment','monthly_savings','total_savings','p24','p36','p48','p54','p60']}
    term=int(float(row.get('program_term') or 60))

    # Client header panel
    dr.rectangle((20,233,620,366),fill=CREAM)
    dr.line((622,244,622,355),fill=(207,144,22),width=2)
    f=fit(dr,name,DIDOT_B,59,34,565,65)
    bb=dr.textbbox((0,0),name,font=f)
    dr.text((35,244-bb[1]),name,font=f,fill=BLACK)
    dr.line((293,318,293,350),fill=(202,141,20),width=2)
    fid=fit(dr,f'Client ID: {cid}',DIDOT,26,18,245,29)
    dr.text((36,317),f'Client ID: {cid}',font=fid,fill=NAVY)
    frev=fit(dr,f'Review Date: {date}',DIDOT,26,17,300,29)
    dr.text((310,317),f'Review Date: {date}',font=frev,fill=NAVY)

    # Total eligible debt
    dr.rectangle((776,278,1142,359),fill=CREAM)
    center(dr,money(vals['debt']),(782,280,1138,356),DIDOT_B,60,40)

    # Four KPI cards - preserve labels, replace value zones
    dr.rectangle((32,525,287,668),fill=WHITE)
    center(dr,money(vals['current']),(38,535,280,624),DIDOT_B,60,38)

    dr.rectangle((314,508,575,670),fill=WHITE)
    center(dr,money(vals['do_nothing']),(321,514,569,568),DIDOT_B,48,31)
    fs=ImageFont.truetype(str(DIDOT),18)
    dn=money(vals['do_nothing'])
    for line,y in zip(['You could end up paying',f'{dn} over time','if you keep paying what','you're paying now.'],[578,600,622,644]):
        bb=dr.textbbox((0,0),line,font=fs)
        dr.text((445-(bb[2]-bb[0])/2,y),line,font=fs,fill=NAVY)

    dr.rectangle((596,525,856,668),fill=WHITE)
    center(dr,money(vals['program_payment']),(604,535,848,624),DIDOT_B,60,38)

    dr.rectangle((885,525,1140,668),fill=WHITE)
    center(dr,money(vals['monthly_savings']),(892,535,1135,624),DIDOT_B,60,38)

    # Payment option cards. Blank/non-authoritative options become Inquire.
    options=[(24,vals['p24'],24,729,244,863),(36,vals['p36'],251,729,473,863),(48,vals['p48'],479,729,699,863),(54,vals['p54'],706,729,918,863),(60,vals['p60'],924,729,1142,863)]
    for t,val,x0,y0,x1,y1 in options:
        selected=(t==term) or (term>60 and t==60)
        dr.rectangle((x0,y0,x1,y1),fill=GOLD_CARD if selected else WHITE)
        center(dr,f'{t} MONTHS',(x0+5,y0+9,x1-5,y0+54),DIDOT,26,19,BLACK if selected else NAVY)
        center(dr,money(val),(x0+8,y0+54,x1-8,y1-8),DIDOT_B,43,25,BLACK)

    # Total savings. Cover the full original numeral height but stop before footer.
    dr.rectangle((773,873,1144,1007),fill=CREAM)
    center(dr,money(vals['total_savings']),(781,885,1138,970),DIDOT_B,54,34,GOLD)

    out=OUT_DIR / f"{safe_name(cid)}_{safe_name(name)}.png"
    img.save(out,optimize=True)
    return out

if not BASE.exists():
    raise SystemExit(f'Missing base image: {BASE}')
if not CSV_PATH.exists():
    raise SystemExit(f'Missing client CSV: {CSV_PATH}')

with CSV_PATH.open(newline='',encoding='utf-8-sig') as f:
    rows=list(csv.DictReader(f))
if not rows:
    raise SystemExit('clients.csv has no data rows')

for row in rows:
    render(row)
print(f'Rendered {len(rows)} production images to {OUT_DIR}')
