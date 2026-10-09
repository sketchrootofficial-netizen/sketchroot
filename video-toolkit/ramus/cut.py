import sys,json
from PIL import Image, ImageFilter, ImageDraw
from rembg import remove, new_session
sess=new_session('u2net')
src=Image.open('ramus/ramus.png').convert('RGB')
INC={'blair':[[(230,540),(472,540),(472,611),(230,611)]],
 'cat':[[(537,322),(662,322),(662,434),(537,434)],[(475,560),(520,560),(520,450),(682,450),(682,612),(475,612)]],
 'hen':[[(1393,480),(1442,480),(1442,612),(1393,612)],[(1400,468),(1418,468),(1432,506),(1412,506)]]}
C={ # name: (box, exclusion polygons in original coords)
 'hulligan':((0,265,240,610),[]),
 'blair':((228,240,475,612),[]),
 'cat':((438,262,700,612),[]),
 'trauma':((880,275,1050,605),[[(880,275),(945,275),(930,420),(900,470),(880,470)]]),
 'dal':((1028,325,1262,672),[[(1028,606),(1192,606),(1192,672),(1028,672)]]),
 'hen':((1240,415,1465,618),[]),
 'abkari':((1452,360,1712,612),[[(1452,360),(1712,360),(1712,372),(1452,372)]]),
 'ramu':((1480,210,1774,378),[]),
}
meta={}
only=sys.argv[1:]
for k,(b,ex) in C.items():
    if only and k not in only: continue
    im=src.crop(b).resize(((b[2]-b[0])*2,(b[3]-b[1])*2),Image.LANCZOS)
    out=remove(im,session=sess,post_process_mask=True)
    m=out.split()[3].point(lambda v:255 if v>110 else 0)
    d=ImageDraw.Draw(m)
    for poly in INC.get(k,[]): d.polygon([((x-b[0])*2,(y-b[1])*2) for x,y in poly],fill=255)
    for poly in ex: d.polygon([((x-b[0])*2,(y-b[1])*2) for x,y in poly],fill=0)
    m=m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(3))
    W,H=m.size;P=40
    stroke=m.filter(ImageFilter.MaxFilter(27)).filter(ImageFilter.GaussianBlur(1.2))
    c=Image.new('RGBA',(W+2*P,H+2*P),(0,0,0,0))
    sh=Image.new('RGBA',c.size,(0,0,0,0));sh.paste(Image.new('RGBA',(W,H),(0,0,0,110)),(P+10,P+16),stroke);sh=sh.filter(ImageFilter.GaussianBlur(14))
    c.alpha_composite(sh);c.paste(Image.new('RGBA',(W,H),(255,255,255,255)),(P,P),stroke)
    body=im.convert('RGBA');body.putalpha(m.filter(ImageFilter.GaussianBlur(.8)));c.alpha_composite(body,(P,P))
    bb=c.getbbox();c=c.crop(bb);c.save(f'ramus/st_{k}.png')
    meta[k]=dict(x=b[0]+(bb[0]-P)/2,y=b[1]+(bb[1]-P)/2,w=(bb[2]-bb[0])/2,h=(bb[3]-bb[1])/2)
    print(k,meta[k],flush=True)
old=json.load(open('ramus/stickers.json')) if __import__('os').path.exists('ramus/stickers.json') else {}
old.update(meta);old['hugo']=dict(x=647,y=133,w=330.5,h=485)
json.dump(old,open('ramus/stickers.json','w'),indent=1)
