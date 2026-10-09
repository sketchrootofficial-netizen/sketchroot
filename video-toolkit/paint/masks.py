import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove, new_session
sess=new_session('u2net')
src=Image.open('ramus/ramus.png').convert('RGB');W,H=src.size
# box, include polygons, exclusion polygons (original coords)
C={
 'hulligan':((0,265,240,610),[],[]),
 'blair':((228,240,475,612),[[(230,540),(472,540),(472,611),(230,611)]],[]),
 'cat':((438,262,700,560),[[(537,322),(662,322),(662,434),(537,434)]],[]),
 'hugo':((660,90,1040,598),[],[[(946,90),(1040,90),(1040,598),(925,598),(925,452),(903,452),(903,420),(916,350),(944,240)]]),
 'trauma':((880,275,1052,605),[[(930,288),(990,282),(1040,318),(1048,600),(905,600),(905,430),(896,360)]],[]),
 'dal':((1028,325,1262,672),[],[[(1028,606),(1192,606),(1192,672),(1028,672)]]),
 'hen':((1240,415,1465,618),[[(1393,480),(1442,480),(1442,612),(1393,612)],[(1400,468),(1418,468),(1432,506),(1412,506)]],[]),
 'abkari':((1452,360,1712,612),[],[]),
 'ramu':((1480,210,1774,440),[],[]),
}
union=Image.new('L',(W,H),0)
for k,(b,inc,ex) in C.items():
    im=src.crop(b).resize(((b[2]-b[0])*2,(b[3]-b[1])*2),Image.LANCZOS)
    m=remove(im,session=sess,only_mask=True,post_process_mask=True).point(lambda v:255 if v>100 else 0)
    d=ImageDraw.Draw(m)
    for poly in inc: d.polygon([((x-b[0])*2,(y-b[1])*2) for x,y in poly],fill=255)
    for poly in ex: d.polygon([((x-b[0])*2,(y-b[1])*2) for x,y in poly],fill=0)
    m=m.resize((b[2]-b[0],b[3]-b[1]),Image.LANCZOS).point(lambda v:255 if v>100 else 0)
    full=Image.new('L',(W,H),0);full.paste(m,(b[0],b[1]))
    full.save(f'paint/mask_{k}.png')
    union=Image.fromarray(np.maximum(np.asarray(union),np.asarray(full)))
    print(k,flush=True)
union=union.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(2)).point(lambda v:255 if v>60 else 0)
union.save('paint/mask_all.png')
