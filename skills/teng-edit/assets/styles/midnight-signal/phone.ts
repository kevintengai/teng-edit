import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Point = [number, number, number];
type Material = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const smooth = (a: number, b: number, x: number) => {
  const u = clamp((x - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
const alloy = (color: number, metalness: number, roughness: number) =>
  new THREE.MeshStandardMaterial({color, metalness, roughness});
const ink = (color: number) => new THREE.MeshBasicMaterial({color, toneMapped: false});

function texture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: Material, pos: Point) {
  const obj = new THREE.Mesh(geo, mat);
  obj.position.set(...pos); parent.add(obj);
  return obj;
}

function slab(parent: THREE.Object3D, size: Point, pos: Point, mat: Material, radius = 0.025) {
  const [w,h,d] = size;
  const geo = radius > 0 ? new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w*.45,h*.45,d*.45)) :
    new THREE.BoxGeometry(w,h,d);
  return add(parent,geo,mat,pos);
}

// A sheet of milled metal can have a broad corner radius and a very thin edge bevel.
function perimeter(w: number, h: number, radius: number) {
  const hw = w / 2, hh = h / 2, r = Math.min(radius,hw,hh);
  const s = new THREE.Shape();
  s.moveTo(-hw+r,-hh); s.lineTo(hw-r,-hh); s.quadraticCurveTo(hw,-hh,hw,-hh+r);
  s.lineTo(hw,hh-r); s.quadraticCurveTo(hw,hh,hw-r,hh);
  s.lineTo(-hw+r,hh); s.quadraticCurveTo(-hw,hh,-hw,hh-r);
  s.lineTo(-hw,-hh+r); s.quadraticCurveTo(-hw,-hh,-hw+r,-hh);
  return s;
}

function faceplate(parent: THREE.Object3D, w: number, h: number, r: number, thickness: number, z: number, mat: Material, bevel: number) {
  return add(parent,new THREE.ExtrudeGeometry(perimeter(w,h,r),{
    depth: thickness, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, curveSegments: 10, steps: 1,
  }),mat,[0,0,z]);
}

function cable(parent: THREE.Object3D, points: Point[], r: number, mat: Material) {
  const route = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return add(parent,new THREE.TubeGeometry(route,52,r,8,false),mat,[0,0,0]);
}

function line(c: CanvasRenderingContext2D, a: number, b: number, d: number, e: number, col: string, width: number) {
  c.strokeStyle=col; c.lineWidth=width; c.beginPath(); c.moveTo(a,b); c.lineTo(d,e); c.stroke();
}

function label(c: CanvasRenderingContext2D, value: string, x: number, y: number, px: number, color: string, weight = 600) {
  c.font=weight+' '+px+'px Arial, sans-serif'; c.fillStyle=color; c.fillText(value,x,y);
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  c.fillStyle=fill; c.beginPath(); c.roundRect(x,y,w,h,r); c.fill();
}

function fitLines(c: CanvasRenderingContext2D, copy: string, width: number, maxLines: number, startPx: number, weight: number) {
  // Wrap freely supplied copy, including a single long identifier and scripts without spaces.
  const words = copy.trim().split(/\s+/u).filter(Boolean);
  let lines: string[] = [], px = startPx;
  for (; px >= 10; px -= 2) {
    c.font = weight+' '+px+'px Arial, sans-serif';
    lines = [];
    let current = '';
    for (const word of words) {
      if (c.measureText(word).width > width) {
        if (current) { lines.push(current); current=''; }
        for (const char of Array.from(word)) {
          if (current && c.measureText(current+char).width > width) { lines.push(current); current=''; }
          current+=char;
        }
      } else {
        const proposed = current ? current+' '+word : word;
        if (current && c.measureText(proposed).width > width) { lines.push(current); current=word; }
        else current=proposed;
      }
    }
    if (current) lines.push(current);
    if (lines.length <= maxLines) break;
  }
  return {lines, px: Math.max(px,10)};
}

const screenW=1.164, screenH=2.445;
const texW=720, texH=1512;
const displayZ=.098;
const panel = {x:48,y:423,width:624,height:287};
const stations = [[147,567],[361,567],[570,567]] as const;

function printScreen(headline: string, detail: string) {
  return texture(texW,texH,c=>{
    // Clip the texture to the same rounded OLED corners as the glass.
    c.beginPath(); c.roundRect(0,0,texW,texH,65); c.clip();
    const dark=c.createLinearGradient(0,texH,texW,0);
    dark.addColorStop(0,'#0b1728'); dark.addColorStop(.66,'#122238'); dark.addColorStop(1,'#1e354d');
    c.fillStyle=dark; c.fillRect(0,0,texW,texH);
    c.fillStyle = '#e5ad59';
    c.beginPath();
    c.arc(61, 130, 9, 0, Math.PI * 2);
    c.fill();
    label(c, 'Dock link', 84, 142, 34, '#cbdce6', 600);
    line(c,50,174,670,174,'#33475b',2);
    c.fillStyle='#e5ad59';c.fillRect(50,166,63,5);
    const head=fitLines(c,headline,615,2,84,700);
    const leading=head.px*1.09;
    const firstY=head.lines.length===1?338:355-((head.lines.length-1)*leading);
    head.lines.forEach((s,i)=>label(c,s,48,firstY+i*leading,head.px,'#f2f5f6',700));
    roundRect(c,panel.x,panel.y,panel.width,panel.height,20,'#20364b');
    const glaze=c.createLinearGradient(0,panel.y,panel.width,panel.y+panel.height);
    glaze.addColorStop(0,'rgba(139,195,218,.105)');glaze.addColorStop(1,'rgba(22,42,67,.02)');
    c.fillStyle=glaze;c.beginPath();c.roundRect(panel.x,panel.y,panel.width,panel.height,20);c.fill();
    for(let i=0;i<4;i++)line(c,83,panel.y+52+i*59,635,panel.y+52+i*59,'rgba(133,177,199,.075)',1);
    for(let i=0;i<9;i++)line(c,106+i*64,panel.y+33,106+i*64,panel.y+255,'rgba(133,177,199,.072)',1);
    stations.forEach(([x,y],i)=>{
      c.beginPath();c.arc(x,y,42,0,Math.PI*2);c.lineWidth=3;c.strokeStyle='#8fcee4';c.stroke();
      roundRect(c,x-11,y-11,22,22,3,i===1?'#e7b66a':'#68a4bd');
    });
    const body=fitLines(c,detail,615,3,58,600);
    body.lines.forEach((s,i)=>label(c,s,49,862+i*body.px*1.23,body.px,'#e1e8ed',600));
  });
}

function atmosphere() {
  // Deterministic window lights let a lateral camera move reveal a soft layer behind the mullions.
  let state=193720;
  const next=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  return texture(960,480,c=>{
    const wash=c.createLinearGradient(0,0,0,480);
    wash.addColorStop(0,'#081322');wash.addColorStop(.7,'#1a2948');wash.addColorStop(1,'#101a2a');
    c.fillStyle=wash;c.fillRect(0,0,960,480);
    let left=-24;
    while(left<960){
      const width=24+next()*50,top=165+next()*128;
      c.fillStyle=next()<.5?'#101b2e':'#132034';c.fillRect(left,top,width,480-top);
      for(let y=top+9;y<465;y+=13)for(let x=left+7;x<left+width-4;x+=10){
        if(next()>.78){
          const bloom=c.createRadialGradient(x,y,0,x,y,4+next()*4);
          const rgb=next()>.28?'143,186,230':'248,179,102';
          bloom.addColorStop(0,'rgba('+rgb+',.62)');bloom.addColorStop(1,'rgba('+rgb+',0)');
          c.fillStyle=bloom;c.fillRect(x-8,y-8,16,16);
        }
      }
      left+=width+4;
    }
  });
}

function haloTexture(){
  return texture(96,96,c=>{
    const g=c.createRadialGradient(48,48,0,48,48,47);
    g.addColorStop(0,'#fff6cd');g.addColorStop(.06,'rgba(255,235,167,1)');
    g.addColorStop(.21,'rgba(255,184,70,.83)');g.addColorStop(.54,'rgba(247,133,31,.22)');
    g.addColorStop(1,'rgba(241,108,24,0)');c.fillStyle=g;c.fillRect(0,0,96,96);
  });
}

function setEnvironment(gl: THREE.WebGLRenderer) {
  const studio=new THREE.Scene();
  studio.background=new THREE.Color('#162337');
  const panels: [Point, Point, number][]=[
    [[0,4,0],[6,.08,4],0xc2d9f8],
    [[-3,1,.8],[.07,3,4],0x83a4f1],
    [[3,2,.8],[.08,2,2],0xe3b480],
  ];
  for(const [pos,size,tint] of panels) slab(studio,size,pos,ink(tint),0);
  const generator=new THREE.PMREMGenerator(gl);
  const environment=generator.fromScene(studio,.04,.1,25,{size:128});
  generator.dispose();
  studio.traverse(object=>{
    if(object instanceof THREE.Mesh){object.geometry.dispose();object.material.dispose()}
  });
  return environment;
}

function disposeSet(group: THREE.Group){
  const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),maps=new Set<THREE.Texture>();
  group.traverse(object=>{
    if(object instanceof THREE.Mesh){geometry.add(object.geometry)}
    if(object instanceof THREE.Mesh || object instanceof THREE.Sprite){
      const item=object.material;
      for (const m of Array.isArray(item)?item:[item]) materials.add(m);
    }
  });
  for(const m of materials)for(const value of Object.values(m))if(value instanceof THREE.Texture)maps.add(value);
  for(const map of maps)map.dispose();
  for(const m of materials)m.dispose();
  for(const geo of geometry)geo.dispose();
  group.removeFromParent();
}

export function buildPhoneSet(scene: THREE.Scene, gl: THREE.WebGLRenderer, headline: string, detail: string) {
  const group=new THREE.Group();scene.add(group);
  const previous={environment:scene.environment,intensity:scene.environmentIntensity,background:scene.background,fog:scene.fog,tone:gl.toneMapping,exposure:gl.toneMappingExposure};
  const environment=setEnvironment(gl);
  scene.environment=environment.texture;scene.environmentIntensity=.71;
  scene.background=new THREE.Color('#081222');scene.fog=new THREE.FogExp2('#0b1730',.035);
  gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.03;
  group.add(new THREE.HemisphereLight(0xb6d2fa,0x18223a,.97));
  function directional(color: number, strength: number, p: Point) {
    const light=new THREE.DirectionalLight(color,strength);light.position.set(...p);group.add(light);
  }
  directional(0xaac8fd,2.2,[-3,4,3]);directional(0x627fef,2.6,[2,3,-2]);
  directional(0xffcf95,1.20,[2,3,3]);
  const charcoal=alloy(0x101826,.30,.45), navy=alloy(0x18253a,.60,.35);
  const glass=alloy(0x0a1420,.46,.14), silver=alloy(0x8b9cac,.86,.27);
  const ledge=alloy(0x414653,.23,.52);
  slab(group,[10,.28,7],[0,-.18,.24],ledge,.08);
  const window=add(group,new THREE.PlaneGeometry(13,6),new THREE.MeshBasicMaterial({map:atmosphere(),toneMapped:false}),[0,2.54,-6.6]);
  window.material.color.setScalar(.88);
  for (const x of [-3.7,.69,4.5]) slab(group,[.062,6,.09],[x,2.55,-6.42],charcoal,.01);
  for (const y of [.56,3.33]) slab(group,[13,.055,.07],[0,y,-6.39],charcoal,.01);
  slab(group,[13,.11,.41],[0,.49,-6.40],ledge,.018);
  // A service lead and the edge of a second device establish the desk in the near plane.
  cable(group,[[-.12,.010,-.28],[.72,.017,-.35],[1.34,.017,-.20],[2.19,.020,-.38]],.019,charcoal);
  const adjacent=slab(group,[.61,.065,2.17],[-1.01,.013,.14],navy,.035);adjacent.rotation.y=-.13;
  const dock=new THREE.Group();group.add(dock);
  slab(dock,[1.25,.110,.69],[0,.035,.019],navy,.050);
  slab(dock,[1.20,.040,.63],[0,.088,.019],charcoal,.018);
  const bracket=slab(dock,[.58,.82,.072],[0,.469,-.135],silver,.033);bracket.rotation.x=-.22;
  slab(dock,[.92,.135,.175],[0,.144,.179],navy,.032);
  const pad=slab(dock,[.90,.036,.128],[0,.215,.162],charcoal,.015);pad.rotation.x=-.10;
  const device=new THREE.Group();device.position.set(0,1.47,0);device.rotation.set(-.088,-.036,-.012);group.add(device);
  faceplate(device,1.228,2.522,.071,.095,-.058,navy,.016);
  faceplate(device,1.222,2.516,.070,.016,.049,silver,.0055);
  faceplate(device,1.210,2.505,.069,.024,.065,glass,.005);
  const displayMaterial=new THREE.MeshBasicMaterial({map:printScreen(headline,detail),transparent:true,toneMapped:false});
  add(device,new THREE.PlaneGeometry(screenW,screenH),displayMaterial,[0,0,displayZ]);
  // A milled speaker bridge and two mechanical keys make the docked unit operable with gloves.
  slab(device, [1.10, .12, .045], [0, 1.153, .107], navy, .015);
  for (let slot = 0; slot < 6; slot++) {
    slab(device, [.025, .060, .007], [-.415 + slot * .055, 1.153, .132], charcoal, .005);
  }
  for (const x of [.33, .405]) {
    add(device, new THREE.CircleGeometry(.024, 20), silver, [x, 1.153, .132]);
    slab(device, [.026, .006, .005], [x, 1.153, .135], charcoal, .002);
  }
  slab(device, [1.10, .235, .044], [0, -1.065, .105], navy, .018);
  for (const [x, name] of [[-.245, 'Back'], [.245, 'Select']] as const) {
    slab(device, [.425, .154, .037], [x, -1.065, .142], glass, .016);
    const legend = texture(256, 72, c => {
      c.textAlign = 'center';
      label(c, name, 128, 51, 46, '#d8e7ed', 600);
    });
    const marking = new THREE.MeshBasicMaterial({map: legend, transparent: true, toneMapped: false});
    add(device, new THREE.PlaneGeometry(.33, .093), marking, [x, -1.065, .163]);
  }
  const selector = add(device, new THREE.CylinderGeometry(.082, .082, .066, 24), silver, [.637, .30, .019]);
  selector.rotation.z = Math.PI / 2;
  for (let rib = 0; rib < 12; rib++) {
    const angle = rib * Math.PI / 6;
    const ridge = slab(selector, [.010, .058, .009], [.082 * Math.sin(angle), 0, .082 * Math.cos(angle)], charcoal, .002);
    ridge.rotation.y = angle;
  }
  for(const side of [-1,1]) {
    for(let i=0;i<3;i++)slab(device,[.022,.006,.027],[side*(.20+i*.048),-1.276,-.004],charcoal,.0025);
    for(const y of [-.89,.92])slab(device,[.009,.016,.099],[side*.619,y,0],charcoal,.004);
  }
  // The graph occupies the emitting surface. Its lens spill is a separate optical layer.
  const worldStation=(s: readonly [number,number]) => new THREE.Vector3(
    (s[0]/texW-.5)*screenW, (.5-s[1]/texH)*screenH, displayZ+.004
  );
  const anchors=stations.map(worldStation);
  const route=new THREE.CurvePath<THREE.Vector3>();
  route.add(new THREE.LineCurve3(anchors[0],anchors[1]));
  route.add(new THREE.LineCurve3(anchors[1],anchors[2]));
  const startPoint=route.getPoint(0), endPoint=route.getPoint(1);
  const trace=add(device,new THREE.TubeGeometry(route,64,.0028,6,false),ink(0x668ca2),[0,0,0]);
  const trail=add(device,new THREE.TubeGeometry(route,64,.0038,6,false),ink(0xe7b36b),[0,0,.001]);
  const indexCount=trail.geometry.index!.count;
  const glowMap=haloTexture();
  function lightSprite(w: number,h: number,opacity: number) {
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,opacity,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    sprite.scale.set(w,h,1);device.add(sprite);return sprite;
  }
  const glow=lightSprite(.15,.15,.92), flare=lightSprite(.25,.023,.59);
  const nodeLights=anchors.map(p=>{
    const m=new THREE.MeshBasicMaterial({color:0xffc474,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
    return add(device,new THREE.TorusGeometry(.067,.0035,8,40),m,[p.x,p.y,p.z+.002]);
  });
  trace.renderOrder=1;trail.renderOrder=2;glow.renderOrder=3;flare.renderOrder=4;
  const footLight=new THREE.PointLight(0x77a2eb,.47,2.5,2);
  footLight.position.set(-1.12,.64,.46);group.add(footLight);
  return {
    pose(progress: number, camera: THREE.PerspectiveCamera) {
      const t=clamp(progress,0,1), push=smooth(0,.95,t);
      // Maintain the photographed height across portrait, square and landscape canvases.
      const distanceScale=Math.max(1,.55/camera.aspect);
      camera.position.set(mix(.93,.14,push),mix(1.83,1.68,push),mix(4.93,4.49,push)*distanceScale);
      camera.lookAt(mix(-.09,.006,push),mix(1.68,1.57,push),.025);
      const travel=smooth(.08,.82,t), p=route.getPointAt(travel);
      trail.geometry.setDrawRange(0,Math.floor(indexCount*travel/3)*3);
      for(let i=0;i<nodeLights.length;i++){
        const u=i/(nodeLights.length-1), distance=Math.abs(travel-u);
        nodeLights[i].material.opacity=.08+.91*(1-smooth(0,.27,distance));
      }
      if(travel===0)p.copy(startPoint);
      if(travel===1)p.copy(endPoint);
      glow.position.copy(p);glow.position.z+=.006;flare.position.copy(glow.position);
      const activity=1-.50*smooth(.82,1,t);
      glow.material.opacity=activity;flare.material.opacity=activity*.61;
    },
    dispose() {
      scene.environment=previous.environment;scene.environmentIntensity=previous.intensity;
      scene.background=previous.background;scene.fog=previous.fog;gl.toneMapping=previous.tone;
      gl.toneMappingExposure=previous.exposure;
      disposeSet(group);environment.dispose();
    },
  };
}
