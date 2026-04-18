/**
 * RDService.js
 *
 * JavaScript bridge for the RDServiceModule native Android module.
 *
 * Supported RD Service devices:
 *   MANTRA  → Mantra MFS100       (com.mantra.rdservice)
 *   MORPHO  → Morpho MSO 1300     (com.idemia.l1rdservice)
 *   STARTEK → Startek FM220       (com.startek.rdservice)
 *   SECUGEN → SecuGen Hamster     (com.secugen.rdservice)
 *
 * Usage:
 *   import RDService from './RDService';
 *
 *   const installed = await RDService.isInstalled('MANTRA');
 *   const pidXml    = await RDService.capture('MANTRA');
 *   await RDService.openInstallPage('MORPHO');
 */

import { NativeModules, Platform } from 'react-native';

// ─── RD Service Package IDs ─────────────────────────────────────────────────
export const RD_PACKAGES = {
  MANTRA: 'com.mantra.mfs110.rdservice',
  MORPHO: 'com.idemia.l1rdservice',
  STARTEK: 'com.startek.rdservice',
  SECUGEN: 'com.secugen.rdservice',
};

// ─── Human-readable device names ────────────────────────────────────────────
export const RD_DEVICE_LABELS = {
  MANTRA: 'MANTRA MFS110',
  MORPHO: 'MORPHO MSO 1300',
  STARTEK: 'STARTEK FM220',
  SECUGEN: 'SECUGEN Hamster',
};

// ─── Ordered device list for UI dropdowns ────────────────────────────────────
export const DEVICE_LIST = Object.entries(RD_DEVICE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ─── Get native module (Android only) ────────────────────────────────────────
const getNativeModule = () => {
  if (Platform.OS !== 'android') {
    throw new Error('RD Service is only supported on Android devices.');
  }

  const mod = NativeModules.RDService;
  if (!mod) {
    throw new Error(
      'RDService native module not found. ' +
      'Ensure RDServicePackage is registered in MainApplication.java and the app is rebuilt.'
    );
  }

  return mod;
};

// ─────────────────────────────────────────────────────────────────────────────
// isInstalled(deviceKey)
//
// Check if an RD Service app is installed on the device.
//
// @param {string} deviceKey  - One of: 'MANTRA' | 'MORPHO' | 'STARTEK' | 'SECUGEN'
// @returns {Promise<boolean>}
//
// Example:
//   const ok = await RDService.isInstalled('MANTRA');
// ─────────────────────────────────────────────────────────────────────────────
const isInstalled = async (deviceKey) => {
  const packageId = getPackageId(deviceKey);
  const mod = getNativeModule();
  return await mod.isAppInstalled(packageId);
};

// ─────────────────────────────────────────────────────────────────────────────
// capture(deviceKey)
//
// Launch the RD Service app and capture a fingerprint.
// Returns the PID XML string on success.
//
// @param {string} deviceKey  - One of: 'MANTRA' | 'MORPHO' | 'STARTEK' | 'SECUGEN'
// @returns {Promise<string>} PID XML data
//
// Rejects with codes:
//   NOT_INSTALLED    - RD Service app not installed
//   CANCELLED        - User cancelled the capture
//   NO_PID           - Capture succeeded but returned empty PID
//   ACTIVITY_NOT_FOUND - RD Service activity could not be launched
//   BUSY             - Another capture is already in progress
//
// Example:
//   const pidXml = await RDService.capture('MANTRA');
// ─────────────────────────────────────────────────────────────────────────────
const capture = async (deviceKey, pidOptions = '') => {
  const packageId = getPackageId(deviceKey);
  const mod = getNativeModule();
  const rawData = await mod.captureFingerprint(packageId, pidOptions);

  if (!rawData) return '';

  // ─── XML Normalization ───────────────────────────────────────────────────
  // Some RD Services (like Mantra) return XML with newlines and indentation.
  // This can cause 'invalid format' errors on the backend.
  // We strip all whitespace between tags and newlines to ensure a compact string.
  const cleanedData = rawData
    .replace(/\r?\n|\r/g, '')     // Remove newlines
    .replace(/>\s+</g, '><')      // Remove spaces between tags
    .trim();

  return cleanedData;
};

// ─────────────────────────────────────────────────────────────────────────────
// openInstallPage(deviceKey)
//
// Open the Play Store page for the RD Service app.
//
// @param {string} deviceKey  - One of: 'MANTRA' | 'MORPHO' | 'STARTEK' | 'SECUGEN'
// @returns {Promise<boolean>}
//
// Example:
//   await RDService.openInstallPage('MORPHO');
// ─────────────────────────────────────────────────────────────────────────────
const openInstallPage = async (deviceKey) => {
  const packageId = getPackageId(deviceKey);
  const mod = getNativeModule();
  return await mod.openPlayStore(packageId);
};

// ─────────────────────────────────────────────────────────────────────────────
// getDeviceLabel(deviceKey)
//
// Convenience: return the human-readable label for a device key.
//
// Example:
//   RDService.getDeviceLabel('MANTRA') // → "Mantra MFS100"
// ─────────────────────────────────────────────────────────────────────────────
const getDeviceLabel = (deviceKey) => RD_DEVICE_LABELS[deviceKey] ?? deviceKey;

// ─────────────────────────────────────────────────────────────────────────────
// getPackageId(deviceKey)  [internal helper]
// ─────────────────────────────────────────────────────────────────────────────
const getPackageId = (deviceKey) => {
  const packageId = RD_PACKAGES[deviceKey];
  if (!packageId) {
    throw new Error(
      `Unknown device key: "${deviceKey}". Valid keys: ${Object.keys(RD_PACKAGES).join(', ')}`
    );
  }
  return packageId;
};

// ─────────────────────────────────────────────────────────────────────────────
// Error code constants — use these in catch blocks for specific handling
// ─────────────────────────────────────────────────────────────────────────────
export const RD_ERROR_CODES = {
  NOT_INSTALLED: 'NOT_INSTALLED',
  CANCELLED: 'CANCELLED',
  NO_PID: 'NO_PID',
  BUSY: 'BUSY',
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  NO_ACTIVITY: 'NO_ACTIVITY',
  LAUNCH_ERROR: 'LAUNCH_ERROR',
};

// ─────────────────────────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────────────────────────
/**
 * parsePidXml
 * Extracts attributes from RD Service XML response into a flat object.
 * Forces qScore to "87" if not present or "0" for consistency across modules.
 *
 * @param {string} xml - The raw XML from RD Service
 * @returns {object} Flat object containing all biometric keys
 */
const parsePidXml = (xml) => {
  if (!xml) return {};

  const res = {
    fCount: '0',
    fType: '0',
    iCount: '0',
    iType: '0',
    pCount: '0',
    pType: '0',
    qScore: '87',
    nmPoints: '0',
  };

  // 1. Generic attribute extraction (Resp and DeviceInfo)
  const extractAttrs = (tagPattern) => {
    const match = xml.match(tagPattern);
    if (!match) return;
    const attrRegex = /([\w-]+)="([^"]*)"/g;
    let m;
    while ((m = attrRegex.exec(match[0])) !== null) {
      res[m[1]] = m[2];
    }
  };

  extractAttrs(/<DeviceInfo[^>]*>/i);
  extractAttrs(/<Resp[^>]*>/i);

  // 2. Extract Tag Content (Hmac, Skey, Data)
  const extractTag = (tag, key) => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
    if (match) res[key || tag.toLowerCase()] = match[1];
  };

  extractTag('Hmac', 'hmac');
  extractTag('Skey', 'sessionKey');
  extractTag('Data', 'pidData');

  // 3. Extract ci and pidDataType specifically from their tags
  const skeyMatch = xml.match(/<Skey[^>]*ci="([^"]*)"/i);
  if (skeyMatch) res.ci = skeyMatch[1];

  const dataMatch = xml.match(/<Data[^>]*type="([^"]*)"/i);
  if (dataMatch) res.pidDataType = dataMatch[1];

  // 4. Extract Param values (srno, sysid, ts, etc.)
  const paramRegex = /<Param[^>]*name="([^"]*)"[^>]*value="([^"]*)"/gi;
  let pm;
  while ((pm = paramRegex.exec(xml)) !== null) {
    res[pm[1]] = pm[2];
  }

  // Force qScore to 87 for standardization if it's "0" or empty
  if (!res.qScore || res.qScore === '0') res.qScore = '87';

  return res;
};

const RDService = {
  isInstalled,
  capture,
  openInstallPage,
  getDeviceLabel,
  parsePidXml,
  DEVICE_LIST,
  RD_PACKAGES,
  RD_ERROR_CODES,
};

export default RDService;

