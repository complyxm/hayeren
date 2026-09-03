/**
 * 線形予測分析（LPC）。docs/phonetics.md §3b:「LPC 分析（次数 ~12）または FFT の
 * ピーク追跡で F1・F2 を推定」。
 *
 * 声道の共鳴（フォルマント）を全極モデルで近似する。母音は声帯の音源を声道が
 * 共鳴で色づけたものなので、音源（基本周波数の細かい櫛）を取り除いた
 * 「なめらかな包絡線」の山がフォルマントになる。FFT のピークを直接拾うと
 * 基本周波数の倍音を拾ってしまうため、LPC を挟む。
 *
 * CLAUDE.md §8 に従い、Float32Array を受け取る純粋関数として書く。
 */

/**
 * プリエンファシス。声門音源のスペクトルは高域に向かって約 -6dB/oct で落ちるので、
 * 1次の高域強調で平坦に近づけてから LPC をかける。係数 0.97 は
 * docs/phonetics.md §2 のパイプラインと同じ値。
 */
export function preEmphasis(samples: Float32Array, coefficient = 0.97): Float32Array {
  const out = new Float32Array(samples.length);
  if (samples.length === 0) return out;
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) out[i] = samples[i] - coefficient * samples[i - 1];
  return out;
}

/** ハミング窓。窓をかけずに LPC をかけると、フレーム端の不連続がスペクトルを汚す。 */
export function hammingWindow(samples: Float32Array): Float32Array {
  const n = samples.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = samples[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return out;
}

/** 自己相関 r[0..order]。 */
export function autocorrelation(samples: Float32Array, order: number): Float64Array {
  const r = new Float64Array(order + 1);
  for (let lag = 0; lag <= order; lag++) {
    let sum = 0;
    for (let i = lag; i < samples.length; i++) sum += samples[i] * samples[i - lag];
    r[lag] = sum;
  }
  return r;
}

export interface LpcResult {
  /** 予測係数 a[1..order]（a[0] は 1 に固定）。A(z) = 1 - Σ a[k] z^-k。 */
  coefficients: Float64Array;
  /** 残差エネルギー。 */
  error: number;
}

/**
 * Levinson–Durbin 再帰で自己相関から予測係数を解く。
 * 数値的に発散した（信号が無音に近い等）場合は null を返し、推測値を返さない。
 */
export function levinsonDurbin(r: Float64Array, order: number): LpcResult | null {
  if (r.length <= order || r[0] <= 0) return null;

  const a = new Float64Array(order + 1);
  a[0] = 1;
  let error = r[0];

  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc -= a[j] * r[i - j];
    const k = acc / error;
    if (!Number.isFinite(k)) return null;

    const prev = a.slice();
    a[i] = k;
    for (let j = 1; j < i; j++) a[j] = prev[j] - k * prev[i - j];

    error *= 1 - k * k;
    // 反射係数の絶対値が 1 を超えるのは数値的な破綻。黙って続けない。
    if (error <= 0) return null;
  }

  return { coefficients: a, error };
}

/**
 * LPC 係数から周波数応答の大きさ（dB）を求める。
 * H(z) = 1 / A(z) なので、|H| = 1 / |A(e^{jω})|。
 */
export function lpcSpectrumDb(
  coefficients: Float64Array,
  sampleRate: number,
  frequencies: number[],
): number[] {
  return frequencies.map((f) => {
    const omega = (2 * Math.PI * f) / sampleRate;
    let re = 1;
    let im = 0;
    for (let k = 1; k < coefficients.length; k++) {
      re -= coefficients[k] * Math.cos(omega * k);
      im += coefficients[k] * Math.sin(omega * k);
    }
    const magnitude = Math.sqrt(re * re + im * im);
    return -20 * Math.log10(Math.max(magnitude, 1e-12));
  });
}

export interface LpcAnalysisOptions {
  /** 予測次数。16kHz なら 12〜18 が目安（docs/phonetics.md §3b は ~12）。 */
  order?: number;
  preEmphasisCoefficient?: number;
}

/** 1フレーム（窓をかける前の生サンプル）から LPC 係数を求める。 */
export function analyzeLpc(frame: Float32Array, opts: LpcAnalysisOptions = {}): LpcResult | null {
  const { order = 12, preEmphasisCoefficient = 0.97 } = opts;
  if (frame.length <= order * 2) return null;
  const windowed = hammingWindow(preEmphasis(frame, preEmphasisCoefficient));
  return levinsonDurbin(autocorrelation(windowed, order), order);
}
