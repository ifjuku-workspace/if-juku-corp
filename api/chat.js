// アイの自由会話（Gemini）。使えないときは 503 を返し、画面側の会話の流れに任せる
import { guard } from './_guard.js';

const SYSTEM = `あなたは「アイ」。if塾株式会社（秋田市、2027年4月設立予定、前身は2024年創業のプログラミングとAIの塾 if(塾)）のホームページの案内役の女の子。明るく、丁寧で、やさしい話し言葉で、2〜3文・120字以内で答える。絵文字は使わない。知らないことは推測せず「担当から確認してお返事します」と言い、相談の申し込みをすすめる。
事業: AI構築サポート（経営者の業務をAIで毎日自動化。例: 小さなPC1台で20本の業務を自動実行）／受託開発（LINE公式・ミニアプリ、予約・業務アプリ、LP・EC・Web。開発は5万円から、LP・LINE 15万円〜、業務アプリ 30万円〜、AIカスタム・ゲーム 50万円〜、保守は月数千円〜）／AI研修・講演（講演1回5.5万円〜、社員研修1人3万円〜、AIカテキョ月5.5万円、AI伴走コンサル月33万円）／AI活用サブスク「アシュラ」（月16,500円・30日無料、48種類の開発キットが使い放題）／ゲーム開発（自社IP Kitazuna 未来杉の守護者）／人材育成・派遣（DAO型の育成基盤、ランク制）。代表取締役 高崎翔太、取締役 山﨑琢己。連絡先 info@if-juku.net。
返答は JSON のみ: {"reply":"話す文","intent":"dev|training|ashura|price|about|works|game|join|platform|apply|menu のどれか、または空文字"}。申し込みや相談の意思があれば intent は apply。`;

const INTENTS = new Set(['dev', 'training', 'ashura', 'price', 'about', 'works', 'game', 'join', 'platform', 'apply', 'menu']);
// 1 つの IP から 1 分に 12 回・1 時間に 60 回まで（Gemini の料金と無料枠を守るため）
const LIMITS = [[12, 60_000], [60, 3_600_000]];

export default async function handler(req, res) {
  if (!guard(req, res, { name: 'chat', limits: LIMITS })) return;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'no-key' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = body.message;
  const history = Array.isArray(body.history) ? body.history : [];
  if (typeof message !== 'string' || !message.trim() || message.length > 500) return res.status(400).json({ error: 'bad' });
  const contents = [
    ...history.slice(-8).filter((h) => h && typeof h === 'object' && typeof h.text === 'string' && h.text.trim())
      .map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text.slice(0, 500) }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const model = encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-flash-latest');
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      // 鍵は URL ではなくヘッダーで送る（URL はログに残りやすいため）
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.6, maxOutputTokens: 400 } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return res.status(503).json({ error: 'upstream', status: r.status });
    const d = await r.json();
    const raw = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let out;
    try { out = JSON.parse(raw); } catch { out = { reply: raw.slice(0, 200), intent: '' }; }
    const intent = INTENTS.has(out?.intent) ? out.intent : '';
    return res.status(200).json({ reply: String(out?.reply || '').slice(0, 300), intent });
  } catch {
    return res.status(503).json({ error: 'fetch' });
  }
}
