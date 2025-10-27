import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { NPC } from './npc.js';
import { Skill, createSkillFromDescription } from './skill.js';

// メインのコード

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(0,3,6);
const hemi = new THREE.HemisphereLight(0xffffff,0x444455,1.0); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff,0.6); dir.position.set(5,10,7); scene.add(dir);

// ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x6b8e23}));
ground.rotation.x = -Math.PI/2; scene.add(ground);

// 簡易な街（建物の列）
function makeBuilding(x,z,h,color=0x8d6e63){
	const geom = new THREE.BoxGeometry(2, h, 2);
	const mat = new THREE.MeshStandardMaterial({color});
	const m = new THREE.Mesh(geom, mat);
	m.position.set(x, h/2, z);
	scene.add(m);
	return m;
}
// 敷地に建物を配置
for(let i=-3;i<=3;i++){
	for(let j=0;j<4;j++){
		const h = 2 + Math.floor(Math.random()*6);
		makeBuilding(i*4, -10 - j*6, h, 0x8d6e63 + (Math.random()*0x333333|0));
	}
}

// プレイヤー（簡易ボックス）と TPS カメラ追従
const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.8,0.6), new THREE.MeshStandardMaterial({color:0x1565c0}));
playerMesh.position.set(0,0.9,0); scene.add(playerMesh);

// プレイヤーデータ
const player = {
	name:'Player',
	sp: 120,
	skills: [],
	weapon: null
};

// 初期スキルテンプレを新ジョブに更新
const skillTemplates = {
	dual: [{name:'旋風双刃', baseCost:7, basePower:24, costExponent:1.7, powerDiminish:0.58}],      // 双剣士
	firework: [{name:'爆花術', baseCost:6, basePower:20, costExponent:1.6, powerDiminish:0.62}],    // 花火師
	hunter: [{name:'狙撃術', baseCost:8, basePower:28, costExponent:1.85, powerDiminish:0.56}],     // 狩人
};

// HUD 更新
const spEl = document.getElementById('player-sp');
const skillsEl = document.getElementById('skills');
function updateHUD(){
	spEl.textContent = player.sp;
	skillsEl.innerHTML = '';
	player.skills.forEach((s,idx)=>{
		const b = document.createElement('button');
		b.className='skill-btn';
		b.textContent = `${s.name} Lv${s.level} → cost:${s.costForNextLevel()}`;
		b.addEventListener('click',()=>{ const cost = s.costForNextLevel(); if(player.sp>=cost){player.sp-=cost; s.levelUp(); updateHUD();}});
		skillsEl.appendChild(b);
	});
}
updateHUD();

// NPC 群（デバッグ用）
const npcs = [];
for(let i=0;i<4;i++){
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.6,0.6), new THREE.MeshStandardMaterial({color:0xb71c1c}));
	mesh.position.set((i-1.5)*3,0.8,-8);
	scene.add(mesh);
	const npc = new NPC({name:`NPC_${i+1}`, initialSP:60 + i*20, skillDefs:[{name:'基本', baseCost:5, basePower:10}] , mesh});
	npc.buildUntilExhausted({randomness:0.05});
	npcs.push(npc);
}

// NPC ラベル DOM
// 変更：npcLabels はラベルと吹き出しのペアにする
const npcLabels = npcs.map(n=>{
	const label = document.createElement('div'); label.className='npc-label'; document.body.appendChild(label);
	const speech = document.createElement('div'); speech.className='npc-speech hidden'; document.body.appendChild(speech);
	return {n, label, speech};
});

// カメラ追従パラメータ
let yaw = 0;
const targetOffset = new THREE.Vector3(0,1.3,0);
const cameraOffset = new THREE.Vector3(0,2.5,6);

const keys = {w:false,a:false,s:false,d:false};
window.addEventListener('keydown',(e)=>{ if(e.key==='w') keys.w=true; if(e.key==='a') keys.a=true; if(e.key==='s') keys.s=true; if(e.key==='d') keys.d=true; });
window.addEventListener('keyup',(e)=>{ if(e.key==='w') keys.w=false; if(e.key==='a') keys.a=false; if(e.key==='s') keys.s=false; if(e.key==='d') keys.d=false; });

const lockBtn = document.getElementById('lock-btn');
lockBtn.addEventListener('click',()=>{ canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange',()=>{ const locked = document.pointerLockElement===canvas; lockBtn.style.display = locked ? 'none' : 'block'; });
document.addEventListener('mousemove',(e)=>{ if(document.pointerLockElement!==canvas) return; yaw -= e.movementX*0.002; });

// ウインドウリサイズ
window.addEventListener('resize', onWindowResize);
function onWindowResize(){ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
onWindowResize();

// NPC 自律（巡回）
function updateNPCs(dt){
	npcs.forEach((entry, i)=>{
		if(!entry.mesh) return;
		const t = performance.now()*0.001 + i*10;
		entry.mesh.position.x = Math.sin(t*0.5 + i) * 3 + (i-1.5)*3;
		entry.mesh.position.z = -8 + Math.cos(t*0.3)*2;
	});
}

// コマンドバー操作
const cmdBar = document.getElementById('command-bar');
const cmdInput = document.getElementById('command-input');
let cmdActive = false;
window.addEventListener('keydown',(e)=>{
	if(e.key === '/' && !cmdActive && document.activeElement !== cmdInput){
		e.preventDefault();
		showCommandBar();
	}
	if(e.key === 'Escape' && cmdActive){ hideCommandBar(); }
});
function showCommandBar(){ cmdBar.classList.remove('hidden'); cmdInput.focus(); cmdActive = true; cmdInput.value = ''; }
function hideCommandBar(){ cmdBar.classList.add('hidden'); cmdInput.blur(); cmdActive = false; }

// シンプルなコマンドパーサ
cmdInput.addEventListener('keydown',(e)=>{
	if(e.key === 'Enter'){
		const raw = cmdInput.value.trim();
		if(raw) runCommand(raw);
		hideCommandBar();
	}
});
function runCommand(line){
	const parts = line.split(/\s+/);
	const cmd = parts[0].toLowerCase();
	if(cmd === '/skill' || cmd === 'skill'){
		if(parts[1] === 'build'){
			// 画面に質問を出す（簡易：prompt を使用）
			const desc = window.prompt('どのようなスキルを生成しますか？（説明を入力）');
			if(desc && desc.trim()){
				const sk = createSkillFromDescription(desc.trim());
				// 初期レベルを1にして所持スキルへ追加
				sk.levelUp();
				player.skills.push(sk);
				updateHUD();
				alert(`スキル「${sk.name}」を生成しました`);
			}
			return;
		}
	}
	if(cmd === '/give' || cmd === 'give'){
		// give sp 50
		if(parts[1] === 'sp' && parts[2]){ const n = parseInt(parts[2],10)||0; player.sp += n; updateHUD(); }
	} else if(cmd === 'spawn'){
		// spawn npc
		if(parts[1] === 'npc'){
			const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.6,0.6), new THREE.MeshStandardMaterial({color:0x4caf50}));
			mesh.position.copy(playerMesh.position).add(new THREE.Vector3(0,0,-3));
			scene.add(mesh);
			const npc = new NPC({name:`NPC_spawned`, initialSP:50, skillDefs:[{name:'臨時', baseCost:4, basePower:8}], mesh});
			npcs.push(npc);
			const label = document.createElement('div'); label.className='npc-label'; document.body.appendChild(label);
			const speech = document.createElement('div'); speech.className='npc-speech hidden'; document.body.appendChild(speech);
			npcLabels.push({n:npc,label,speech});
		}
	} else if(cmd === 'teleport' || cmd === 'tp'){
		// tp x z
		const x = parseFloat(parts[1])||0; const z = parseFloat(parts[2])||0;
		playerMesh.position.set(x, 0.9, z);
	} else if(cmd === 'npc'){
		// npc say <index> <message...>
		if(parts[1] === 'say' && parts[2]){
			const idx = parseInt(parts[2],10) - 1;
			const msg = parts.slice(3).join(' ');
			if(!isNaN(idx) && npcLabels[idx]){
				npcLabels[idx].n.speak(msg || '...'); // デフォルト
			} else {
				alert('NPC番号が不正です');
			}
		}
	} else if(cmd === 'jobs' || cmd === '/jobs'){
		alert('利用可能な職業: sniper, warrior, mage\n選択: selectjob <name>');
	} else if(cmd === 'selectjob' || cmd === 'job'){
		const name = parts[1];
		if(name && skillTemplates[name]){
			applyJob(name);
			alert(`職業 ${name} を選択しました`);
		}
	} else {
		alert('不明なコマンド: ' + line);
	}
}

// 職業適用（初期スキル・武器） — 既存関数を流用して weapon 名などを設定
function applyJob(jobKey){
	const defs = skillTemplates[jobKey] || [];
	player.skills = defs.map(d=> new Skill(d));
	// 武器設定（日本語表示）
	if(jobKey === 'dual'){
		player.weapon = '双剣';
	} else if(jobKey === 'firework'){
		player.weapon = '花火筒';
	} else if(jobKey === 'hunter'){
		player.weapon = '長弓';
	} else {
		player.weapon = null;
	}
	localStorage.setItem('hasChosenJob','1');
	updateHUD();
}

// 初回職業選択モーダル制御
const jobModal = document.getElementById('job-modal');
const jobBtns = document.querySelectorAll('.job-btn');

// 次へを押すとオープニングを閉じて職業選択を表示
jobBtns.forEach(b=>{
	b.addEventListener('click', ()=>{ 
		const j = b.dataset.job; 
		applyJob(j); 
		jobModal.classList.add('hidden'); 
	});
});

// --- オープニング用：タイプライター・ページ送りの実装 ---
const openingModal = document.getElementById('opening-modal');
const openingTextEl = document.getElementById('opening-text');
const openingNext = document.getElementById('opening-next');

// 簡易 sleep
function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

// テキストをタイプライターで表示する。speed(ms/char)。
// 途中で skipRequested を true にすると即座に完了する。
let skipRequested = false;
async function typeText(el, text, speed = 36){
	el.textContent = '';
	el.classList.remove('fade-in','fade-out');
	el.classList.add('fade-in');
	for(let i=0;i<text.length;i++){
		if(skipRequested){ el.textContent = text; break; }
		el.textContent += text[i];
		await sleep(speed);
	}
	// 少し余韻
	await sleep(300);
}

// オープニングの複数ページを自動で送り、終了後に職業選択を開く。
// pages: array of {text, wait} wait は表示維持時間(ms)。
async function playOpeningSequence(pages = []){
	openingModal.classList.remove('hidden');
	skipRequested = false;
	for(let i=0;i<pages.length;i++){
		openingTextEl.textContent = '';
		await typeText(openingTextEl, pages[i].text, 28);
		// wait: 自動進行までの時間。途中 skip されたら早送り。
		const waitMs = pages[i].wait || 1800;
		let elapsed = 0;
		const step = 100;
		while(elapsed < waitMs && !skipRequested){
			await sleep(step);
			elapsed += step;
		}
		if(skipRequested) break;
	}
	openingModal.classList.add('hidden');
	// 次はキャラメイク → 名前 → 職業の順
	charModal.classList.remove('hidden');
	updateCharPreview();
}

// openingNext ボタンでスキップを通知（次へで即座に職業選択へ）
openingNext.addEventListener('click', ()=>{
	skipRequested = true;
});

// --- 新規: キャラメイク / 名前入力用 DOM 参照と制御 ---
const charModal = document.getElementById('charmake-modal');
const chHeight = document.getElementById('ch-height');
const chHeightVal = document.getElementById('ch-height-val');
const chColorBtns = document.querySelectorAll('.ch-color-btn');
const chPreview = document.getElementById('ch-preview');
const chNext = document.getElementById('ch-next');

const nameModal = document.getElementById('name-modal');
const nameInput = document.getElementById('name-input');
const nameNext = document.getElementById('name-next');

// キャラメイク初期値
let selectedColor = '#1565c0';
let selectedHeight = parseFloat(chHeight.value) || 1.0;

// プレビュー更新（DOM とプレイヤーに反映）
function updateCharPreview(){
	chHeightVal.textContent = selectedHeight.toFixed(2);
	chPreview.style.background = selectedColor;
	// プレイヤーメッシュに反映（高さは scale.y）
	if(playerMesh){
		playerMesh.material.color.set(selectedColor);
		playerMesh.scale.y = selectedHeight;
		// 足元を維持
		playerMesh.position.y = 0.9 * selectedHeight;
	}
	// カラー選択 UI 更新
	chColorBtns.forEach(btn => {
		btn.classList.toggle('active', btn.dataset.color === selectedColor);
	});
}
chColorBtns.forEach(btn=>{
	btn.addEventListener('click', ()=>{ selectedColor = btn.dataset.color; updateCharPreview(); });
});
chHeight.addEventListener('input', ()=>{ selectedHeight = parseFloat(chHeight.value); updateCharPreview(); });

// 次へ（キャラメイク完了 -> 名前入力へ）
chNext.addEventListener('click', ()=>{
	// 反映済みの状態でキャラメイクを閉じて名前入力へ
	charModal.classList.add('hidden');
	nameModal.classList.remove('hidden');
	nameInput.focus();
});

// 名前決定 -> 職業選択表示
nameNext.addEventListener('click', ()=>{
	const n = (nameInput.value || '').trim();
	if(n.length === 0){
		alert('名前を入力してください');
		nameInput.focus();
		return;
	}
	player.name = n;
	nameModal.classList.add('hidden');
	jobModal.classList.remove('hidden');
});

// （その他既存コードはそのまま）

// アニメーションループ
let last = performance.now();
function animate(){
	const now = performance.now();
	const dt = (now - last)/1000; last = now;

	// player input movement
	playerMesh.rotation.y = yaw;
	let dir = new THREE.Vector3();
	if(keys.w) dir.z -= 1;
	if(keys.s) dir.z += 1;
	if(keys.a) dir.x -= 1;
	if(keys.d) dir.x += 1;
	if(dir.lengthSq()>0){
		dir.normalize();
		const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
		const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
		const move = forward.multiplyScalar(-dir.z).add(right.multiplyScalar(dir.x));
		move.multiplyScalar(4*dt);
		playerMesh.position.add(move);
	}

	// camera follow
	const targetPos = playerMesh.position.clone().add(targetOffset);
	const desiredCamPos = playerMesh.position.clone().add(new THREE.Vector3(Math.sin(yaw)*cameraOffset.z, cameraOffset.y, Math.cos(yaw)*cameraOffset.z));
	camera.position.lerp(desiredCamPos, Math.min(1,8*dt));
	camera.lookAt(targetPos);

	updateNPCs(dt);

	// update npc labels & speech screen pos & text
	for(let i=0;i<npcLabels.length;i++){
		const entry = npcLabels[i];
		const mesh = entry.n ? entry.n.mesh : null;
		if(!mesh) continue;
		const pos = mesh.position.clone().add(new THREE.Vector3(0,2.2,0));
		const v = pos.project(camera);
		const x = (v.x*0.5 + 0.5) * window.innerWidth;
		const y = (-v.y*0.5 + 0.5) * window.innerHeight;
		entry.label.style.transform = `translate(${x}px, ${y}px)`;
		entry.label.textContent = `${entry.n.name} SP:${entry.n.sp}`;

		// 吹き出しの表示管理
		if(entry.n.isSpeaking()){
			entry.speech.classList.remove('hidden');
			entry.speech.textContent = entry.n.speech;
			// 少し上に表示
			entry.speech.style.transform = `translate(${x}px, ${y - 26}px)`;
		} else {
			entry.speech.classList.add('hidden');
		}
	}

	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}
animate();