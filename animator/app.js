// VTuber Animator: drives a VRM character from a webcam or a recorded video
// and records the result as a video with a solid (green-screen) background.
//
// Pipeline per frame:
//   video frame -> MediaPipe (face + pose landmarks) -> Kalidokit (bone angles)
//   -> VRM humanoid bones / expressions -> three.js render -> MediaRecorder

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { Face, Pose, Utils } from 'kalidokit';
import { FilesetResolver, FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const SAMPLE_VRM = 'https://raw.githubusercontent.com/pixiv/three-vrm/v3.5.5/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

const $ = (id) => document.getElementById(id);
const ui = {
  canvas: $('canvas'), video: $('sourceVideo'), narration: $('narration'), log: $('log'),
  vrmFile: $('vrmFile'), sampleBtn: $('sampleBtn'), webcamBtn: $('webcamBtn'), videoFile: $('videoFile'),
  trackFace: $('trackFace'), trackBody: $('trackBody'), trackLegs: $('trackLegs'), showSource: $('showSource'),
  smoothing: $('smoothing'), lipSource: $('lipSource'), audioFile: $('audioFile'), videoAudio: $('videoAudio'),
  bgColor: $('bgColor'), resolution: $('resolution'), framing: $('framing'), lookAtCam: $('lookAtCam'),
  recordBtn: $('recordBtn'), recordVideoBtn: $('recordVideoBtn'), recDot: $('recDot'),
};

function log(msg) {
  console.log(msg);
  ui.log.textContent = `${new Date().toLocaleTimeString()}  ${msg}\n` + ui.log.textContent.slice(0, 2000);
}
window.addEventListener('error', (e) => log(`Error: ${e.message}`));
window.addEventListener('unhandledrejection', (e) => log(`Error: ${e.reason?.message ?? e.reason}`));

// ---------------------------------------------------------------- three.js
const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true });
renderer.setPixelRatio(1); // the canvas size *is* the output video size
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(ui.bgColor.value);

const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 20);
camera.position.set(0, 1.4, 1.5);
const controls = new OrbitControls(camera, ui.canvas);
controls.target.set(0, 1.35, 0);
controls.update();

const keyLight = new THREE.DirectionalLight(0xffffff, Math.PI);
keyLight.position.set(1, 1.5, 2);
scene.add(keyLight, new THREE.AmbientLight(0xffffff, 0.6));

function setResolution() {
  const [w, h] = ui.resolution.value.split('x').map(Number);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
setResolution();
ui.resolution.onchange = () => { setResolution(); frameCharacter(); };
ui.bgColor.oninput = () => scene.background.set(ui.bgColor.value);

// ---------------------------------------------------------------- character
let vrm = null;
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

async function loadVRM(url, name) {
  log(`Loading character ${name}…`);
  const gltf = await loader.loadAsync(url);
  const next = gltf.userData.vrm;
  if (!next) throw new Error('This file is not a VRM model.');
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(next); // VRM 0.x models face the other way; make them face the camera
  next.scene.traverse((o) => { o.frustumCulled = false; });

  if (vrm) {
    scene.remove(vrm.scene);
    VRMUtils.deepDispose(vrm.scene);
  }
  vrm = next;
  scene.add(vrm.scene);
  applyLookAt();
  frameCharacter();
  log(`Loaded ${name} (VRM ${vrm.meta?.metaVersion === '0' ? '0.x' : '1.0'}).`);
}

ui.vrmFile.onchange = () => {
  const f = ui.vrmFile.files[0];
  if (f) loadVRM(URL.createObjectURL(f), f.name).catch((e) => log(`Could not load model: ${e.message}`));
};
ui.sampleBtn.onclick = () => loadVRM(SAMPLE_VRM, 'sample character').catch((e) => log(`Could not load sample: ${e.message}`));

function applyLookAt() {
  if (vrm?.lookAt) vrm.lookAt.target = ui.lookAtCam.checked ? camera : undefined;
}
ui.lookAtCam.onchange = applyLookAt;

function bonePos(name) {
  const node = vrm?.humanoid.getNormalizedBoneNode(name);
  return node ? node.getWorldPosition(new THREE.Vector3()) : null;
}

function frameCharacter() {
  if (!vrm) return;
  vrm.scene.updateMatrixWorld(true);
  const head = bonePos('head') ?? new THREE.Vector3(0, 1.4, 0);
  const hips = bonePos('hips') ?? new THREE.Vector3(0, 0.9, 0);
  const portrait = camera.aspect < 1;
  let target, dist;
  switch (ui.framing.value) {
    case 'face': target = head.clone().add(new THREE.Vector3(0, 0.08, 0)); dist = portrait ? 1.4 : 0.85; break;
    case 'full': target = hips.clone(); dist = portrait ? 4.2 : 3.2; break;
    default: target = head.clone().add(new THREE.Vector3(0, -0.12, 0)); dist = portrait ? 2.6 : 1.7;
  }
  controls.target.copy(target);
  camera.position.set(target.x, target.y + 0.02, target.z + dist);
  controls.update();
}
ui.framing.onchange = frameCharacter;

// --------------------------------------------------------------- rig helpers
// Kalidokit angles follow the VRM 0.x axis convention. VRM 1.0 models are
// mirrored around the vertical axis, so X and Z rotations flip sign.
const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();

function rigRotation(boneName, rot, dampener = 1, lerp = 0.3) {
  const bone = vrm?.humanoid.getNormalizedBoneNode(boneName);
  if (!bone || !rot) return;
  const s = vrm.meta?.metaVersion === '0' ? 1 : -1;
  tmpEuler.set(rot.x * dampener * s, rot.y * dampener, rot.z * dampener * s, 'XYZ');
  tmpQuat.setFromEuler(tmpEuler);
  bone.quaternion.slerp(tmpQuat, lerp);
}

const expr = {}; // smoothed expression weights
function setExpression(name, value, lerp = 0.5) {
  const em = vrm?.expressionManager;
  if (!em || !em.getExpression(name)) return;
  const v = THREE.MathUtils.lerp(expr[name] ?? 0, Utils.clamp(value, 0, 1), lerp);
  expr[name] = v;
  em.setValue(name, v);
}

const remap = (v, lo, hi) => Utils.clamp((v - lo) / (hi - lo), 0, 1);

// ------------------------------------------------------------ motion source
let faceLandmarker = null;
let poseLandmarker = null;
let sourceKind = null; // 'webcam' | 'file'

async function initTrackers() {
  if (faceLandmarker && poseLandmarker) return;
  log('Loading face & body trackers (first time takes a few seconds)…');
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  const create = async (delegate) => {
    const base = (path) => ({ modelAssetPath: path, delegate });
    faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: base(FACE_MODEL), runningMode: 'VIDEO', numFaces: 1,
      outputFaceBlendshapes: true,
    });
    poseLandmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: base(POSE_MODEL), runningMode: 'VIDEO', numPoses: 1,
    });
  };
  try {
    await create('GPU');
  } catch (e) {
    log(`GPU tracking unavailable (${e.message}); using CPU.`);
    await create('CPU');
  }
  log('Trackers ready.');
}

function stopWebcam() {
  const stream = ui.video.srcObject;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  ui.video.srcObject = null;
}

ui.webcamBtn.onclick = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    log('The browser blocks the webcam on this address. Start the page with start.py and open http://localhost:8000');
    return;
  }
  try {
    ensureAudio();
    await initTrackers();
    stopWebcam();
    ui.video.removeAttribute('src');
    ui.video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 }, audio: false,
    });
    ui.video.muted = true;
    ui.video.loop = false;
    ui.video.classList.remove('file');
    await ui.video.play();
    sourceKind = 'webcam';
    updateSourceVisibility();
    ui.recordVideoBtn.disabled = true;
    log('Webcam running. Sit so your head and shoulders are visible.');
  } catch (e) {
    log(`Webcam failed: ${e.message}`);
  }
};

ui.videoFile.onchange = async () => {
  const f = ui.videoFile.files[0];
  if (!f) return;
  try {
    ensureAudio();
    await initTrackers();
    stopWebcam();
    ui.video.src = URL.createObjectURL(f);
    ui.video.muted = false;
    ui.video.loop = true;
    ui.video.classList.add('file');
    await ui.video.play();
    sourceKind = 'file';
    updateSourceVisibility();
    ui.recordVideoBtn.disabled = false;
    log(`Playing ${f.name}. Use "Record whole video file" to capture it from start to end.`);
  } catch (e) {
    log(`Could not play video: ${e.message}`);
  }
};

const updateSourceVisibility = () => ui.video.classList.toggle('hidden', !ui.showSource.checked || !sourceKind);
ui.showSource.onchange = updateSourceVisibility;
updateSourceVisibility();

// ------------------------------------------------------------------- audio
// One AudioContext routes: video sound + narration -> speakers + recording,
// and feeds an analyser that drives the mouth for audio lip sync.
let audioCtx = null, recDest = null, lipAnalyser = null, videoGain = null, micSource = null;
const lipBuf = new Float32Array(1024);

function ensureAudio() {
  if (audioCtx) { audioCtx.resume(); return; }
  audioCtx = new AudioContext();
  recDest = audioCtx.createMediaStreamDestination();
  lipAnalyser = audioCtx.createAnalyser();
  lipAnalyser.fftSize = 1024;

  videoGain = audioCtx.createGain();
  audioCtx.createMediaElementSource(ui.video).connect(videoGain);
  videoGain.connect(audioCtx.destination);
  videoGain.connect(recDest);
  updateVideoGain();

  const narr = audioCtx.createMediaElementSource(ui.narration);
  narr.connect(audioCtx.destination);
  narr.connect(recDest);
  narr.connect(lipAnalyser);
}
function updateVideoGain() {
  if (videoGain) videoGain.gain.value = ui.videoAudio.checked ? 1 : 0;
}
ui.videoAudio.onchange = updateVideoGain;

ui.audioFile.onchange = () => {
  const f = ui.audioFile.files[0];
  if (!f) return;
  ensureAudio();
  ui.narration.src = URL.createObjectURL(f);
  ui.lipSource.value = 'narration';
  log(`Narration loaded: ${f.name}. It plays when you record (or press Space to preview).`);
};

ui.lipSource.onchange = async () => {
  ensureAudio();
  if (ui.lipSource.value === 'mic' && !micSource) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micSource = audioCtx.createMediaStreamSource(stream);
      micSource.connect(lipAnalyser);
      micSource.connect(recDest); // not to speakers, to avoid feedback
      log('Microphone lip sync on.');
    } catch (e) {
      log(`Microphone failed: ${e.message}`);
    }
  }
};

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body && ui.narration.src) {
    e.preventDefault();
    ensureAudio();
    ui.narration.paused ? ui.narration.play() : ui.narration.pause();
  }
});

function audioLevel() {
  lipAnalyser.getFloatTimeDomainData(lipBuf);
  let sum = 0;
  for (const v of lipBuf) sum += v * v;
  return Math.sqrt(sum / lipBuf.length);
}

// ----------------------------------------------------------------- tracking
let lastVideoTime = -1;
let lastFaceSeen = -Infinity;
let lastPoseSeen = -Infinity;

function track(now) {
  const v = ui.video;
  if (!sourceKind || v.readyState < 2 || v.currentTime === lastVideoTime) return;
  lastVideoTime = v.currentTime;
  const lerp = 1 - Number(ui.smoothing.value);
  const opts = { runtime: 'mediapipe', video: v };

  if (ui.trackFace.checked) {
    const res = faceLandmarker.detectForVideo(v, now);
    const lm = res.faceLandmarks?.[0];
    if (lm) {
      lastFaceSeen = now;
      const face = Face.solve(lm, opts);
      if (face) {
        rigRotation('neck', face.head, 0.7, lerp);
        rigRotation('head', face.head, 0.3, lerp);
      }
      const bs = Object.fromEntries((res.faceBlendshapes?.[0]?.categories ?? []).map((c) => [c.categoryName, c.score]));
      applyFaceExpressions(bs);
    }
  }

  if (ui.trackBody.checked) {
    const res = poseLandmarker.detectForVideo(v, now);
    const lm2d = res.landmarks?.[0];
    const lm3d = res.worldLandmarks?.[0];
    if (lm2d && lm3d) {
      const pose = Pose.solve(lm3d, lm2d, { ...opts, enableLegs: ui.trackLegs.checked });
      if (pose) {
        lastPoseSeen = now;
        rigRotation('hips', pose.Hips.rotation, 0.5, lerp);
        rigRotation('chest', pose.Spine, 0.25, lerp);
        rigRotation('spine', pose.Spine, 0.45, lerp);
        rigRotation('rightUpperArm', pose.RightUpperArm, 1, lerp);
        rigRotation('rightLowerArm', pose.RightLowerArm, 1, lerp);
        rigRotation('leftUpperArm', pose.LeftUpperArm, 1, lerp);
        rigRotation('leftLowerArm', pose.LeftLowerArm, 1, lerp);
        rigRotation('rightHand', pose.RightHand, 1, lerp);
        rigRotation('leftHand', pose.LeftHand, 1, lerp);
        if (ui.trackLegs.checked) {
          rigRotation('rightUpperLeg', pose.RightUpperLeg, 1, lerp);
          rigRotation('rightLowerLeg', pose.RightLowerLeg, 1, lerp);
          rigRotation('leftUpperLeg', pose.LeftUpperLeg, 1, lerp);
          rigRotation('leftLowerLeg', pose.LeftLowerLeg, 1, lerp);
        }
      }
    }
  }
}

// MediaPipe returns 52 ARKit-style blendshape scores (0..1); map them onto
// the standard VRM expressions every VRoid model has.
function applyFaceExpressions(bs) {
  const l = remap(bs.eyeBlinkLeft ?? 0, 0.35, 0.75);
  const r = remap(bs.eyeBlinkRight ?? 0, 0.35, 0.75);
  if (Math.abs(l - r) < 0.3) {
    setExpression('blink', (l + r) / 2, 0.7);
    setExpression('blinkLeft', 0); setExpression('blinkRight', 0);
  } else { // a deliberate wink; the camera image is mirrored, so swap sides
    setExpression('blink', 0);
    setExpression('blinkLeft', r, 0.7); setExpression('blinkRight', l, 0.7);
  }
  const smile = ((bs.mouthSmileLeft ?? 0) + (bs.mouthSmileRight ?? 0)) / 2;
  setExpression('happy', remap(smile, 0.25, 0.8), 0.3);
  setExpression('surprised', remap(((bs.browInnerUp ?? 0) + (bs.eyeWideLeft ?? 0)) / 2, 0.4, 0.8), 0.3);

  if (ui.lipSource.value === 'face') {
    setExpression('aa', remap(bs.jawOpen ?? 0, 0.05, 0.5));
    setExpression('oh', remap(bs.mouthFunnel ?? 0, 0.1, 0.5));
    setExpression('ou', remap(bs.mouthPucker ?? 0, 0.3, 0.8));
    setExpression('ee', remap(((bs.mouthStretchLeft ?? 0) + (bs.mouthStretchRight ?? 0)) / 2, 0.1, 0.4));
  }
}

function applyAudioLipSync() {
  const level = audioLevel();
  const open = remap(level, 0.01, 0.12);
  // vary the vowel a little so the mouth does not look like a flapping box
  const wobble = (Math.sin(performance.now() / 90) + 1) / 2;
  setExpression('aa', open * (0.6 + 0.4 * wobble), 0.6);
  setExpression('oh', open * 0.4 * (1 - wobble), 0.6);
  setExpression('ou', 0); setExpression('ee', 0);
}

// When nothing is tracked, keep the character alive: arms down, breathing,
// a slight sway and automatic blinking.
let nextBlink = 0;
function idle(now, t) {
  const lerp = 0.08;
  if (now - lastPoseSeen > 600 || !ui.trackBody.checked) {
    rigRotation('leftUpperArm', { x: 0, y: 0, z: 1.25 }, 1, lerp);
    rigRotation('rightUpperArm', { x: 0, y: 0, z: -1.25 }, 1, lerp);
    rigRotation('leftLowerArm', { x: 0, y: 0, z: 0.1 }, 1, lerp);
    rigRotation('rightLowerArm', { x: 0, y: 0, z: -0.1 }, 1, lerp);
    rigRotation('spine', { x: Math.sin(t * 1.6) * 0.02, y: Math.sin(t * 0.5) * 0.03, z: 0 }, 1, lerp);
    rigRotation('chest', { x: 0, y: 0, z: 0 }, 1, lerp);
    rigRotation('hips', { x: 0, y: 0, z: 0 }, 1, lerp);
  }
  if (now - lastFaceSeen > 600 || !ui.trackFace.checked) {
    rigRotation('neck', { x: Math.sin(t * 0.7) * 0.04, y: Math.sin(t * 0.43) * 0.08, z: Math.sin(t * 0.31) * 0.03 }, 1, lerp);
    rigRotation('head', { x: 0, y: 0, z: 0 }, 1, lerp);
    if (now > nextBlink) nextBlink = now + 2500 + Math.random() * 3000;
    setExpression('blink', nextBlink - now < 120 ? 1 : 0, 0.6);
    if (ui.lipSource.value === 'face') ['aa', 'oh', 'ou', 'ee'].forEach((n) => setExpression(n, 0, 0.3));
  }
}

// ---------------------------------------------------------------- recording
let recorder = null;
let recordChunks = [];

function pickMime() {
  return ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

function startRecording() {
  ensureAudio();
  const stream = ui.canvas.captureStream(30);
  recDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mimeType = pickMime();
  recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
  recordChunks = [];
  recorder.ondataavailable = (e) => e.data.size && recordChunks.push(e.data);
  recorder.onstop = () => {
    const type = recorder.mimeType || 'video/webm';
    const blob = new Blob(recordChunks, { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vtuber-${new Date().toISOString().replace(/[:.]/g, '-')}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
    a.click();
    log(`Saved ${a.download} (${(blob.size / 1e6).toFixed(1)} MB).`);
    ui.recordBtn.textContent = '● Start recording';
    ui.recordBtn.classList.remove('recording');
    ui.recDot.hidden = true;
  };
  recorder.start(1000);
  if (ui.narration.src) { ui.narration.currentTime = 0; ui.narration.play(); }
  ui.recordBtn.textContent = '■ Stop recording';
  ui.recordBtn.classList.add('recording');
  ui.recDot.hidden = false;
  log(`Recording (${recorder.mimeType})…`);
}

function stopRecording() {
  if (recorder?.state === 'recording') recorder.stop();
  ui.narration.pause();
}

ui.recordBtn.onclick = () => (recorder?.state === 'recording' ? stopRecording() : startRecording());

ui.recordVideoBtn.onclick = async () => {
  if (sourceKind !== 'file') return;
  const v = ui.video;
  v.pause();
  v.loop = false;
  v.currentTime = 0;
  await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  startRecording();
  await v.play();
  v.addEventListener('ended', () => { stopRecording(); v.loop = true; v.play(); }, { once: true });
};

// --------------------------------------------------------------- main loop
const timer = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const delta = timer.getDelta();
  const now = performance.now();
  if (vrm) {
    if (faceLandmarker && poseLandmarker) track(now);
    idle(now, timer.getElapsed());
    if (ui.lipSource.value !== 'face' && lipAnalyser) applyAudioLipSync();
    vrm.update(delta);
  }
  controls.update();
  renderer.render(scene, camera);
});

log('Step 1: load your .vrm character (or the sample). Step 2: start the webcam or pick a video.');
