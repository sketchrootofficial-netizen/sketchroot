import torch,torch.nn as nn,torch.nn.functional as F,numpy as np
from PIL import Image
class RDB(nn.Module):
    def __init__(s,nf=64,gc=32):
        super().__init__()
        s.conv1=nn.Conv2d(nf,gc,3,1,1);s.conv2=nn.Conv2d(nf+gc,gc,3,1,1);s.conv3=nn.Conv2d(nf+2*gc,gc,3,1,1)
        s.conv4=nn.Conv2d(nf+3*gc,gc,3,1,1);s.conv5=nn.Conv2d(nf+4*gc,nf,3,1,1);s.l=nn.LeakyReLU(0.2,True)
    def forward(s,x):
        x1=s.l(s.conv1(x));x2=s.l(s.conv2(torch.cat((x,x1),1)));x3=s.l(s.conv3(torch.cat((x,x1,x2),1)))
        x4=s.l(s.conv4(torch.cat((x,x1,x2,x3),1)));x5=s.conv5(torch.cat((x,x1,x2,x3,x4),1));return x5*0.2+x
class RRDB(nn.Module):
    def __init__(s,nf,gc):
        super().__init__();s.rdb1=RDB(nf,gc);s.rdb2=RDB(nf,gc);s.rdb3=RDB(nf,gc)
    def forward(s,x):return s.rdb3(s.rdb2(s.rdb1(x)))*0.2+x
class Net(nn.Module):
    def __init__(s,nb=6,nf=64,gc=32):
        super().__init__()
        s.conv_first=nn.Conv2d(3,nf,3,1,1);s.body=nn.Sequential(*[RRDB(nf,gc) for _ in range(nb)])
        s.conv_body=nn.Conv2d(nf,nf,3,1,1);s.conv_up1=nn.Conv2d(nf,nf,3,1,1);s.conv_up2=nn.Conv2d(nf,nf,3,1,1)
        s.conv_hr=nn.Conv2d(nf,nf,3,1,1);s.conv_last=nn.Conv2d(nf,3,3,1,1);s.l=nn.LeakyReLU(0.2,True)
    def forward(s,x):
        f=s.conv_first(x);f=f+s.conv_body(s.body(f))
        f=s.l(s.conv_up1(F.interpolate(f,scale_factor=2,mode='nearest')))
        f=s.l(s.conv_up2(F.interpolate(f,scale_factor=2,mode='nearest')))
        return s.conv_last(s.l(s.conv_hr(f)))
net=Net();sd=torch.load('story/anime6B.pth',map_location='cpu');net.load_state_dict(sd.get('params_ema',sd.get('params',sd)));net.eval()
torch.set_num_threads(8)
src=Image.open('story/sheet.png').convert('RGB')
C={
# female poses (row 1)
'f_smile':(0,36,191,186),'f_study':(191,30,424,186),'f_phone':(424,0,591,186),'f_search':(591,0,768,186),
'f_think':(768,0,946,186),'f_frustrated':(946,0,1154,186),'f_found':(1154,0,1348,186),'f_asking':(1348,0,1536,186),
# female close-ups (row 2)
'e_happy':(0,250,186,384),'e_surprised':(186,250,351,384),'e_worried':(351,252,522,384),'e_overwhelmed':(522,223,683,384),
'e_sad':(683,223,850,384),'e_determined':(850,223,1018,384),'e_determined2':(1018,223,1193,384),'e_hopeful':(1193,223,1361,384),'e_content':(1361,223,1536,384),
# male poses (row 3)
'm_talking':(118,445,252,650),'m_lookher':(362,417,491,650),'m_supportive':(592,417,729,650),'m_phone':(729,417,849,650),'m_calm':(849,417,962,650),
# male close-ups
'me_smile':(970,445,1100,548),'me_concerned':(1100,445,1243,548),'me_thoughtful':(1243,445,1385,548),'me_amused':(1385,445,1536,548),
'me_supportive':(970,569,1100,662),'me_serious':(1100,569,1243,662),'me_reassuring':(1243,569,1385,662),'me_warm':(1385,569,1536,662),
# together (row 4)
't_casual':(0,712,202,845),'t_ranting':(202,714,414,845),'t_guiding':(414,686,585,845),'t_support':(585,686,763,845),
't_laughing':(763,686,956,845),'t_studying':(956,686,1137,845),'t_laptop':(1137,686,1332,845),'t_encourage':(1332,686,1536,845),
# extras & props (row 5)
'x_notes':(8,898,80,999),'x_window':(320,898,399,999),'x_breath':(402,898,474,999),'x_tired':(479,898,551,999),'x_ready':(554,898,623,999),
'p_keys_table':(1157,900,1238,999),'p_keys_hand':(1241,900,1297,999),'p_laptop':(1300,900,1400,999),'p_books':(1402,885,1530,999),
}
import sys
only=sys.argv[1:]
for k,b in C.items():
    if only and k not in only: continue
    im=src.crop(b);x=torch.from_numpy(np.asarray(im)).permute(2,0,1).float().unsqueeze(0)/255
    with torch.no_grad(): y=net(x).clamp(0,1)[0].permute(1,2,0).numpy()
    Image.fromarray((y*255).round().astype('uint8')).save(f'story/panels/{k}.jpg',quality=93)
    print(k,im.size,flush=True)
