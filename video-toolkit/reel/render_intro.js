const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node22/lib/node_modules/playwright')}})();
const fs=require('fs'),{spawn}=require('child_process');
const [,,out,from,to,fps]=process.argv;
(async()=>{
  const html=fs.readFileSync(__dirname+'/intro.html','utf8').replace('__BEATS__',fs.readFileSync(__dirname+'/intro_beats.json','utf8').trim());
  fs.writeFileSync(__dirname+'/_r.html',html);
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
  await pg.goto('file://'+__dirname+'/_r.html');await pg.evaluate(()=>document.fonts.ready);
  const F=+fps||30,a=+from,z=+to;
  if(out.endsWith('.png')){ // stills mode: from = comma list
    for(const ts of from.split(',')){await pg.evaluate(t=>render(t),+ts);await pg.screenshot({path:out.replace('.png',`_${ts}.png`)})}
    await b.close();return;}
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(F),'-i','-','-i',__dirname+'/intro_music.wav','-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','18','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  for(let i=0;i<Math.round((z-a)*F);i++){await pg.evaluate(t=>render(t),a+i/F);const buf=await pg.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();
})();
