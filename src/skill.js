class Skill {
	// name: スキル名
	// baseCost: レベル1に相当する基準コスト
	// basePower: レベル1での基準効果（例: ダメージ）
	// costExponent: コスト増加の非線形指数 (>1 に設定)
	// powerDiminish: 利得の漸減を制御する指数 (0<val<1)
	constructor({ name, baseCost = 5, basePower = 10, costExponent = 1.7, powerDiminish = 0.6 }) {
		this.name = name;
		this.baseCost = baseCost;
		this.basePower = basePower;
		this.costExponent = costExponent;
		this.powerDiminish = powerDiminish;
		this.level = 0;
	}

	// 次のレベルを1増やしたときの単発コスト（そのレベルを取得するのに必要なポイント）
	costForNextLevel() {
		const nextLevel = this.level + 1;
		return Math.ceil(this.baseCost * Math.pow(nextLevel, this.costExponent));
	}

	// 現在レベル -> 次レベルで得られる"利得"（例: 攻撃力増加の微分的値）
	marginalBenefitForNextLevel() {
		const nextLevel = this.level + 1;
		// 利得は漸減: basePower * (level^powerDiminish - (level-1)^powerDiminish)
		const currentValue = Math.pow(this.level, this.powerDiminish);
		const nextValue = Math.pow(nextLevel, this.powerDiminish);
		const benefit = this.basePower * Math.max(0, nextValue - currentValue);
		return benefit;
	}

	// レベルを上げる（コスト支払いは外部で処理）
	levelUp() {
		this.level += 1;
	}

	// 表示用の簡易ステータス
	status() {
		return {
			name: this.name,
			level: this.level,
			nextCost: this.costForNextLevel(),
			nextMarginal: this.marginalBenefitForNextLevel(),
		};
	}
}

module.exports = { Skill };
