// Résume un rapport JSON d'OWASP ZAP en tableau Markdown (résumé de job GitHub Actions).
// Usage : node scripts/zap-summary.mjs <rapport.json> <mode BUGS>
import { readFileSync, existsSync } from 'node:fs';

const [file, mode = '?'] = process.argv.slice(2);

if (!file || !existsSync(file)) {
  console.log(`### ZAP baseline (BUGS=${mode})\n\nAucun rapport JSON trouvé : le scan n'a pas abouti.`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const alerts = (report.site ?? []).flatMap((s) => s.alerts ?? []);

const levels = [
  { code: '3', label: 'Haute' },
  { code: '2', label: 'Moyenne' },
  { code: '1', label: 'Faible' },
  { code: '0', label: 'Information' },
];

const out = [];
out.push(`### ZAP baseline (BUGS=${mode})`, '');
out.push('| Risque | Alertes |', '| --- | ---: |');
for (const { code, label } of levels) {
  out.push(`| ${label} | ${alerts.filter((a) => a.riskcode === code).length} |`);
}
out.push('');

if (alerts.length > 0) {
  out.push('| Risque | Alerte | Occurrences |', '| --- | --- | ---: |');
  const sorted = [...alerts].sort((a, b) => Number(b.riskcode) - Number(a.riskcode));
  for (const a of sorted) {
    const label = levels.find((l) => l.code === a.riskcode)?.label ?? a.riskcode;
    const count = a.count ?? a.instances?.length ?? 1;
    out.push(`| ${label} | ${a.name} | ${count} |`);
  }
} else {
  out.push('Aucune alerte.');
}

console.log(out.join('\n'));
