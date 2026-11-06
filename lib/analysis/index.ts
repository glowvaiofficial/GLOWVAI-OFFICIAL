import { HeuristicSkinEngine, type SkinEngine, type AnalysisReport } from "./engine";

const currentEngine: SkinEngine = new HeuristicSkinEngine();

export async function analyse(
  canvas: HTMLCanvasElement | null,
  demographic?: string
): Promise<AnalysisReport> {
  return currentEngine.analyseFrame(canvas, demographic);
}

export * from "./engine";
