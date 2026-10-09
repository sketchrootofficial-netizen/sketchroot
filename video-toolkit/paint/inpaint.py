import sys,torch,numpy as np
from PIL import Image, ImageDraw, ImageFilter
img=Image.open(sys.argv[1]).convert('RGB');m=Image.open(sys.argv[2]).convert('L')
d=ImageDraw.Draw(m)
for r in ([(1645,425,1734,514),(1438,586,1556,612)] if 'fix' not in sys.argv[2] else []): d.rectangle(r,fill=255)
m=m.filter(ImageFilter.MaxFilter(5))
m.save(sys.argv[2].replace('.png','_final.png'))
model=torch.jit.load('paint/big-lama.pt',map_location='cpu');model.eval()
a=torch.from_numpy(np.asarray(img)).permute(2,0,1).float().unsqueeze(0)/255
k=torch.from_numpy((np.asarray(m)>127).astype('float32'))[None,None]
H,W=a.shape[2:];ph,pw=(8-H%8)%8,(8-W%8)%8
a=torch.nn.functional.pad(a,(0,pw,0,ph),mode='reflect');k=torch.nn.functional.pad(k,(0,pw,0,ph),mode='reflect')
with torch.no_grad(): out=model(a,k)[0].permute(1,2,0).clamp(0,1).numpy()[:H,:W]
res=Image.fromarray((out*255).round().astype('uint8'))
# keep original pixels outside the mask
res=Image.composite(res,img,m.filter(ImageFilter.GaussianBlur(2)))
res.save(sys.argv[3]);print('saved',res.size)
