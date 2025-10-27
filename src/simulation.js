const { NPC } = require('./npc');

function runDemo() {
	// スキル定義の例（ゲーム内での個別調整が可能）
	const skillDefs = [
		{ name: 'スナイプ', baseCost: 8, basePower: 30, costExponent: 1.9, powerDiminish: 0.55 },
		{ name: '連射', baseCost: 6, basePower: 18, costExponent: 1.6, powerDiminish: 0.6 },
		{ name: '防御強化', baseCost: 5, basePower: 12, costExponent: 1.5, powerDiminish: 0.7 },
		{ name: '支援魔法', baseCost: 7, basePower: 20, costExponent: 1.8, powerDiminish: 0.6 },
	];

	// 複数NPCを生成してビルド
	const npcs = [
		new NPC({ name: 'NPC_A', initialSP: 120, skillDefs }),
		new NPC({ name: 'NPC_B', initialSP: 90, skillDefs }),
		new NPC({ name: 'NPC_C', initialSP: 150, skillDefs }),
	];

	for (const npc of npcs) {
		npc.buildUntilExhausted({ randomness: 0.08 });
		console.log(JSON.stringify(npc.summary(), null, 2));
	}
}

// コマンドライン実行時にデモを走らせる
if (require.main === module) {
	runDemo();
}

module.exports = { runDemo };
