"""Cut the student + SketchRoot book out of reel/hero.jpg as a white-outlined sticker.
usage (from video-toolkit/): python tools/cut_character_sticker.py"""
from PIL import Image, ImageFilter, ImageChops, ImageDraw
src=Image.open('reel/hero.jpg').convert('RGBA').crop((350,520,910,1000))
src=src.resize((1120,960),Image.LANCZOS)
from rembg import remove, new_session
raw=remove(src.convert('RGB'),session=new_session('isnet-general-use'),only_mask=True,post_process_mask=True)
m=raw.point(lambda v:255 if v>110 else 0)
d=ImageDraw.Draw(m)
book=[(347,170),(531,178),(534,306),(380,306)]
d.polygon([(x*2,y*2) for x,y in book],fill=255)
# clip: drop mug on the left and debris below the base
clip=Image.new('L',m.size,0); ImageDraw.Draw(clip).rectangle([44*2,0,560*2,440*2],fill=255)
m=ImageChops.multiply(m,clip)
m=m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(3))
W,H=m.size;P=40
stroke=m.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(1.2))
c=Image.new('RGBA',(W+2*P,H+2*P),(0,0,0,0))
sh=Image.new('RGBA',c.size,(0,0,0,0)); sh.paste(Image.new('RGBA',(W,H),(0,0,0,120)),(P+12,P+20),stroke); sh=sh.filter(ImageFilter.GaussianBlur(16))
c.alpha_composite(sh); c.paste(Image.new('RGBA',(W,H),(255,255,255,255)),(P,P),stroke)
body=src.copy(); body.putalpha(m.filter(ImageFilter.GaussianBlur(.8))); c.alpha_composite(body,(P,P))
c=c.crop(c.getbbox()); c.save('reel/character.png')  # sticker of the student holding the SketchRoot book; print(c.size)
