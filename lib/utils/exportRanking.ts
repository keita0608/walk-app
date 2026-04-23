import { RankingEntry } from '@/lib/types';

function fmt(n: number) { return n.toLocaleString('en-US'); }

function jpDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return `${y}年${m}月${day}日`;
}

function timestamp() {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export function exportRankingAsImage(
  entries: RankingEntry[],
  eventTitle: string,
  startDate: string,
  endDate: string,
) {
  const hasHandicap = entries.some((e) => e.handicapMultiplier > 1);

  const sorted = [...entries].sort((a, b) => {
    const diff = hasHandicap
      ? b.netAverageSteps - a.netAverageSteps
      : b.averageSteps - a.averageSteps;
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const SCALE = 2;
  const W = 680;
  const PAD = 28;
  const ROW_H = 54;
  const HEADER_H = 90;
  const FOOTER_H = 44;
  const H = HEADER_H + sorted.length * ROW_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  const FONT = `-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#4338CA';
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(eventTitle, PAD, 36);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const mode = hasHandicap ? 'ネット（ハンデ適用）ランキング' : 'グロスランキング';
  ctx.fillText(`${mode}  ·  ${jpDate(startDate)} 〜 ${jpDate(endDate)}`, PAD, 62);

  // Rows
  const maxSteps = Math.max(
    ...sorted.map((e) => hasHandicap ? e.netAverageSteps : e.averageSteps),
    ...sorted.map((e) => e.targetSteps ?? 0),
    1,
  );
  const BAR_X = W - PAD - 220;
  const BAR_W = 200;

  sorted.forEach((entry, idx) => {
    const steps = hasHandicap ? entry.netAverageSteps : entry.averageSteps;
    const y = HEADER_H + idx * ROW_H;
    const ry = y + ROW_H / 2;

    // Row bg
    ctx.fillStyle = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
    ctx.fillRect(0, y, W, ROW_H);

    // Separator line
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(0, y + ROW_H - 1, W, 1);

    // Rank number
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    if (idx === 0) { ctx.fillStyle = '#CA8A04'; ctx.font = `bold 16px ${FONT}`; }
    else if (idx === 1) { ctx.fillStyle = '#9CA3AF'; ctx.font = `bold 15px ${FONT}`; }
    else if (idx === 2) { ctx.fillStyle = '#B45309'; ctx.font = `bold 15px ${FONT}`; }
    else { ctx.fillStyle = '#9CA3AF'; ctx.font = `14px ${FONT}`; }
    ctx.fillText(String(idx + 1), PAD + 14, ry);

    // Name — blue for male, pink for female, dark for unset
    const nameColor =
      entry.gender === 'male' ? '#3B6FD4' :
      entry.gender === 'female' ? '#C0588A' :
      '#111827';
    ctx.fillStyle = nameColor;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(entry.name, PAD + 36, ry);

    // Steps value
    ctx.fillStyle = '#4338CA';
    ctx.font = `bold 14px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(steps)} 歩/日`, BAR_X - 10, ry);

    // Bar background
    const barY = ry - 4;
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(BAR_X, barY, BAR_W, 8);

    // Bar fill — indigo if target achieved (or no target), gray otherwise
    const achieved = entry.targetSteps === undefined || steps >= entry.targetSteps;
    const fill = Math.max((steps / maxSteps) * BAR_W, 0);
    ctx.fillStyle = achieved ? '#4338CA' : '#9CA3AF';
    ctx.fillRect(BAR_X, barY, fill, 8);

    // Target line (red vertical line)
    if (entry.targetSteps !== undefined) {
      const targetX = BAR_X + Math.min((entry.targetSteps / maxSteps) * BAR_W, BAR_W);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(targetX - 1, barY - 4, 2, 16);
    }
  });

  // Footer
  const footerY = HEADER_H + sorted.length * ROW_H;
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, footerY, W, FOOTER_H);
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`オペブラ陸上部-歩数バトル  ·  ${dateStr} 出力`, W / 2, footerY + FOOTER_H / 2);

  // Download — yyyymmddhhmmss.png
  const a = document.createElement('a');
  a.download = `${timestamp()}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
