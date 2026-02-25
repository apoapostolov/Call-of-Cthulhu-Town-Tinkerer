import { generatePopulation } from "../src/logic.ts";
import { debugClassDistribution } from "../src/map.ts";
const scenarios = [
    {
        name: "Hamlet",
        population: 1200,
        baseSeed: 91011,
        mapSeeds: Array.from({ length: 16 }, (_, i) => 4000 + i * 37),
    },
    {
        name: "Town",
        population: 8000,
        baseSeed: 92021,
        mapSeeds: Array.from({ length: 16 }, (_, i) => 8000 + i * 53),
    },
    {
        name: "City",
        population: 60000,
        baseSeed: 93031,
        mapSeeds: Array.from({ length: 16 }, (_, i) => 12000 + i * 71),
    },
    {
        name: "Metropolis",
        population: 220000,
        baseSeed: 94041,
        mapSeeds: Array.from({ length: 12 }, (_, i) => 20000 + i * 97),
    },
];
const labels = [
    "Slums",
    "Poor",
    "Working Class",
    "Modest",
    "Middle Class",
    "Respectable",
    "Affluent",
    "Luxury",
];
function average(values) {
    if (values.length === 0)
        return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
async function run() {
    for (const scenario of scenarios) {
        const { people } = await generatePopulation(scenario.population, scenario.baseSeed);
        const byLabel = new Map();
        for (const label of labels)
            byLabel.set(label, []);
        const buildingTotals = [];
        for (const seed of scenario.mapSeeds) {
            const result = debugClassDistribution(scenario.population, seed, people);
            buildingTotals.push(result.totalBuildings);
            for (const label of labels) {
                byLabel.get(label)?.push(result.percentages[label] ?? 0);
            }
        }
        console.log(`\n=== ${scenario.name} (population ${scenario.population}) ===`);
        console.log(`Avg parcels: ${average(buildingTotals).toFixed(1)} across ${scenario.mapSeeds.length} map seeds`);
        for (const label of labels) {
            const val = average(byLabel.get(label) ?? []);
            console.log(`${label.padEnd(14)} ${val.toFixed(2).padStart(6)}%`);
        }
    }
}
run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
