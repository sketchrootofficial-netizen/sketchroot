"""Narration: Kokoro TTS (sherpa-onnx) per line of script.json -> public/narration.wav + public/timeline.json.
usage: python3 tts.py <kokoro_model_dir> [voice_id] [speed]"""
import sys, json, wave, numpy as np, sherpa_onnx
d=sys.argv[1]; sid=int(sys.argv[2]) if len(sys.argv)>2 else 7; speed=float(sys.argv[3]) if len(sys.argv)>3 else 1.0
tts=sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=d+'/model.onnx',voices=d+'/voices.bin',tokens=d+'/tokens.txt',data_dir=d+'/espeak-ng-data'),num_threads=4)))
lines=json.load(open('script.json')); SR=tts.sample_rate; out=[]; t=0.6; audio=[np.zeros(int(SR*t),np.float32)]
for i,l in enumerate(lines):
    a=np.array(tts.generate(l['say'],sid=sid,speed=speed).samples,np.float32)
    nz=np.nonzero(np.abs(a)>0.01)[0]; a=a[max(0,nz[0]-200):nz[-1]+800]  # trim silence
    dur=len(a)/SR; gap=0.25+l.get('pause',0)
    out.append({**l,'i':i,'start':round(t,3),'end':round(t+dur,3)})
    audio+= [a,np.zeros(int(SR*gap),np.float32)]; t+=dur+gap
    print(f"{t:6.2f} {l['cap']}",flush=True)
x=np.concatenate(audio); x=x/np.abs(x).max()*0.89
w=wave.open('public/narration.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype(np.int16).tobytes()); w.close()
json.dump({'duration':round(t+0.4,3),'lines':out},open('public/timeline.json','w'),indent=1)
