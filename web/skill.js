export class Skill {
	constructor({ name, baseCost = 5, basePower = 10, costExponent = 1.7, powerDiminish = 0.6 }) {
		this.name = name;
		this.baseCost = baseCost;
		this.basePower = basePower;
		this.costExponent = costExponent;
		this.powerDiminish = powerDiminish;
		this.level = 0;
	}
	costForNextLevel() {
		const nextLevel = this.level + 1;
		return Math.ceil(this.baseCost * Math.pow(nextLevel, this.costExponent));
	}
	marginalBenefitForNextLevel() {
		const nextLevel = this.level + 1;
		const currentValue = Math.pow(this.level, this.powerDiminish);
		const nextValue = Math.pow(nextLevel, this.powerDiminish);
		return this.basePower * Math.max(0, nextValue - currentValue);
	}
	levelUp() { this.level += 1; }
	status() {
		return { name: this.name, level: this.level, nextCost: this.costForNextLevel(), nextMarginal: this.marginalBenefitForNextLevel() };
	}
}

// 新規：文章からスキルを生成する簡易ファクトリ
export function createSkillFromDescription(text) {
	const t = (text || '').toLowerCase();
	// キーワード判定で属性を決める（簡易）
	let name = text.trim() || 'カスタムスキル';
	let baseCost = 6;
	let basePower = 12;
	let costExponent = 1.7;
	let powerDiminish = 0.6;

	if (t.includes('スナイプ') || t.includes('狙撃') || t.includes('遠距離')) {
		baseCost = 9; basePower = 32; costExponent = 1.9; powerDiminish = 0.55;
		name = name || 'スナイプ';
	} else if (t.includes('連射') || t.includes('速射') || t.includes('弾')) {
		baseCost = 6; basePower = 18; costExponent = 1.6; powerDiminish = 0.6;
	} else if (t.includes('防御') || t.includes('盾') || t.includes('防')) {
		baseCost = 5; basePower = 14; costExponent = 1.5; powerDiminish = 0.7;
	} else if (t.includes('火') || t.includes('炎') || t.includes('ファイア') || t.includes('魔')) {
		baseCost = 7; basePower = 22; costExponent = 1.8; powerDiminish = 0.6;
	} else if (t.length > 0) {
		// 無名の文なら長さに応じて強度を調整
		basePower = Math.min(40, 8 + Math.floor(t.length / 3));
		baseCost = Math.max(4, Math.floor(basePower / 3));
	}

	return new Skill({ name, baseCost, basePower, costExponent, powerDiminish });
}