import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { Skill } from './skill.js';
import { NPC } from './npc.js';

// メインのコード

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// カメラ（TPS: プレイヤー後方から追従）
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 6);

// ライト
const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);

// 地面
const ground = new THREE.Mesh(
	new THREE.PlaneGeometry(200, 200),
	new THREE.MeshStandardMaterial({ color: 0x3a6b3a })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// プレイヤー
const player = new THREE.Mesh(
	new THREE.BoxGeometry(0.8, 1.8, 0.6),
	new THREE.MeshStandardMaterial({ color: 0x1565c0 })
);
player.position.set(0, 0.9, 0);
scene.add(player);

// プレイヤーのビルド（SPとスキル）
const playerSkillsDef = [
	{ name: 'スナイプ', baseCost: 8, basePower: 30, costExponent: 1.9, powerDiminish: 0.55 },
	{ name: '連射', baseCost: 6, basePower: 18, costExponent: 1.6, powerDiminish: 0.6 },
	{ name: '防御強化', baseCost: 5, basePower: 12, costExponent: 1.5, powerDiminish: 0.7 },
	{ name: '支援魔法', baseCost: 7, basePower: 20, costExponent: 1.8, powerDiminish: 0.6 },
];
const playerNPC = new NPC({ name: 'Player', initialSP: 120, skillDefs: playerSkillsDef });

// NPC群を生成
const npcs = [];
for (let i = 0; i < 3; i++) {
	const mesh = new THREE.Mesh(
		new THREE.BoxGeometry(0.8, 1.6, 0.6),
		new THREE.MeshStandardMaterial({ color: 0xb71c1c })
	);
	mesh.position.set((i - 1) * 4, 0.8, -6 - i * 3);
	scene.add(mesh);
	const npc = new NPC({ name: `NPC_${i + 1}`, initialSP: 80 + i * 30, skillDefs: playerSkillsDef, mesh });
	npc.buildUntilExhausted({ randomness: 0.08 });
	npcs.push(npc);
}

// UI 要素
const spEl = document.getElementById('player-sp');
const skillsEl = document.getElementById('skills');
const lockBtn = document.getElementById('lock-btn');

function renderSkillButtons() {
	skillsEl.innerHTML = '';
	playerNPC.skills.forEach((s, idx) => {
		const btn = document.createElement('button');
		btn.className = 'skill-btn';
		const cost = s.costForNextLevel();
		btn.textContent = `${s.name} Lv${s.level} → cost:${cost}`;
		if (cost > playerNPC.sp) btn.disabled = true;
		btn.addEventListener('click', () => {
			if (playerNPC.sp >= cost) {
				playerNPC.sp -= cost;
				s.levelUp();
				updateHUD();
			}
		});
		skillsEl.appendChild(btn);
	});
}

function updateHUD() {
	spEl.textContent = playerNPC.sp;
	renderSkillButtons();
}

// シンプルなラベル表示 for NPC
const labels = [];
npcs.forEach((n) => {
	const div = document.createElement('div');
	div.className = 'npc-label';
	div.textContent = `${n.name} SP:${n.sp}`;
	document.body.appendChild(div);
	labels.push({ node: div, npc: n });
});

// カメラ追従パラメータ
let yaw = 0;
const targetOffset = new THREE.Vector3(0, 1.5, 0);
const cameraOffset = new THREE.Vector3(0, 2.5, 6);

const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => { if (e.key === 'w') keys.w = true; if (e.key === 'a') keys.a = true; if (e.key === 's') keys.s = true; if (e.key === 'd') keys.d = true; });
window.addEventListener('keyup', (e) => { if (e.key === 'w') keys.w = false; if (e.key === 'a') keys.a = false; if (e.key === 's') keys.s = false; if (e.key === 'd') keys.d = false; });

// ポインタロックでマウス回転
lockBtn.addEventListener('click', () => {
	canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
	const locked = document.pointerLockElement === canvas;
	lockBtn.style.display = locked ? 'none' : 'block';
});
document.addEventListener('mousemove', (e) => {
	if (document.pointerLockElement !== canvas) return;
	yaw -= e.movementX * 0.002;
});

// ウィンドウリサイズ
window.addEventListener('resize', onWindowResize);
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}
onWindowResize();

// 簡単なNPC移動（巡回）
function updateNPCs(dt) {
	npcs.forEach((n, i) => {
		if (!n.mesh) return;
		const t = performance.now() * 0.001 + i * 10;
		const x = Math.sin(t * 0.5 + i) * 3 + (i - 1) * 4;
		const z = -6 - i * 3 + Math.cos(t * 0.3) * 2;
		n.mesh.position.x = x;
		n.mesh.position.z = z;
	});
}

// メインループ
let last = performance.now();
function animate() {
	const now = performance.now();
	const dt = (now - last) / 1000;
	last = now;

	// プレイヤー回転と移動
	player.rotation.y = yaw;
	let dir = new THREE.Vector3();
	if (keys.w) dir.z -= 1;
	if (keys.s) dir.z += 1;
	if (keys.a) dir.x -= 1;
	if (keys.d) dir.x += 1;
	if (dir.lengthSq() > 0) {
		dir.normalize();
		// ローカル回転をワールドに変換
		const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
		const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
		const move = forward.multiplyScalar(-dir.z).add(right.multiplyScalar(dir.x));
		move.multiplyScalar(4 * dt); // speed
		player.position.add(move);
	}

	// カメラ追従（滑らかに）
	const targetPos = player.position.clone().add(targetOffset);
	const desiredCamPos = player.position.clone().add(new THREE.Vector3(
		Math.sin(yaw) * cameraOffset.z,
		cameraOffset.y,
		Math.cos(yaw) * cameraOffset.z
	));
	camera.position.lerp(desiredCamPos, Math.min(1, 8 * dt));
	camera.lookAt(targetPos);

	// NPC 更新
	updateNPCs(dt);

	// ラベルのスクリーン位置更新
	labels.forEach(({ node, npc }) => {
		const pos = npc.mesh ? npc.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0)) : new THREE.Vector3();
		const v = pos.project(camera);
		const x = (v.x * 0.5 + 0.5) * window.innerWidth;
		const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
		node.style.transform = `translate(${x}px, ${y}px)`;
		node.textContent = `${npc.name} SP:${npc.sp}`;
	});

	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

// 初期 HUD 表示
updateHUD();
animate();