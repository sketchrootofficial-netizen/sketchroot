const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node22/lib/node_modules/playwright')}})();
const fs=require('fs'),{spawn}=require('child_process');
const [,,out,stills,fpsArg]=process.argv;
(async()=>{
  const html=fs.readFileSync(__dirname+'/explainer.html','utf8').replace('__STICKERS__',fs.readFileSync(__dirname+'/st.json','utf8').trim());
  fs.writeFileSync(__dirname+'/_e.html',html);
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1920,height:1080}});
  pg.on('pageerror',e=>console.error('PAGEERR',e.message));
  await pg.goto('file://'+__dirname+'/_e.html');await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(300);
  const D=await pg.evaluate(()=>window.DURATION);console.error('duration',D);
  if(stills){for(const ts of stills.split(',')){await pg.evaluate(async t=>{await render(t)},+ts);await pg.screenshot({path:out.replace('.png',`_${ts}.png`)})}await b.close();return}
  const F=+(fpsArg||30);
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(F),'-i','-','-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  const N=Math.round(D*F);
  for(let i=0;i<N;i++){await pg.evaluate(async t=>{await render(t)},i/F);const buf=await pg.screenshot({type:'jpeg',quality:90});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%300==0)console.error('frame',i,'/',N)}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();
})();
