import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const sheetWidth = 4.50;
const sheetHeight = 2.60;

function canvasMap(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

// The two separations share the same printing coordinates. Stock, crop marks and the
// blue impression stay on the bed while the roller transfers the amber impression.
function printPlate(amber: boolean) {
  return canvasMap(1080, 624, c => {
    if (!amber) {
      c.fillStyle = '#c7d5d7';
      c.fillRect(0, 0, 1080, 624);
      c.fillStyle = '#102c42';
      c.fillRect(103, 65, 874, 494);
      c.strokeStyle = '#334b57';
      c.lineWidth = 2;
      for (const x of [69, 1011]) for (const y of [49, 575]) {
        c.beginPath();
        c.moveTo(x - 16, y); c.lineTo(x + 16, y);
        c.moveTo(x, y - 16); c.lineTo(x, y + 16);
        c.arc(x, y, 7, 0, Math.PI * 2);
        c.stroke();
      }
      // Alternating gauges on the stock margin are used to inspect impression strength.
      for (let index = 0; index < 12; index++) {
        c.fillStyle = ['#7794a1', '#506d7e', '#263f52'][index % 3];
        c.fillRect(111 + index * 17, 573, 12, 9);
      }
    }
    c.save();
    c.beginPath(); c.rect(127, 88, 822, 448); c.clip();
    // A fan of interrupted concentric rings and a straight test comb form a two-ink proof.
    c.strokeStyle = amber ? '#ffbe39' : '#719eab';
    c.lineWidth = 21;
    for (let radius = 41; radius <= 288; radius += 34) {
      const sweep = amber ? Math.PI * .5 : 0;
      for (const turn of [0, Math.PI]) {
        const start = sweep + turn - Math.PI * .09;
        c.beginPath();
        c.arc(435, 313, radius, start, start + Math.PI * .5);
        c.stroke();
      }
    }
    c.fillStyle = amber ? '#ffc94d' : '#6e96a5';
    for (let row = 0; row < 9; row++) {
      c.fillRect(731, 123 + row * 43 + (amber ? 0 : 12), 188 - row * 12, amber ? 10 : 6);
    }
    c.restore();
    if (amber) {
      for (let index = 0; index < 7; index++) {
        c.fillStyle = ['#e8a933', '#ffbd3c', '#ffd675'][index % 3];
        c.fillRect(840 + index * 18, 573, 15, 9);
      }
    }
  });
}

function footprint() {
  return canvasMap(400, 300, c => {
    c.filter = 'blur(9px)';
    c.fillStyle = 'rgba(0, 3, 11, .88)';
    c.beginPath();
    c.roundRect(32, 34, 336, 232, 11);
    c.fill();
  });
}

export function buildPressSet(scene: THREE.Scene) {
  const press = new THREE.Group();
  press.rotation.z = -.055;
  scene.add(press);
  const resources: Array<{dispose(): void}> = [];
  function keep<T extends {dispose(): void}>(resource: T) {
    resources.push(resource);
    return resource;
  }
  const metal = (color: string, metalness: number, roughness: number) =>
    keep(new THREE.MeshStandardMaterial({color, metalness, roughness}));
  const enamel = metal('#213d55', .32, .39);
  const indigo = metal('#102338', .25, .54);
  const pale = metal('#99aab6', .58, .30);
  const darkMetal = metal('#536a7a', .57, .35);
  const rubber = metal('#141b23', .12, .59);
  const warm = metal('#eeab3b', .30, .36);
  const brightInk = metal('#c78a29', .13, .35);

  type Position = [number, number, number];
  function part(parent: THREE.Object3D, shape: THREE.BufferGeometry, material: THREE.Material, position: Position) {
    const piece = new THREE.Mesh(keep(shape), material);
    piece.position.set(...position);
    parent.add(piece);
    return piece;
  }
  function block(parent: THREE.Object3D, size: Position, pos: Position, material: THREE.Material, bevel = .03) {
    return part(parent, new RoundedBoxGeometry(...size, 2, bevel), material, pos);
  }
  // Cylinders run parallel to the roller axle, along the local Y axis.
  function axle(parent: THREE.Object3D, radius: number, length: number, pos: Position, material: THREE.Material) {
    return part(parent, new THREE.CylinderGeometry(radius, radius, length, 48), material, pos);
  }
  const printSurface = (map: THREE.Texture) =>
    keep(new THREE.MeshBasicMaterial({map: keep(map), transparent: true, toneMapped: false, depthWrite: false}));
  const shadow = printSurface(footprint());
  part(press, new THREE.PlaneGeometry(7.18, 5.14), shadow, [.13, -.14, -.25]);
  block(press, [6.08, 3.86, .26], [0, 0, 0], indigo, .13);
  block(press, [5.98, 3.74, .16], [0, .02, .115], enamel, .09);
  block(press, [5.40, 2.96, .10], [0, 0, .222], rubber);
  block(press, [sheetWidth + .025, sheetHeight + .025, .04], [.016, -.014, .285], darkMetal, .009);
  part(press, new THREE.PlaneGeometry(sheetWidth, sheetHeight), printSurface(printPlate(false)), [0, 0, .313]);
  const inkMap = printPlate(true);
  const impression = part(press, new THREE.PlaneGeometry(sheetWidth, sheetHeight), printSurface(inkMap), [0, 0, .317]);

  for (const side of [-1, 1]) {
    const railY = side * 1.56;
    block(press, [5.53, .12, .09], [0, railY, .256], darkMetal);
    block(press, [5.48, .030, .025], [0, railY + .019, .313], pale, .008);
    for (const x of [-2.76, 2.76]) {
      block(press, [.19, .30, .16], [x, railY, .265], indigo, .035);
      const screw = axle(press, .055, .025, [x, railY, .359], pale);
      screw.rotation.x = Math.PI / 2;
      block(press, [.071, .014, .008], [x, railY, .374], rubber, .003).rotation.z = side * .65;
    }
  }
  // An engraved measuring rule sits above the sheet on the stationary casting.
  const tickShape = keep(new THREE.BoxGeometry(1, 1, 1));
  const ticks = new THREE.InstancedMesh(tickShape, darkMetal, 61);
  const tick = new THREE.Object3D();
  for (let index = 0; index < ticks.count; index++) {
    const length = index % 5 === 0 ? .072 : .035;
    tick.position.set((index - 30) * .080, 1.784 - length * .5, .201);
    tick.scale.set(.012, length, .014);
    tick.updateMatrix();
    ticks.setMatrixAt(index, tick.matrix);
  }
  press.add(ticks);

  const carriage = new THREE.Group();
  press.add(carriage);
  const wheel = axle(carriage, .164, 2.82, [0, 0, .483], brightInk);
  // A seam on the cylinder turns with its surface during the impression.
  block(wheel, [.016, 2.78, .010], [0, 0, .163], warm, .003);
  for (const side of [-1, 1]) {
    axle(carriage, .172, .080, [0, side * 1.375, .483], darkMetal);
    axle(carriage, .090, .26, [0, side * 1.488, .483], pale);
    block(carriage, [.40, .23, .18], [0, side * 1.56, .39], enamel, .046);
    block(carriage, [.32, .15, .085], [0, side * 1.56, .503], darkMetal, .027);
    axle(carriage, .125, .135, [0, side * 1.743, .482], rubber);
    axle(carriage, .099, .030, [0, side * 1.805, .482], warm);
  }
  // Grounding shadows stay attached to the mechanisms and follow the carriage.
  const rollerShade = keep(new THREE.MeshBasicMaterial({
    color: '#020a13', transparent: true, opacity: .23, depthWrite: false, toneMapped: false,
  }));
  part(carriage, new THREE.PlaneGeometry(.37, 2.69), rollerShade, [.079, -.02, .325]);
  const ambient = new THREE.HemisphereLight('#e1eeff', '#607993', 1.56);
  const key = new THREE.DirectionalLight('#fff0d4', 2.70);
  key.position.set(-4, 6, 8);
  const rim = new THREE.DirectionalLight('#a3cfff', 1.65);
  rim.position.set(4, 1, 3);
  press.add(ambient, key, rim);

  return {
    pose(progress: number) {
      const travel = THREE.MathUtils.smootherstep(progress, .035, .89);
      const x = THREE.MathUtils.lerp(-2.54, 2.54, travel);
      carriage.position.x = x;
      wheel.rotation.y = (x + 2.54) / .164;
      const widthPrinted = THREE.MathUtils.clamp(x + sheetWidth / 2, 0, sheetWidth);
      const fraction = widthPrinted / sheetWidth;
      impression.visible = widthPrinted > 0;
      impression.position.x = (widthPrinted - sheetWidth) / 2;
      impression.scale.x = fraction;
      inkMap.repeat.x = fraction;
    },
    dispose() {
      scene.remove(press);
      ticks.dispose();
      resources.forEach(resource => resource.dispose());
    },
  };
}
