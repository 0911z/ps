
'use strict';
// ===============================================================
//  CONFIGURATION
// ===============================================================
const TILE = 4;          // world units per tile
const MAP_W = 80;        // tiles wide
const MAP_H = 80;        // tiles tall
const HOUR_SEC = 20;     // 1 game hour = 20 real seconds
const PLAYER_SPEED = 8;  // units/sec
const CAM_HEIGHT = 24;   // camera Y
const CAM_TILT = 30;     // degrees from vertical

// -- BUILDINGS (world-unit positions) --
// Roads at world-x/z 56,136,216,296.  Each road+sidewalk zone = ±9 from centre.
// Buildings in x=[0,56] block must end x<=47 ; in x=[56,136] must start x>=65.
// Buildings in z=[0,56] block must end z<=47 ; in z=[56,136] must start z>=66.
// Grid blocks (road centers at x/z = 56,136,216,296 → safe zones):
//  Col0: x=[2,44]   center=28   Col1: x=[68,124]  center=96
//  Col2: x=[148,204] center=176  Col3: x=[228,284] center=256
//  Row0: z=[2,44]   center=28   Row1: z=[68,124]  center=96
//  Row2: z=[148,204] center=176  Row3: z=[228,284] center=256
const BUILDINGS = [
  { id:'house',    wx:18, wz:20, ww:20, wd:16, color:0x4a90d9, label:'Your House',    indoor:'house'    }, // col0 row0 — smaller
  { id:'store',    wx:84, wz:19, ww:24, wd:18, color:0xe67e22, label:'Corner Store',  indoor:'store'    }, // col1 row0 — smaller
  { id:'mchappy',  wx:161,wz:17, ww:30, wd:22, color:0xe74c3c, label:"McHappy's",     indoor:'mchappy'  }, // col2 row0
  { id:'uni',      wx:237,wz:15, ww:38, wd:26, color:0x8e44ad, label:'University',    indoor:'uni'      }, // col3 row0
  { id:'casino',   wx:13, wz:82, ww:30, wd:28, color:0xf39c12, label:'Casino',        indoor:'casino'   }, // col0 row1
  { id:'hospital', wx:240,wz:84, ww:32, wd:24, color:0xe74c3c, label:'Hospital',      indoor:'hospital' }, // col3 row1
  { id:'airport',  wx:70, wz:237,ww:52, wd:38, color:0x607d8b, label:'Airport',       indoor:'airport'  }, // col1 row3
  { id:'police',   wx:82, wz:162,ww:28, wd:22, color:0x607890, label:'Police Station', indoor:'police'   }, // col1 row2
  // Decorative apartment towers in empty lots (non-enterable)
  { id:'dhouse1',  wx:82, wz:82, ww:28, wd:22, color:0x7a9abd, label:'House',         indoor:null       }, // col1 row1
  { id:'dhouse2',  wx:162,wz:82, ww:28, wd:22, color:0xb08060, label:'House',         indoor:null       }, // col2 row1
  { id:'dhouse3',  wx:15, wz:162,ww:26, wd:20, color:0x6a9a7a, label:'House',         indoor:null       }, // col0 row2
  { id:'dhouse4',  wx:242,wz:162,ww:28, wd:22, color:0x8a7aaa, label:'House',         indoor:null       }, // col3 row2
  { id:'dhouse5',  wx:162,wz:242,ww:28, wd:22, color:0xaa8a5a, label:'House',         indoor:null       }, // col2 row3
];

// -- ITEMS --
const ITEMS = {
  burger:   { name:'Burger',   em:'🍔', hunger:40, thirst:5,  price:8  },
  sandwich: { name:'Sandwich', em:'🥪', hunger:25, thirst:5,  price:5  },
  water:    { name:'Water',    em:'💧', hunger:0,  thirst:40, price:2  },
  soda:     { name:'Soda',     em:'🥤', hunger:0,  thirst:25, price:3  },
  fries:    { name:'Fries',    em:'🍟', hunger:20, thirst:-5, price:3  },
  apple:    { name:'Apple',    em:'🍎', hunger:15, thirst:10, price:2  },
  chips:    { name:'Chips',    em:'🥨', hunger:10, thirst:-5, price:1  },
  mealDeal: { name:'Meal Deal',em:'🍱', hunger:50, thirst:20, price:12 },
  mop:      { name:'Mop',      em:'🧹', hunger:0,  thirst:0,  price:0, isTool:true },
};

const HATS    = [{id:'none',em:'✕',label:'None'},{id:'cap',em:'🧢',label:'Cap'},{id:'cowboy',em:'🤠',label:'Cowboy'},{id:'beanie',em:'🎩',label:'Beanie'},{id:'crown',em:'👑',label:'Crown'}];
const GLASSES = [{id:'none',em:'✕',label:'None'},{id:'cool',em:'😎',label:'Shades'},{id:'nerdy',em:'🤓',label:'Nerdy'},{id:'round',em:'👓',label:'Round'}];

const ACHIEVEMENTS = [
  {id:'class_all',   em:'📚', name:'Scholar',     desc:'Attend class every day'},
  {id:'job_mc',      em:'👔', name:'Employed',    desc:'Get the McHappy job'},
  {id:'casino_big',  em:'💰', name:'High Roller', desc:'Win $500+ in one session'},
  {id:'called_home', em:'📞', name:'Homesick',    desc:'Call your parents'},
  {id:'graduated',   em:'🎓', name:'Graduate',    desc:'Pass the final exam'},
  {id:'made_home',   em:'🏡', name:'Coming Home', desc:'Fly home'},
];

const WEATHERS = ['Sunny','Cloudy','Rainy','Windy','Snowy','Partly Cloudy'];
const WEATHER_ICONS = {Sunny:'☀️',Cloudy:'☁️',Rainy:'🌧️',Windy:'💨',Snowy:'❄️','Partly Cloudy':'⛅'};

function applyWeatherVisuals(w){
  const ov=document.getElementById('weather-overlay');
  ov.innerHTML='';
  if(w==='Rainy'||w==='Snowy'){
    ov.style.display='block';
    const isSnow=w==='Snowy';
    const count=isSnow?60:120;
    for(let i=0;i<count;i++){
      const p=document.createElement('div');p.className='w-particle';
      const size=isSnow?(3+Math.random()*4):(1+Math.random()*1.5);
      p.style.cssText=`width:${size}px;height:${isSnow?size:8+Math.random()*12}px;`+
        `left:${Math.random()*100}%;background:${isSnow?'rgba(220,240,255,0.85)':'rgba(100,150,255,0.6)'};`+
        `animation-duration:${isSnow?2+Math.random()*3:0.6+Math.random()*0.8}s;`+
        `animation-delay:${Math.random()*3}s;opacity:${0.5+Math.random()*0.5};`;
      ov.appendChild(p);
    }
  } else {
    ov.style.display='none';
  }
}

// ===============================================================
//  GAME STATE
// ===============================================================
let G = null;

function initG() {
  G = {
    // Position (world units)
    px: 28, pz: 42,
    vx: 0,  vz: 0,
    hat: 'none', glasses: 'none',
    beanColor: 0xFF9F43,
    // Stats
    money: 1000,
    hunger: 100, thirst: 100,
    hungerTimer: 0, thirstTimer: 0,
    critTimer: 0,
    // Time
    gameTime: 6 * HOUR_SEC,
    day: 1,
    // Flags
    hasJob: false, lastWorkDay: -1, moppingActive: false, mopStartTime: 0,
    stunned: false, stunTimer: 0, hitCooldown: 0,
    parentCallDay: -1, parentCallHour: -1,
    classC: 0, studyC: 0,
    lastClassDay: -1,
    examDone: false, graduated: false,
    examDay: 4,
    hospitalized: false,
    parentsCalledYou: false,
    inCar: false, carX: 43, carZ: 28,
    // Weather
    weather: 'Sunny', weatherTimer: 0,
    // Inventory
    inventory: [],
    storeCart: [],
    fridge: [],
    // Achievements
    achs: {},
    // Input
    keys: {up:false,down:false,left:false,right:false},
    // Camera
    camTarget: {x:18,z:18},
    // Scene state
    indoor: null,  // null = outdoor, else building id
    nearBuilding: null,
    dlgOpen: false, dlgData: null,
    panelOpen: false,
    gameOver: false,
    prevTs: 0,
  };
}

// ===============================================================
//  THREE.JS SETUP
// ===============================================================
let renderer, scene, camera;
let playerMesh, playerGroup;
let outdoorScene, indoorScenes = {};
let currentIndoorScene = null;
let animMixers = [];
let lightGroup;
let playerCarMesh = null;

function initThree() {
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Camera  -  isometric-ish birds-eye
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87CEEB, 60, 200);
  scene.background = new THREE.Color(0x87CEEB);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  buildOutdoorScene();
  buildAllIndoorScenes();
  buildPlayerMesh();
  positionCamera();
}

// -- MATERIALS --
function mat(color, rough=0.8, metal=0) {
  return new THREE.MeshLambertMaterial({ color });
}
function matPhong(color, shininess=30) {
  return new THREE.MeshPhongMaterial({ color, shininess });
}

// -- LIGHTING --
function addLights(sc) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  sc.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sc.add(sun);
  return {ambient, sun};
}

// -------------------------------------------------------------
//  OUTDOOR SCENE
// -------------------------------------------------------------
function buildOutdoorScene() {
  outdoorScene = new THREE.Scene();
  outdoorScene.fog = new THREE.Fog(0x87CEEB, 80, 220);
  outdoorScene.background = new THREE.Color(0x87CEEB);
  const lights = addLights(outdoorScene);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W*TILE, MAP_H*TILE),
    new THREE.MeshLambertMaterial({ color: 0x7ec850 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.set(MAP_W*TILE/2, 0, MAP_H*TILE/2);
  ground.receiveShadow = true;
  outdoorScene.add(ground);

  // Roads (H)
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x707070 });
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xC8BCA0 });
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xFFFF99, transparent:true, opacity:0.5 });

  const roadRows = [14, 34, 54, 74];
  const roadCols = [14, 34, 54, 74];

  roadRows.forEach(r => {
    const rz = r * TILE;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W*TILE, TILE*2.5), roadMat);
    road.rotation.x = -Math.PI/2;
    road.position.set(MAP_W*TILE/2, 0.01, rz);
    outdoorScene.add(road);
    // Sidewalks
    [-1.6, 1.6].forEach(off => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W*TILE, TILE*1.2), sidewalkMat);
      sw.rotation.x = -Math.PI/2;
      sw.position.set(MAP_W*TILE/2, 0.02, rz + off*TILE);
      outdoorScene.add(sw);
    });
    // Centre line dashes
    for(let x=0; x<MAP_W*TILE; x+=TILE*3) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(TILE*1.5, 0.2), lineMat);
      dash.rotation.x = -Math.PI/2;
      dash.position.set(x, 0.03, rz);
      outdoorScene.add(dash);
    }
  });

  roadCols.forEach(c => {
    const cx = c * TILE;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(TILE*2.5, MAP_H*TILE), roadMat);
    road.rotation.x = -Math.PI/2;
    road.position.set(cx, 0.01, MAP_H*TILE/2);
    outdoorScene.add(road);
    [-1.6,1.6].forEach(off => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(TILE*1.2, MAP_H*TILE), sidewalkMat);
      sw.rotation.x = -Math.PI/2;
      sw.position.set(cx+off*TILE, 0.02, MAP_H*TILE/2);
      outdoorScene.add(sw);
    });
    for(let z=0; z<MAP_H*TILE; z+=TILE*3) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, TILE*1.5), lineMat);
      dash.rotation.x = -Math.PI/2;
      dash.position.set(cx, 0.03, z);
      outdoorScene.add(dash);
    }
  });

  // Buildings
  BUILDINGS.forEach(b => buildBuilding3D(outdoorScene, b));

  // Parking lots (double-row with center planter) in front of each building
  BUILDINGS.forEach(b => addParkingLot(outdoorScene, b));

  // Point lights giving casino/uni/airport a coloured glow
  [{id:'casino',color:0xf5a623,range:40},{id:'uni',color:0xc471ed,range:40},{id:'airport',color:0x4fc3f7,range:50}]
  .forEach(({id,color,range})=>{
    const b=BUILDINGS.find(b=>b.id===id);if(!b)return;
    const pl=new THREE.PointLight(color,2.5,range);
    pl.position.set(b.wx+b.ww/2,14,b.wz+b.wd/2);
    outdoorScene.add(pl);
  });

  // Street lamps along all road sidewalks
  buildStreetLamps(outdoorScene);

  // Traffic lights at all intersections
  buildTrafficLights(outdoorScene);

  // Random trees scattered across map
  const treePosns = [];
  for(let i=0;i<400;i++) {
    const x = (Math.random()*0.9+0.05)*MAP_W*TILE;
    const z = (Math.random()*0.9+0.05)*MAP_H*TILE;
    if(!isNearRoad(x,z) && !isNearBuilding(x,z)) treePosns.push([x,z]);
  }
  treePosns.forEach(([x,z]) => addTree(outdoorScene, x, z));
  // Dense tree clusters in the two fully-empty lots (col0 row3 and col3 row3)
  [[28,256],[256,256]].forEach(([cx,cz])=>{
    for(let i=0;i<30;i++){
      const tx=cx+(Math.random()-0.5)*30, tz=cz+(Math.random()-0.5)*30;
      if(!isNearRoad(tx,tz)&&!isNearBuilding(tx,tz)) addTree(outdoorScene,tx,tz);
    }
  });

  // NPC cars with intersection-turning routing
  outdoorScene._cars = [];
  const carColors=[0xe74c3c,0x2980b9,0x27ae60,0x8e44ad,0xf39c12,0x1abc9c,0xe67e22];
  const LANE=0.85; // lane offset from road centre
  roadRows.forEach(r => {
    for(let c=0;c<4;c++) {
      const dir=Math.random()<0.5?1:-1;
      const rz=r*TILE;
      const car=buildCar(outdoorScene,carColors[c%carColors.length]);
      car.position.set(Math.random()*MAP_W*TILE,0.4,rz+(dir>0?-LANE:LANE));
      car._dir=dir; car._speed=9+Math.random()*7;
      car._axis='x'; car._roadCZ=rz;
      car._targetRot=dir>0?0:Math.PI;
      car._intCooldown=Math.random()*4;
      car._routing=true;
      car.rotation.y=car._targetRot;
      outdoorScene._cars.push(car); outdoorScene.add(car);
    }
  });
  roadCols.forEach(c => {
    for(let i=0;i<2;i++){
      const dir=Math.random()<0.5?1:-1;
      const rx=c*TILE;
      const car=buildCar(outdoorScene,carColors[(c+i)%carColors.length]);
      car.position.set(rx+(dir>0?LANE:-LANE),0.4,Math.random()*MAP_H*TILE);
      car._dir=dir; car._speed=9+Math.random()*7;
      car._axis='z'; car._roadCX=rx;
      car._targetRot=dir>0?-Math.PI/2:Math.PI/2;
      car._intCooldown=Math.random()*4;
      car._routing=true;
      car.rotation.y=car._targetRot;
      outdoorScene._cars.push(car); outdoorScene.add(car);
    }
  });

  // School bus (only active daytime 6–20h)
  const bus=buildBus(outdoorScene);
  const busRow=roadRows[1]; // row 34, z=136
  const busDir=1;
  bus.position.set(MAP_W*TILE*0.3,0.4,busRow*TILE-LANE*1.8);
  bus._dir=busDir; bus._speed=6;
  bus._axis='x'; bus._roadCZ=busRow*TILE;
  bus._targetRot=0; bus._intCooldown=3;
  bus._routing=true; bus._isBus=true;
  bus.rotation.y=0;
  outdoorScene._cars.push(bus); outdoorScene.add(bus);
  outdoorScene._schoolBus=bus;

  // 1 police car parked beside station (wx=82,wz=162,ww=28)
  outdoorScene._policeCars=[];
  const parked=buildPoliceCar(outdoorScene);
  parked.position.set(82+28+3, 0.4, 162+11);
  parked.rotation.y=Math.PI/2;
  parked._isPolice=true; parked._routing=false; // starts parked, activated on crime
  parked._targetRot=Math.PI/2;
  outdoorScene.add(parked); outdoorScene._policeCars.push(parked);

  // Player's car (parked outside house, facing +X)
  playerCarMesh = buildCar(outdoorScene, 0xFF9F43);
  playerCarMesh.position.set(G.carX, 0.4, G.carZ);
  playerCarMesh.rotation.y = 0;
  outdoorScene.add(playerCarMesh);

  // NPCs walking on sidewalks (horizontal + vertical)
  outdoorScene._npcs = [];
  // Horizontal sidewalk walkers (35 total)
  for(let i=0;i<35;i++) {
    const npc = buildNPCMesh(outdoorScene);
    const r = roadRows[Math.floor(Math.random()*roadRows.length)];
    const swOff = (Math.random()<0.5 ? -1 : 1) * TILE * 1.6;
    const swZ = r*TILE + swOff;
    npc.position.set(Math.random()*MAP_W*TILE, 0, swZ);
    npc._dir = Math.random()<0.5?1:-1;
    npc._speed = 1.8+Math.random()*2;
    npc._walkT = Math.random()*6;
    npc._swZ = swZ;
    npc.rotation.y = npc._dir>0 ? Math.PI/2 : -Math.PI/2; // face walk direction (+x=east→PI/2)
    outdoorScene._npcs.push(npc);
    outdoorScene.add(npc);
  }
  // Vertical sidewalk walkers (15 total)
  for(let i=0;i<15;i++) {
    const npc = buildNPCMesh(outdoorScene);
    const c = roadCols[Math.floor(Math.random()*roadCols.length)];
    const swOff = (Math.random()<0.5 ? -1 : 1) * TILE * 1.6;
    const swX = c*TILE + swOff;
    npc.position.set(swX, 0, Math.random()*MAP_H*TILE);
    npc._dir = Math.random()<0.5?1:-1;
    npc._speed = 1.8+Math.random()*2;
    npc._walkT = Math.random()*6;
    npc._swX = swX;
    npc.rotation.y = npc._dir>0 ? 0 : Math.PI; // face walk direction
    outdoorScene._npcs.push(npc);
    outdoorScene.add(npc);
  }
  // Wandering police officers near station
  spawnWanderingOfficers();

  // Park (must come after _npcs is initialised so park people can be added)
  buildPark(outdoorScene, 151, 151, 50, 50);
}

function isNearRoad(x,z) {
  const roadRows = [14, 34, 54, 74].map(r=>r*TILE);
  const roadCols = [14, 34, 54, 74].map(c=>c*TILE);
  for(const rz of roadRows) if(Math.abs(z-rz)<TILE*3.5) return true;
  for(const cx of roadCols) if(Math.abs(x-cx)<TILE*3.5) return true;
  return false;
}
const PARK = {wx:151,wz:151,ww:50,wd:50}; // col2 row2 — center of map (expanded)
function isNearBuilding(x,z) {
  if(x>PARK.wx-4&&x<PARK.wx+PARK.ww+4&&z>PARK.wz-4&&z<PARK.wz+PARK.wd+4) return true;
  return BUILDINGS.some(b => x>b.wx-TILE*2&&x<b.wx+b.ww+TILE*2&&z>b.wz-TILE*2&&z<b.wz+b.wd+TILE*4.5);
}

function buildBuilding3D(sc, b) {
  const glowEmissive={casino:0xd4830a,uni:0x7b2fbe,airport:0x1a7fa8};
  const emissive=glowEmissive[b.id]||0x000000;
  const wallMat = new THREE.MeshLambertMaterial({ color: b.color, emissive, emissiveIntensity: emissive?0.35:0 });
  const roofMat = new THREE.MeshLambertMaterial({ color: darkenColor(b.color, 0.6), emissive, emissiveIntensity: emissive?0.2:0 });
  const winMat  = new THREE.MeshLambertMaterial({ color: 0xfff0aa, transparent:true, opacity:0.85 });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });

  const isApt = b.id.startsWith('dhouse');
  const h = b.id==='casino'?8 : b.id==='uni'?9 : b.id==='airport'?7 : b.id==='police'?7 : isApt?18 : 5;
  const cx = b.wx + b.ww/2, cz = b.wz + b.wd/2;

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.ww, h, b.wd), wallMat);
  body.position.set(cx, h/2, cz);
  body.castShadow = body.receiveShadow = true;
  sc.add(body);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(b.ww+0.5, 0.5, b.wd+0.5), roofMat);
  roof.position.set(cx, h+0.25, cz);
  sc.add(roof);

  // Windows
  const wCols = Math.floor(b.ww/4);
  const wRows = Math.floor(h/2.5);
  for(let wc=0;wc<wCols;wc++) for(let wr=0;wr<wRows;wr++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2,1), winMat);
    win.position.set(b.wx + 2 + wc*(b.ww-4)/(Math.max(1,wCols-1)), 2+wr*2.5, b.wz+b.wd+0.01);
    sc.add(win);
    const winB = new THREE.Mesh(new THREE.PlaneGeometry(1.2,1), winMat);
    winB.rotation.y = Math.PI;
    winB.position.set(b.wx + 2 + wc*(b.ww-4)/(Math.max(1,wCols-1)), 2+wr*2.5, b.wz-0.01);
    sc.add(winB);
  }

  // Door (only for enterable buildings)
  if(!isApt) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.2), doorMat);
    door.position.set(cx, 1.5, b.wz+b.wd+0.1);
    sc.add(door);
    addSign(sc, b.label, cx, h+1, b.wz+b.wd+1);
  } else {
    // Apartment entrance doors (lobby double-doors)
    [-0.7,0.7].forEach(ox=>{
      const d=new THREE.Mesh(new THREE.BoxGeometry(0.9,2.5,0.15),doorMat);
      d.position.set(cx+ox,1.25,b.wz+b.wd+0.08);sc.add(d);
    });
    // Apartment rooftop features
    const wtMat=new THREE.MeshLambertMaterial({color:0x8B6914});
    const wtBase=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,2.2,8),wtMat);
    wtBase.position.set(cx+b.ww*0.28,h+1.1,cz);sc.add(wtBase);
    const wtTop=new THREE.Mesh(new THREE.ConeGeometry(1.2,1.1,8),wtMat);
    wtTop.position.set(cx+b.ww*0.28,h+2.65,cz);sc.add(wtTop);
    // Rooftop AC units
    const acMat=new THREE.MeshLambertMaterial({color:0xaaaaaa});
    [[-b.ww*0.2,b.wd*0.2],[b.ww*0.2,-b.wd*0.2]].forEach(([ox,oz])=>{
      const ac=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.9,1.2),acMat);
      ac.position.set(cx+ox,h+0.7,cz+oz);sc.add(ac);
    });
    // "Apartments" building number sign on front face
    addSign(sc,'Apartments',cx,h*0.5,b.wz+b.wd+0.1);
  }

  // Airport extras
  if(b.id==='airport') {
    // Control tower (left side of terminal)
    const twH=20;
    const twMat=new THREE.MeshLambertMaterial({color:0x78909c});
    const tw=new THREE.Mesh(new THREE.BoxGeometry(4,twH,4),twMat);
    tw.position.set(b.wx+4,twH/2,b.wz+b.wd/2);
    sc.add(tw);
    // Tower cab (glass booth at top)
    const cabMat=new THREE.MeshLambertMaterial({color:0x80cee1,transparent:true,opacity:0.75});
    const cab=new THREE.Mesh(new THREE.BoxGeometry(6,3,6),cabMat);
    cab.position.set(b.wx+4,twH+1.5,b.wz+b.wd/2);
    sc.add(cab);
    // Tower light beacon
    const beacon=new THREE.PointLight(0xff3300,2,12);
    beacon.position.set(b.wx+4,twH+3.5,b.wz+b.wd/2);
    sc.add(beacon);
    // Runway strip south of terminal
    const rwMat=new THREE.MeshLambertMaterial({color:0x444444});
    const rw=new THREE.Mesh(new THREE.PlaneGeometry(12,50),rwMat);
    rw.rotation.x=-Math.PI/2;
    rw.position.set(cx,0.015,b.wz+b.wd+25);
    sc.add(rw);
    // Runway dashes
    const dashM=new THREE.MeshLambertMaterial({color:0xeeeeee,transparent:true,opacity:0.8});
    for(let dz=4;dz<46;dz+=8){
      const rd=new THREE.Mesh(new THREE.PlaneGeometry(0.6,4),dashM);
      rd.rotation.x=-Math.PI/2;
      rd.position.set(cx,0.02,b.wz+b.wd+dz);
      sc.add(rd);
    }
    // Runway side lights (small boxes)
    const litM=new THREE.MeshLambertMaterial({color:0xffee55,emissive:0xffee55,emissiveIntensity:0.6});
    for(let dz=0;dz<50;dz+=5){
      [-6,6].forEach(ox=>{
        const lit=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.2,0.3),litM);
        lit.position.set(cx+ox,0.1,b.wz+b.wd+dz);
        sc.add(lit);
      });
    }
    // Parked airplane (right side of terminal)
    const planeX=b.wx+b.ww-8;
    const planeZ=b.wz+b.wd/2;
    const bodyM=new THREE.MeshLambertMaterial({color:0xf0f0f0});
    const stripeM=new THREE.MeshLambertMaterial({color:0x2196f3});
    // Fuselage (long along z-axis)
    const fuse=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,18,10),bodyM);
    fuse.rotation.x=Math.PI/2;
    fuse.position.set(planeX,1.8,planeZ);
    sc.add(fuse);
    // Nose cone
    const nose=new THREE.Mesh(new THREE.ConeGeometry(1.2,3,10),bodyM);
    nose.rotation.x=Math.PI/2;
    nose.position.set(planeX,1.8,planeZ+10.5);
    sc.add(nose);
    // Wings
    const wing=new THREE.Mesh(new THREE.BoxGeometry(20,0.4,5),bodyM);
    wing.position.set(planeX,1.5,planeZ-1);
    sc.add(wing);
    // Tail fin (vertical)
    const tailFin=new THREE.Mesh(new THREE.BoxGeometry(0.4,4,4),bodyM);
    tailFin.position.set(planeX,3.5,planeZ-8);
    sc.add(tailFin);
    // Tail horizontal stabiliser
    const tailH=new THREE.Mesh(new THREE.BoxGeometry(8,0.4,2.5),bodyM);
    tailH.position.set(planeX,2.5,planeZ-8);
    sc.add(tailH);
    // Blue stripe along fuselage
    const strip=new THREE.Mesh(new THREE.BoxGeometry(1.22,0.7,14),stripeM);
    strip.position.set(planeX,2.2,planeZ+1);
    sc.add(strip);
    // Engine pods under wings
    [-5,5].forEach(ox=>{
      const eng=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,4,8),new THREE.MeshLambertMaterial({color:0xcccccc}));
      eng.rotation.x=Math.PI/2;
      eng.position.set(planeX+ox,0.9,planeZ-1);
      sc.add(eng);
    });
  }

  // Casino extra glow
  if(b.id==='casino') {
    const glowLight = new THREE.PointLight(0xFFAA00, 2, 20);
    glowLight.position.set(cx, h+2, cz);
    sc.add(glowLight);
    const glowLight2 = new THREE.PointLight(0xFF5500, 1.5, 15);
    glowLight2.position.set(cx, 2, b.wz+b.wd+3);
    sc.add(glowLight2);
  }
  // Police station extras
  if(b.id==='police') {
    // Flag pole beside station
    const fpMat=new THREE.MeshLambertMaterial({color:0x888888});
    const fp=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,9,6),fpMat);
    fp.position.set(b.wx-1.5,4.5,b.wz+b.wd*0.5);sc.add(fp);
    // Flag (blue & white stripes)
    const flagMat=new THREE.MeshLambertMaterial({color:0x1a237e,side:THREE.DoubleSide});
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(3,1.6),flagMat);
    flag.position.set(b.wx-1.5+1.5,8.2,b.wz+b.wd*0.5);sc.add(flag);
    // Blue rooftop beacon
    const beacon=new THREE.PointLight(0x2244ff,2.5,18);
    beacon.position.set(cx,h+1.5,cz);sc.add(beacon);
    // Steps in front
    const stepMat=new THREE.MeshLambertMaterial({color:0xbbbbbb});
    [0,0.35].forEach((sy,si)=>{
      const step=new THREE.Mesh(new THREE.BoxGeometry(b.ww*0.5,0.25,1.2-si*0.4),stepMat);
      step.position.set(cx,sy,b.wz+b.wd+0.6+si*0.3);sc.add(step);
    });
  }
}

function addSign(sc, text, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width=256; canvas.height=48;
  const c=canvas.getContext('2d');
  c.fillStyle='rgba(0,0,0,0.7)';
  c.fillRect(0,0,256,48);
  c.fillStyle='#FFD166';
  c.font='bold 18px Segoe UI, sans-serif';
  c.textAlign='center';
  c.textBaseline='middle';
  c.fillText(text,128,24);
  const tex=new THREE.CanvasTexture(canvas);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(4,0.75),new THREE.MeshBasicMaterial({map:tex,transparent:true}));
  sign.position.set(x,y,z);
  sc.add(sign);
}

function darkenColor(hex, factor) {
  const r = ((hex>>16)&0xff)*factor;
  const g = ((hex>>8)&0xff)*factor;
  const b = (hex&0xff)*factor;
  return (Math.round(r)<<16)|(Math.round(g)<<8)|Math.round(b);
}

function buildTrafficLights(sc) {
  sc._trafficLights = [];
  sc._tlTimer = 0;
  const CYCLE = 28; // total seconds: 12 green + 2 yellow + 12 red + 2 yellow
  const poleMat  = new THREE.MeshLambertMaterial({color:0x222222});
  const housMat  = new THREE.MeshLambertMaterial({color:0x111111});
  const rOff = new THREE.MeshLambertMaterial({color:0x550000});
  const yOff = new THREE.MeshLambertMaterial({color:0x553300});
  const gOff = new THREE.MeshLambertMaterial({color:0x004400});
  const roadRz = [14,34,54,74].map(r=>r*TILE);
  const roadCx = [14,34,54,74].map(c=>c*TILE);
  roadRz.forEach(rz=>{
    roadCx.forEach(cx=>{
      // One pole per intersection at NW corner
      const px=cx-5, pz=rz-5;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,6,6),poleMat);
      pole.position.set(px,3,pz); sc.add(pole);
      // Arm extending over road
      const arm=new THREE.Mesh(new THREE.BoxGeometry(5,0.18,0.18),poleMat);
      arm.position.set(px+2.5,6.1,pz); sc.add(arm);
      // Signal housing
      const hous=new THREE.Mesh(new THREE.BoxGeometry(0.5,2.2,0.5),housMat);
      hous.position.set(px+5,5.1,pz); sc.add(hous);
      // Light spheres: red top, yellow mid, green bottom
      const mk=(y,mat)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,8),mat.clone());m.position.set(px+5,y,pz);sc.add(m);return m;};
      const rL=mk(5.75,rOff);
      const yL=mk(5.1,yOff);
      const gL=mk(4.45,gOff);
      // Start in green phase
      rL.material.emissive=new THREE.Color(0); rL.material.emissiveIntensity=0;
      yL.material.emissive=new THREE.Color(0); yL.material.emissiveIntensity=0;
      gL.material.color.set(0x00cc44); gL.material.emissive=new THREE.Color(0x00cc44); gL.material.emissiveIntensity=1;
      sc._trafficLights.push({r:rL,y:yL,g:gL});
    });
  });
}

function updateTrafficLights(dt) {
  if(!outdoorScene._trafficLights) return;
  outdoorScene._tlTimer = (outdoorScene._tlTimer||0)+dt;
  const t = outdoorScene._tlTimer % 28;
  // 0-12s green, 12-14s yellow, 14-26s red, 26-28s yellow
  const phase = t<12?'g': t<14?'y': t<26?'r':'y';
  outdoorScene._trafficLights.forEach(tl=>{
    tl.r.material.emissiveIntensity = phase==='r'?1:0;
    tl.r.material.color.set(phase==='r'?0xff2200:0x220000);
    tl.y.material.emissiveIntensity = phase==='y'?1:0;
    tl.y.material.color.set(phase==='y'?0xffaa00:0x221100);
    tl.g.material.emissiveIntensity = phase==='g'?1:0;
    tl.g.material.color.set(phase==='g'?0x00cc44:0x002200);
  });
}

function addTree(sc, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,2,6), new THREE.MeshLambertMaterial({color:0x8B6914}));
  trunk.position.set(x,1,z);
  trunk.castShadow = true;
  sc.add(trunk);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(2,7,6), new THREE.MeshLambertMaterial({color:0x2d8a2d}));
  canopy.position.set(x,3.5,z);
  canopy.castShadow = true;
  sc.add(canopy);
  const canopy2 = new THREE.Mesh(new THREE.SphereGeometry(1.4,7,6), new THREE.MeshLambertMaterial({color:0x3aac3a}));
  canopy2.position.set(x+0.5,4.8,z-0.3);
  sc.add(canopy2);
}

function addBush(sc, x, z, scale=1) {
  const colors=[0x2d8a2d,0x3aac3a,0x267326,0x4ab84a];
  const c=colors[Math.floor(Math.random()*colors.length)];
  const mat=new THREE.MeshLambertMaterial({color:c});
  // Two overlapping spheres for a lumpy bush shape
  const r1=0.7*scale, r2=0.55*scale;
  const b1=new THREE.Mesh(new THREE.SphereGeometry(r1,7,6),mat);
  b1.position.set(x,r1*0.9,z); sc.add(b1);
  const b2=new THREE.Mesh(new THREE.SphereGeometry(r2,7,6),mat);
  b2.position.set(x+r1*0.6,r2*0.85,z+r1*0.3); sc.add(b2);
  const b3=new THREE.Mesh(new THREE.SphereGeometry(r2*0.8,7,6),mat);
  b3.position.set(x-r1*0.5,r2*0.8,z-r1*0.4); sc.add(b3);
}

// --- Parking lots (double-row with center planter island) ---
function addParkingLot(sc, b) {
  const roadZs=[14,34,54,74].map(r=>r*TILE);
  const southFace=b.wz+b.wd;
  let roadZ=null;
  for(const rz of roadZs){ if(rz>southFace+2){ roadZ=rz; break; } }
  if(!roadZ) return;
  const lotStart=southFace+0.5;
  const lotEnd=roadZ-TILE*2.2;
  const availDepth=lotEnd-lotStart;
  if(availDepth<6) return;

  const lotW=b.ww;
  const lotCX=b.wx+lotW/2;
  const spaceD=4.0, aisleW=5.0;
  const totalD=spaceD*2+aisleW;
  const doDouble=availDepth>=totalD+0.5;
  const lotDepth=doDouble ? totalD : Math.min(spaceD+0.5, availDepth);
  const lotCZ=lotStart+lotDepth/2;

  // Asphalt base
  const asphMat=new THREE.MeshLambertMaterial({color:0x4a4a4a});
  const asph=new THREE.Mesh(new THREE.PlaneGeometry(lotW,lotDepth),asphMat);
  asph.rotation.x=-Math.PI/2;
  asph.position.set(lotCX,0.015,lotCZ);
  sc.add(asph);

  const lineMat=new THREE.MeshLambertMaterial({color:0xffffff});
  const spaceW=2.5;
  const numSpaces=Math.floor(lotW/spaceW);
  const lineStartX=b.wx+(lotW-numSpaces*spaceW)/2;

  if(doDouble){
    const aisleStartZ=lotStart+spaceD;
    const aisleEndZ=aisleStartZ+aisleW;

    // Row edge lines
    for(const lz of [lotStart+0.06, aisleStartZ, aisleEndZ, aisleEndZ+spaceD-0.06]){
      const hl=new THREE.Mesh(new THREE.PlaneGeometry(lotW,0.12),lineMat);
      hl.rotation.x=-Math.PI/2; hl.position.set(lotCX,0.02,lz); sc.add(hl);
    }
    // Vertical space dividers for both rows
    for(let i=0;i<=numSpaces;i++){
      const lx=lineStartX+i*spaceW;
      for(const [cz,d] of [[lotStart+spaceD/2,spaceD],[aisleEndZ+spaceD/2,spaceD]]){
        const vl=new THREE.Mesh(new THREE.PlaneGeometry(0.1,d),lineMat);
        vl.rotation.x=-Math.PI/2; vl.position.set(lx,0.02,cz); sc.add(vl);
      }
    }

    // Center planter island
    const plCZ=aisleStartZ+aisleW/2;
    const plLen=lotW*0.68;
    const plW=1.7;
    const plH=0.22;
    const soilMat=new THREE.MeshLambertMaterial({color:0x8B5E3C});
    // Main rectangular body
    const plBox=new THREE.Mesh(new THREE.BoxGeometry(plLen,plH,plW),soilMat);
    plBox.position.set(lotCX,plH/2+0.02,plCZ);
    sc.add(plBox);
    // Rounded capsule ends
    const endGeo=new THREE.CylinderGeometry(plW/2,plW/2,plH,12);
    [-1,1].forEach(side=>{
      const ec=new THREE.Mesh(endGeo,soilMat);
      ec.position.set(lotCX+side*plLen/2,plH/2+0.02,plCZ);
      sc.add(ec);
    });
    // Green bushes along the planter
    const bushMat=new THREE.MeshLambertMaterial({color:0x2d8a2d});
    const bushMat2=new THREE.MeshLambertMaterial({color:0x3aac3a});
    for(let bx=lotCX-plLen/2+0.9;bx<=lotCX+plLen/2-0.5;bx+=1.7){
      const r=0.65+Math.random()*0.15;
      const bm=Math.random()<0.5?bushMat:bushMat2;
      const bs=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),bm);
      bs.position.set(bx,plH+r*0.7+0.02,plCZ+(Math.random()-0.5)*0.4);
      sc.add(bs);
    }
  } else {
    // Single row fallback
    for(const lz of [lotStart+0.06, lotStart+lotDepth-0.06]){
      const hl=new THREE.Mesh(new THREE.PlaneGeometry(lotW,0.12),lineMat);
      hl.rotation.x=-Math.PI/2; hl.position.set(lotCX,0.02,lz); sc.add(hl);
    }
    for(let i=0;i<=numSpaces;i++){
      const lx=lineStartX+i*spaceW;
      const vl=new THREE.Mesh(new THREE.PlaneGeometry(0.1,lotDepth-0.12),lineMat);
      vl.rotation.x=-Math.PI/2; vl.position.set(lx,0.02,lotCZ); sc.add(vl);
    }
  }
}

// --- Street lamps ---
function addStreetLamp(sc, x, z) {
  const poleMat=new THREE.MeshLambertMaterial({color:0x888888});
  const headMat=new THREE.MeshLambertMaterial({color:0xFFEE99,emissive:0xFFCC44,emissiveIntensity:0.7});
  // Vertical pole
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.14,4.5,6),poleMat);
  pole.position.set(x,2.25,z);
  sc.add(pole);
  // Lamp head (slightly flattened box on top)
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.22,0.6),headMat);
  head.position.set(x,4.75,z);
  sc.add(head);
}

function buildStreetLamps(sc) {
  const roadRows=[14,34,54,74];
  const roadCols=[14,34,54,74];
  const step=TILE*5; // one lamp every 20 world units
  // Along horizontal roads (north and south sidewalks)
  roadRows.forEach(r=>{
    const rz=r*TILE;
    const swN=rz-TILE*1.6;
    const swS=rz+TILE*1.6;
    for(let x=step/2;x<MAP_W*TILE;x+=step){
      addStreetLamp(sc,x,swN);
      addStreetLamp(sc,x,swS);
    }
  });
  // Along vertical roads (west and east sidewalks)
  roadCols.forEach(c=>{
    const cx=c*TILE;
    const swW=cx-TILE*1.6;
    const swE=cx+TILE*1.6;
    for(let z=step/2;z<MAP_H*TILE;z+=step){
      addStreetLamp(sc,swW,z);
      addStreetLamp(sc,swE,z);
    }
  });
}

function buildPark(sc, px, pz, pw, pd) {
  const cx=px+pw/2, cz=pz+pd/2;

  // Grass patch
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(pw,pd),new THREE.MeshLambertMaterial({color:0x4aaa30}));
  grass.rotation.x=-Math.PI/2;grass.position.set(cx,0.015,cz);sc.add(grass);

  // Fence (4 sides, gapped for entrance)
  const fenceM=new THREE.MeshLambertMaterial({color:0x8B6914});
  const postM=new THREE.MeshLambertMaterial({color:0x6B4A10});
  const sides=[
    [px+pw/2,pz,pw,0],    // north
    [px+pw/2,pz+pd,pw,0], // south
    [px,pz+pd/2,pd,1],    // west
    [px+pw,pz+pd/2,pd,1], // east
  ];
  sides.forEach(([fx,fz,flen,axis])=>{
    // Rail
    const rail=new THREE.Mesh(new THREE.BoxGeometry(axis?0.15:flen,0.18,axis?flen:0.15),fenceM);
    rail.position.set(fx,0.9,fz);sc.add(rail);
    const rail2=rail.clone();rail2.position.y=0.5;sc.add(rail2);
    // Posts
    const posts=Math.floor(flen/4);
    for(let i=0;i<=posts;i++){
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.2,0.2),postM);
      const t=i/posts;
      post.position.set(axis?fx:px+t*pw,0.6,axis?pz+t*pd:fz);
      sc.add(post);
    }
  });

  // Path ring (gravel)
  const pathM=new THREE.MeshLambertMaterial({color:0xC8BCA0,transparent:true,opacity:0.8});
  const path=new THREE.Mesh(new THREE.RingGeometry(3.5,6,32),pathM);
  path.rotation.x=-Math.PI/2;path.position.set(cx,0.02,cz);sc.add(path);

  // Fountain base
  const fBase=new THREE.Mesh(new THREE.CylinderGeometry(3,3.2,0.5,16),new THREE.MeshLambertMaterial({color:0xaaaaaa}));
  fBase.position.set(cx,0.25,cz);sc.add(fBase);
  // Fountain water bowl
  const fWater=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,0.3,16),new THREE.MeshLambertMaterial({color:0x44aadd,transparent:true,opacity:0.8}));
  fWater.position.set(cx,0.55,cz);sc.add(fWater);
  // Fountain pillar
  const fPillar=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,1.6,8),new THREE.MeshLambertMaterial({color:0x999}));
  fPillar.position.set(cx,0.8,cz);sc.add(fPillar);
  // Fountain top
  const fTop=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.4,0.25,8),new THREE.MeshLambertMaterial({color:0xaaaaaa}));
  fTop.position.set(cx,1.75,cz);sc.add(fTop);
  // Water spray (blue cone upward)
  const fSpray=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.35,1.0,8),new THREE.MeshLambertMaterial({color:0x88ccff,transparent:true,opacity:0.7}));
  fSpray.position.set(cx,2.3,cz);sc.add(fSpray);
  // Fountain glow
  const fLight=new THREE.PointLight(0x44aaff,1.2,8);fLight.position.set(cx,2,cz);sc.add(fLight);
  // Park sign
  addSign(sc,'🌳 City Park',cx,2.5,pz-0.5);

  // Benches (around fountain — each faces inward toward fountain)
  const benchM=new THREE.MeshLambertMaterial({color:0x8B5E2A});
  const benchLegM=new THREE.MeshLambertMaterial({color:0x555555});
  [[0,1],[1,0],[0,-1],[-1,0]].forEach(([bx,bz])=>{
    const bpx=cx+bx*7, bpz=cz+bz*7;
    // isNS: bench runs left-right (N/S of fountain) — seat long axis is X
    // isEW: bench runs front-back (E/W of fountain) — seat long axis is Z
    const isNS=(bz!==0);
    // Seat
    const seat=new THREE.Mesh(
      isNS ? new THREE.BoxGeometry(2.2,0.12,0.7) : new THREE.BoxGeometry(0.7,0.12,2.2),
      benchM);
    seat.position.set(bpx,0.5,bpz);sc.add(seat);
    // Backrest — offset AWAY from fountain (in bx/bz direction)
    const back=new THREE.Mesh(
      isNS ? new THREE.BoxGeometry(2.2,0.55,0.12) : new THREE.BoxGeometry(0.12,0.55,2.2),
      benchM);
    back.position.set(bpx+bx*0.35, 0.8, bpz+bz*0.35);sc.add(back);
    // Legs — spread along the bench's long axis
    const legOff=isNS?[[-0.85,0],[0.85,0]]:[[0,-0.85],[0,0.85]];
    legOff.forEach(([lx,lz])=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,0.12),benchLegM);
      leg.position.set(bpx+lx,0.25,bpz+lz);sc.add(leg);
    });
  });

  // Park trees (corner/edge trees)
  [[px+4,pz+4],[px+pw-4,pz+4],[px+4,pz+pd-4],[px+pw-4,pz+pd-4],
   [cx-8,pz+5],[cx+8,pz+5],[cx-8,pz+pd-5],[cx+8,pz+pd-5]].forEach(([tx,tz])=>{
    addTree(sc,tx,tz);
  });

  // Birds (small dark blobs that fly around)
  sc._birds=[];
  for(let i=0;i<8;i++){
    const bird=new THREE.Group();
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.18,5,4),new THREE.MeshLambertMaterial({color:0x222222}));
    body.position.y=0;bird.add(body);
    const wingL=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.06,0.14),new THREE.MeshLambertMaterial({color:0x333}));
    wingL.position.set(-0.26,0,0);bird.add(wingL);
    const wingR=wingL.clone();wingR.position.set(0.26,0,0);bird.add(wingR);
    const angle=Math.random()*Math.PI*2;
    const r=5+Math.random()*8;
    bird.position.set(cx+Math.cos(angle)*r,3.5+Math.random()*2,cz+Math.sin(angle)*r);
    bird._angle=angle;bird._r=r;bird._speed=0.4+Math.random()*0.5;bird._alt=bird.position.y;
    bird._flapT=Math.random()*6;
    sc.add(bird);sc._birds.push(bird);
  }
  // Also expose on outdoorScene for the game loop
  if(sc===outdoorScene) outdoorScene._birds=sc._birds;

  // Extra trees dotted around the park interior
  const innerTrees=[
    [cx-14,cz-14],[cx+14,cz-14],[cx-14,cz+14],[cx+14,cz+14],
    [cx-14,cz],[cx+14,cz],[cx,cz-14],[cx,cz+14],
    [cx-9,cz-9],[cx+9,cz-9],[cx-9,cz+9],[cx+9,cz+9],
  ];
  innerTrees.forEach(([tx,tz])=>addTree(sc,tx,tz));

  // Bushes scattered throughout (avoiding fountain centre and benches)
  const bushSpots=[
    [cx-18,cz-10],[cx-18,cz+10],[cx+18,cz-10],[cx+18,cz+10],
    [cx-10,cz-18],[cx+10,cz-18],[cx-10,cz+18],[cx+10,cz+18],
    [cx-20,cz-4],[cx+20,cz-4],[cx-20,cz+4],[cx+20,cz+4],
    [cx-4,cz-20],[cx+4,cz-20],[cx-4,cz+20],[cx+4,cz+20],
    [cx-16,cz-16],[cx+16,cz-16],[cx-16,cz+16],[cx+16,cz+16],
    [cx-12,cz+2],[cx+12,cz+2],[cx-12,cz-2],[cx+12,cz-2],
    [cx+2,cz-12],[cx-2,cz-12],[cx+2,cz+12],[cx-2,cz+12],
  ];
  bushSpots.forEach(([bx,bz])=>{
    // Only place if within park bounds and not too close to fountain
    const dFount=Math.hypot(bx-cx,bz-cz);
    if(dFount>6 && bx>px+2&&bx<px+pw-2&&bz>pz+2&&bz<pz+pd-2)
      addBush(sc,bx,bz,0.8+Math.random()*0.5);
  });

  // Park wanderers (6 NPCs bouncing inside the fence)
  sc._parkNpcs=[];
  for(let i=0;i<6;i++){
    const n=buildNPCMesh(sc);
    n.position.set(px+4+Math.random()*(pw-8), 0, pz+4+Math.random()*(pd-8));
    const ang=Math.random()*Math.PI*2;
    n._pvx=Math.cos(ang)*1.8; n._pvz=Math.sin(ang)*1.8;
    n._walkT=Math.random()*6;
    n._isParkNpc=true;
    n._parkBounds={x1:px+3,x2:px+pw-3,z1:pz+3,z2:pz+pd-3};
    sc.add(n);
    sc._parkNpcs.push(n);
    if(sc===outdoorScene) outdoorScene._npcs.push(n);
  }
}

// Bird update (called from game loop when outdoors near park)
function updateBirds(dt) {
  if(!outdoorScene._birds) return;
  outdoorScene._birds.forEach(b=>{
    b._angle+=b._speed*dt;
    b._flapT+=dt;
    const cx=PARK.wx+PARK.ww/2, cz=PARK.wz+PARK.wd/2;
    b.position.x=cx+Math.cos(b._angle)*b._r;
    b.position.z=cz+Math.sin(b._angle)*b._r;
    b.position.y=b._alt+Math.sin(b._flapT*3)*0.4;
    b.rotation.y=-b._angle+Math.PI/2;
    // Flap wings
    const flapAng=Math.sin(b._flapT*8)*0.5;
    if(b.children[1]) b.children[1].rotation.z=flapAng;
    if(b.children[2]) b.children[2].rotation.z=-flapAng;
  });
}

function buildBus(sc) {
  const g = new THREE.Group();
  const busYellow = new THREE.MeshLambertMaterial({color:0xFFD100});
  const darkMat   = new THREE.MeshLambertMaterial({color:0x111111});
  const winMat    = new THREE.MeshLambertMaterial({color:0xb0d8ff,transparent:true,opacity:0.7});
  // Long body (7 units long, wider than a car)
  const body=new THREE.Mesh(new THREE.BoxGeometry(7,1.6,2.4),busYellow);
  body.position.y=0.8;body.castShadow=true;g.add(body);
  // Roof
  const roof=new THREE.Mesh(new THREE.BoxGeometry(7,0.25,2.3),busYellow);
  roof.position.y=1.73;g.add(roof);
  // Black bumper stripe along sides
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(7,0.25,2.42),darkMat);
  stripe.position.y=0.55;g.add(stripe);
  // Side windows (5 across)
  for(let i=-2;i<=2;i++){
    const w=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.06),winMat);
    w.position.set(i*1.1,1.2,1.21);g.add(w);
    const wb=w.clone();wb.position.z=-1.21;g.add(wb);
  }
  // Windshield (front = +X direction)
  const ws=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.65,1.9),winMat);
  ws.position.set(3.5,1.2,0);g.add(ws);
  // Stop sign arm (folded, at front)
  const stopMat=new THREE.MeshLambertMaterial({color:0xdd0000});
  const stop=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.6,0.6),stopMat);
  stop.position.set(3.2,1.0,1.3);g.add(stop);
  // Wheels
  [[2.2,-0.35,1.1],[2.2,-0.35,-1.1],[-2.2,-0.35,1.1],[-2.2,-0.35,-1.1]].forEach(([wx,wy,wz])=>{
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.3,8),darkMat);
    wheel.rotation.z=Math.PI/2;wheel.position.set(wx,wy,wz);g.add(wheel);
  });
  return g;
}

function buildPoliceCar(sc) {
  const g = buildCar(sc, 0x0d1b4a); // dark navy
  // Light bar housing
  const barMat=new THREE.MeshLambertMaterial({color:0x111111});
  const bar=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.2,0.55),barMat);
  bar.position.set(0,1.72,0);g.add(bar);
  // Red light
  const redMat=new THREE.MeshLambertMaterial({color:0xff1111,emissive:new THREE.Color(0xff1111),emissiveIntensity:1});
  const rL=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,8),redMat);
  rL.position.set(-0.5,1.88,0);g.add(rL);
  // Blue light
  const bluMat=new THREE.MeshLambertMaterial({color:0x1155ff,emissive:new THREE.Color(0x1155ff),emissiveIntensity:0.1});
  const bL=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,8),bluMat);
  bL.position.set(0.5,1.88,0);g.add(bL);
  // White door stripe
  const stripeMat=new THREE.MeshLambertMaterial({color:0xffffff});
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.22,2.02),stripeMat);
  stripe.position.set(0.1,0.72,0);g.add(stripe);
  g._pRedLight=rL;g._pBluLight=bL;
  return g;
}

function buildCar(sc, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6,0.9,2), new THREE.MeshLambertMaterial({color}));
  body.position.y = 0.45;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2,0.8,1.8), new THREE.MeshLambertMaterial({color:darkenColor(color,0.8)}));
  cabin.position.set(0.1,1.2,0);
  g.add(cabin);
  const winMat = new THREE.MeshLambertMaterial({color:0xb0d8ff,transparent:true,opacity:0.7});
  const win = new THREE.Mesh(new THREE.BoxGeometry(2,0.6,1.7),winMat);
  win.position.set(0.1,1.35,0);
  g.add(win);
  [[1.2,-0.3,0.9],[1.2,-0.3,-0.9],[-1.2,-0.3,0.9],[-1.2,-0.3,-0.9]].forEach(([wx,wy,wz])=>{
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.25,8),new THREE.MeshLambertMaterial({color:0x222}));
    wheel.rotation.z=Math.PI/2;
    wheel.position.set(wx,wy,wz);
    g.add(wheel);
  });
  return g;
}

function buildNPCMesh(sc, overrideColor) {
  const g = new THREE.Group();
  const colors = [0xe74c3c,0x3498db,0x2ecc71,0x9b59b6,0xf39c12,0x1abc9c];
  const c = overrideColor !== undefined ? overrideColor : colors[Math.floor(Math.random()*colors.length)];
  const beanMat = new THREE.MeshLambertMaterial({color:c});
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5,8,8), beanMat);
  body.scale.y = 1.4;
  body.position.y = 0.9;
  body.castShadow = true;
  g.add(body);
  const eyeMat = new THREE.MeshLambertMaterial({color:0xffffff});
  const pupilMat = new THREE.MeshLambertMaterial({color:0x111111});
  [-0.2,0.2].forEach(ex=>{
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13,6,6), eyeMat);
    eye.position.set(ex,1.15,0.44);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6), pupilMat);
    pupil.position.set(ex,1.15,0.55);
    g.add(pupil);
  });
  return g;
}

// -------------------------------------------------------------
//  PLAYER MESH
// -------------------------------------------------------------
function buildPlayerMesh() {
  playerGroup = new THREE.Group();
  const beanMat = new THREE.MeshLambertMaterial({color: G.beanColor});

  // Body (bean shape)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6,10,10), beanMat);
  body.scale.y = 1.5;
  body.position.y = 1.1;
  body.castShadow = true;
  playerGroup.add(body);

  // Eyes
  const eyeM = new THREE.MeshLambertMaterial({color:0xffffff});
  const pupM  = new THREE.MeshLambertMaterial({color:0x111111});
  [-0.22, 0.22].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14,8,8), eyeM);
    eye.position.set(ex, 1.32, 0.54);
    playerGroup.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8), pupM);
    pup.position.set(ex, 1.32, 0.64);
    playerGroup.add(pup);
  });

  // Arms
  const armM = new THREE.MeshLambertMaterial({color:darkenColor(G.beanColor,0.8)});
  [-0.8, 0.8].forEach(ax => {
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.2,6,6), armM);
    arm.scale.set(0.8,1.6,0.8);
    arm.position.set(ax, 0.9, 0);
    playerGroup.add(arm);
  });

  // Legs
  const legM = new THREE.MeshLambertMaterial({color:darkenColor(G.beanColor,0.7)});
  [-0.22, 0.22].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.18,6,6), legM);
    leg.scale.set(0.9,1.7,0.9);
    leg.position.set(lx, 0, 0);
    leg.castShadow = true;
    playerGroup.add(leg);
  });

  // Shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5,12),
    new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.2})
  );
  shadow.rotation.x = -Math.PI/2;
  shadow.position.y = 0.01;
  playerGroup.add(shadow);

  playerGroup.position.set(G.px, 0, G.pz);
  scene.add(playerGroup);
}

function updatePlayerMesh() {
  if(G.inCar && playerCarMesh) {
    playerGroup.visible = false;
    playerCarMesh.position.set(G.px, 0.4, G.pz);
    if(G.vx!==0||G.vz!==0) {
      // Car body is long in X, so face along movement X axis
      playerCarMesh.rotation.y = Math.atan2(-G.vz, G.vx);
    }
  } else {
    playerGroup.visible = true;
    playerGroup.position.set(G.px, 0, G.pz);
    if(G.vx!==0||G.vz!==0) {
      playerGroup.rotation.y = Math.atan2(G.vx, G.vz);
    }
  }
}

// -------------------------------------------------------------
//  INDOOR SCENES
// -------------------------------------------------------------
function buildPoliceScene() {
  const sc=baseRoom(24,20,0xdde8ee,0xaac0cc);
  sc.name='police'; sc._w=24; sc._d=20;
  // Front desks (3 officers at back)
  [5,12,19].forEach(x=>addFurniture(sc,'counter',x,2,0));
  // Waiting area benches
  const bMat=new THREE.MeshLambertMaterial({color:0x556677});
  [[4,14],[12,14],[20,14]].forEach(([bx,bz])=>{
    const bench=new THREE.Mesh(new THREE.BoxGeometry(3.5,0.3,0.9),bMat);
    bench.position.set(bx,0.45,bz);sc.add(bench);
  });
  // Holding cell bars (left side)
  const barMat=new THREE.MeshLambertMaterial({color:0x888888});
  for(let i=0;i<=5;i++){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,3,5),barMat);
    b.position.set(1.5+i*1.2,1.5,7);sc.add(b);
  }
  const hbar=new THREE.Mesh(new THREE.BoxGeometry(6,0.1,0.1),barMat);
  hbar.position.set(4.5,3,7);sc.add(hbar);
  // Sign
  addSign(sc,'🚔 Police Station',12,4.2,0.3);
  // Ceiling lights
  [[6,0,8],[18,0,8],[12,0,16]].forEach(([x,y,z])=>{
    const l=new THREE.PointLight(0xddeeff,1.3,12);l.position.set(x,4.5,z);sc.add(l);
  });
  sc._interactables=[
    {x:5, z:2, radius:2.5, label:'Speak to officer', action:()=>showDlg('🚔 Police','No current incidents. Stay out of trouble.',null,null)},
    {x:12,z:2, radius:2.5, label:'Speak to officer', action:()=>showDlg('🚔 Police','No current incidents. Stay out of trouble.',null,null)},
    {x:19,z:2, radius:2.5, label:'Speak to officer', action:()=>showDlg('🚔 Police','No current incidents. Stay out of trouble.',null,null)},
    {x:12,z:19,radius:2,   label:'Exit building',     action:()=>exitBuilding()},
  ];
  sc._playerStart={x:12,z:17};
  // Blue-uniformed police officer NPCs at desks
  [5,12,19].forEach(x=>{
    const n=buildNPCMesh(sc,0x1a237e);
    n.position.set(x,0,1.5);n.rotation.y=Math.PI;sc.add(n);
  });
  // Wandering visitors
  spawnIndoorNPCs(sc,4,[]);
  return sc;
}

function buildAllIndoorScenes() {
  indoorScenes.house    = buildHouseScene();
  indoorScenes.store    = buildStoreScene();
  indoorScenes.mchappy  = buildMcHappyScene();
  indoorScenes.uni      = buildUniScene();
  indoorScenes.casino   = buildCasinoScene();
  indoorScenes.hospital = buildHospitalScene();
  indoorScenes.airport  = buildAirportScene();
  indoorScenes.police   = buildPoliceScene();
}

// Spawn indoor wandering NPCs into a scene
function spawnIndoorNPCs(sc, count, stationaryPosts) {
  sc._indoorNpcs=[];
  const w=sc._w||20, d=sc._d||20;
  // Stationary cashier/counter NPCs
  if(stationaryPosts) stationaryPosts.forEach(([x,z])=>{
    const n=buildNPCMesh(sc);n.position.set(x,0,z);n.rotation.y=Math.PI;
    sc.add(n);sc._indoorNpcs.push({mesh:n,stationary:true});
  });
  // Wandering NPCs
  for(let i=0;i<count;i++){
    const n=buildNPCMesh(sc);
    n.position.set(2+Math.random()*(w-4),0,2+Math.random()*(d-6));
    const dir=Math.random()*Math.PI*2;
    sc._indoorNpcs.push({mesh:n,vx:Math.cos(dir)*1.5,vz:Math.sin(dir)*1.5,walkT:Math.random()*6,stationary:false});
    sc.add(n);
  }
}

function updateIndoorNPCs(dt) {
  if(!G.indoor) return;
  const sc=indoorScenes[G.indoor];
  if(!sc||!sc._indoorNpcs) return;
  const w=sc._w||20,d=sc._d||20;
  sc._indoorNpcs.forEach(obj=>{
    if(obj.stationary) return;
    const m=obj.mesh;
    obj.walkT+=dt;
    m.position.x+=obj.vx*dt;
    m.position.z+=obj.vz*dt;
    // Bounce off walls
    if(m.position.x<1||m.position.x>w-1) obj.vx*=-1;
    if(m.position.z<1||m.position.z>d-2) obj.vz*=-1;
    m.position.x=Math.max(1,Math.min(w-1,m.position.x));
    m.position.z=Math.max(1,Math.min(d-2,m.position.z));
    m.position.y=Math.abs(Math.sin(obj.walkT*3))*0.12;
    m.rotation.y=Math.atan2(obj.vx,obj.vz);
  });
}

function baseRoom(w, d, floorColor=0xE8DFD0, wallColor=0xD4C5B0) {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x1a1a2e);
  addLights(sc);

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshLambertMaterial({color:floorColor}));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(w/2,0,d/2);
  floor.receiveShadow = true;
  sc.add(floor);

  // Floor grid lines
  const lineMat = new THREE.MeshBasicMaterial({color:darkenColor(floorColor,0.85),transparent:true,opacity:0.4});
  for(let x=0;x<=w;x+=2){
    const l=new THREE.Mesh(new THREE.PlaneGeometry(0.06,d),lineMat);
    l.rotation.x=-Math.PI/2;l.position.set(x,0.01,d/2);sc.add(l);
  }
  for(let z=0;z<=d;z+=2){
    const l=new THREE.Mesh(new THREE.PlaneGeometry(w,0.06),lineMat);
    l.rotation.x=-Math.PI/2;l.position.set(w/2,0.01,z);sc.add(l);
  }

  // Walls
  const wallM = new THREE.MeshLambertMaterial({color:wallColor});
  const h=4;
  // Back
  const wBack=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.2),wallM);
  wBack.position.set(w/2,h/2,0);sc.add(wBack);
  // Left
  const wL=new THREE.Mesh(new THREE.BoxGeometry(0.2,h,d),wallM);
  wL.position.set(0,h/2,d/2);sc.add(wL);
  // Right
  const wR=new THREE.Mesh(new THREE.BoxGeometry(0.2,h,d),wallM);
  wR.position.set(w,h/2,d/2);sc.add(wR);
  // Front (partial, door gap)
  const wFl=new THREE.Mesh(new THREE.BoxGeometry(w/2-1.5,h,0.2),wallM);
  wFl.position.set(w/4-0.75,h/2,d);sc.add(wFl);
  const wFr=new THREE.Mesh(new THREE.BoxGeometry(w/2-1.5,h,0.2),wallM);
  wFr.position.set(w*3/4+0.75,h/2,d);sc.add(wFr);
  const wFt=new THREE.Mesh(new THREE.BoxGeometry(3,1,0.2),wallM);
  wFt.position.set(w/2,h-0.5,d);sc.add(wFt);

  // Ceiling
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshLambertMaterial({color:0xffffff}));
  ceil.rotation.x=Math.PI/2;ceil.position.set(w/2,h,d/2);sc.add(ceil);

  // Door frame
  const frameMat=new THREE.MeshLambertMaterial({color:0x5a3a1a});
  [[-1.5,0],[1.5,0]].forEach(([dx])=>{
    const f=new THREE.Mesh(new THREE.BoxGeometry(0.15,3,0.15),frameMat);
    f.position.set(w/2+dx,1.5,d+0.05);sc.add(f);
  });
  const top=new THREE.Mesh(new THREE.BoxGeometry(3.3,0.15,0.15),frameMat);
  top.position.set(w/2,3.05,d+0.05);sc.add(top);

  sc._w=w;sc._d=d;
  sc._interactables=[];
  return sc;
}

function addFurniture(sc, type, x, z, rot=0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;

  switch(type) {
    case 'bed': {
      const frame=new THREE.Mesh(new THREE.BoxGeometry(3,0.4,4.5),new THREE.MeshLambertMaterial({color:0x8B6914}));
      frame.position.y=0.2;g.add(frame);
      const mattress=new THREE.Mesh(new THREE.BoxGeometry(2.8,0.35,4.2),new THREE.MeshLambertMaterial({color:0xf0e8d0}));
      mattress.position.y=0.57;g.add(mattress);
      const pillow=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.2,0.8),new THREE.MeshLambertMaterial({color:0xffffff}));
      pillow.position.set(0,0.75,-1.5);g.add(pillow);
      const blanket=new THREE.Mesh(new THREE.BoxGeometry(2.8,0.15,2.5),new THREE.MeshLambertMaterial({color:0x4a90d9}));
      blanket.position.set(0,0.65,0.7);g.add(blanket);
      break;
    }
    case 'wardrobe': {
      const body=new THREE.Mesh(new THREE.BoxGeometry(2.5,4,0.8),new THREE.MeshLambertMaterial({color:0x7a5c2e}));
      body.position.y=2;g.add(body);
      const door1=new THREE.Mesh(new THREE.BoxGeometry(1.15,3.8,0.05),new THREE.MeshLambertMaterial({color:0x9a7a4e}));
      door1.position.set(-0.6,2,0.43);g.add(door1);
      const door2=door1.clone();door2.position.set(0.6,2,0.43);g.add(door2);
      const handle1=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshLambertMaterial({color:0xffd166}));
      handle1.position.set(-0.1,2,0.5);g.add(handle1);
      const handle2=handle1.clone();handle2.position.set(0.1,2,0.5);g.add(handle2);
      break;
    }
    case 'desk': {
      const top=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.1,1.2),new THREE.MeshLambertMaterial({color:0xc8a068}));
      top.position.y=1.1;g.add(top);
      [[1,0],[-1,0],[1,1.1],[-1,1.1]].forEach(([lx,lz])=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.1,0.1),new THREE.MeshLambertMaterial({color:0x9a7a4e}));
        leg.position.set(lx*1.1,0.55,lz*0.5);g.add(leg);
      });
      const laptop=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.05,0.8),new THREE.MeshLambertMaterial({color:0x333}));
      laptop.position.set(0,1.18,0);g.add(laptop);
      const screen=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.8,0.03),new THREE.MeshLambertMaterial({color:0x1a1a2e}));
      screen.position.set(0,1.55,-0.38);screen.rotation.x=0.3;g.add(screen);
      break;
    }
    case 'fridge': {
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,3.5,1.2),new THREE.MeshLambertMaterial({color:0xcccccc}));
      body.position.y=1.75;g.add(body);
      const door=new THREE.Mesh(new THREE.BoxGeometry(1.18,1.6,0.05),new THREE.MeshLambertMaterial({color:0xdddddd}));
      door.position.set(0,2.65,0.63);g.add(door);
      const door2=new THREE.Mesh(new THREE.BoxGeometry(1.18,1.7,0.05),new THREE.MeshLambertMaterial({color:0xdddddd}));
      door2.position.set(0,0.85,0.63);g.add(door2);
      const handle=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.4,0.12),new THREE.MeshLambertMaterial({color:0x888}));
      handle.position.set(0.5,2.65,0.7);g.add(handle);
      break;
    }
    case 'shelf': {
      for(let s=0;s<3;s++){
        const shelf=new THREE.Mesh(new THREE.BoxGeometry(3,0.1,0.8),new THREE.MeshLambertMaterial({color:0xc8a068}));
        shelf.position.set(0,0.8+s*1.1,0);g.add(shelf);
        // Products on shelf
        for(let p=0;p<5;p++){
          const prod=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.5,0.3),new THREE.MeshLambertMaterial({
            color:[0xe74c3c,0x27ae60,0xf39c12,0x3498db,0x9b59b6][p]
          }));
          prod.position.set(-1.2+p*0.6,1.15+s*1.1,0);g.add(prod);
        }
      }
      const back=new THREE.Mesh(new THREE.BoxGeometry(3,3.5,0.05),new THREE.MeshLambertMaterial({color:0xaaa090}));
      back.position.set(0,1.75,-0.38);g.add(back);
      break;
    }
    case 'counter': {
      const body=new THREE.Mesh(new THREE.BoxGeometry(4,1.1,1),new THREE.MeshLambertMaterial({color:0x7a5c2e}));
      body.position.y=0.55;g.add(body);
      const top=new THREE.Mesh(new THREE.BoxGeometry(4.1,0.1,1.1),new THREE.MeshLambertMaterial({color:0x999}));
      top.position.y=1.15;g.add(top);
      const register=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.4),new THREE.MeshLambertMaterial({color:0x222}));
      register.position.set(1.2,1.4,0);g.add(register);
      const screen2=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.35),new THREE.MeshBasicMaterial({color:0x44ff88}));
      screen2.position.set(1.2,1.5,0.21);g.add(screen2);
      break;
    }
    case 'table': {
      const top=new THREE.Mesh(new THREE.BoxGeometry(2,0.1,2),new THREE.MeshLambertMaterial({color:0x27ae60}));
      top.position.y=1.0;g.add(top);
      [[0.8,0.8],[-0.8,0.8],[0.8,-0.8],[-0.8,-0.8]].forEach(([lx,lz])=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.12,1,0.12),new THREE.MeshLambertMaterial({color:0x1a5c2e}));
        leg.position.set(lx,0.5,lz);g.add(leg);
      });
      // Green felt surface
      const felt=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.02,1.9),new THREE.MeshLambertMaterial({color:0x1a7a40}));
      felt.position.y=1.06;g.add(felt);
      break;
    }
    case 'slot-machine': {
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.2,0.8),new THREE.MeshLambertMaterial({color:0x8B0000}));
      body.position.y=1.1;g.add(body);
      const screen3=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.7,0.05),new THREE.MeshLambertMaterial({color:0x111}));
      screen3.position.set(0,1.6,0.43);g.add(screen3);
      // Screen glow
      const glow=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.65,0.02),new THREE.MeshBasicMaterial({color:0xffcc00}));
      glow.position.set(0,1.6,0.46);g.add(glow);
      const lever=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.8,0.08),new THREE.MeshLambertMaterial({color:0xcc2222}));
      lever.position.set(0.7,1.5,0);g.add(lever);
      const ball=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshLambertMaterial({color:0xff4444}));
      ball.position.set(0.7,1.95,0);g.add(ball);
      const base=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.15,0.9),new THREE.MeshLambertMaterial({color:0x600000}));
      base.position.y=0.07;g.add(base);
      break;
    }
    case 'roulette-table': {
      const body2=new THREE.Mesh(new THREE.BoxGeometry(3,0.9,5),new THREE.MeshLambertMaterial({color:0x2d6a1f}));
      body2.position.y=0.45;g.add(body2);
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.3,24),new THREE.MeshLambertMaterial({color:0x8B0000}));
      wheel.position.set(0,0.95,-1.5);g.add(wheel);
      const wheelRim=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.1,8,24),new THREE.MeshLambertMaterial({color:0xffd166}));
      wheelRim.rotation.x=Math.PI/2;wheelRim.position.set(0,1.1,-1.5);g.add(wheelRim);
      const bettingZone=new THREE.Mesh(new THREE.BoxGeometry(2.8,0.02,2.5),new THREE.MeshLambertMaterial({color:0x1a5c10}));
      bettingZone.position.set(0,0.92,0.8);g.add(bettingZone);
      break;
    }
    case 'craps-table': {
      const body3=new THREE.Mesh(new THREE.BoxGeometry(4,0.9,2.5),new THREE.MeshLambertMaterial({color:0x2d6a1f}));
      body3.position.y=0.45;g.add(body3);
      const wall1=new THREE.Mesh(new THREE.BoxGeometry(4,0.5,0.1),new THREE.MeshLambertMaterial({color:0x1a4a10}));
      wall1.position.set(0,1.15,1.2);g.add(wall1);
      const wall2=wall1.clone();wall2.position.set(0,1.15,-1.2);g.add(wall2);
      break;
    }
    case 'baccarat-table': {
      const body4=new THREE.Mesh(new THREE.BoxGeometry(4,0.9,2),new THREE.MeshLambertMaterial({color:0x2d6a1f}));
      body4.position.y=0.45;g.add(body4);
      break;
    }
    case 'desk-chair': {
      const seat=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.1,0.8),new THREE.MeshLambertMaterial({color:0x3a3aaa}));
      seat.position.y=0.55;g.add(seat);
      const back2=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.7,0.08),new THREE.MeshLambertMaterial({color:0x3a3aaa}));
      back2.position.set(0,0.95,-0.36);g.add(back2);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,6),new THREE.MeshLambertMaterial({color:0x888}));
      pole.position.y=0.25;g.add(pole);
      break;
    }
    case 'lecture-bench': {
      const top2=new THREE.Mesh(new THREE.BoxGeometry(4,0.08,0.8),new THREE.MeshLambertMaterial({color:0xc8a068}));
      top2.position.y=0.85;g.add(top2);
      const front=new THREE.Mesh(new THREE.BoxGeometry(4,0.7,0.06),new THREE.MeshLambertMaterial({color:0xa8804a}));
      front.position.set(0,0.5,0.37);g.add(front);
      break;
    }
    case 'hospital-bed': {
      const frame2=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.5,4.5),new THREE.MeshLambertMaterial({color:0xdddddd}));
      frame2.position.y=0.5;g.add(frame2);
      const mat2=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.2,4.2),new THREE.MeshLambertMaterial({color:0xffffff}));
      mat2.position.y=0.85;g.add(mat2);
      // Rails
      [[1.2,0],[-1.2,0]].forEach(([rx])=>{
        const rail=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.4,4.2),new THREE.MeshLambertMaterial({color:0xaaaaaa}));
        rail.position.set(rx,1.05,0);g.add(rail);
      });
      break;
    }
    case 'airport-seat': {
      const row=new THREE.Group();
      for(let s=0;s<4;s++){
        const seat2=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.1,0.8),new THREE.MeshLambertMaterial({color:0x2980b9}));
        seat2.position.set(s*0.9,0.5,0);row.add(seat2);
        const back3=new THREE.Mesh(new THREE.BoxGeometry(0.78,0.6,0.08),new THREE.MeshLambertMaterial({color:0x2980b9}));
        back3.position.set(s*0.9,0.85,-0.35);row.add(back3);
      }
      const frame3=new THREE.Mesh(new THREE.BoxGeometry(3.5,0.06,0.8),new THREE.MeshLambertMaterial({color:0x888}));
      frame3.position.y=0.45;row.add(frame3);
      g.add(row);
      break;
    }
    case 'plant': {
      const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.25,0.5,8),new THREE.MeshLambertMaterial({color:0xc0732a}));
      pot.position.y=0.25;g.add(pot);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.8,6),new THREE.MeshLambertMaterial({color:0x2d7a2d}));
      stem.position.y=0.9;g.add(stem);
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.45,8,8),new THREE.MeshLambertMaterial({color:0x3aac3a}));
      leaf.position.y=1.4;g.add(leaf);
      break;
    }
  }
  sc.add(g);
  return g;
}

// -- HOUSE INTERIOR --
function buildHouseScene() {
  const sc = baseRoom(14, 18, 0xE8DCC8, 0xD4C0A8);
  sc.name = 'house';

  // Bedroom area (left)
  addFurniture(sc,'bed',3,5,0);
  addFurniture(sc,'wardrobe',3.5,2.5,0);
  addFurniture(sc,'desk',9,4,0);
  addFurniture(sc,'desk-chair',9,5.5,0);
  addFurniture(sc,'plant',12,2,0);

  // Kitchen area (right)
  addFurniture(sc,'fridge',12,10,0);
  addFurniture(sc,'counter',8,13,Math.PI/2);
  addFurniture(sc,'plant',1,14,0);

  // Rug
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(5,4),new THREE.MeshLambertMaterial({color:0xaa4422}));
  rug.rotation.x=-Math.PI/2;rug.position.set(4,0.01,8);sc.add(rug);

  // Ceiling light
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));
  bulb.position.set(7,3.8,9);sc.add(bulb);
  const pLight=new THREE.PointLight(0xfff5e0,1.5,15);pLight.position.set(7,3.5,9);sc.add(pLight);

  sc._interactables = [
    {x:3,z:5,radius:2.5,label:'Sleep in bed',action:()=>doSleep()},
    {x:3.5,z:3,radius:2.2,label:'Open wardrobe',action:()=>openWardrobe()},
    {x:9,z:4,radius:2,label:'Check laptop',action:()=>checkLaptop()},
    {x:12,z:10,radius:2,label:'Open fridge',action:()=>openFridge()},
    {x:8,z:13,radius:2,label:'Kitchen counter',action:()=>kitchenCounter()},
    {x:7,z:17,radius:2,label:'Exit building',action:()=>exitBuilding()},
  ];
  sc._playerStart = {x:7,z:15};
  return sc;
}

// -- STORE INTERIOR --
function buildStoreScene() {
  const sc = baseRoom(16, 14, 0xF0E8D8, 0xDDD0C0);
  sc.name='store';

  addFurniture(sc,'shelf',4,5,0);
  addFurniture(sc,'shelf',9,5,0);
  addFurniture(sc,'shelf',4,9,0);
  addFurniture(sc,'shelf',9,9,0);
  addFurniture(sc,'counter',8,2,0);

  // Ceiling lights
  [[4,0.1,4],[12,0.1,4],[4,0.1,10],[12,0.1,10]].forEach(([x,y,z])=>{
    const l=new THREE.PointLight(0xffffff,1,8);l.position.set(x,3.5,z);sc.add(l);
  });

  sc._interactables = [
    {x:4,z:5,radius:2.5,label:'Browse shelves',action:()=>browseShelf()},
    {x:9,z:5,radius:2.5,label:'Browse shelves',action:()=>browseShelf()},
    {x:4,z:9,radius:2.5,label:'Browse shelves',action:()=>browseShelf()},
    {x:9,z:9,radius:2.5,label:'Browse shelves',action:()=>browseShelf()},
    {x:8,z:2,radius:2.5,label:'Go to checkout',action:()=>storeCheckout()},
    {x:8,z:12.5,radius:2,label:'Exit building',action:()=>exitBuilding()},
  ];
  sc._playerStart = {x:8,z:11};
  spawnIndoorNPCs(sc,4,[[8,1.5]]);
  return sc;
}

// -- MCHAPPY INTERIOR --
function buildMcHappyScene() {
  const sc = baseRoom(26, 20, 0xFFF5E0, 0xFFE0A0);
  sc.name='mchappy';

  // Counter at back centre
  addFurniture(sc,'counter',13,2,0);

  // Six dining tables spread across the bigger floor
  [[5,7],[13,7],[21,7],[5,14],[13,14],[21,14]].forEach(([x,z])=>{
    addFurniture(sc,'table',x,z,0);
  });

  // Menu board on back wall
  const menuCanvas=document.createElement('canvas');
  menuCanvas.width=512;menuCanvas.height=256;
  const mc=menuCanvas.getContext('2d');
  mc.fillStyle='#cc0000';mc.fillRect(0,0,512,256);
  mc.fillStyle='#FFD700';mc.font='bold 32px sans-serif';mc.textAlign='center';
  mc.fillText("McHappy's",256,50);
  mc.fillStyle='white';mc.font='20px sans-serif';
  ['🍔 Burger - $8','🍟 Fries - $3','🥤 Soda - $3','💧 Water - $2'].forEach((t,i)=>{
    mc.fillText(t,256,100+i*38);
  });
  const menuTex=new THREE.CanvasTexture(menuCanvas);
  const menuBoard=new THREE.Mesh(new THREE.PlaneGeometry(8,3.5),new THREE.MeshBasicMaterial({map:menuTex}));
  menuBoard.position.set(13,2.5,0.2);sc.add(menuBoard);

  // Ceiling lights (warm) — 6 spread across bigger room
  [[5,0,6],[13,0,6],[21,0,6],[5,0,14],[13,0,14],[21,0,14]].forEach(([x,y,z])=>{
    const l=new THREE.PointLight(0xfff5e0,1.2,10);l.position.set(x,3.5,z);sc.add(l);
  });

  // Mop leaning in corner
  const mopGrp=new THREE.Group();
  const mopStick=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,8),new THREE.MeshLambertMaterial({color:0x9a7a4e}));
  mopStick.position.y=1.1;mopGrp.add(mopStick);
  const mopHead=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.15,0.18),new THREE.MeshLambertMaterial({color:0xdddddd}));
  mopHead.position.y=0.07;mopGrp.add(mopHead);
  mopGrp.position.set(2,0,2.5);mopGrp.rotation.y=0.4;
  sc.add(mopGrp);
  sc._mopMesh=mopGrp;

  // Dirt spots spread across the bigger floor
  const dirtMat=new THREE.MeshLambertMaterial({color:0x7a6040,transparent:true,opacity:0.55});
  sc._dirtSpots=[];
  [[8,8],[18,11],[10,16],[20,7]].forEach(([dx,dz])=>{
    const d=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),dirtMat.clone());
    d.rotation.x=-Math.PI/2;d.position.set(dx,0.015,dz);
    sc.add(d);sc._dirtSpots.push(d);
  });

  // Mop progress label (canvas texture sign)
  const mpC=document.createElement('canvas');mpC.width=256;mpC.height=48;
  sc._mopProgressCanvas=mpC;
  sc._mopProgressMesh=null; // created lazily

  sc._interactables=[
    {x:13,z:2,  radius:2.5, label:'Talk to cashier', action:()=>mcCashierMenu()},
    {x:2, z:2.5,radius:1.8, label:'Pick up mop',     action:()=>pickupMop()},
    {x:13,z:10, radius:8,   label:'Mop the floor',   action:()=>doMopWork()},
    {x:13,z:19, radius:2,   label:'Exit building',   action:()=>exitBuilding()},
  ];
  sc._playerStart={x:13,z:17};
  spawnIndoorNPCs(sc,8,[[13,1.5]]);
  return sc;
}

// -- UNIVERSITY INTERIOR --
function buildUniScene() {
  const sc=baseRoom(22,18,0xE8E8F8,0xC8C8E8);
  sc.name='uni';

  // Lecture benches
  for(let row=0;row<4;row++){
    addFurniture(sc,'lecture-bench',11,3+row*3.2,0);
  }
  // Podium
  const podium=new THREE.Mesh(new THREE.BoxGeometry(2,1.2,1),new THREE.MeshLambertMaterial({color:0x7a5c2e}));
  podium.position.set(11,0.6,1);sc.add(podium);
  const board=new THREE.Mesh(new THREE.BoxGeometry(5,2.5,0.1),new THREE.MeshLambertMaterial({color:0x1a3a1a}));
  board.position.set(11,2.2,0.2);sc.add(board);
  const chalk=new THREE.Mesh(new THREE.BoxGeometry(4,1.8,0.05),new THREE.MeshLambertMaterial({color:0x2a4a2a}));
  chalk.position.set(11,2.2,0.16);sc.add(chalk);

  // White writing on board
  const boardCanvas=document.createElement('canvas');
  boardCanvas.width=400;boardCanvas.height=200;
  const bc=boardCanvas.getContext('2d');
  bc.fillStyle='#1a3a1a';bc.fillRect(0,0,400,200);
  bc.fillStyle='rgba(255,255,255,0.7)';bc.font='bold 22px sans-serif';bc.textAlign='left';
  bc.fillText('Final Exam: Day 4',20,50);
  bc.font='16px sans-serif';
  ['Attend class: +25%','Study session: +5%','Max chance: 95%'].forEach((t,i)=>bc.fillText(t,20,90+i*30));
  const boardTex=new THREE.CanvasTexture(boardCanvas);
  const boardWrite=new THREE.Mesh(new THREE.PlaneGeometry(4.8,2.4),new THREE.MeshBasicMaterial({map:boardTex}));
  boardWrite.position.set(11,2.2,0.22);sc.add(boardWrite);

  // Plants and lights
  [[2,2],[20,2],[2,16],[20,16]].forEach(([x,z])=>addFurniture(sc,'plant',x,z,0));
  [[7,0,9],[15,0,9]].forEach(([x,y,z])=>{const l=new THREE.PointLight(0xffffff,1,10);l.position.set(x,3.5,z);sc.add(l);});

  // Desk for studying
  addFurniture(sc,'desk',6,14,0);
  addFurniture(sc,'desk',16,14,0);

  sc._interactables=[
    {x:11,z:1,radius:3,label:'Attend class',action:()=>attendClass()},
    {x:6,z:14,radius:2.5,label:'Study session',action:()=>doStudy()},
    {x:16,z:14,radius:2.5,label:'Study session',action:()=>doStudy()},
    {x:11,z:16.5,radius:2,label:'Exit building',action:()=>exitBuilding()},
  ];
  sc._playerStart={x:11,z:16};
  spawnIndoorNPCs(sc,8,[[11,0.8]]);
  return sc;
}

// -- CASINO INTERIOR --
function buildCasinoScene() {
  const sc=baseRoom(28,24,0x2a1a0a,0x1a0a00);
  sc.name='casino';
  sc.background=new THREE.Color(0x1a0800);

  // Fancy floor
  const tiles=new THREE.Mesh(new THREE.PlaneGeometry(28,24),new THREE.MeshLambertMaterial({color:0x3a1a08}));
  tiles.rotation.x=-Math.PI/2;tiles.position.set(14,0.005,12);sc.add(tiles);

  // Casino tables
  addFurniture(sc,'table',5,5,0);          // Blackjack
  addFurniture(sc,'slot-machine',13,5,0);   // Slots
  addFurniture(sc,'slot-machine',15,5,0);
  addFurniture(sc,'slot-machine',17,5,0);
  addFurniture(sc,'roulette-table',22,6,0); // Roulette
  addFurniture(sc,'craps-table',5,15,0);    // Craps
  addFurniture(sc,'baccarat-table',20,15,0);// Baccarat

  // Bar counter at back
  addFurniture(sc,'counter',14,2,0);

  // Glowing ceiling lights (casino vibe)
  [[5,0,5],[13,0,5],[22,0,6],[14,0,12],[5,0,15],[22,0,15]].forEach(([x,y,z])=>{
    const colors=[0xFFAA00,0xFF4400,0xFFFF00,0xAA00FF,0xFF0088];
    const l=new THREE.PointLight(colors[Math.floor(Math.random()*colors.length)],1.5,8);
    l.position.set(x,3.5,z);sc.add(l);
  });

  // Signs for each game
  [{t:'🃏 BLACKJACK',x:5,y:3.8,z:2.8},{t:'🎰 SLOTS',x:15,y:3.8,z:2.8},
   {t:'🎡 ROULETTE',x:22,y:3.8,z:2.8},{t:'🎲 CRAPS',x:5,y:3.8,z:12},
   {t:'🃠 BACCARAT',x:20,y:3.8,z:12}].forEach(({t,x,y,z})=>addSign(sc,t,x,y,z));

  // Ambient red glow
  const ambient=sc.children.find(c=>c instanceof THREE.AmbientLight);
  if(ambient){ambient.color.set(0x3a1500);ambient.intensity=0.4;}

  sc._interactables=[
    {x:5,z:5,radius:2.5,label:'Play Blackjack',action:()=>openCasinoGame('blackjack')},
    {x:15,z:5,radius:3,label:'Play Slots',action:()=>openCasinoGame('slots')},
    {x:22,z:6,radius:3,label:'Play Roulette',action:()=>openCasinoGame('roulette')},
    {x:5,z:15,radius:3,label:'Play Craps',action:()=>openCasinoGame('craps')},
    {x:20,z:15,radius:3,label:'Play Baccarat',action:()=>openCasinoGame('baccarat')},
    {x:14,z:22.5,radius:2,label:'Exit building',action:()=>exitBuilding()},
  ];
  sc._playerStart={x:14,z:21};
  spawnIndoorNPCs(sc,10,[[14,1.5]]);
  return sc;
}

// -- HOSPITAL INTERIOR --
function buildHospitalScene() {
  const sc=baseRoom(16,14,0xF0F8F0,0xE0EEEE);
  sc.name='hospital';

  addFurniture(sc,'hospital-bed',4,6,0);
  addFurniture(sc,'hospital-bed',12,6,0);
  addFurniture(sc,'counter',8,2,0);
  addFurniture(sc,'plant',2,12,0);
  addFurniture(sc,'plant',14,12,0);

  const l=new THREE.PointLight(0xffffff,1.5,20);l.position.set(8,3.5,7);sc.add(l);

  sc._interactables=[
    {x:8,z:2,radius:2.5,label:'Talk to nurse',action:()=>talkNurse()},
    {x:8,z:12.5,radius:2,label:'Exit building',action:()=>exitBuilding()},
  ];
  sc._playerStart={x:8,z:11};
  spawnIndoorNPCs(sc,2,[[8,1.5]]);
  return sc;
}

// -- AIRPORT INTERIOR --
function buildAirportScene() {
  const sc=baseRoom(38,28,0xF0F0F8,0xE0E8F0);
  sc.name='airport';
  sc._w=38; sc._d=28;

  // Check-in counters (back wall)
  [7,19,31].forEach(x=>addFurniture(sc,'counter',x,2,0));

  // Security checkpoint barrier
  const barMat=new THREE.MeshLambertMaterial({color:0x90a4ae});
  const bar=new THREE.Mesh(new THREE.BoxGeometry(28,1.2,0.4),barMat);
  bar.position.set(19,0.6,10);sc.add(bar);

  // Gate waiting areas
  [5,13,25,33].forEach(x=>{
    addFurniture(sc,'airport-seat',x,15,0);
    addFurniture(sc,'airport-seat',x,19,0);
  });

  // Gate signs
  ['A1','A2','A3','A4'].forEach((g,i)=>{
    const gc=document.createElement('canvas');gc.width=128;gc.height=64;
    const gx=gc.getContext('2d');
    gx.fillStyle='#1565c0';gx.fillRect(0,0,128,64);
    gx.fillStyle='#fff';gx.font='bold 28px monospace';gx.textAlign='center';gx.textBaseline='middle';
    gx.fillText(g,64,32);
    const gsign=new THREE.Mesh(new THREE.PlaneGeometry(2,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(gc)}));
    gsign.position.set(5+i*9,3.5,13.8);sc.add(gsign);
  });

  // Departure board (back wall)
  const boardC=document.createElement('canvas');boardC.width=640;boardC.height=320;
  const bc=boardC.getContext('2d');
  bc.fillStyle='#05051e';bc.fillRect(0,0,640,320);
  bc.fillStyle='#FFD166';bc.font='bold 30px monospace';bc.textAlign='center';
  bc.fillText('✈  DEPARTURES',320,50);
  bc.fillStyle='rgba(255,255,255,0.15)';bc.fillRect(20,68,600,2);
  [['FH001','HOME','ON TIME'],['FH002','CITY','DELAYED'],['FH003','AWAY','BOARDING'],['FH004','NORTH','ON TIME']].forEach(([f,d,s],i)=>{
    bc.fillStyle=s==='BOARDING'?'#06d6a0':s==='DELAYED'?'#ef476f':'#ccc';
    bc.font='18px monospace';
    bc.fillText(`${f.padEnd(7)} ${d.padEnd(9)} ${s}`,320,100+i*52);
  });
  const bTex=new THREE.CanvasTexture(boardC);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(14,7),new THREE.MeshBasicMaterial({map:bTex,transparent:true}));
  board.position.set(19,4.5,0.3);sc.add(board);

  // Ceiling lights
  [[7,0,6],[19,0,6],[31,0,6],[7,0,17],[19,0,17],[31,0,17],[7,0,25],[19,0,25],[31,0,25]].forEach(([x,y,z])=>{
    const l=new THREE.PointLight(0xffffff,1,14);l.position.set(x,4.5,z);sc.add(l);
  });

  sc._interactables=[
    {x:7, z:2,  radius:2.5, label:'Check-in ($4000)',  action:()=>buyTicket()},
    {x:19,z:2,  radius:2.5, label:'Check-in ($4000)',  action:()=>buyTicket()},
    {x:31,z:2,  radius:2.5, label:'Check-in ($4000)',  action:()=>buyTicket()},
    {x:19,z:16, radius:5,   label:'Wait at gate',       action:()=>waitForFlight()},
    {x:19,z:27, radius:2,   label:'Exit building',      action:()=>exitBuilding()},
  ];
  sc._playerStart={x:19,z:24};
  spawnIndoorNPCs(sc,12,[[7,1.5],[19,1.5],[31,1.5]]);
  return sc;
}

// -------------------------------------------------------------
//  SCENE SWITCHING
// -------------------------------------------------------------
function enterBuilding(buildingId) {
  if(G.inCar){toast('Park your car first (E to exit car)','bad');return;}
  if(buildingId==='mchappy'){
    const h=Math.floor((G.gameTime/HOUR_SEC)%24);
    if(h<6){toast("McHappy's is closed! Open 6am - midnight",'bad');return;}
  }
  G.indoor = buildingId;
  currentIndoorScene = indoorScenes[buildingId];
  if(!currentIndoorScene) { G.indoor=null; return; }
  scene = currentIndoorScene;
  const start = currentIndoorScene._playerStart || {x:5,z:10};
  G.px = start.x; G.pz = start.z;
  scene.add(playerGroup);
  playerGroup.position.set(G.px,0,G.pz);
  positionCamera();
}

function exitBuilding() {
  if(!G.indoor) return;
  const b = BUILDINGS.find(b=>b.id===G.indoor);
  G.indoor = null;
  currentIndoorScene = null;
  scene = outdoorScene;
  if(b) { G.px=b.wx+b.ww/2+1; G.pz=b.wz+b.wd+3; }
  scene.add(playerGroup);
  playerGroup.position.set(G.px,0,G.pz);
  positionCamera();
}

// -------------------------------------------------------------
//  CAMERA
// -------------------------------------------------------------
function positionCamera() {
  camera.position.set(G.px, CAM_HEIGHT, G.pz + 18);
  camera.lookAt(G.px, 0, G.pz);
}

function updateCamera(dt) {
  // Smooth follow
  G.camTarget.x += (G.px - G.camTarget.x) * 8 * dt;
  G.camTarget.z += (G.pz - G.camTarget.z) * 8 * dt;
  camera.position.set(G.camTarget.x, CAM_HEIGHT, G.camTarget.z + 18);
  camera.lookAt(G.camTarget.x, 0, G.camTarget.z);
}

// -------------------------------------------------------------
//  MOVEMENT & INTERACTION
// -------------------------------------------------------------
function updateMovement(dt) {
  if(G.dlgOpen || G.panelOpen || G.gameOver) return;
  // Stun tick
  if(G.stunned){
    G.stunTimer-=dt;
    if(G.stunTimer<=0){G.stunned=false;document.getElementById('dizzy-overlay').style.display='none';}
    return; // can't move while stunned
  }
  if(G.hitCooldown>0) G.hitCooldown-=dt;

  let dx=0,dz=0;
  if(G.keys.up)    dz=-1;
  if(G.keys.down)  dz= 1;
  if(G.keys.left)  dx=-1;
  if(G.keys.right) dx= 1;
  if(dx&&dz){dx*=0.707;dz*=0.707;}

  G.vx=dx; G.vz=dz;

  if(dx||dz) {
    const spd = (G.inCar ? 20 : PLAYER_SPEED)*dt;
    const nx=G.px+dx*spd, nz=G.pz+dz*spd;

    if(G.indoor) {
      const w=currentIndoorScene._w||20;
      const d=currentIndoorScene._d||20;
      if(nx>1&&nx<w-1) G.px=nx;
      if(nz>0.5&&nz<d+2.5) G.pz=nz;
      // Exit through door
      if(G.pz>d+0.5&&G.px>w/2-2.5&&G.px<w/2+2.5) exitBuilding();
    } else {
      G.px=Math.max(0,Math.min(MAP_W*TILE,nx));
      G.pz=Math.max(0,Math.min(MAP_H*TILE,nz));
    }
    updatePlayerMesh();
  }

  // Near building detection
  checkNearBuilding();
}

function checkNearBuilding() {
  if(G.indoor) {
    // Check near interactables
    const sc=currentIndoorScene;
    if(!sc||!sc._interactables) {G.nearBuilding=null;updateInteractPrompt();return;}
    let nearest=null,minD=3;
    sc._interactables.forEach(obj=>{
      const d=Math.hypot(G.px-obj.x,G.pz-obj.z);
      if(d<obj.radius&&d<minD){minD=d;nearest=obj;}
    });
    G.nearBuilding=nearest;
    updateInteractPrompt(nearest?nearest.label:null);
    return;
  }
  // In car: only show exit prompt
  if(G.inCar) {
    G.nearBuilding={isPlayerCar:true,isExitCar:true};
    updateInteractPrompt('Exit car');
    return;
  }
  // Check near player car
  if(playerCarMesh) {
    const d=Math.hypot(G.px-playerCarMesh.position.x,G.pz-playerCarMesh.position.z);
    if(d<3){G.nearBuilding={isPlayerCar:true};updateInteractPrompt('Enter your car');return;}
  }
  let nearest=null,minD=6;
  BUILDINGS.filter(b=>b.indoor).forEach(b=>{
    const cx=b.wx+b.ww/2, cz=b.wz+b.wd+1.5;
    const d=Math.hypot(G.px-cx,G.pz-cz);
    if(d<minD){minD=d;nearest=b;}
  });
  G.nearBuilding=nearest;
  updateInteractPrompt(nearest?`Enter ${nearest.label}`:null);
}

function updateInteractPrompt(text) {
  const el=document.getElementById('interact-prompt');
  if(text){el.style.display='block';el.textContent=`[E] ${text}`;}
  else el.style.display='none';
}

function doInteract() {
  if(G.gameOver)return;
  if(G.dlgOpen){advDialog();return;}
  if(G.panelOpen)return;
  if(!G.nearBuilding){return;}

  if(G.indoor) {
    if(G.nearBuilding.action) G.nearBuilding.action();
  } else if(G.nearBuilding.isPlayerCar) {
    if(G.inCar) {
      G.inCar=false;G.carX=G.px;G.carZ=G.pz;G.px+=2;
      updatePlayerMesh();toast('Car parked','info');
    } else {
      G.inCar=true;G.px=playerCarMesh.position.x;G.pz=playerCarMesh.position.z;
      updatePlayerMesh();toast('In car - move faster!','info');
    }
  } else {
    enterBuilding(G.nearBuilding.id);
  }
}

// -------------------------------------------------------------
//  CRIME & POLICE SYSTEM
// -------------------------------------------------------------

function buildPoliceOfficerNPC() {
  const g = buildNPCMesh(null, 0x0d1b6e); // dark navy uniform
  // Badge (gold star on chest)
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.1,6),
    new THREE.MeshBasicMaterial({color:0xFFD700,side:THREE.DoubleSide}));
  badge.position.set(0,1.0,0.52); g.add(badge);
  // Flat-top officer hat
  const hatMat = new THREE.MeshLambertMaterial({color:0x050e2a});
  const hat = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.28,0.62),hatMat);
  hat.position.set(0,1.56,0); g.add(hat);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.95,0.07,0.78),hatMat);
  brim.position.set(0,1.41,0); g.add(brim);
  return g;
}

function spawnWanderingOfficers() {
  // 3 police officers that patrol the sidewalk near the police station (col1 road z=136)
  const swZ = 34*TILE + TILE*1.6; // south sidewalk of road row 34 (z=136)
  for(let i=0;i<3;i++){
    const o=buildPoliceOfficerNPC();
    const startX = 82 + i*10; // spread along the block
    o.position.set(startX, 0, swZ);
    o._dir = i%2===0 ? 1 : -1;
    o._speed = 1.4 + Math.random()*0.8;
    o._walkT = Math.random()*6;
    o._swZ = swZ; // patrol along this z (horizontal walker)
    o.rotation.y = o._dir>0 ? Math.PI/2 : -Math.PI/2;
    outdoorScene._npcs.push(o);
    outdoorScene.add(o);
  }
}

// -------------------------------------------------------------
//  PARENTS PHONE CALL
// -------------------------------------------------------------
function triggerParentCall() {
  if(G.dlgOpen||G.panelOpen) return;
  const topics=[
    {q:'Mom: "How are your studies going, sweetie?"',opts:[
      {t:'Really well! Learning so much.',fn:()=>{G.studyC=Math.max(0,G.studyC-1);toast('Mom: "We\'re so proud of you! ❤️"','good');}},
      {t:'I\'m passing everything so far.',fn:()=>toast('Mom: "Keep it up! We believe in you."','good')},
      {t:'I\'ve barely been attending...',fn:()=>toast('Mom: "Oh no, please get back on track."','bad')},
      {t:'School is overrated honestly.',fn:()=>{G.money=Math.max(0,G.money-300);toast('Mom: "Then we\'re cutting your allowance. -$300"','bad');}},
    ]},
    {q:'Mom: "Are you eating and taking care of yourself?"',opts:[
      {t:'Eating great and staying healthy!',fn:()=>{G.hunger=Math.min(100,G.hunger+20);G.thirst=Math.min(100,G.thirst+10);toast('Mom: "That\'s our responsible child! ❤️"','good');}},
      {t:'Managing okay, keeping busy.',fn:()=>toast('Mom: "So glad! We miss you."','good')},
      {t:'Honestly a bit run-down.',fn:()=>toast('Mom: "Please rest and eat properly, dear."','bad')},
      {t:'I\'ve been partying too much.',fn:()=>{G.hunger=Math.max(0,G.hunger-20);toast('Mom: "This is very concerning..." ','bad');}},
    ]},
    {q:'Dad: "How\'s the money situation? Need anything?"',opts:[
      {t:'All good! Budgeting carefully.',fn:()=>{G.money+=200;toast('Dad: "Great! Here\'s a little extra. +$200"','good');}},
      {t:'Tight but I\'m managing.',fn:()=>{G.money+=100;toast('Dad: "Here\'s $100 just in case."','good');}},
      {t:'I spent it all pretty fast...',fn:()=>toast('Dad: "You need to be more responsible."','bad')},
      {t:'Been gambling at the casino.',fn:()=>{G.money-=200;toast('Dad: "Absolutely not. You\'re losing our support. -$200"','bad');}},
    ]},
    {q:'Mom: "How\'s your social life? Made any friends?"',opts:[
      {t:'Yes! Met some great people.',fn:()=>toast('Mom: "Oh how wonderful! We\'re so happy for you! ❤️"','good')},
      {t:'Getting out and exploring the city.',fn:()=>toast('Mom: "That\'s the spirit!"','good')},
      {t:'Pretty lonely if I\'m honest.',fn:()=>toast('Mom: "Aw, try joining something. We love you."','bad')},
      {t:'I never leave my room.',fn:()=>{G.thirst=Math.max(0,G.thirst-15);toast('Mom: "Please go outside. This worries us."','bad');}},
    ]},
  ];
  const topic=topics[Math.floor(Math.random()*topics.length)];
  showDlg('📞 Parents Calling',topic.q,topic.opts,null);
}

// -------------------------------------------------------------
//  NPC & CAR UPDATE
// -------------------------------------------------------------
function updateNPCs(dt) {
  if(!outdoorScene._cars) return;
  const RZS=[56,136,216,296]; // horizontal road z-centres
  const RXS=[56,136,216,296]; // vertical road x-centres
  const LANE=0.85;

  // Toggle school bus by time of day
  if(outdoorScene._schoolBus) {
    const hr=(G.gameTime/HOUR_SEC)%24;
    outdoorScene._schoolBus.visible=(hr>=6&&hr<20);
  }


  // Flash police car lights
  if(outdoorScene._policeCars) {
    const flash=Math.floor(Date.now()/280)%2;
    outdoorScene._policeCars.forEach(pc=>{
      if(pc._pRedLight) pc._pRedLight.material.emissiveIntensity=flash===0?1.6:0.1;
      if(pc._pBluLight) pc._pBluLight.material.emissiveIntensity=flash===1?1.6:0.1;
    });
  }

  outdoorScene._cars.forEach(car=>{
    if(!car._routing) return;
    if(car._isBus&&!car.visible) return;

    // Smooth rotation
    let rd=car._targetRot-car.rotation.y;
    while(rd>Math.PI)rd-=Math.PI*2; while(rd<-Math.PI)rd+=Math.PI*2;
    if(Math.abs(rd)>0.02) car.rotation.y+=Math.sign(rd)*Math.min(Math.abs(rd),7*dt);
    else car.rotation.y=car._targetRot;

    if(car._intCooldown>0) car._intCooldown-=dt;
    const step=car._dir*car._speed*dt;

    if(car._axis==='x') {
      car.position.x+=step;
      car.position.z=car._roadCZ+(car._dir>0?-LANE:LANE);
      // Intersection turn chance
      if(car._intCooldown<=0) {
        for(const rx of RXS) {
          if(Math.abs(car.position.x-rx)<Math.abs(step)+1.2){
            car._intCooldown=2.5;
            if(Math.random()<0.38){
              car.position.x=rx;
              const nd=Math.random()<0.5?1:-1;
              car._axis='z'; car._roadCX=rx; car._dir=nd;
              car._targetRot=nd>0?-Math.PI/2:Math.PI/2;
              car._intCooldown=3;
            }
            break;
          }
        }
      }
      // Map edges — U-turn
      if(car.position.x>MAP_W*TILE-1){car.position.x=MAP_W*TILE-1;car._dir=-1;car._targetRot=Math.PI;car._intCooldown=2;}
      else if(car.position.x<1){car.position.x=1;car._dir=1;car._targetRot=0;car._intCooldown=2;}

    } else {
      car.position.z+=step;
      car.position.x=car._roadCX+(car._dir>0?LANE:-LANE);
      if(car._intCooldown<=0) {
        for(const rz of RZS) {
          if(Math.abs(car.position.z-rz)<Math.abs(step)+1.2){
            car._intCooldown=2.5;
            if(Math.random()<0.38){
              car.position.z=rz;
              const nd=Math.random()<0.5?1:-1;
              car._axis='x'; car._roadCZ=rz; car._dir=nd;
              car._targetRot=nd>0?0:Math.PI;
              car._intCooldown=3;
            }
            break;
          }
        }
      }
      if(car.position.z>MAP_H*TILE-1){car.position.z=MAP_H*TILE-1;car._dir=-1;car._targetRot=Math.PI/2;car._intCooldown=2;}
      else if(car.position.z<1){car.position.z=1;car._dir=1;car._targetRot=-Math.PI/2;car._intCooldown=2;}
    }
  });
  outdoorScene._npcs.forEach(npc=>{
    // Stun countdown
    if(npc._stunned) {
      npc._stunTimer-=dt;
      if(npc._stunTimer<=0) {
        npc._stunned=false;
        if(npc._dizzyMesh){npc.remove(npc._dizzyMesh);npc._dizzyMesh=null;}
      } else {
        if(npc._dizzyMesh) npc._dizzyMesh.rotation.z+=dt*6;
        return; // don't walk while stunned
      }
    }
    npc._walkT+=dt;
    if(npc._isParkNpc){
      const b=npc._parkBounds;
      npc.position.x+=npc._pvx*dt;
      npc.position.z+=npc._pvz*dt;
      if(npc.position.x<b.x1||npc.position.x>b.x2) npc._pvx*=-1;
      if(npc.position.z<b.z1||npc.position.z>b.z2) npc._pvz*=-1;
      npc.rotation.y=Math.atan2(npc._pvx,npc._pvz);
      npc.position.y=Math.abs(Math.sin(npc._walkT*4))*0.15;
      return;
    }
    if(npc._swX!==undefined){
      // Vertical lane walker (moves along Z)
      npc.position.z+=npc._dir*npc._speed*dt;
      if(npc.position.z>MAP_H*TILE||npc.position.z<0) npc._dir*=-1;
      npc.position.x=npc._swX;
      npc.rotation.y=npc._dir>0?0:Math.PI; // +z=south→0, -z=north→PI
    } else {
      // Horizontal lane walker (moves along X)
      npc.position.x+=npc._dir*npc._speed*dt;
      if(npc.position.x>MAP_W*TILE||npc.position.x<0) npc._dir*=-1;
      if(npc._swZ!==undefined) npc.position.z=npc._swZ;
      npc.rotation.y=npc._dir>0?Math.PI/2:-Math.PI/2; // +x=east→PI/2, -x=west→-PI/2
    }
    npc.position.y=Math.abs(Math.sin(npc._walkT*4))*0.15;
  });

  // Player car → NPC collision
  if(G.inCar && !G.indoor && playerCarMesh) {
    const carX=playerCarMesh.position.x, carZ=playerCarMesh.position.z;
    outdoorScene._npcs.forEach(npc=>{
      if(npc._stunned) return;
      const dx=npc.position.x-carX, dz=npc.position.z-carZ;
      if(Math.abs(dx)<2.0&&Math.abs(dz)<2.0) {
        npc._stunned=true; npc._stunTimer=3;
        npc.position.x+=dx*2; npc.position.z+=dz*2;
        // Spinning dizzy torus above head
        const dizzy=new THREE.Mesh(
          new THREE.TorusGeometry(0.3,0.07,6,14),
          new THREE.MeshBasicMaterial({color:0xffdd00})
        );
        dizzy.position.y=2.6; dizzy.rotation.x=Math.PI/2;
        npc.add(dizzy); npc._dizzyMesh=dizzy;
        toast('You hit a pedestrian! 😬','bad');
      }
    });
  }

  // Car-player collision (only when on foot, not already stunned, not in car)
  if(!G.inCar && !G.stunned && !G.indoor && G.hitCooldown<=0) {
    outdoorScene._cars.forEach(car=>{
      const dx=G.px-car.position.x, dz=G.pz-car.position.z;
      if(Math.abs(dx)<2.2&&Math.abs(dz)<1.4) {
        G.stunned=true; G.stunTimer=2.5; G.hitCooldown=5;
        // Knock player back
        G.px+=dx*1.5; G.pz+=dz*1.5;
        updatePlayerMesh();
        toast('Hit by a car! 😵','bad');
        const dz2=document.getElementById('dizzy-overlay');
        dz2.style.display='block';
        dz2.style.animation='none'; void dz2.offsetWidth;
        dz2.style.animation='dizzySpinPop .4s ease-out';
      }
    });
  }
}

// -------------------------------------------------------------
//  TIME & STATS
// -------------------------------------------------------------
function updateTime(dt) {
  if(G.gameOver)return;
  G.gameTime+=dt;
  const dayLen=HOUR_SEC*24;
  if(G.gameTime>=dayLen){
    G.gameTime-=dayLen;G.day++;
    toast(`Day ${G.day} begins`,'info');
    if(G.hasJob&&G.lastWorkDay<G.day-1&&G.lastWorkDay>=0){
      G.hasJob=false;toast('Fired from McHappy\'s  -  missed a shift','bad');
    }
    if(G.day===G.examDay) setTimeout(()=>toast('EXAM DAY! Go to University','gold'),500);
    // Always pick new weather each day
    G.weather=WEATHERS[Math.floor(Math.random()*WEATHERS.length)];
    document.getElementById('h-weather').textContent=WEATHER_ICONS[G.weather]||'☀️';
    applyWeatherVisuals(G.weather);
    toast(`Weather: ${G.weather} ${WEATHER_ICONS[G.weather]}`,'info');
    // Schedule random parent call for this day (10am–9pm)
    G.parentCallHour = 10 + Math.floor(Math.random()*11);
  }

  const h=Math.floor((G.gameTime/HOUR_SEC)%24);
  const m=Math.floor(((G.gameTime/HOUR_SEC)%1)*60);
  document.getElementById('h-clock').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  document.getElementById('h-day').textContent=`Day ${G.day}`;

  // Parent call trigger
  if(G.parentCallHour>=0&&h===G.parentCallHour&&G.parentCallDay!==G.day&&!G.dlgOpen&&!G.panelOpen){
    G.parentCallDay=G.day;
    setTimeout(triggerParentCall,800);
  }

  // Drain
  G.hungerTimer+=dt;G.thirstTimer+=dt;
  // Drain ~3 game-days to fully deplete each stat
  if(G.hungerTimer>=HOUR_SEC*3){G.hungerTimer=0;G.hunger=Math.max(0,G.hunger-4);updateStats();}
  if(G.thirstTimer>=HOUR_SEC*2.5){G.thirstTimer=0;G.thirst=Math.max(0,G.thirst-4);updateStats();}

  if(G.hunger===0&&G.thirst===0){
    G.critTimer=(G.critTimer||0)+dt;
    if(G.critTimer>HOUR_SEC*2) sendToHospital();
  } else G.critTimer=0;

  if(G.hunger<20) toast('Very hungry!','bad');
  if(G.thirst<20) toast('Very thirsty!','bad');

  // Dynamic sky lighting
  if(scene===outdoorScene){
    const hr=(G.gameTime/HOUR_SEC)%24; // 0-24
    let skyColor, sunInt, sunColor, ambInt;
    if(hr<5||hr>=23){        // Deep night
      skyColor=0x040410; sunInt=0.05; sunColor=0x1a2055; ambInt=0.18;
    } else if(hr<6.5){       // Pre-dawn / twilight
      const t=(hr-5)/1.5;
      skyColor=lerpHex(0x040410,0xd45a1a,t); sunInt=0.1+t*0.5; sunColor=0xff6622; ambInt=0.2+t*0.3;
    } else if(hr<8){         // Sunrise
      const t=(hr-6.5)/1.5;
      skyColor=lerpHex(0xd45a1a,0x87CEEB,t); sunInt=0.6+t*0.5; sunColor=lerpHex(0xff9933,0xfff5e0,t); ambInt=0.4+t*0.2;
    } else if(hr<17){        // Full day
      skyColor=G.weather==='Cloudy'||G.weather==='Rainy'||G.weather==='Snowy'?0x8899aa:0x87CEEB;
      sunInt=G.weather==='Rainy'?0.5:G.weather==='Cloudy'?0.7:1.2;
      sunColor=0xfff5e0; ambInt=G.weather==='Rainy'?0.4:0.6;
    } else if(hr<18.5){      // Sunset
      const t=(hr-17)/1.5;
      skyColor=lerpHex(0x87CEEB,0xff5500,t); sunInt=1.2-t*0.8; sunColor=lerpHex(0xfff5e0,0xff4400,t); ambInt=0.6-t*0.25;
    } else if(hr<20){        // Dusk
      const t=(hr-18.5)/1.5;
      skyColor=lerpHex(0xff5500,0x0d0820,t); sunInt=0.4-t*0.3; sunColor=0x2233aa; ambInt=0.35-t*0.17;
    } else {                 // Evening/night
      skyColor=0x040410; sunInt=0.05; sunColor=0x1a2055; ambInt=0.18;
    }
    const target=new THREE.Color(skyColor);
    outdoorScene.background.lerp(target,0.04);
    outdoorScene.fog.color.lerp(target,0.04);
    const sunLight=outdoorScene.children.find(c=>c instanceof THREE.DirectionalLight);
    if(sunLight){sunLight.intensity=sunInt;sunLight.color.set(sunColor);}
    const ambLight=outdoorScene.children.find(c=>c instanceof THREE.AmbientLight);
    if(ambLight) ambLight.intensity=ambInt;
  }
}

function lerpHex(a,b,t){
  const ar=(a>>16)&0xff,ag=(a>>8)&0xff,ab_=a&0xff;
  const br=(b>>16)&0xff,bg=(b>>8)&0xff,bb_=b&0xff;
  const r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab_+(bb_-ab_)*t);
  return (r<<16)|(g<<8)|bl;
}

function updateStats() {
  document.getElementById('bar-hunger').style.width=G.hunger+'%';
  document.getElementById('bar-thirst').style.width=G.thirst+'%';
  document.getElementById('h-money').textContent='$'+G.money;
  const hColor=G.hunger<30?'#ef476f':G.hunger<60?'#f7971e':'';
  const tColor=G.thirst<30?'#ef476f':G.thirst<60?'#4facfe':'';
  document.getElementById('bar-hunger').style.background=hColor?`linear-gradient(90deg,${hColor},${hColor})`:'';
  document.getElementById('bar-thirst').style.background=tColor?`linear-gradient(90deg,${tColor},${tColor})`:'';
  if(!hColor) document.getElementById('bar-hunger').className='stat-fill fill-hunger';
  if(!tColor) document.getElementById('bar-thirst').className='stat-fill fill-thirst';
}

function sendToHospital() {
  if(G.hospitalized)return;
  G.hospitalized=true;
  toast('Rushed to hospital!','bad');
  exitBuilding();
  setTimeout(()=>{
    showDlg('🏥 Hospital','You collapsed. An ambulance brought you in.\n\nYour parents were called.',null,
      ()=>showDlg('📞 Parents','"We\'re getting you home. You need rest."\n\nA ticket was booked.',null,
        ()=>doEnding('hospital')));
  },1500);
}

// -------------------------------------------------------------
//  INVENTORY
// -------------------------------------------------------------
function addItem(key) {
  if(G.inventory.length>=5){toast('Inventory full! (5 max)','bad');return false;}
  G.inventory.push(key);
  toast(`${ITEMS[key].em} ${ITEMS[key].name} added`,'good');
  return true;
}
function openInventory() {
  renderInventory();
  openOverlay('ov-inv');
}
function renderInventory() {
  const grid=document.getElementById('inv-grid');
  grid.innerHTML='';
  for(let i=0;i<5;i++){
    const slot=document.createElement('div');
    slot.className='inv-slot'+(i<G.inventory.length?' has-item':'');
    if(i<G.inventory.length){
      const it=ITEMS[G.inventory[i]];
      slot.innerHTML=`<div class="inv-slot-em">${it.em}</div><div class="inv-slot-name">${it.name}</div>`;
      slot.onclick=()=>useItem(i);
    } else {
      slot.innerHTML='<div style="font-size:.6rem;color:rgba(255,255,255,.15)">empty</div>';
    }
    grid.appendChild(slot);
  }
}
function useItem(idx){
  const key=G.inventory[idx];const it=ITEMS[key];
  if(it.isTool){
    toast(`${it.em} ${it.name} — use it in the right place`,'info');
    return;
  }
  G.hunger=Math.min(100,Math.max(0,G.hunger+it.hunger));
  G.thirst=Math.min(100,Math.max(0,G.thirst+it.thirst));
  G.inventory.splice(idx,1);
  updateStats();renderInventory();
  toast(`Ate/drank ${it.em} ${it.name}`,'good');
}

// -------------------------------------------------------------
//  PHONE
// -------------------------------------------------------------
function openPhone(){openOverlay('ov-phone');document.getElementById('phone-content').textContent='Select an app above.';}
function phoneApp(app){
  const el=document.getElementById('phone-content');
  if(app==='clock'){
    const h=Math.floor((G.gameTime/HOUR_SEC)%24),m=Math.floor(((G.gameTime/HOUR_SEC)%1)*60);
    el.innerHTML=`<div style="font-size:2rem;text-align:center;margin:.5rem 0">${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}</div><div style="text-align:center;opacity:.5;font-size:.75rem">Day ${G.day}</div>`;
  } else if(app==='weather'){
    el.innerHTML=`<div style="font-size:2.5rem;text-align:center;margin:.5rem 0">${WEATHER_ICONS[G.weather]}</div><div style="text-align:center">${G.weather}</div>`;
  } else if(app==='achievements'){
    el.innerHTML='<div class="ach-grid">'+ACHIEVEMENTS.map(a=>`
      <div class="ach-row${G.achs[a.id]?' done':''}">
        <div class="ach-em">${a.em}</div>
        <div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
      </div>`).join('')+'</div>';
  } else if(app==='call'){
    const achCount=Object.keys(G.achs).length;
    const lines=[`"Hey! We heard you've got ${achCount} achievement${achCount!==1?'s':''}!"`,`"Keep going, we believe in you!"`,`"Don't forget to eat and drink water!"`,`"We love you. Come home soon. ❤️"`];
    el.innerHTML=`<div style="text-align:center;font-size:1.5rem;margin-bottom:.5rem">📞</div>${lines[Math.floor(Math.random()*lines.length)]}`;
    unlock('called_home');
  }
}

// -------------------------------------------------------------
//  WARDROBE
// -------------------------------------------------------------
function updatePlayerAccessories() {
  // Remove old accessory meshes
  const toRemove = playerGroup.children.filter(c=>c._isAccessory);
  toRemove.forEach(c=>playerGroup.remove(c));

  // Hat
  if(G.hat && G.hat!=='none') {
    if(G.hat==='cap') {
      const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.58,0.1,10),new THREE.MeshLambertMaterial({color:0x2244cc}));
      brim.position.set(0,1.82,0.1);brim._isAccessory=true;playerGroup.add(brim);
      const top=new THREE.Mesh(new THREE.SphereGeometry(0.42,10,8),new THREE.MeshLambertMaterial({color:0x2244cc}));
      top.scale.y=0.55;top.position.set(0,1.97,0);top._isAccessory=true;playerGroup.add(top);
    } else if(G.hat==='cowboy') {
      const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.82,0.88,0.08,12),new THREE.MeshLambertMaterial({color:0x8B4513}));
      brim.position.set(0,1.78,0);brim._isAccessory=true;playerGroup.add(brim);
      const crown=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.46,0.52,10),new THREE.MeshLambertMaterial({color:0x8B4513}));
      crown.position.set(0,2.06,0);crown._isAccessory=true;playerGroup.add(crown);
    } else if(G.hat==='beanie') {
      const beanie=new THREE.Mesh(new THREE.SphereGeometry(0.44,10,8),new THREE.MeshLambertMaterial({color:0xaa2222}));
      beanie.scale.y=0.75;beanie.position.set(0,1.92,0);beanie._isAccessory=true;playerGroup.add(beanie);
    } else if(G.hat==='crown') {
      const base=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.42,0.22,8),new THREE.MeshLambertMaterial({color:0xFFD700}));
      base.position.set(0,1.84,0);base._isAccessory=true;playerGroup.add(base);
      for(let i=0;i<5;i++){
        const spike=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.3,5),new THREE.MeshLambertMaterial({color:0xFFD700}));
        const a=i*(Math.PI*2/5);
        spike.position.set(Math.sin(a)*0.36,2.06,Math.cos(a)*0.36);
        spike._isAccessory=true;playerGroup.add(spike);
      }
    }
  }

  // Glasses
  if(G.glasses && G.glasses!=='none') {
    const col=G.glasses==='cool'?0x111111:G.glasses==='nerdy'?0x553311:0x888888;
    const gMat=new THREE.MeshLambertMaterial({color:col});
    [-0.22,0.22].forEach(ex=>{
      const frame=new THREE.Mesh(new THREE.TorusGeometry(0.13,0.03,4,12),gMat);
      frame.rotation.x=Math.PI/2;frame.position.set(ex,1.32,0.68);
      frame._isAccessory=true;playerGroup.add(frame);
    });
    const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.03,0.03),gMat);
    bridge.position.set(0,1.32,0.68);bridge._isAccessory=true;playerGroup.add(bridge);
  }
}

function openWardrobe(){
  const hg=document.getElementById('hat-opts');
  const gg=document.getElementById('glasses-opts');
  hg.innerHTML='';gg.innerHTML='';
  HATS.forEach(h=>{
    const d=document.createElement('div');
    d.className='acc-opt'+(G.hat===h.id?' selected':'')+(h.id==='none'?' none-opt':'');
    d.textContent=h.id==='none'?'None':h.em;d.title=h.label;
    d.onclick=()=>{G.hat=h.id;updatePlayerAccessories();openWardrobe();};
    hg.appendChild(d);
  });
  GLASSES.forEach(g=>{
    const d=document.createElement('div');
    d.className='acc-opt'+(G.glasses===g.id?' selected':'')+(g.id==='none'?' none-opt':'');
    d.textContent=g.id==='none'?'None':g.em;d.title=g.label;
    d.onclick=()=>{G.glasses=g.id;updatePlayerAccessories();openWardrobe();};
    gg.appendChild(d);
  });
  const hat=HATS.find(h=>h.id===G.hat);
  const gl=GLASSES.find(g=>g.id===G.glasses);
  document.getElementById('wardrobe-preview').textContent=(hat&&hat.id!=='none'?hat.em:'')+'🫘'+(gl&&gl.id!=='none'?gl.em:'');
  openOverlay('ov-wardrobe');
}

// -------------------------------------------------------------
//  BUILDING ACTIONS
// -------------------------------------------------------------
function doSleep(){
  const curH=Math.floor((G.gameTime/HOUR_SEC)%24);
  if(curH>=6&&curH<21){
    showDlg('🛏️ Bed',"It's not bedtime yet! Come back after 9 PM.",null,null);
    return;
  }
  G.day++;G.gameTime=6*HOUR_SEC;G.hunger=Math.min(G.hunger+10,100);
  toast(`Slept well. Day ${G.day} — 6:00am`,'info');
  updateStats();
  if(G.day===G.examDay) setTimeout(()=>toast('EXAM TODAY! Go to University','gold'),600);
}
function checkLaptop(){
  const base=G.classC*25,study=G.studyC*5,pen=(G.hunger<50?30:0)+(G.thirst<50?30:0);
  showDlg('💻 Laptop',`Day ${G.day} · $${G.money}\nClasses: ${G.classC}  Study: ${G.studyC}\nBase: ${base}%  +Study: ${study}%\nPenalties: -${pen}%\nExam chance: ~${Math.max(0,Math.min(95,base+study-pen))}%`,null,null);
}
function openFridge(){
  const foodKeys=['burger','sandwich','water','soda','fries','apple','chips','mealDeal'];
  const opts=[];
  // Take items from fridge
  if(G.fridge.length===0){
    opts.push({t:'(fridge is empty)',fn:openFridge});
  } else {
    G.fridge.forEach((key,i)=>{
      const it=ITEMS[key];
      opts.push({t:`Take ${it.em} ${it.name}`,fn:()=>{
        G.fridge.splice(i,1);
        if(!addItem(key)) G.fridge.splice(i,0,key); // put back if inv full
        openFridge();
      }});
    });
  }
  // Store food from inventory
  const foodInInv=G.inventory.map((k,i)=>({k,i})).filter(({k})=>foodKeys.includes(k));
  if(foodInInv.length>0){
    foodInInv.forEach(({k,i})=>{
      const it=ITEMS[k];
      opts.push({t:`Store ${it.em} ${it.name}`,fn:()=>{
        G.inventory.splice(i,1);
        G.fridge.push(k);
        renderInventory();
        toast(`${it.em} stored in fridge`,'good');
        openFridge();
      }});
    });
  }
  opts.push({t:'← Close',fn:closeDlg});
  const subtitle=G.fridge.length===0?'Empty — store food from your inventory here.':
    `${G.fridge.length} item(s) inside.`;
  showDlg('🧊 Fridge',subtitle,opts);
}
function kitchenCounter(){
  showDlg('🍳 Kitchen','You make yourself something simple.',[
    {t:'Cook a meal (free, +20 hunger)',fn:()=>{G.hunger=Math.min(100,G.hunger+20);updateStats();closeDlg();toast('+20 hunger','good');}},
    {t:'← Back',fn:closeDlg},
  ]);
}

// STORE
let storeCart=[];
function browseShelf(){
  storeCart=storeCart||[];
  document.getElementById('shop-title').textContent='🏪 Corner Store';
  const list=document.getElementById('shop-items');list.innerHTML='';
  const shopItems=['burger','sandwich','water','soda','apple','chips'];
  shopItems.forEach(key=>{
    const it=ITEMS[key];
    const d=document.createElement('div');d.className='shop-item';
    d.innerHTML=`<div class="shop-em">${it.em}</div><div class="shop-info"><div class="shop-name">${it.name}</div><div class="shop-desc">+${it.hunger} hunger, +${it.thirst} thirst</div></div><div class="shop-price">$${it.price}</div>`;
    d.onclick=()=>{storeCart.push(key);toast(`${it.em} added to cart`,'good');};
    list.appendChild(d);
  });
  // Cart/checkout buttons
  const btns=document.createElement('div');
  btns.style.cssText='display:flex;gap:8px;margin-top:.8rem;';
  const pay=document.createElement('button');pay.className='game-btn btn-deal';pay.textContent='Pay & Leave';
  pay.onclick=()=>{storeCheckout();closeOverlay('ov-shop');};
  const walk=document.createElement('button');walk.className='game-btn btn-deal';walk.textContent='Walk out (free)';
  walk.onclick=()=>{storeWalkOut();closeOverlay('ov-shop');};
  btns.appendChild(pay);btns.appendChild(walk);list.appendChild(btns);
  openOverlay('ov-shop');
}
function storeCheckout(){
  if(!storeCart||!storeCart.length)return;
  const total=storeCart.reduce((s,k)=>s+ITEMS[k].price,0);
  if(G.money<total){toast(`Need $${total}`,'bad');return;}
  G.money-=total;storeCart.forEach(k=>addItem(k));storeCart=[];updateStats();
  toast(`Paid $${total}`,'good');
}
function storeWalkOut(){
  if(!storeCart||!storeCart.length)return;
  storeCart.forEach(k=>addItem(k));storeCart=[];
}

// MCHAPPY
function mcOrder(){
  document.getElementById('shop-title').textContent="🍟 McHappy's";
  const list=document.getElementById('shop-items');list.innerHTML='';
  ['burger','fries','soda','water'].forEach(key=>{
    const it=ITEMS[key];
    const d=document.createElement('div');d.className='shop-item';
    d.innerHTML=`<div class="shop-em">${it.em}</div><div class="shop-info"><div class="shop-name">${it.name}</div></div><div class="shop-price">$${it.price}</div>`;
    d.onclick=()=>{
      if(G.money<it.price){toast('Not enough!','bad');return;}
      G.money-=it.price;addItem(key);updateStats();toast(`${it.em} ordered!`,'good');
    };
    list.appendChild(d);
  });
  openOverlay('ov-shop');
}
function mcJobMenu(){
  const h=Math.floor((G.gameTime/HOUR_SEC)%24);
  if(h<6||h>=24){showDlg("McHappy's","It's closed right now.\nOpen 6am - midnight.",null,null);return;}
  if(!G.hasJob){
    showDlg("💼 McHappy's","Apply for the mopping job?\n$20 per shift. Come every day or you're fired.",[
      {t:'Apply!',fn:()=>{G.hasJob=true;G.jobDay=G.day;closeDlg();unlock('job_mc');toast('Got the job! Grab the mop and clean the floor.','gold');}},
      {t:'No thanks',fn:closeDlg},
    ]);
  } else if(G.lastWorkDay===G.day){
    showDlg("McHappy's","You already worked today. Come back tomorrow!",null,null);
  } else {
    showDlg("🧹 Your Shift","Pick up the mop from the corner,\nthen mop the floor for 1 hour to earn $20.",null,null);
  }
}

function mcCashierMenu(){
  showDlg("🍟 McHappy's","Welcome! What can I do for you?",[
    {t:'Order food',fn:()=>{closeDlg();mcOrder();}},
    {t:G.hasJob?'Ask about shift':'Apply for job',fn:()=>{closeDlg();mcJobMenu();}},
    {t:'Never mind',fn:closeDlg},
  ]);
}

function pickupMop(){
  const sc=indoorScenes.mchappy;
  if(G.inventory.includes('mop')){toast('Already have the mop','info');return;}
  if(sc&&sc._mopMesh) sc._mopMesh.visible=false;
  addItem('mop');
  toast('Picked up the mop 🧹','good');
}

function doMopWork(){
  if(!G.hasJob){toast("Need a job first — talk to the cashier",'bad');return;}
  if(!G.inventory.includes('mop')){toast("Grab the mop first!",'bad');return;}
  if(G.lastWorkDay===G.day){toast('Already worked today — come back tomorrow','info');return;}
  if(G.moppingActive){
    const elapsed=G.gameTime-G.mopStartTime;
    const pct=Math.min(100,Math.round((elapsed/HOUR_SEC)*100));
    toast(`Still mopping... ${pct}% done`,'info');
    return;
  }
  G.moppingActive=true;
  G.mopStartTime=G.gameTime;
  toast('Started mopping 🧹 — keep moving for 1 hour!','gold');

  // Animate dirt fading
  const sc=indoorScenes.mchappy;
  const checkMop=setInterval(()=>{
    if(!G.moppingActive){clearInterval(checkMop);return;}
    if(G.indoor!=='mchappy'){
      G.moppingActive=false;clearInterval(checkMop);
      toast('Left McHappy\'s — mopping cancelled','bad');return;
    }
    const elapsed=G.gameTime-G.mopStartTime;
    const frac=Math.min(1,elapsed/HOUR_SEC);
    // Fade out dirt spots
    if(sc&&sc._dirtSpots){
      sc._dirtSpots.forEach(d=>{if(d.material)d.material.opacity=0.55*(1-frac);});
    }
    if(frac>=1){
      clearInterval(checkMop);
      G.moppingActive=false;
      G.lastWorkDay=G.day;
      G.money+=20;updateStats();
      toast('Floor spotless! +$20 💰','gold');
      // Reset dirt spots for next day
      if(sc&&sc._dirtSpots) sc._dirtSpots.forEach(d=>{if(d.material)d.material.opacity=0.55;});
      if(sc&&sc._mopMesh){sc._mopMesh.visible=true;}
      // Remove mop from inventory
      const mi=G.inventory.indexOf('mop');if(mi>=0)G.inventory.splice(mi,1);
    }
  },500);
}

// UNIVERSITY
function attendClass(){
  if(G.day>G.examDay){showDlg('University','The exam is over.',null,null);return;}
  if(G.day===G.examDay&&!G.examDone){
    const base=G.classC*25,study=G.studyC*5,pen=(G.hunger<50?30:0)+(G.thirst<50?30:0);
    const chance=Math.max(0,Math.min(95,base+study-pen));
    showDlg('📝 Final Exam',`Your chance: ~${chance}%\n\nClasses: ${G.classC}\nStudy bonus: +${study}%\nStat penalties: -${pen}%`,[
      {t:'Sit the exam',fn:()=>{closeDlg();startExam();}},
      {t:'Not yet',fn:closeDlg},
    ]);return;
  }
  if(G.lastClassDay===G.day){showDlg('University','Already attended today. Come back tomorrow.',null,null);return;}
  G.classC++;G.lastClassDay=G.day;G.gameTime+=HOUR_SEC*2;
  toast(`Class attended! +25% pass chance (${G.classC} total)`,'good');
  if(G.classC>=G.examDay-1) unlock('class_all');
}
function doStudy(){
  if(G.day===G.examDay&&!G.examDone){toast('Exam day — attend the lecture hall','info');return;}
  G.studyC++;G.gameTime+=HOUR_SEC;
  toast(`Studied! +5% chance · 1 hour passed (${G.studyC} sessions)`,'good');
}

// HOSPITAL
function talkNurse(){
  showDlg('👩‍⚕️ Nurse','You need to eat and drink regularly.\nYour parents have been notified.',[
    {t:'Call parents now',fn:()=>{closeDlg();phoneApp('call');openPhone();}},
    {t:'OK',fn:closeDlg},
  ]);
}

// AIRPORT
let airportWaiting=false,airportTimer=0;
function buyTicket(){
  if(G.money<4000){showDlg('✈️ Ticket','You need $4000 for a ticket home.\nYour money: $'+G.money,null,null);return;}
  showDlg('✈️ Buy Ticket','Purchase a one-way ticket home for $4000?',[
    {t:'Buy ($4000)',fn:()=>{
      G.money-=4000;airportWaiting=true;airportTimer=0;
      closeDlg();updateStats();toast('Ticket purchased! Wait 2hrs in lounge','gold');
    }},
    {t:'Not now',fn:closeDlg},
  ]);
}
function waitForFlight(){
  if(!airportWaiting){showDlg('✈️ Departure Lounge','Buy a ticket at the counter first.',null,null);return;}
  showDlg('✈️ Waiting...','Your flight leaves in about 2 hours.\nStay in the lounge.',null,null);
}

// -------------------------------------------------------------
//  EXAM
// -------------------------------------------------------------
function startExam(){
  setScreen('exam-screen');
  let count=10;
  document.getElementById('exam-count').textContent=count;
  document.getElementById('exam-sub').textContent='Writing your answers...';
  const t=setInterval(()=>{
    count--;
    document.getElementById('exam-count').textContent=count;
    if(count<=0){
      clearInterval(t);
      resolveExam();
    }
  },1000);
}
function resolveExam(){
  G.examDone=true;
  const base=G.classC*25,study=G.studyC*5;
  const pen=(G.hunger<50?30:0)+(G.thirst<50?30:0);
  const chance=Math.max(0,Math.min(95,base+study-pen));
  const passed=Math.random()*100<chance;
  G.graduated=passed;
  setScreen('game');
  if(passed){unlock('graduated');showDlg('📄 Results','PASSED.',null,null);toast('PASSED!','gold');}
  else {showDlg('📄 Results','FAILED.',null,null);toast('Failed.','bad');}
}

// -------------------------------------------------------------
//  ENDINGS
// -------------------------------------------------------------
const LESSONS = {
  home: "He came to himself. That moment of clarity  -  when the far country stopped looking like freedom and started looking like a cage  -  that's when the journey home really begins. The father didn't wait for a perfect apology. He ran.",
  hospital: "He spent everything in reckless living. When it was gone, the world had nothing left for him. Even then  -  even when the consequences brought him to his knees  -  grace was already running down the road to meet him.",
  broke: "He began to be in need. The money ran out, and suddenly the city that had seemed so full of possibility felt completely empty. That emptiness, as painful as it is, can be the beginning of wisdom.",
  graduated: "He arose and went to his father. He was disciplined. He showed up. And though the far country was full of distractions, he came home not just alive  -  but accomplished.",
  deported: '"But we had to celebrate and be glad, because this brother of yours was dead and is alive again; he was lost and is found." — Luke 15:32',
};

function doEnding(reason) {
  if(G.gameOver)return;
  G.gameOver=true;
  unlock('made_home');
  const configs = {
    home: {icon:'✈️',title:'MADE IT HOME',
      text:'You boarded the plane.\n\nThe city shrank beneath you.\nYou watched the lights fade and thought about everything.\n\nYour parents were at arrivals.\nYour dad was already crying.'},
    hospital: {icon:'🏥',title:'SENT HOME',
      text:'The hospital called your parents.\nA ticket was booked before you could argue.\n\nYou woke up in your own bed.\nYour mom was in the doorway, just watching.'},
    broke: {icon:'📵',title:'FUNDS DEPLETED',
      text:'The ATM screen said $0.\n\nYou sat outside for a long time.\nThen you called home.\n\nYour mom answered before it finished ringing.\n"Come home," she said.'},
    graduated: {icon:'🎓',title:'GRADUATED',
      text:`You passed.\n${G.classC} classes. ${G.studyC} study sessions.\n\nYou called home from the steps of the university.\nYour parents were already in the car.`},
    deported: {icon:'🚔',title:'DEPORTED — BUT HOME',
      text:'The police caught you in the act.\n\nThere was no arguing. A one-way ticket was arranged before morning.\n\nBut when you walked through arrivals —\nyour parents were already there.\n\nYour mom pulled you into a hug before you could say sorry.\n"We\'re just glad you\'re home," your dad said.\n\nHe didn\'t let go for a long time.'},
  };
  const cfg=configs[reason]||configs.home;
  document.getElementById('end-icon').textContent=cfg.icon;
  document.getElementById('end-title').textContent=cfg.title;
  document.getElementById('end-text').textContent=cfg.text;
  document.getElementById('end-lesson').textContent=LESSONS[reason]||LESSONS.home;
  const achC=Object.keys(G.achs).length;
  document.getElementById('end-stats').innerHTML=`
    <div class="end-stat"><div class="end-stat-l">Days</div><div class="end-stat-v">${G.day}</div></div>
    <div class="end-stat"><div class="end-stat-l">Money Left</div><div class="end-stat-v">$${G.money}</div></div>
    <div class="end-stat"><div class="end-stat-l">Classes</div><div class="end-stat-v">${G.classC}</div></div>
    <div class="end-stat"><div class="end-stat-l">Achievements</div><div class="end-stat-v">${achC}/6</div></div>
    <div class="end-stat"><div class="end-stat-l">Exam</div><div class="end-stat-v">${!G.examDone?' - ':G.graduated?'✅':'❌'}</div></div>
  `;
  setScreen('ending-screen');
}

// -------------------------------------------------------------
//  CASINO GAMES
// -------------------------------------------------------------
function openCasinoGame(game) {
  document.getElementById('casino-game-title').textContent =
    {blackjack:'🃏 Blackjack',slots:'🎰 Slot Machines',roulette:'🎡 Roulette',craps:'🎲 Craps',baccarat:'🃠 Baccarat'}[game];
  const body=document.getElementById('casino-game-body');
  body.innerHTML='';
  if(game==='blackjack') renderBlackjack(body);
  else if(game==='slots')    renderSlots(body);
  else if(game==='roulette') renderRoulette(body);
  else if(game==='craps')    renderCraps(body);
  else if(game==='baccarat') renderBaccarat(body);
  openOverlay('ov-casino');
}
function closeCasinoGame(){closeOverlay('ov-casino');}

// -- BET UI --
function makeBetRow(id, dflt, max) {
  const row=document.createElement('div');row.className='bet-row';
  row.innerHTML=`<span class="bet-label">BET:</span><span class="bet-val" id="${id}-val">$${dflt}</span>`;
  let bet=dflt;
  const updateBet=v=>{bet=Math.max(10,Math.min(G.money,v));document.getElementById(`${id}-val`).textContent='$'+bet;};
  const mk=(t,d)=>{const c=document.createElement('span');c.className='chip';c.textContent=t;c.onclick=()=>updateBet(bet+d);return c;};
  row.appendChild(mk('-$25',-25));row.appendChild(mk('+$25',25));row.appendChild(mk('+$100',100));
  const maxBtn=document.createElement('span');maxBtn.className='chip';maxBtn.textContent='MAX';
  maxBtn.onclick=()=>updateBet(G.money);row.appendChild(maxBtn);
  row._getBet=()=>bet;
  return row;
}

// -- BLACKJACK --
let BJ={};
function renderBlackjack(container) {
  const html=`<div class="casino-game">
    <div class="bj-area"><div class="bj-label">Dealer</div><div class="card-row" id="bj-dh"></div><div class="bj-score" id="bj-ds"></div></div>
    <div class="bj-area"><div class="bj-label">You</div><div class="card-row" id="bj-ph"></div><div class="bj-score" id="bj-ps"></div></div>
    <div class="bj-msg" id="bj-msg"></div>
    <div id="bj-bet-row"></div>
    <div class="bj-btns" id="bj-btns"></div>
  </div>`;
  container.innerHTML=html;

  const betRow=makeBetRow('bj',Math.min(50,G.money),G.money);
  document.getElementById('bj-bet-row').appendChild(betRow);

  const deal=mkBtn('DEAL','btn-deal',()=>bjDeal(betRow._getBet()));
  const hit=mkBtn('HIT','btn-hit',bjHit,[true]);
  const stand=mkBtn('STAND','btn-stand',bjStand,[true]);
  const dbl=mkBtn('DOUBLE','btn-double',bjDouble,[true]);
  document.getElementById('bj-btns').append(deal,hit,stand,dbl);
  BJ={deck:[],ph:[],dh:[],bet:0,over:false};bjShuffle();bjPhase('bet');
}
function bjShuffle(){const S=['♠','♥','♦','♣'],V=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];BJ.deck=[];for(const s of S)for(const v of V)BJ.deck.push({s,v});for(let i=BJ.deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[BJ.deck[i],BJ.deck[j]]=[BJ.deck[j],BJ.deck[i]];}}
const bjVal=c=>(['J','Q','K'].includes(c.v)?10:c.v==='A'?11:+c.v);
function bjScore(h){let s=h.reduce((a,c)=>a+bjVal(c),0),ac=h.filter(c=>c.v==='A').length;while(s>21&&ac-->0)s-=10;return s;}
function bjCard(c,hidden=false){
  const d=document.createElement('div');
  if(hidden){d.className='card back';return d;}
  d.className='card'+((c.s==='♥'||c.s==='♦')?' red':'');
  d.innerHTML=`<div>${c.v}</div><div>${c.s}</div>`;return d;
}
function bjRender(hideDealer=true){
  const dh=document.getElementById('bj-dh'),ph=document.getElementById('bj-ph');
  if(!dh||!ph)return;
  dh.innerHTML='';ph.innerHTML='';
  BJ.dh.forEach((c,i)=>dh.appendChild(bjCard(c,hideDealer&&i===1)));
  BJ.ph.forEach(c=>ph.appendChild(bjCard(c)));
  document.getElementById('bj-ps').textContent='Score: '+bjScore(BJ.ph);
  document.getElementById('bj-ds').textContent=hideDealer?'Score: ?':'Score: '+bjScore(BJ.dh);
}
function bjPhase(p){
  const inPlay=p==='play';
  document.getElementById('bj-btns')?.querySelectorAll('button').forEach((b,i)=>{
    if(i===0)b.disabled=inPlay;
    else b.disabled=!inPlay;
  });
  document.getElementById('bj-bet-row')?.querySelectorAll('.chip,.bet-label,.bet-val').forEach(el=>el.style.display=inPlay?'none':'');
}
function bjDeal(bet){
  if(G.money<bet||bet<1)return;
  if(BJ.deck.length<15)bjShuffle();
  BJ.bet=bet;G.money-=bet;updateStats();
  BJ.ph=[BJ.deck.pop(),BJ.deck.pop()];
  BJ.dh=[BJ.deck.pop(),BJ.deck.pop()];
  bjRender(true);bjPhase('play');document.getElementById('bj-msg').textContent='';
  if(bjScore(BJ.ph)===21){bjEnd('Blackjack! 🎉',Math.floor(bet*1.5));}
}
function bjHit(){BJ.ph.push(BJ.deck.pop());bjRender(true);if(bjScore(BJ.ph)>21)bjEnd('Bust! 💥',-BJ.bet);}
function bjStand(){while(bjScore(BJ.dh)<17)BJ.dh.push(BJ.deck.pop());bjRender(false);
  const ps=bjScore(BJ.ph),ds=bjScore(BJ.dh);
  if(ds>21||ps>ds)bjEnd('You win! 🎉',BJ.bet);
  else if(ps===ds)bjEnd('Push',0,true);
  else bjEnd('Dealer wins',- BJ.bet);}
function bjDouble(){BJ.bet*=2;G.money-=BJ.bet/2;updateStats();BJ.ph.push(BJ.deck.pop());bjRender(true);if(bjScore(BJ.ph)>21)bjEnd('Bust!',-BJ.bet);else bjStand();}
function bjEnd(msg,net,push=false){
  if(!push)G.money+=Math.max(0,BJ.bet+net);else G.money+=BJ.bet;
  updateStats();bjRender(false);
  document.getElementById('bj-msg').textContent=msg+(net>0?` +$${net}`:net<0?` -$${Math.abs(net)}`:'');
  document.getElementById('bj-msg').style.color=net>0?'#06d6a0':net<0?'#ef476f':'#ffd166';
  bjPhase('bet');
  if(net+BJ.bet>=500)unlock('casino_big');
}

// -- SLOTS --
const SLOT_SYM=['🍒','🍋','🍊','🍇','⭐','💎','7️⃣'];
const SLOT_PAY={'🍒🍒🍒':3,'🍋🍋🍋':4,'🍊🍊🍊':5,'🍇🍇🍇':6,'⭐⭐⭐':10,'💎💎💎':20,'7️⃣7️⃣7️⃣':50,'🍒🍒':1.5};
let slotRunning=false,slotBet=25;
function renderSlots(container){
  container.innerHTML=`<div class="casino-game">
    <div class="slots-reels"><div class="reel" id="sl0">🍒</div><div class="reel" id="sl1">🍋</div><div class="reel" id="sl2">⭐</div></div>
    <div class="game-result" id="sl-msg">Pull the lever!</div>
    <div id="sl-bet-row"></div>
    <div style="display:flex;gap:8px;margin-top:.5rem">
      <button class="game-btn btn-spin" id="sl-btn" onclick="spinSlots()">🎰 PULL LEVER</button>
    </div>
  </div>`;
  const br=makeBetRow('sl',Math.min(25,G.money));
  slotBet=25;
  const origGet=br._getBet.bind(br);
  br._getBet=()=>{slotBet=origGet();return slotBet;};
  document.getElementById('sl-bet-row').appendChild(br);
  slotRunning=false;
}
function spinSlots(){
  if(slotRunning||G.money<slotBet)return;
  G.money-=slotBet;updateStats();slotRunning=true;
  document.getElementById('sl-btn').disabled=true;
  document.getElementById('sl-msg').textContent='Spinning...';
  const results=[0,1,2].map(()=>SLOT_SYM[Math.floor(Math.random()*SLOT_SYM.length)]);
  const ivals=[0,1,2].map(i=>{
    let idx=0;
    return setInterval(()=>{idx=(idx+1)%SLOT_SYM.length;const el=document.getElementById('sl'+i);if(el)el.textContent=SLOT_SYM[idx];},80);
  });
  [900,1200,1600].forEach((t,i)=>setTimeout(()=>{
    clearInterval(ivals[i]);
    const el=document.getElementById('sl'+i);if(el)el.textContent=results[i];
    if(i===2){
      const combo=results.join('');let mult=0;
      Object.entries(SLOT_PAY).forEach(([k,v])=>{if(combo.startsWith(k))mult=Math.max(mult,v);});
      const win=mult>0?Math.round(slotBet*mult):0;
      G.money+=win;updateStats();
      document.getElementById('sl-msg').textContent=mult>0?`WIN! +$${win} 🎉`:`No match. -$${slotBet}`;
      document.getElementById('sl-msg').style.color=mult>0?'#06d6a0':'#ef476f';
      slotRunning=false;document.getElementById('sl-btn').disabled=false;
      if(win>=500)unlock('casino_big');
    }
  },t));
}

// -- ROULETTE --
let rouSel=null,rouBet=50,rouRunning=false,rouDeg=0;
function renderRoulette(container){
  container.innerHTML=`<div class="casino-game">
    <div class="roulette-wheel" id="rou-wheel"></div>
    <div class="roulette-bets" id="rou-bets"></div>
    <div id="rou-bet-row"></div>
    <div class="game-result" id="rou-result">Place your bet and spin!</div>
    <button class="game-btn btn-spin" onclick="spinRoulette()">🎡 SPIN</button>
  </div>`;
  const bets=[{id:'red',label:'🔴 Red (2×)',cls:'red-bet'},{id:'black',label:'⚫ Black (2×)',cls:'black-bet'},
    {id:'green',label:'🟢 Zero (14×)',cls:'green-bet'},{id:'even',label:'Even (2×)',cls:'even-bet'},
    {id:'odd',label:'Odd (2×)',cls:'odd-bet'}];
  const bc=document.getElementById('rou-bets');
  bets.forEach(b=>{
    const btn=document.createElement('button');
    btn.className=`r-bet ${b.cls}`;btn.textContent=b.label;btn.dataset.id=b.id;
    btn.onclick=()=>{rouSel=b.id;bc.querySelectorAll('.r-bet').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');};
    bc.appendChild(btn);
  });
  const br=makeBetRow('rou',Math.min(50,G.money));
  br._getBet2=br._getBet;
  document.getElementById('rou-bet-row').appendChild(br);
  rouRunning=false;rouSel=null;
}
const REDS=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function spinRoulette(){
  if(rouRunning||!rouSel)return;
  const br=document.getElementById('rou-bet-row');
  const betRow=br?.querySelector('[id$="-val"]');
  const bet=parseInt((betRow?.textContent||'$50').replace('$',''))||50;
  if(G.money<bet)return;
  rouRunning=true;G.money-=bet;updateStats();
  const spinAmt=1080+Math.floor(Math.random()*720);
  rouDeg+=spinAmt;
  document.getElementById('rou-wheel').style.transform=`rotate(${rouDeg}deg)`;
  setTimeout(()=>{
    const num=Math.floor(Math.random()*37);
    const isRed=REDS.has(num);const isGreen=num===0;
    const color=isGreen?'green':isRed?'red':'black';
    let win=0,mult=0;
    if(rouSel==='red'&&color==='red'){win=1;mult=2;}
    else if(rouSel==='black'&&color==='black'){win=1;mult=2;}
    else if(rouSel==='green'&&color==='green'){win=1;mult=14;}
    else if(rouSel==='even'&&num>0&&num%2===0){win=1;mult=2;}
    else if(rouSel==='odd'&&num>0&&num%2===1){win=1;mult=2;}
    const gained=win?bet*mult:0;
    G.money+=gained;updateStats();
    const res=document.getElementById('rou-result');
    res.textContent=`${num} (${color.toUpperCase()})  -  ${win?'WIN +$'+gained:'LOSE -$'+bet}`;
    res.style.color=win?'#06d6a0':'#ef476f';
    rouRunning=false;
    if(gained>=500)unlock('casino_big');
  },3200);
}

// -- CRAPS --
let crBet=50,crSel=null,crPoint=null,crRunning=false;
const DOT_GRIDS=[[],[4],[2,8],[1,5,9],[0,2,6,8],[0,4,6,2,8],[0,2,4,6,8,5]];
function renderCraps(container){
  container.innerHTML=`<div class="casino-game">
    <div class="dice-display"><div class="die" id="cr-d0"></div><div class="die" id="cr-d1"></div></div>
    <div class="craps-bets" id="cr-bets"></div>
    <div id="cr-bet-row"></div>
    <div class="game-result" id="cr-info">Select a bet and roll!</div>
    <button class="game-btn btn-roll" onclick="rollCraps()">🎲 ROLL</button>
  </div>`;
  renderDice([1,1]);
  const bets=[{id:'pass',label:'Pass Line'},{id:'nopass',label:"Don't Pass"},{id:'field',label:'Field (2-4,9-12)'},{id:'any7',label:'Any 7 (4×)'}];
  const bc=document.getElementById('cr-bets');
  bets.forEach(b=>{
    const btn=document.createElement('button');btn.className='craps-btn';btn.textContent=b.label;
    btn.onclick=()=>{crSel=b.id;bc.querySelectorAll('.craps-btn').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');};
    bc.appendChild(btn);
  });
  const br=makeBetRow('cr',Math.min(50,G.money));
  document.getElementById('cr-bet-row').appendChild(br);
  crPoint=null;crRunning=false;crSel=null;
  // Store bet row ref
  document.getElementById('cr-bet-row')._getB=br._getBet;
}
function renderDice(vals){
  [0,1].forEach((di)=>{
    const die=document.getElementById('cr-d'+di);if(!die)return;
    die.innerHTML='';
    for(let c=0;c<9;c++){const d=document.createElement('div');d.className='dot'+(DOT_GRIDS[vals[di]]?.includes(c)?'':' e');die.appendChild(d);}
  });
}
function rollCraps(){
  if(!crSel||crRunning)return;
  const br=document.getElementById('cr-bet-row');
  const bet=br?._getB?(br._getB()):50;
  if(G.money<bet)return;
  crRunning=true;G.money-=bet;updateStats();
  const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6),total=d1+d2;
  const iv=setInterval(()=>renderDice([Math.ceil(Math.random()*6),Math.ceil(Math.random()*6)]),80);
  setTimeout(()=>{
    clearInterval(iv);renderDice([d1,d2]);
    let info='',win=false,gained=0;
    if(crSel==='any7'){
      if(total===7){win=true;gained=bet*4;info=`${total}! Any 7 WIN +$${gained}`;}
      else info=`${total}. Not 7. Lost -$${bet}`;
    } else if(crSel==='field'){
      const fw=[2,3,4,9,10,11,12].includes(total);
      if(fw){const m=total===2||total===12?2:1;gained=bet*(1+m);win=true;info=`${total} FIELD WIN +$${gained}`;}
      else info=`${total} not field. Lost -$${bet}`;
    } else if(crSel==='pass'||crSel==='nopass'){
      if(crPoint===null){
        if(total===7||total===11){
          if(crSel==='pass'){win=true;gained=bet;info=`Come-out ${total}! Pass WIN +$${gained}`;}
          else info=`Come-out ${total}. Don't Pass loses -$${bet}`;
        } else if(total===2||total===3||total===12){
          if(crSel==='nopass'&&total!==12){win=true;gained=bet;info=`${total}! Don't Pass WIN +$${gained}`;}
          else info=`Crapped out (${total}). Lost -$${bet}`;
        } else {
          crPoint=total;crRunning=false;
          document.getElementById('cr-info').textContent=`Point: ${crPoint}. Roll again!`;
          return;
        }
      } else {
        if(total===crPoint){
          if(crSel==='pass'){win=true;gained=bet;info=`Hit point ${total}! WIN +$${gained}`;}
          else info=`Hit point ${total}. Don't Pass loses -$${bet}`;
          crPoint=null;
        } else if(total===7){
          if(crSel==='nopass'){win=true;gained=bet;info=`Seven out! Don't Pass WIN +$${gained}`;}
          else info=`Seven out. Pass loses -$${bet}`;
          crPoint=null;
        } else {
          crRunning=false;
          document.getElementById('cr-info').textContent=`Rolled ${total}. Point still ${crPoint}.`;
          return;
        }
      }
    }
    if(win) G.money+=gained+bet;
    updateStats();
    const el=document.getElementById('cr-info');
    if(el){el.textContent=info;el.style.color=win?'#06d6a0':'#ef476f';}
    crRunning=false;
    if(gained>=500)unlock('casino_big');
  },1000);
}

// -- BACCARAT --
let bacBet=50,bacRunning=false;
function renderBaccarat(container){
  container.innerHTML=`<div class="casino-game">
    <div class="bj-area"><div class="bj-label">Player</div><div class="card-row" id="bac-ph"></div><div class="bj-score" id="bac-ps"></div></div>
    <div class="bj-area"><div class="bj-label">Banker</div><div class="card-row" id="bac-bh"></div><div class="bj-score" id="bac-bs"></div></div>
    <div class="bacc-bets" id="bac-bets"></div>
    <div id="bac-bet-row"></div>
    <div class="game-result" id="bac-result">Place your bet!</div>
    <button class="game-btn btn-deal" onclick="dealBaccarat()">Deal</button>
  </div>`;
  const bets=[{id:'player',label:'Player (2×)'},{id:'banker',label:'Banker (1.95×)'},{id:'tie',label:'Tie (8×)'}];
  let bacSel='player';
  const bc=document.getElementById('bac-bets');
  bets.forEach(b=>{
    const btn=document.createElement('button');btn.className='bacc-btn'+(b.id==='player'?' selected':'');btn.textContent=b.label;
    btn.onclick=()=>{bacSel=b.id;bc.querySelectorAll('.bacc-btn').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');};
    bc.appendChild(btn);
  });
  const br=makeBetRow('bac',Math.min(50,G.money));
  document.getElementById('bac-bet-row').appendChild(br);
  document.getElementById('bac-bet-row')._getBacSel=()=>bacSel;
  document.getElementById('bac-bet-row')._getBacBet=br._getBet;
  bacRunning=false;
}
function dealBaccarat(){
  if(bacRunning)return;
  const br=document.getElementById('bac-bet-row');
  const sel=br._getBacSel?.();const bet=br._getBacBet?.();
  if(!sel||!bet||G.money<bet)return;
  bacRunning=true;G.money-=bet;updateStats();

  const cards=[...BJ.deck.slice()];
  if(cards.length<10)bjShuffle();
  const bv=c=>Math.min(9,bjVal(c));
  const hand=()=>{const c=[BJ.deck.pop(),BJ.deck.pop()];return {cards:c,score:(bv(c[0])+bv(c[1]))%10};};
  const p=hand(),b2=hand();
  // Third card rules simplified
  if(p.score<=5){p.cards.push(BJ.deck.pop());p.score=(p.score+bv(p.cards[2]))%10;}
  if(b2.score<=5){b2.cards.push(BJ.deck.pop());b2.score=(b2.score+bv(b2.cards[2]))%10;}

  document.getElementById('bac-ph').innerHTML='';
  document.getElementById('bac-bh').innerHTML='';
  p.cards.forEach(c=>document.getElementById('bac-ph').appendChild(bjCard(c)));
  b2.cards.forEach(c=>document.getElementById('bac-bh').appendChild(bjCard(c)));
  document.getElementById('bac-ps').textContent='Score: '+p.score;
  document.getElementById('bac-bs').textContent='Score: '+b2.score;

  let won=false,gained=0;
  if(p.score===b2.score){if(sel==='tie'){won=true;gained=bet*8;}}
  else if(p.score>b2.score){if(sel==='player'){won=true;gained=bet*2;}}
  else {if(sel==='banker'){won=true;gained=Math.floor(bet*1.95);}}
  if(won)G.money+=gained;
  updateStats();
  const res=document.getElementById('bac-result');
  res.textContent=`Player:${p.score} Banker:${b2.score}  -  ${won?'WIN +$'+gained:'LOSE -$'+bet}`;
  res.style.color=won?'#06d6a0':'#ef476f';
  bacRunning=false;
  if(gained>=500)unlock('casino_big');
}

// -------------------------------------------------------------
//  HELPERS
// -------------------------------------------------------------
function mkBtn(label,cls,fn,disabledArr){
  const b=document.createElement('button');b.className=`game-btn ${cls}`;b.textContent=label;
  b.onclick=fn;if(disabledArr)b.disabled=true;return b;
}
function unlock(id){
  if(G.achs[id])return;
  G.achs[id]=true;
  const a=ACHIEVEMENTS.find(x=>x.id===id);
  if(a)toast(`🏆 Achievement: ${a.name}`,'gold');
}

// -------------------------------------------------------------
//  DIALOG
// -------------------------------------------------------------
function showDlg(speaker,text,opts,cb){
  G.dlgOpen=true;G.dlgData={cb};
  document.getElementById('dlg-speaker').textContent=speaker;
  document.getElementById('dlg-text').textContent=text;
  const optsEl=document.getElementById('dlg-opts');
  const cont=document.getElementById('dlg-cont');
  optsEl.innerHTML='';
  if(opts&&opts.length){
    cont.style.display='none';
    opts.forEach(o=>{
      const b=document.createElement('button');b.className='dialog-opt';b.textContent='▶ '+o.t;
      b.onclick=(e)=>{e.stopPropagation();o.fn();};optsEl.appendChild(b);
    });
  } else cont.style.display='block';
  document.getElementById('dialog').classList.add('open');
}
function closeDlg(){G.dlgOpen=false;G.dlgData=null;document.getElementById('dialog').classList.remove('open');}
function advDialog(){
  if(!G.dlgData)return;
  if(document.getElementById('dlg-opts').children.length)return;
  const cb=G.dlgData.cb;closeDlg();cb?.();
}

// -------------------------------------------------------------
//  OVERLAYS
// -------------------------------------------------------------
function openOverlay(id){G.panelOpen=true;document.getElementById(id).classList.add('open');}
function closeOverlay(id){G.panelOpen=false;document.getElementById(id).classList.remove('open');}

// -------------------------------------------------------------
//  TOAST
// -------------------------------------------------------------
const toastDebounce={};
function toast(msg,type=''){
  if(toastDebounce[msg]&&Date.now()-toastDebounce[msg]<3000)return;
  toastDebounce[msg]=Date.now();
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;
  document.getElementById('toast-stack').appendChild(el);
  setTimeout(()=>el.remove(),2700);
}

// -------------------------------------------------------------
//  SCREEN SWITCHING
// -------------------------------------------------------------
function setScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// -------------------------------------------------------------
//  MINIMAP
// -------------------------------------------------------------
function drawMinimap(){
  const mc=document.getElementById('minimap');if(!mc)return;
  const mctx=mc.getContext('2d');
  const W=mc.width,H=mc.height;
  const wW=MAP_W*TILE,wH=MAP_H*TILE;
  const sx=W/wW,sz=H/wH;
  mctx.fillStyle='#2a4a1a';mctx.fillRect(0,0,W,H);
  // Roads
  mctx.fillStyle='#666';
  [14,34,54,74].forEach(r=>{mctx.fillRect(0,r*TILE*sz,W,2*TILE*sz);});
  [14,34,54,74].forEach(c=>{mctx.fillRect(c*TILE*sx,0,2*TILE*sx,H);});
  // Buildings (glow for casino/uni/airport)
  const glowCols={casino:'#f5a623',uni:'#c471ed',airport:'#4fc3f7'};
  BUILDINGS.forEach(b=>{
    const gc=glowCols[b.id];
    if(gc){
      mctx.save();
      mctx.shadowBlur=10;mctx.shadowColor=gc;
      mctx.fillStyle=gc;
      mctx.fillRect(b.wx*sx,b.wz*sz,b.ww*sx,b.wd*sz);
      mctx.restore();
    }
    mctx.fillStyle='#'+b.color.toString(16).padStart(6,'0');
    mctx.fillRect(b.wx*sx,b.wz*sz,b.ww*sx,b.wd*sz);
  });
  // Park
  mctx.fillStyle='#3a8a20';
  mctx.fillRect(PARK.wx*sx,PARK.wz*sz,PARK.ww*sx,PARK.wd*sz);
  // Player
  const px=G.indoor?(G.camTarget.x):G.px;
  const pz=G.indoor?(G.camTarget.z):G.pz;
  mctx.fillStyle='#fff';
  mctx.beginPath();mctx.arc(px*sx,pz*sz,3,0,Math.PI*2);mctx.fill();
  // Expand icon — bottom-right corner
  const ex=W-5, ez=H-5, as=11;
  mctx.strokeStyle='rgba(57,255,20,0.95)';mctx.lineWidth=2.5;mctx.lineCap='round';
  // top-left L
  mctx.beginPath();mctx.moveTo(ex-as,ez);mctx.lineTo(ex-as,ez-as);mctx.lineTo(ex,ez-as);mctx.stroke();
  // diagonal
  mctx.beginPath();mctx.moveTo(ex-as+2,ez-as+2);mctx.lineTo(ex,ez);mctx.stroke();
  mctx.lineCap='butt';
}

function openFullMap(){
  document.getElementById('map-overlay').classList.add('open');
  drawFullMap();
}
function closeFullMap(){
  document.getElementById('map-overlay').classList.remove('open');
}
function drawFullMap(){
  const mc=document.getElementById('map-full');if(!mc)return;
  const mctx=mc.getContext('2d');
  const W=mc.width,H=mc.height;
  const wW=MAP_W*TILE,wH=MAP_H*TILE;
  const sx=W/wW,sz=H/wH;
  // Background grass
  mctx.fillStyle='#2a4a1a';mctx.fillRect(0,0,W,H);
  // Roads
  mctx.fillStyle='#555';
  [14,34,54,74].forEach(r=>{mctx.fillRect(0,r*TILE*sz-1,W,2*TILE*sz+2);});
  [14,34,54,74].forEach(c=>{mctx.fillRect(c*TILE*sx-1,0,2*TILE*sx+2,H);});
  // Road centre dashes
  mctx.strokeStyle='rgba(255,255,150,0.35)';mctx.lineWidth=1;mctx.setLineDash([6,6]);
  [14,34,54,74].forEach(r=>{mctx.beginPath();mctx.moveTo(0,r*TILE*sz);mctx.lineTo(W,r*TILE*sz);mctx.stroke();});
  [14,34,54,74].forEach(c=>{mctx.beginPath();mctx.moveTo(c*TILE*sx,0);mctx.lineTo(c*TILE*sx,H);mctx.stroke();});
  mctx.setLineDash([]);
  // Park
  mctx.fillStyle='#3a8a20';
  mctx.fillRect(PARK.wx*sx,PARK.wz*sz,PARK.ww*sx,PARK.wd*sz);
  // Park label
  mctx.fillStyle='#c8f7a0';mctx.font='bold 10px sans-serif';
  mctx.textAlign='center';mctx.textBaseline='middle';
  mctx.fillText('🌳 Park',(PARK.wx+PARK.ww/2)*sx,(PARK.wz+PARK.wd/2)*sz);
  // Buildings
  const glowCols={casino:'#f5a623',uni:'#c471ed',airport:'#4fc3f7'};
  const icons={house:'🏠',store:'🏪',mchappy:'🍔',uni:'🎓',casino:'🎰',hospital:'🏥',airport:'✈️',police:'🚔',dhouse1:'🏢',dhouse2:'🏢'};
  BUILDINGS.forEach(b=>{
    const gc=glowCols[b.id];
    if(gc){
      mctx.save();mctx.shadowBlur=18;mctx.shadowColor=gc;
      mctx.fillStyle=gc;mctx.fillRect(b.wx*sx,b.wz*sz,b.ww*sx,b.wd*sz);
      mctx.restore();
    }
    mctx.fillStyle='#'+b.color.toString(16).padStart(6,'0');
    mctx.fillRect(b.wx*sx,b.wz*sz,b.ww*sx,b.wd*sz);
    // Label
    const bcx=(b.wx+b.ww/2)*sx, bcz=(b.wz+b.wd/2)*sz;
    const icon=icons[b.id]||'';
    mctx.fillStyle='#fff';
    mctx.font='bold 9px sans-serif';
    mctx.textAlign='center';mctx.textBaseline='middle';
    // Icon on top, text below
    if(icon){mctx.font='11px sans-serif';mctx.fillText(icon,bcx,bcz-6);}
    mctx.font='bold 8px sans-serif';
    mctx.fillStyle='#fff';
    // shadow for readability
    mctx.shadowColor='rgba(0,0,0,0.9)';mctx.shadowBlur=3;
    mctx.fillText(b.label,bcx,bcz+(icon?5:0));
    mctx.shadowBlur=0;
  });
  // Player dot
  const ppx=G.indoor?G.camTarget.x:G.px;
  const ppz=G.indoor?G.camTarget.z:G.pz;
  mctx.fillStyle='#fff';
  mctx.beginPath();mctx.arc(ppx*sx,ppz*sz,5,0,Math.PI*2);mctx.fill();
  mctx.fillStyle='#00ffe0';
  mctx.beginPath();mctx.arc(ppx*sx,ppz*sz,3,0,Math.PI*2);mctx.fill();
  mctx.fillStyle='rgba(255,255,255,0.85)';
  mctx.font='bold 8px sans-serif';mctx.textAlign='center';mctx.textBaseline='bottom';
  mctx.fillText('YOU',ppx*sx,ppz*sz-7);
}

// -------------------------------------------------------------
//  INPUT
// -------------------------------------------------------------
function setupInput(){
  document.addEventListener('keydown',e=>{
    if(['ArrowUp','w','W'].includes(e.key))    G.keys.up=true;
    if(['ArrowDown','s','S'].includes(e.key))  G.keys.down=true;
    if(['ArrowLeft','a','A'].includes(e.key))  G.keys.left=true;
    if(['ArrowRight','d','D'].includes(e.key)) G.keys.right=true;
    if(['e','E',' '].includes(e.key)){e.preventDefault();doInteract();}
    if(['f','F'].includes(e.key)){e.preventDefault();openInventory();}
    if(['r','R'].includes(e.key)){e.preventDefault();openPhone();}
    if(['Escape'].includes(e.key)){
      document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));
      closeFullMap();
      G.panelOpen=false;
    }
  });
  document.addEventListener('keyup',e=>{
    if(['ArrowUp','w','W'].includes(e.key))    G.keys.up=false;
    if(['ArrowDown','s','S'].includes(e.key))  G.keys.down=false;
    if(['ArrowLeft','a','A'].includes(e.key))  G.keys.left=false;
    if(['ArrowRight','d','D'].includes(e.key)) G.keys.right=false;
  });

  // Joystick
  const zone=document.getElementById('joystick-zone');
  const knob=document.getElementById('joy-knob');
  if(!zone||!knob)return;
  let active=false,startX=0,startY=0;
  const onStart=e=>{
    active=true;const t=e.touches?e.touches[0]:e;
    const r=zone.getBoundingClientRect();startX=r.left+r.width/2;startY=r.top+r.height/2;
    e.preventDefault();
  };
  const onMove=e=>{
    if(!active)return;const t=e.touches?e.touches[0]:e;
    const dx=t.clientX-startX,dz=t.clientY-startY;
    const dist=Math.hypot(dx,dz),max=45,cl=Math.min(dist,max);
    const angle=Math.atan2(dz,dx);
    knob.style.transform=`translate(calc(-50% + ${Math.cos(angle)*cl}px),calc(-50% + ${Math.sin(angle)*cl}px))`;
    const dead=12;
    G.keys.up=dz<-dead;G.keys.down=dz>dead;G.keys.left=dx<-dead;G.keys.right=dx>dead;
    e.preventDefault();
  };
  const onEnd=()=>{active=false;knob.style.transform='translate(-50%,-50%)';G.keys={up:false,down:false,left:false,right:false};};
  zone.addEventListener('touchstart',onStart,{passive:false});
  document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('touchend',onEnd);
}

// -------------------------------------------------------------
//  AIRPORT WAIT TIMER
// -------------------------------------------------------------
let _airportInterval=null;
function startAirportTimer(){
  if(_airportInterval)return;
  _airportInterval=setInterval(()=>{
    airportTimer+=1;
    if(airportTimer>=HOUR_SEC*2){
      clearInterval(_airportInterval);_airportInterval=null;
      airportWaiting=false;
      showDlg('✈️ Boarding','Your flight is boarding now!',null,()=>doEnding('home'));
    }
  },1000);
}

// -------------------------------------------------------------
//  GAME LOOP
// -------------------------------------------------------------
let _raf;
function loop(ts){
  const dt=Math.min((ts-(G.prevTs||ts))/1000,0.05);
  G.prevTs=ts;

  if(!G.gameOver){
    updateMovement(dt);
    updateCamera(dt);
    if(!G.indoor){ updateNPCs(dt); updateBirds(dt); updateTrafficLights(dt); }
    else updateIndoorNPCs(dt);
    updateTime(dt);
    if(airportWaiting) startAirportTimer();
    if(G.money<=0&&!G.parentsCalledYou){
      G.parentsCalledYou=true;
      setTimeout(()=>showDlg('📞 Mom calling','"Honey, are you okay?\nWe\'re booking you a ticket home."',null,()=>doEnding('broke')),1000);
    }
  }

  // Render active scene
  renderer.render(scene, camera);
  drawMinimap();
  _raf=requestAnimationFrame(loop);
}

// -------------------------------------------------------------
//  START
// -------------------------------------------------------------
function startGame(){
  document.getElementById('minimap').style.display='block';
  setScreen('game');
  initG();
  initThree();
  scene=outdoorScene;
  playerGroup.position.set(G.px,0,G.pz);
  scene.add(playerGroup);
  setupInput();
  updateStats();
  G.prevTs=0;
  requestAnimationFrame(ts=>{
    G.prevTs=ts;
    _raf=requestAnimationFrame(loop);
  });
  setTimeout(()=>showDlg('📖 Narrator',
    'A city full of choices.\n\nYou have $1,000s.\n\nYour life has begun.',
    null,()=>showDlg('📖 Narrator',
      'The far country is full of bright lights\nand empty promises.\n\nHow you spend your days\nwill determine how this ends.\n\nWASD to move · E to interact.',
      null,null)
  ),500);
}


