const { Skill } = require('./skill');

class NPC {
	constructor({ name, initialSP = 100, skillDefs = [] }) {
		this.name = name;
		this.sp = initialSP;
		// skillDefs: [{name, baseCost, basePower, ...}, ...]
		this.skills = skillDefs.map(def => new Skill(def));
	}

	// 1ターン分（SPが尽きるまで）スキル購入を行う
	buildUntilExhausted({ randomness = 0.05 } = {}) {
		// 繰り返し、購入可能で最も効率の良いスキルを選ぶ
		while (true) {
			// 各スキルの (marginalBenefit / cost) を計算
			const options = this.skills
				.map(skill => {
					const cost = skill.costForNextLevel();
					const benefit = skill.marginalBenefitForNextLevel();
					// ノイズを少し加えて多様性を出す
					const noise = 1 + (Math.random() * 2 - 1) * randomness;
					const score = (benefit * noise) / cost;
					return { skill, cost, benefit, score };
				})
				.filter(opt => opt.cost <= this.sp && opt.benefit > 0);

			if (options.length === 0) break;

			// スコア最大のものを選ぶ（ランダムにタイブレーク）
			options.sort((a, b) => b.score - a.score);
			const best = options[0];

			// 安全チェック：もしscoreが非常に小さい（コスパが悪い）なら停止
			if (best.score <= 1e-6) break;

			// 購入
			this.sp -= best.cost;
			best.skill.levelUp();
		}
	}

	// ビルドの要約を返す
	summary() {
		return {
			name: this.name,
			remainingSP: this.sp,
			skills: this.skills.map(s => s.status()),
		};
	}
}

module.exports = { NPC };
