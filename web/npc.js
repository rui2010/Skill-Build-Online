import { Skill } from './skill.js';

export class NPC {
	constructor({ name, initialSP = 100, skillDefs = [], mesh = null }) {
		this.name = name;
		this.sp = initialSP;
		this.skills = skillDefs.map(def => new Skill(def));
		this.mesh = mesh; // THREE.Mesh 参照（任意）
	}

	buildUntilExhausted({ randomness = 0.05 } = {}) {
		while (true) {
			const options = this.skills
				.map(skill => {
					const cost = skill.costForNextLevel();
					const benefit = skill.marginalBenefitForNextLevel();
					const noise = 1 + (Math.random() * 2 - 1) * randomness;
					const score = (benefit * noise) / cost;
					return { skill, cost, benefit, score };
				})
				.filter(opt => opt.cost <= this.sp && opt.benefit > 0);

			if (options.length === 0) break;
			options.sort((a, b) => b.score - a.score);
			const best = options[0];
			if (best.score <= 1e-6) break;
			this.sp -= best.cost;
			best.skill.levelUp();
		}
	}

	summary() {
		return {
			name: this.name,
			remainingSP: this.sp,
			skills: this.skills.map(s => s.status()),
		};
	}
}