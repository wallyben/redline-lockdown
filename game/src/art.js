const Art = (() => {
  const districts = [
    { roof: '#263747', trim: '#597086', glass: '#8ee7ff', name: 'DOWNTOWN' },
    { roof: '#302a3a', trim: '#6d5873', glass: '#ff9cba', name: 'OLD QUARTER' },
    { roof: '#303b3b', trim: '#687669', glass: '#efd38a', name: 'INDUSTRIAL DOCKS' },
  ];
  const district = b => districts[b.row === 2 ? 2 : b.col >= 2 ? 1 : 0];
  function fill(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function atmosphere(ctx, x, y, radius, color) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    fill(ctx, x - radius, y - radius, radius * 2, radius * 2, glow);
  }
  function buildCity() {
    const map = document.createElement('canvas');
    map.width = 1430;
    map.height = 1040;
    const c = map.getContext('2d');
    fill(c, 0, 0, 1430, 1040, '#0a1823');
    fill(c, 78, 81, 1268, 878, '#263440');
    let random = 138419;
    for (let i = 0; i < 7500; i++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const x = 79 + random % 1264;
      const y = 82 + (random >>> 11) % 873;
      fill(c, x, y, 1 + random % 4, 1, random % 2 ? '#ffffff0c' : '#00000019');
    }
    for (const y of City.ys) {
      for (let x = 90; x < 1330; x += 27) fill(c, x, y, 12, 1.5, '#caba8e82');
      fill(c, 78, y - 39, 1268, 1, '#8a9a9faa');
      fill(c, 78, y + 38, 1268, 1, '#8a9a9faa');
    }
    for (const x of City.xs) {
      for (let y = 90; y < 940; y += 27) fill(c, x, y, 1.5, 12, '#caba8e82');
      for (const y of City.ys) {
        for (let p = -30; p < 32; p += 8) {
          fill(c, x + p, y - 42, 3, 9, '#acc3c197');
          fill(c, x + p, y + 33, 3, 9, '#acc3c197');
        }
      }
    }
    for (const b of City.blocks) {
      const d = district(b);
      const w = b.right - b.x, h = b.bottom - b.y;
      fill(c, b.x, b.y, w, h, '#435362');
      fill(c, b.x + 5, b.y + 5, w - 10, h - 10, '#293640');
      for (let slot = 0; slot < 2; slot++) {
        const x = b.x + 13 + slot * ((w - 20) / 2);
        const y = b.y + 19 + slot * 12;
        const bw = (w - 44) / 2;
        const bh = h - 55 - slot * 11;
        fill(c, x + 9, y + 11, bw + 4, bh + 5, '#0a101acc');
        fill(c, x, y, bw, bh + 7, '#111923');
        fill(c, x, y, bw, bh, d.trim);
        const roof=c.createLinearGradient(x,y,x+bw,y+bh);roof.addColorStop(0,d.trim);roof.addColorStop(.12,d.roof);roof.addColorStop(1,'#111c2a');
        fill(c, x + 2, y + 2, bw - 4, bh - 4, roof);
        fill(c,x+bw-5,y+3,3,bh-6,'#a5d2e526');
        for(let floor=0;floor<3;floor++)for(let pane=6;pane<bw-8;pane+=10){fill(c,x+pane,y+bh+3+floor*3,5,2,d.glass+(floor===0?'70':'38'));}
        c.strokeStyle = '#131e2a';
        c.strokeRect(x + 8, y + 8, bw - 16, bh - 16);
        fill(c, x + bw * .42, y + 22, 19, 37, '#647481');
        fill(c, x + bw * .42 + 2, y + 24, 15, 33, '#222d38');
        for (let i = 7; i < bw - 6; i += 11) {
          if ((i + slot + b.row + b.col) % 4 === 0) continue;
          fill(c, x + i, y + bh + 1, 6, 3, d.glass);
          fill(c, x + i, y + bh + 5, 6, 6, d.glass + '33');
        }
        if (slot === (b.row + b.col) % 2) {
          atmosphere(c, x + bw / 2, y + bh + 10, 36, d.glass + '39');
          c.font = 'bold 9px system-ui';
          c.fillStyle = d.glass;
          c.fillText(['NIGHT SHIFT', '24H SERVICE', 'FERRY DEPOT', 'MOTOR WORKS'][(b.row + b.col) % 4], x + 6, y + bh + 20);
        }
      }
      for (const x of [b.x + 3, b.right - 3]) for (const y of [b.y + 3, b.bottom - 3]) {
        atmosphere(c, x, y, 55, '#ffc37950');
        fill(c, x - 2, y - 2, 4, 4, '#ffe0a3');
      }
    }
    StreetDetail.paint(c);
    landmarks(c);
    districtFeatures(c);
    for (let i = 0; i < 9; i++) {
      c.strokeStyle = '#54aac022';
      c.strokeRect(1348 + i * 4, 105 + i * 18, 32, 470 + i * 12);
    }
    return map;
  }

  function landmarks(ctx) {
    const bank = City.blocks.find(b => b.row === 0 && b.col === 1);
    const bankX = bank.x + 14, bankY = bank.y + 37;
    atmosphere(ctx, bankX + 69, bankY + 84, 104, '#f4c46850');
    fill(ctx, bankX, bankY, 138, 91, '#171b22');
    fill(ctx, bankX + 5, bankY + 5, 128, 80, '#39414a');
    fill(ctx, bankX + 10, bankY + 10, 118, 56, '#242d35');
    fill(ctx, bankX + 13, bankY + 62, 112, 19, '#c4a46a');
    fill(ctx, bankX + 17, bankY + 65, 104, 13, '#342d24');
    for (let x = bankX + 20; x < bankX + 120; x += 25) {
      fill(ctx, x, bankY + 25, 7, 38, '#d5c395');
      fill(ctx, x + 2, bankY + 27, 3, 34, '#59616a');
    }
    fill(ctx, bankX + 51, bankY + 31, 34, 31, '#121a21');
    ctx.beginPath();
    ctx.arc(bankX + 68, bankY + 46, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#d7b66e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bankX + 68, bankY + 46, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#352f26';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '900 8px system-ui';
    ctx.fillStyle = '#f5dc9b';
    ctx.fillText('PORT MERIDIAN BANK', bankX + 15, bankY + 76);

    for(let x=1170;x<1340;x+=32) {
      fill(ctx,x,864,27,16,'#6c5b40');
      fill(ctx,x+2,866,23,11,'#aa8150');
      fill(ctx,x,942,27,12,'#3d5c60');
    }
    fill(ctx,1161,859,4,95,'#e2c479');
    ctx.font='bold 9px system-ui';
    ctx.fillStyle='#ffe0a0';
    ctx.fillText('COVERED LOADING BAY',1174,857);
    const hotel = City.blocks.find(b => b.row === 0 && b.col === 2);
    const facade = hotel.bottom - 19;
    atmosphere(ctx, 837, facade + 15, 105, '#d136ff65');
    fill(ctx, 759, facade - 96, 168, 99, '#1b1331');
    fill(ctx, 770, facade - 84, 146, 76, '#432b57');
    ctx.strokeStyle = '#f78de9';
    ctx.lineWidth = 2;
    ctx.strokeRect(773, facade - 80, 139, 67);
    // Lit hotel windows make the landmark read as a facade at speed.
    for(let row=0;row<3;row++)for(let col=0;col<8;col++) {
      fill(ctx,782+col*15,facade-72+row*14,7,8,(row+col)%3?'#ffbded':'#775382');
    }
    fill(ctx, 780, facade - 24, 126, 31, '#260e31');
    ctx.font = '900 16px system-ui';
    ctx.fillStyle = '#ffb9ed';
    ctx.fillText('H O T E L  I R I S', 785, facade - 4);
    fill(ctx, 768, facade + 8, 148, 3, '#f365df');

    const { x, top, bottom, halfWidth, coverTop, coverBottom } = City.alley;
    fill(ctx, x - halfWidth, coverTop, halfWidth*2, coverBottom - coverTop, '#0718179f');
    for (let y = coverTop; y < coverBottom; y += 25) {
      fill(ctx, x - 21, y, 2, 14, '#64ae91a1');
      fill(ctx, x + 19, y, 2, 14, '#64ae91a1');
    }
    for (const edge of [x - 39, x + halfWidth]) {
      fill(ctx, edge, top, 11, bottom - top, '#21352e');
      fill(ctx, edge + 2, top + 1, 3, bottom - top - 2, '#85b591');
      for (let y = top + 2; y < bottom - 1; y += 13) fill(ctx, edge, y, 11, 3, '#d4b666');
    }
    atmosphere(ctx, x, coverTop + 3, 41, '#70ffc067');
    ctx.font = '800 11px system-ui';
    ctx.fillStyle = '#9bfccf';
    ctx.fillText('SERVICE ALLEY ↓', x - 45, coverTop - 12);
    ctx.font = '700 8px system-ui';
    ctx.fillText('BREAK LINE OF SIGHT', x - 43, coverTop - 2);

    const dock = City.blocks.find(b => b.row === 2 && b.col === 3);
    for (let i = 0; i < 4; i++) {
      const y = dock.y + 14 + i * 30;
      fill(ctx, dock.x + 12, y, 124, 20, '#151d23');
      fill(ctx, dock.x + 12, y, 118, 16, ['#8d4d37', '#4d7272'][i % 2]);
      for (let x = dock.x + 16; x < dock.x + 128; x += 7) fill(ctx, x, y + 2, 1, 12, '#091a255d');
    }
    for (const x of [1151, 1238]) {
      atmosphere(ctx, x, 882, 67, '#ffc4604e');
      fill(ctx, x, 833, 7, 58, '#292223');
      fill(ctx, x - 32, 832, 39, 5, '#d2aa5c');
      fill(ctx, x - 34, 836, 2, 28, '#bfa179');
    }
    fill(ctx, 1229, 883, 101, 52, '#32766852');
    fill(ctx,1264,900,14,30,'#344853');
    fill(ctx,1265,902,12,26,'#607783');
    for(let y=905;y<929;y+=8)fill(ctx,1265,y,12,2,'#a8c2c7');
    fill(ctx,1263,899,16,3,'#1a252b');
    fill(ctx,1236,925,86,6,'#172b34');
    fill(ctx,1240,926,78,2,'#a1c4c6');
    for(let x=1242;x<1318;x+=14)fill(ctx,x,923,4,10,'#e3bb6d');
    for (let x = 1232; x < 1329; x += 12) fill(ctx, x, 884, 6, 3, '#8bdab3');
    ctx.font = '900 13px system-ui';
    ctx.fillStyle = '#bbffda';
    ctx.fillText('DOCK GATE', 1241, 928);
  }


  // Handmade neighborhood set pieces stay entirely inside non-drivable building
  // blocks or outside city walls; they do not change the collision graph.
  function districtFeatures(ctx) {
    const market = City.blocks.find(b => b.row === 0 && b.col === 0);
    const mx = market.x + 16, my = market.y + 18;
    atmosphere(ctx, mx + 89, my + 82, 100, '#f7378b4b');
    fill(ctx,mx-2,my-3,164,139,'#131827');
    fill(ctx,mx+3,my+2,154,128,'#172a3c');
    for(let i=0;i<5;i++){
      const x=mx+8+i*30;
      fill(ctx,x,my+30,25,73,'#091724');
      fill(ctx,x+2,my+32,21,20,['#a43e5f','#377e88','#875fc4','#c27d37','#3f968d'][i]);
      for(let q=0;q<4;q++)fill(ctx,x+3+q*5,my+57,3,40,q%2?'#18344c':'#365268');
      fill(ctx,x,my+29,25,3,'#fff1b050');
    }
    ctx.font='900 14px system-ui';ctx.fillStyle='#ffc0de';
    ctx.fillText('NIGHT MARKET',mx+10,my+17);
    fill(ctx,mx+11,my+19,132,2,'#ef61c5');
    for(let i=0;i<8;i++){
      const x=mx+12+i*18,y=my+118+(i%3)*2;
      atmosphere(ctx,x,y,13,i%2?'#f5c35b32':'#50e6dd32');
      fill(ctx,x,y,4,4,i%2?'#ffdc92':'#6cebd8');
    }

    // The armored transfer lockbox is a distinct on-street Payday objective.
    // Its façade sits inside an existing block, without changing collisions.
    const cache=City.blocks.find(b=>b.row===0&&b.col===1);
    const ax=cache.x+18,ay=cache.bottom-73;
    atmosphere(ctx,ax+64,ay+38,52,'#f4a65c35');
    fill(ctx,ax,ay,132,67,'#111d2b');
    fill(ctx,ax+5,ay+5,122,56,'#3b4556');
    fill(ctx,ax+10,ay+10,40,40,'#192331');
    ctx.strokeStyle='#ffc777';ctx.lineWidth=3;
    ctx.strokeRect(ax+13,ay+13,34,34);
    ctx.beginPath();ctx.arc(ax+30,ay+30,11,0,Math.PI*2);ctx.stroke();
    fill(ctx,ax+56,ay+12,65,3,'#8bd4df');
    ctx.font='900 10px system-ui';ctx.fillStyle='#ffdda2';
    ctx.fillText('ARMORED',ax+57,ay+29);
    ctx.fillText('TRANSFER',ax+57,ay+43);
    fill(ctx,ax+10,ay+53,110,5,'#d9a75d');

    // Original municipal switch-house beside Grid's separately playable raid.
    const hub = City.blocks.find(b => b.row===1 && b.col===0);
    const hx=hub.x+13,hy=hub.y+12;
    atmosphere(ctx,hx+65,hy+69,70,'#39e8bc4c');
    fill(ctx,hx,hy,137,138,'#081a2b');
    fill(ctx,hx+5,hy+5,127,128,'#163a46');
    for(let i=0;i<3;i++){
      fill(ctx,hx+10+i*41,hy+15,33,72,'#0b1b30');
      fill(ctx,hx+13+i*41,hy+18,27,10,'#54eac3');
      for(let q=0;q<5;q++)fill(ctx,hx+14+i*41,hy+36+q*9,25,3,q===2?'#f6a95a':'#68bdb1');
      fill(ctx,hx+21+i*41,hy+84,12,5,'#ffae6d');
    }
    fill(ctx,hx+6,hy+100,125,26,'#06131c');
    ctx.fillStyle='#9dffe0';ctx.font='900 12px system-ui';
    ctx.fillText('GRID SWITCH',hx+13,hy+117);
    fill(ctx,hx+7,hy+126,122,3,'#42e4bd');

    const yard = City.blocks.find(b => b.row === 2 && b.col === 0);
    const yx=yard.x+15,yy=yard.y+18;
    fill(ctx,yx-4,yy-4,157,123,'#192630');
    ctx.strokeStyle='#8796a2';ctx.lineWidth=2;ctx.strokeRect(yx-3,yy-3,155,121);
    for(let i=0;i<4;i++){
      const x=yx+4+i*34,cy=yy+16+(i%2)*6;
      fill(ctx,x+3,cy+4,29,73,'#06141d8a');
      fill(ctx,x,cy,29,73,i%2?'#35566a':'#7e493b');
      for(let k=1;k<5;k++)fill(ctx,x+3,cy+k*12,24,2,'#b0c1c233');
      fill(ctx,x+23,cy,3,73,'#d7d9c033');
    }
    fill(ctx,yx+10,yy+97,130,9,'#d2ac60');
    ctx.font='900 10px system-ui';ctx.fillStyle='#fff4c1';
    ctx.fillText('FREIGHT YARD 07',yx+12,yy+104);

    const old = City.blocks.find(b => b.row === 1 && b.col === 3);
    const ox=old.x+20,oy=old.y+24;
    atmosphere(ctx,ox+83,oy+60,90,'#ce61ff45');
    fill(ctx,ox-5,oy-5,176,115,'#17192d');
    fill(ctx,ox,oy,166,103,'#2b203c');
    ctx.strokeStyle='#bc82e5';ctx.lineWidth=3;ctx.strokeRect(ox+10,oy+10,146,83);
    for(let i=0;i<5;i++)for(let j=0;j<3;j++){
      const x=ox+18+i*27,y=oy+17+j*22;
      fill(ctx,x,y,17,14,(i+j)%3?'#d8b4fb':'#65517f');
      fill(ctx,x+2,y+2,13,4,'#ecdbff66');
    }
    fill(ctx,ox+10,oy+79,145,23,'#1d122b');
    ctx.font='900 13px system-ui';ctx.fillStyle='#f7b8fe';
    ctx.fillText('ELECTRIC ARCADE',ox+17,oy+95);

    // WEST QUAY UNDERPASS: an actual line-of-sight hideout, not decorative art.
    // The player must reach the sheltered lane (y>922) to break observation.
    atmosphere(ctx,142,932,86,'#6de3bc34');
    fill(ctx,85,922,129,29,'#0b1927');
    fill(ctx,90,925,119,24,'#102a35');
    for(let i=0;i<6;i++){
      fill(ctx,99+i*18,928,7,16,'#214c58');
      fill(ctx,99+i*18,927,7,2,'#99ffe0');
    }
    fill(ctx,104,943,91,2,'#62ebc088');
    ctx.font='900 9px system-ui';ctx.fillStyle='#9bfbd3';
    ctx.fillText('WEST QUAY / COVER',96,940);
    // The dark harbor beyond the eastern sea wall changes the exit silhouette.
    fill(ctx,1347,700,83,340,'#082530');
    for(let i=0;i<15;i++){
      const x=1352+(i*19)%71,y=707+i*22;
      fill(ctx,x,y,23,2,i%3?'#26798755':'#72d8d688');
    }
    for(const y of [785,920]){
      fill(ctx,1347,y,56,7,'#795c47');
      for(let x=1350;x<1402;x+=11)fill(ctx,x,y+8,3,21,'#b0a288');
    }
    ctx.font='900 11px system-ui';ctx.fillStyle='#8cdacc';
    ctx.save();ctx.translate(1367,835);ctx.rotate(Math.PI/2);ctx.fillText('PORT MERIDIAN HARBOR',0,0);ctx.restore();
  }

  function reflections(ctx, unit, time, index) {
    const phase = Math.sin(time * 16 + index);
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.angle);
    ctx.scale(1.9, .74);
    atmosphere(ctx, -9, -11, 54, phase > 0 ? '#ff335f8f' : '#ff335f24');
    atmosphere(ctx, 6, 12, 57, phase < 0 ? '#306fff99' : '#306fff25');
    ctx.restore();
  }

  function spray(ctx, c, time) {
    const speed = Math.hypot(c.vx, c.vy);
    if (speed < 48) return;
    const dx = c.vx / speed, dy = c.vy / speed;
    ctx.strokeStyle = speed > 170 ? '#b3e4ef70' : '#b3e4ef44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const age = (time * 4.7 + i * .137) % 1;
      const spread = (i % 2 ? -1 : 1) * (7 + age * ((i % 7) + 5));
      const reach = 15 + age * speed * .19;
      const x = c.x - dx * reach - dy * spread;
      const y = c.y - dy * reach + dx * spread;
      ctx.moveTo(x, y);
      ctx.lineTo(x - dx * (2 + age * 7), y - dy * (2 + age * 7));
    }
    ctx.stroke();
  }

  function car(ctx, c, police, time, courier = false) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    const beam = ctx.createLinearGradient(17, 0, 112, 0);
    beam.addColorStop(0, '#d9ecff85');
    beam.addColorStop(1, '#d9ecff00');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(16, -7);
    ctx.lineTo(112, -36);
    ctx.lineTo(112, 36);
    ctx.lineTo(16, 7);
    ctx.fill();
    if (police) {
      const flash = Math.floor(time * 9) % 2;
      atmosphere(ctx, 0, -10, 57, flash ? '#ff345c70' : '#ff345c24');
      atmosphere(ctx, 0, 10, 57, flash ? '#337aff24' : '#337aff79');
    }
    if(!police){atmosphere(ctx,-20,0,32,c.braking?'#ff322c8a':'#ff402c30');}
    fill(ctx, -22, -11, 46, 23, '#090e16bb');
    for (const x of [-14, 10]) for (const y of [-11, 7]) fill(ctx, x, y, 9, 4, '#0b0e16');
    // Functional silhouettes: tail white, interceptor violet, reinforcement amber.
    const role=c.role||'tail';
    const emergency=police && role==='roadblock' ? ['#ffdd92','#bd603a','#78322a','#ffe4ba'] :
      police && role==='interceptor' ? ['#f9deff','#a78fe8','#5f5ba5','#c2abff'] :
      police && role==='reinforcement' ? ['#fff0c4','#d8b66b','#896c3e','#ffe1a6'] :
      ['#f7ffff','#bfdae2','#718e9e','#d6eaf0'];
    const paint=ctx.createLinearGradient(0,-10,0,10);
    paint.addColorStop(0,police?emergency[0]:courier?'#fff1ad':'#ffb899');paint.addColorStop(.25,police?emergency[1]:courier?'#ebc151':'#ff684e');paint.addColorStop(.7,police?emergency[2]:courier?'#b28827':'#b72236');paint.addColorStop(1,police?emergency[3]:courier?'#edc65f':'#f45747');ctx.fillStyle=paint;
    ctx.beginPath();
    ctx.roundRect(-20, -9, 40, 18, [4, 6, 6, 4]);
    ctx.fill();
    ctx.strokeStyle=police?'#e7ffff':'#ffb38d';ctx.lineWidth=.7;ctx.stroke();
    fill(ctx, -9, -7, 16, 14, '#122937');
    fill(ctx, 3, -6, 4, 12, '#6aadc2');fill(ctx,-9,-5,3,10,'#4f899c');
    fill(ctx,-18,-8,2,16,'#13212a');
    if(!police&&!courier){fill(ctx,8,-3,10,2,'#ffb987');fill(ctx,8,1,10,2,'#ffb987');}
    ctx.fillStyle='#e8fbff66';ctx.fillRect(-13,-8,27,1);
    fill(ctx, -5, -5, 9, 10, police ? '#adbbce' : courier ? '#5c4c24' : '#9c302c');
    fill(ctx, 14, -7, 4, 14, police ? '#243448' : '#b52e28');
    for (const y of [-7, 4]) {
      fill(ctx, 17, y, 3, 3, '#f2feff');
      fill(ctx, -20, y, c.braking ? 4 : 2, 3, c.braking ? '#ff9385' : '#ff233c');
    }
    if (police) {
      fill(ctx, -2, -7, 4, 7, '#ff4b68');
      fill(ctx, -2, 0, 4, 7, '#56a2ff');
      if (role === 'interceptor') { fill(ctx,-16,-8,6,16,'#7a5ec2'); fill(ctx,9,-8,5,16,'#7a5ec2'); }
      if (role === 'reinforcement') { fill(ctx,-18,-9,6,18,'#e4b45c'); fill(ctx,11,-9,6,18,'#e4b45c'); }
      if (role === 'roadblock') { fill(ctx,-24,-13,11,26,'#c77c42'); fill(ctx,15,-13,11,26,'#c77c42');fill(ctx,8,-3,14,6,'#ffd484'); }
    }
    if(courier){fill(ctx,-3,-15,8,5,'#fff1b0');fill(ctx,-5,10,11,3,'#ffdb69');}
    ctx.restore();
  }

  function minimap(ctx, w, h, run, p) {
    const size = Math.min(182, w * .34);
    const scale = size / 1268;
    const x = w - size - 25, y = h - 878 * scale - 27;
    fill(ctx, x - 10, y - 21, size + 20, 878 * scale + 36, '#0b121bea');
    ctx.font = 'bold 10px system-ui';
    ctx.fillStyle = '#b2c8d5';
    ctx.fillText('PORT MERIDIAN', x, y - 6);
    ctx.save();
    ctx.translate(x - 78 * scale, y - 81 * scale);
    ctx.scale(scale, scale);
    for (const b of City.blocks) fill(ctx, b.x, b.y, b.right - b.x, b.bottom - b.y, '#405568');
    for (const gate of Traffic.gates) {
      const [a,b]=gate.edge, start=City.nodes[a], end=City.nodes[b];
      ctx.strokeStyle = run.traffic?.closedEdges?.has(City.edgeKey(a,b)) ? '#ff526d' : '#43f4c2';
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(start.x,start.y); ctx.lineTo(end.x,end.y); ctx.stroke();
    }
    if (run.traffic?.barrier) {
      const b=run.traffic.barrier;
      if(b.orientation==='h')fill(ctx,b.x-4,b.y-b.span,8,b.span*2,'#ff6575');
      else fill(ctx,b.x-b.span,b.y-4,b.span*2,8,'#ff6575');
    }
    for(const gate of Traffic.gates){ fill(ctx,gate.console.x-11,gate.console.y-11,22,22,'#3fffc1'); }
    const dot = (q, color) => fill(ctx, q.x - 15, q.y - 15, 30, 30, color);
    dot(run.collected ? Pursuit.exit : Drive.pickup, run.collected ? '#6affc0' : '#ffc978');
    if (p.intercept) dot(City.nodes[p.intercept.node], '#ff5c76');
    for(const unit of p.units)dot(unit,unit.role==='interceptor'?'#b995ff':unit.role==='reinforcement'?'#ffd083':unit.role==='roadblock'?'#ffad66':'#ff617f');
    const destination=run.jobs?.stage===0?Jobs.pickup(run.jobs,run.time):run.jobs?.stage===1?Drive.pickup:run.jobs?.stage===2?run.jobs.courier:Pursuit.exit;
    dot(destination,'#ffdf84');
    dot(run.car, '#ffffff');
    ctx.restore();
  }

  function weather(ctx, car, time, w, h) {
    ctx.strokeStyle = '#b5deff27';
    ctx.lineWidth = .8;
    ctx.beginPath();
    for (let i = 0; i < 110; i++) {
      const x = car.x - w * .8 + ((i * 123.73 + time * 94) % (w * 1.6));
      const y = car.y - h * .8 + ((i * 61.81 + time * 330) % (h * 1.6));
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4, y + 13 + i % 7);
    }
    ctx.stroke();
  }

  return { buildCity, car, minimap, weather, reflections, spray };
})();
