"""Cut Hugo + the split geyser out of the Ramu's Kada sketch as a sticker.
usage (from video-toolkit/): python tools/cut_hugo_sticker.py u2net   -> reel/hugo_u2net.png"""
import sys
from PIL import Image, ImageFilter, ImageChops, ImageDraw
from rembg import remove, new_session
box=(660,90,1040,598)
src=Image.open('ramus/ramus.png').convert('RGB').crop(box)
src=src.resize((src.width*2,src.height*2),Image.LANCZOS)
model=sys.argv[1]
out=remove(src,session=new_session(model),post_process_mask=True)
m=out.split()[3].point(lambda v:255 if v>110 else 0)
ex=[(946,90),(1040,90),(1040,598),(925,598),(925,452),(903,452),(903,420),(916,350),(944,240)]
ImageDraw.Draw(m).polygon([((x-660)*2,(y-90)*2) for x,y in ex],fill=0)
m=m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(3))
W,H=m.size;P=40
stroke=m.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(1.2))
c=Image.new('RGBA',(W+2*P,H+2*P),(0,0,0,0))
sh=Image.new('RGBA',c.size,(0,0,0,0)); sh.paste(Image.new('RGBA',(W,H),(0,0,0,120)),(P+12,P+20),stroke); sh=sh.filter(ImageFilter.GaussianBlur(16))
c.alpha_composite(sh); c.paste(Image.new('RGBA',(W,H),(255,255,255,255)),(P,P),stroke)
body=src.convert('RGBA'); body.putalpha(m.filter(ImageFilter.GaussianBlur(.8))); c.alpha_composite(body,(P,P))
bb=c.getbbox(); print("orig_xy",660+(bb[0]-40)/2,90+(bb[1]-40)/2,"orig_wh",(bb[2]-bb[0])/2,(bb[3]-bb[1])/2); c=c.crop(bb); c.save(f"reel/hugo_{model}.png"); print(model,c.size)
