from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def hexc(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
LEAF=hexc('2fc25f'); LEAFHI=hexc('7fe08a'); DEEP=hexc('1a9a47'); POT=hexc('ff8a5b'); POTD=hexc('e86a3c'); PINK=hexc('ff5fa2'); SUN=hexc('ffcd3c')
def leaf(d,cx,cy,w,h,ang,col,vein):
    pts=[]
    for i in range(41):
        t=i/40; x=t*w; y=math.sin(t*math.pi)*h/2
        pts.append((x,-y))
    for i in range(40,-1,-1):
        t=i/40; x=t*w; y=math.sin(t*math.pi)*h/2
        pts.append((x,y))
    a=math.radians(ang)
    P=[(cx+x*math.cos(a)-y*math.sin(a),cy+x*math.sin(a)+y*math.cos(a)) for x,y in pts]
    d.polygon(P,fill=col)
    d.line([P[0],(cx+w*.85*math.cos(a),cy+w*.85*math.sin(a))],fill=vein,width=max(2,int(h*.07)))
def plant(d,cx,base,s):
    # pot
    d.rounded_rectangle([cx-170*s,base-70*s,cx+170*s,base-20*s],radius=22*s,fill=POTD)
    d.polygon([(cx-148*s,base-24*s),(cx+148*s,base-24*s),(cx+118*s,base+120*s),(cx-118*s,base+120*s)],fill=POT)
    # stem
    d.rounded_rectangle([cx-12*s,base-420*s,cx+12*s,base-60*s],radius=12*s,fill=DEEP)
    leaf(d,cx+6*s,base-170*s,190*s,96*s,-28,LEAF,DEEP)
    leaf(d,cx-6*s,base-280*s,180*s,90*s,-152,LEAF,DEEP)
    leaf(d,cx+6*s,base-370*s,140*s,72*s,-40,LEAFHI,DEEP)
    # bloom
    for k in range(6):
        a=math.radians(k*60-90); r=46*s
        x=cx+math.cos(a)*r; y=base-450*s+math.sin(a)*r
        d.ellipse([x-38*s,y-38*s,x+38*s,y+38*s],fill=PINK)
    d.ellipse([cx-32*s,base-482*s,cx+32*s,base-418*s],fill=SUN)
def icon(size,maskable=False):
    S=1024;img=Image.new('RGB',(S,S));d=ImageDraw.Draw(img)
    for y in range(S):
        c=lerp(hexc('aee2ff'),hexc('fffbe3'),y/S); d.line([(0,y),(S,y)],fill=c)
    d.ellipse([-300,780,700,1300],fill=hexc('86dc5c')); d.ellipse([350,820,1400,1300],fill=hexc('5fc444'))
    sc=1.15 if not maskable else .95
    plant(d,512,800 if not maskable else 760,sc)
    img=img.resize((size,size),Image.LANCZOS)
    if not maskable:
        m=Image.new('L',(size,size),0);ImageDraw.Draw(m).rounded_rectangle([0,0,size-1,size-1],radius=int(size*.22),fill=255)
        out=Image.new('RGBA',(size,size));out.paste(img,(0,0),m);return out
    return img
icon(192).save('site/icon-192.png');icon(512).save('site/icon-512.png')
icon(512,True).save('site/icon-maskable-512.png')
icon(180,True).convert('RGB').save('site/apple-touch-icon.png')
icon(48).save('site/favicon.png')
# OG image
W,H=1200,630;img=Image.new('RGB',(W,H));d=ImageDraw.Draw(img)
for y in range(H):d.line([(0,y),(W,y)],fill=lerp(hexc('aee2ff'),hexc('fffbe3'),y/H))
glow=Image.new('L',(W,H),0);ImageDraw.Draw(glow).ellipse([980,40,1120,180],fill=255);glow=glow.filter(ImageFilter.GaussianBlur(30))
img.paste(Image.new('RGB',(W,H),hexc('ffe58a')),(0,0),glow);d=ImageDraw.Draw(img)
d.ellipse([1010,70,1090,150],fill=SUN)
d.ellipse([-200,480,700,820],fill=hexc('86dc5c'));d.ellipse([500,500,1500,860],fill=hexc('5fc444'))
plant(d,930,520,.78)
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';reg='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
F1=ImageFont.truetype(bold,118);F2=ImageFont.truetype(bold,40);F3=ImageFont.truetype(bold,34)
d.text((70,120),'Sproutle',font=F1,fill=hexc('1a9a47'))
d.text((74,270),'Grow a word,',font=F2,fill=hexc('173b23'));d.text((74,322),'one letter at a time.',font=F2,fill=hexc('173b23'))
x=74;y=420
for i,w in enumerate(['ORE','CORE','SCORE','SCORED','SCOURED']):
    bw=d.textlength(w,font=F3)+28
    d.rounded_rectangle([x,y,x+bw,y+54],radius=27,fill=(255,255,255))
    d.text((x+14,y+8),w,font=F3,fill=hexc('173b23'));x+=bw+12
    if x>760:break
img.save('site/og-image.png')
print('ok')
