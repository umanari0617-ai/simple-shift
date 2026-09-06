// revenuecat-bridge-src.js を revenuecat-bundle.js に1つにまとめるための小さなスクリプト。
// ターミナルで「node build-revenuecat.mjs」と打つだけで実行できる（＝などの記号を打つ必要がない）。
import { build } from "esbuild";

await build({
  entryPoints: ["revenuecat-bridge-src.js"],
  bundle: true,
  format: "iife",
  outfile: "revenuecat-bundle.js",
});

console.log("完了しました: revenuecat-bundle.js を作成しました");
