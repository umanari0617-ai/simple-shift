// RevenueCatとやり取りするための橋渡しファイル（元ファイル）。
// このファイルは直接ブラウザに読み込まれません。
// Macでesbuildを使って revenuecat-bundle.js に1つのファイルとしてまとめてから使います。
// まとめ方（Macのターミナルで、~/SimpleShift/www の中で実行）：
//   npx esbuild revenuecat-bridge-src.js --bundle --format=iife --outfile=revenuecat-bundle.js
import { Purchases, LOG_LEVEL, PURCHASES_ERROR_CODE } from "@revenuecat/purchases-capacitor";
import { RevenueCatUI } from "@revenuecat/purchases-capacitor-ui";

const ENTITLEMENT_ID = "シンプルシフト表_pro";
let configured = false;

async function configure(apiKey) {
 if (configured) return;
 try {
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }); // XcodeのConsoleで動作確認しやすいようにログを詳しく出す
  await Purchases.configure({ apiKey });
  configured = true;
 } catch (e) {
  console.error("RevenueCat configure failed", e);
 }
}

function isEntitlementActiveIn(customerInfo) {
 return !!(customerInfo && customerInfo.entitlements && customerInfo.entitlements.active && typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined");
}

async function getCustomerInfo() {
 const { customerInfo } = await Purchases.getCustomerInfo();
 return customerInfo;
}

async function checkEntitlement() {
 try {
  const customerInfo = await getCustomerInfo();
  return isEntitlementActiveIn(customerInfo);
 } catch (e) {
  console.error("RevenueCat getCustomerInfo failed", e);
  return null; // 通信できなかった場合はnull（判定不能）を返す。呼び出し側で「分からない時は無料期間タイマーに任せる」処理をする
 }
}

async function getOfferings() {
 const offerings = await Purchases.getOfferings();
 return offerings;
}

async function purchaseMonthlyPackage() {
 const offerings = await Purchases.getOfferings();
 const current = offerings && offerings.current;
 if (!current || !current.availablePackages || !current.availablePackages.length) {
  throw new Error("購入できるプランが見つかりませんでした。");
 }
 const pkg = current.monthly || current.availablePackages[0];
 const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
 return isEntitlementActiveIn(customerInfo);
}

async function restorePurchases() {
 const { customerInfo } = await Purchases.restorePurchases();
 return isEntitlementActiveIn(customerInfo);
}

async function presentPaywall() {
 const { result } = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
 return result;
}

async function presentCustomerCenter() {
 await RevenueCatUI.presentCustomerCenter();
}

window.RevenueCatBridge = {
 configure,
 checkEntitlement,
 purchaseMonthlyPackage,
 restorePurchases,
 presentPaywall,
 presentCustomerCenter,
 CANCELLED_CODE: PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
};
