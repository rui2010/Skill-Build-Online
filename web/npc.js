import { Skill } from './skill.js';
export class NPC {
	constructor({ name, initialSP = 100, skillDefs = [], mesh = null }) {
		this.name = name;
		this.sp = initialSP;
		this.skills = skillDefs.map(def => new Skill(def));
		this.mesh = mesh;
		// 発話管理
		this.speech = '';
		this.speechExpire = 0; // performance.now() ミリ秒で管理
	}
	buildUntilExhausted({ randomness = 0.05 } = {}) {
		while (true) {
			const options = this.skills.map(skill => {
				const cost = skill.costForNextLevel();
				const benefit = skill.marginalBenefitForNextLevel();
				const noise = 1 + (Math.random() * 2 - 1) * randomness;
				return { skill, cost, benefit, score: (benefit * noise) / cost };
			}).filter(opt => opt.cost <= this.sp && opt.benefit > 0);
			if (options.length === 0) break;
			options.sort((a,b)=>b.score-a.score);
			const best = options[0];
			if (best.score <= 1e-6) break;
			this.sp -= best.cost;
			best.skill.levelUp();
		}
	}
	summary(){ return { name: this.name, remainingSP: this.sp, skills: this.skills.map(s=>s.status()) }; }

	// 新規：吹き出しで喋る（duration は秒）
	speak(text, duration = 3) {
		this.speech = String(text || '');
		this.speechExpire = performance.now() + Math.max(0.5, duration) * 1000;
	}
	// 現在発話中かどうか
	isSpeaking() {
		return performance.now() < this.speechExpire;
	}
}