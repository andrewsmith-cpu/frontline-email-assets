import csv, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'daa-savings' / 'production' / 'DAA_SAVINGS_SUMMARY_PRODUCTION_MASTER_V3.png'
HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / 'clients.csv'
OUT_DIR = HERE / 'rendered'
OUT_DIR.mkdir(parents=True, exist_ok=True)

DIDOT = Path('/usr/share/fonts/opentype/didot/GFSDidot.otf')
DIDOT_B = Path('/usr/share/fonts/opentype/didot/GFSDidotBold.otf')
DIDOT_I = Path('/usr/share/fonts/opentype/didot/GFSDidotItalic.otf')
if not DIDOT.exists():
    DIDOT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSerifCondensed.ttf')
if not DIDOT_B.exists():
    DIDOT_B = Path('/usr/share/fonts/truetype/dejavu/DejaVuSerifCondensed-Bold.ttf')
if not DIDOT_I.exists():
    DIDOT_I = Path('/usr/share/fonts/truetype/dejavu/DejaVuSerifCondensed-Italic.ttf')

NAVY=(8,42,91)
DARK_NAVY=(4,31,68)
GOLD=(167,103,0)
GOLD2=(204,144,34)
BLACK=(4,4,7)
CREAM_TOP=(255,255,252)
CREAM_BOT=(250,246,236)
BORDER=(214,208,194)
WHITE=(255,255,255)

def num(s):
    s = str(s or '').strip().replace('$','').replace(',','')
    if not s or s.lower() in {'inquire','n/a','na'}:
        return None
    return float(s)

def money(v):
    return 'Inquire' if v is None else f'${v:,.2f}'

def safe_name(s):
    return re.sub(r'[^A-Za-z0-9._-]+','_',str(s)).strip('_')

def fnt(path,size):
    return ImageFont.truetype(str(path), size)

def fit(draw, text, path, max_size, min_size, max_width):
    for s in range(max_size, min_size-1, -1):
        f=fnt(path,s)
        bb=draw.textbbox((0,0),text,font=f)
        if bb[2]-bb[0] <= max_width:
            return f
    return fnt(path,min_size)

def centered(draw, text, box, font, fill):
    x0,y0,x1,y1=box
    bb=draw.textbbox((0,0),text,font=font)
    tw,th=bb[2]-bb[0],bb[3]-bb[1]
    draw.text(((x0+x1-tw)/2,(y0+y1-th)/2-bb[1]),text,font=font,fill=fill)

def gradient_rect(img, box, top, bottom, radius=10, border=None, border_width=1, shadow=False):
    x0,y0,x1,y1=box
    w=x1-x0; h=y1-y0
    if shadow:
        sh=Image.new('RGBA',img.size,(0,0,0,0))
        sd=ImageDraw.Draw(sh)
        sd.rounded_rectangle((x0+3,y0+4,x1+3,y1+6),radius=radius,fill=(0,0,0,36))
        sh=sh.filter(ImageFilter.GaussianBlur(5))
        img.paste(sh,(0,0),sh)
    grad=np.zeros((h,w,3),dtype=np.uint8)
    for yy in range(h):
        t=yy/max(1,h-1)
        c=[int(top[i]*(1-t)+bottom[i]*t) for i in range(3)]
        grad[yy,:,:]=c
    patch=Image.fromarray(grad,'RGB')
    mask=Image.new('L',(w,h),0)
    md=ImageDraw.Draw(mask)
    md.rounded_rectangle((0,0,w-1,h-1),radius=radius,fill=255)
    img.paste(patch,(x0,y0),mask)
    if border:
        ImageDraw.Draw(img).rounded_rectangle(box,radius=radius,outline=border,width=border_width)

def render(row):
    base=Image.open(BASE).convert('RGB')
    W,H=base.size
    img=Image.new('RGB',(W,H),'white')

    # Preserve the approved header and footer exactly.
    img.paste(base.crop((0,0,W,230)),(0,0))
    img.paste(base.crop((0,985,W,H)),(0,985))

    d=ImageDraw.Draw(img)
    d.rectangle((0,230,W,985),fill=(255,255,252))

    name=str(row.get('name','')).strip()
    cid=str(row.get('client_id','')).strip()
    date=str(row.get('review_date','09/18/2026')).strip() or '09/18/2026'
    vals={k:num(row.get(k,'')) for k in ['debt','current','do_nothing','program_payment','monthly_savings','total_savings','p24','p36','p48','p54','p60']}
    term=int(float(row.get('program_term') or 60))

    # Client header
    fname=fit(d,name,DIDOT_B,60,38,565)
    d.text((34,244),name,font=fname,fill=BLACK)
    d.line((623,244,623,358),fill=GOLD2,width=2)
    fmeta=fnt(DIDOT,24)
    d.text((36,323),f'Client ID: {cid}',font=fmeta,fill=NAVY)
    d.line((292,324,292,351),fill=GOLD2,width=2)
    d.text((314,323),f'Review Date: {date}',font=fmeta,fill=NAVY)

    # Total debt card
    gradient_rect(img,(636,239,1135,360),(254,254,252),(248,245,236),radius=10,border=(166,132,73),shadow=True)
    d=ImageDraw.Draw(img)
    d.rounded_rectangle((636,239,1135,276),radius=9,fill=DARK_NAVY)
    d.rectangle((636,266,1135,276),fill=DARK_NAVY)
    centered(d,'TOTAL ELIGIBLE DEBT',(650,240,1123,276),fnt(DIDOT_B,24),WHITE)
    img.paste(base.crop((675,276,763,357)),(676,276))
    d=ImageDraw.Draw(img)
    centered(d,money(vals['debt']),(756,277,1124,357),fit(d,money(vals['debt']),DIDOT_B,62,42,360),BLACK)

    # Main cards
    cards=[(24,383,300,669),(306,383,575,669),(582,383,852,669),(858,383,1134,669)]
    for b in cards:
        gradient_rect(img,b,CREAM_TOP,CREAM_BOT,radius=9,border=BORDER,shadow=True)

    icon_crops=[(42,392,107,459),(328,392,393,459),(609,392,674,459),(888,392,953,459)]
    icon_pos=[(43,392),(329,392),(610,392),(889,392)]
    for crop,pos in zip(icon_crops,icon_pos):
        img.paste(base.crop(crop),pos)

    d=ImageDraw.Draw(img)
    title=fnt(DIDOT_B,24)
    sub=fnt(DIDOT,20)
    def two_line(x0,x1,a,b):
        centered(d,a,(x0,397,x1,424),title,GOLD)
        centered(d,b,(x0,423,x1,451),title,GOLD)

    two_line(107,292,'YOUR CURRENT','SITUATION')
    two_line(392,567,'IF YOU DO','NOTHING')
    two_line(675,844,'OUR PROGRAM','CAN HELP')
    two_line(951,1128,'ESTIMATED','MONTHLY SAVINGS')

    centered(d,'Current Monthly Payments',(36,468,292,499),sub,NAVY)
    centered(d,'Estimated Do-Nothing',(317,463,565,489),sub,NAVY)
    centered(d,'Payback',(317,487,565,514),sub,NAVY)
    centered(d,'New Program Payment',(593,468,842,499),sub,NAVY)
    centered(d,'You Could Save',(868,462,1126,488),sub,NAVY)
    centered(d,'Each Month',(868,486,1126,512),sub,NAVY)

    for x0,x1,y in [(123,211,518),(678,763,518),(957,1042,528)]:
        d.line((x0,y,x1,y),fill=GOLD2,width=2)

    centered(d,money(vals['current']),(34,530,292,617),fit(d,money(vals['current']),DIDOT_B,58,39,250),BLACK)
    centered(d,money(vals['do_nothing']),(316,520,566,578),fit(d,money(vals['do_nothing']),DIDOT_B,48,31,242),BLACK)

    fex=fnt(DIDOT,17)
    explain=[
        'You could end up paying',
        f"{money(vals['do_nothing'])} over time",
        'if you keep paying what',
        "you're paying now."
    ]
    for text,y in zip(explain,[584,605,626,647]):
        centered(d,text,(318,y,563,y+20),fex,NAVY)

    centered(d,money(vals['program_payment']),(593,530,842,617),fit(d,money(vals['program_payment']),DIDOT_B,58,39,240),BLACK)
    centered(d,money(vals['monthly_savings']),(870,530,1127,617),fit(d,money(vals['monthly_savings']),DIDOT_B,58,39,248),BLACK)

    # Payment options heading
    d.text((23,685),'PAYMENT OPTIONS',font=fnt(DIDOT_B,35),fill=DARK_NAVY)
    d.line((358,705,578,705),fill=GOLD2,width=2)
    d.text((600,689),'Please select the option that best fits your budget.',font=fnt(DIDOT_I,21),fill=NAVY)
    d.line((1083,705,1126,705),fill=GOLD2,width=2)

    pboxes=[(24,731,244,852),(250,731,468,852),(474,731,690,852),(696,731,905,852),(912,731,1133,852)]
    for b in pboxes[:4]:
        gradient_rect(img,b,(253,251,246),(247,243,234),radius=8,border=BORDER,shadow=True)
    gradient_rect(img,pboxes[4],(247,223,167),(214,160,65),radius=8,border=(154,92,0),shadow=True)

    d=ImageDraw.Draw(img)
    terms=[24,36,48,54,60]
    values=[vals['p24'],vals['p36'],vals['p48'],vals['p54'],vals['p60']]
    for i,(b,t,v) in enumerate(zip(pboxes,terms,values)):
        x0,y0,x1,y1=b
        selected=(t==term) or (term>60 and t==60)
        label_color=BLACK if selected else NAVY
        centered(d,f'{t} MONTHS',(x0+5,744,x1-5,780),fnt(DIDOT,24),label_color)
        txt=money(v)
        centered(d,txt,(x0+8,783,x1-8,842),fit(d,txt,DIDOT_B,42,28,x1-x0-16),BLACK)

    # Total savings bar
    gradient_rect(img,(24,868,1134,976),(255,253,248),(249,244,233),radius=8,border=(185,122,20),shadow=True)
    d=ImageDraw.Draw(img)
    d.text((39,879),'TOTAL ESTIMATED SAVINGS',font=fnt(DIDOT_B,42),fill=DARK_NAVY)
    d.text((39,930),'Compared with estimated do-nothing payback, including interest.',font=fnt(DIDOT,20),fill=NAVY)
    d.line((666,881,666,963),fill=GOLD2,width=2)
    img.paste(base.crop((698,882,772,963)),(698,882))
    d=ImageDraw.Draw(img)
    ts=money(vals['total_savings'])
    centered(d,ts,(775,880,1123,965),fit(d,ts,DIDOT_B,58,38,340),GOLD)

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

print(f'Rendered {len(rows)} corrected production image(s) to {OUT_DIR}')
