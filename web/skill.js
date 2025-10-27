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
		const benefit = this.basePower * Math.max(0, nextValue - currentValue);
		return benefit;
	}

	levelUp() {
		this.level += 1;
	}

	status() {
		return {
			name: this.name,
			level: this.level,
			nextCost: this.costForNextLevel(),
			nextMarginal: this.marginalBenefitForNextLevel(),
		};
	}
}