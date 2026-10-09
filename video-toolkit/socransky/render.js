// node socransky/render.js $PWD/out/socransky.mp4 [stills] [fps] [from] [to]
//   from/to: render only that span in seconds (render_parallel.sh splits the video across CPU cores)
//   stills: comma-separated seconds, or "mid" for one still in the middle of every beat
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node22/lib/node_modules/playwright')}})();
const {spawn}=require('child_process');
const {TL}=require('./beats.js');
const [,,out,stills,fpsArg,fromArg,toArg]=process.argv;
(async()=>{
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1920,height:1080}});
  pg.on('pageerror',e=>console.error('PAGEERR',e.message));
  await pg.goto('file://'+__dirname+'/scene.html');await pg.evaluate(()=>document.fonts.ready);await pg.evaluate(()=>window.ready);
  const D=await pg.evaluate(()=>window.DURATION);console.error('duration',D.toFixed(1),'s');
  if(stills){const ts=stills==='mid'?TL.map(x=>+(x.start+Math.min(x.dur-.5,x.mcq?x.keepAt+3:x.dur*.75)).toFixed(2)):stills.split(',').map(Number);
    for(const t of ts){await pg.evaluate(async t=>{await render(t)},t);await pg.screenshot({path:out.replace('.png',`_${String(t).padStart(7,'0')}.png`)})}
    await b.close();return}
  const F=+(fpsArg||30);
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(F),'-i','-','-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  const i0=Math.round((+fromArg||0)*F),N=Math.round((toArg?Math.min(+toArg,D):D)*F);
  for(let i=i0;i<N;i++){await pg.evaluate(async t=>{await render(t)},i/F);const buf=await pg.screenshot({type:'jpeg',quality:90});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%300==0)console.error('frame',i,'/',N)}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();
})();
