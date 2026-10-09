const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node22/lib/node_modules/playwright')}})();
const {spawn}=require('child_process');
const [,,out,stills]=process.argv;
(async()=>{
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
  await pg.goto('file://'+__dirname+'/meme.html');await pg.evaluate(()=>document.fonts.ready);
  if(stills){for(const ts of stills.split(',')){await pg.evaluate(async t=>{await render(t)},+ts);await pg.screenshot({path:out.replace('.png',`_${ts}.png`)})}await b.close();return}
  const D=13.7667,F=30;
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-i','-','-i',__dirname+'/in.mp4','-map','0:v','-map','1:a','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  for(let i=0;i<Math.round(D*F);i++){await pg.evaluate(async t=>{await render(t)},i/F);const buf=await pg.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();
})();
