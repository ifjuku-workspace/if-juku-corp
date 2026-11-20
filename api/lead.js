// アイの会話からの申し込みを Discord（フォーラムチャンネル）へ 1 件 1 スレッドで届ける
import { guard } from './_guard.js';

// 1 つの IP から 10 分に 3 件・1 日に 10 件まで（嘘の申し込みの大量送信を防ぐ）
const LIMITS = [[3, 600_000], [10, 86_400_000]];

// Discord の書式（太字・リンク・引用・見出し・コードなど）として解釈されないように打ち消す。
// @ はメールアドレスに要るので残す（メンションは allowed_mentions で止めているので飛ばない）
const md = (s) => s.replace(/([\\*_~|>#[\]()<:`-])/g, '\\$1');
// 1 行の項目：改行をつぶして、「ご連絡先：」のような偽の行を作らせない
const line = (v, n) => md(String(v || '').replace(/[\r\n\t]+/g, ' ').slice(0, n).trim());
const text = (v, n) => md(String(v || '').replace(/\r\n?/g, '\n').slice(0, n).trim());
// スレッド名は書式が効かないので、改行だけ除く
const plain = (v, n) => String(v || '').replace(/[\r\n\t]+/g, ' ').slice(0, n).trim();

export default async function handler(req, res) {
  if (!guard(req, res, { name: 'lead', limits: LIMITS })) return;
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (!hook) return res.status(503).json({ error: 'no-hook' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const type = line(b.type, 60), name = line(b.name, 80), contact = line(b.contact, 120), body = text(b.body, 1500);
  if (!name || !contact) return res.status(400).json({ error: 'missing' });
  const content = `**HPのアイから相談が届きました**\nご相談：${type}\nお名前：${name}\nご連絡先：${contact}\n内容：${body || '（なし）'}`;
  try {
    const r = await fetch(`${hook}?wait=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, ...(process.env.LEAD_WEBHOOK_FORUM === '1' ? { thread_name: `HP相談｜${plain(b.type, 60)}｜${plain(b.name, 80)}`.slice(0, 95) } : {}), allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return res.status(502).json({ error: 'discord', status: r.status });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'fetch' });
  }
}
