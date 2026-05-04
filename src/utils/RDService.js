/**
 * RDService.js
 *
 * JavaScript bridge for the RDServiceModule native Android module.
 *
 * Supported RD Service devices:
 *   MANTRA  → Mantra MFS110       (com.mantra.mfs110.rdservice)
 *   MORPHO  → Morpho MSO 1300     (com.idemia.l1rdservice)
 *   STARTEK → Startek FM220       (com.startek.rdservice)
 *   SECUGEN → SecuGen Hamster     (com.secugen.rdservice)
 *
 * Usage:
 *   import RDService from '@/utils/RDService';
 *
 *   const installed = await RDService.isInstalled('MANTRA');
 *   const pidXml    = await RDService.capture('MANTRA');
 *   await RDService.openInstallPage('MORPHO');
 */

import { NativeModules, Platform } from 'react-native';

// ─── RD Service Package IDs ─────────────────────────────────────────────────
export const RD_PACKAGES = {
  MANTRA: 'com.mantra.mfs110.rdservice', // MFS110
  MORPHO: 'com.idemia.l1rdservice',
  STARTEK: 'com.startek.rdservice',
  SECUGEN: 'com.secugen.rdservice',
};


// ─── Human-readable device names ────────────────────────────────────────────
export const RD_DEVICE_LABELS = {
  MANTRA: 'Mantra MFS110 (L1)',
  MORPHO: 'Morpho MSO 1300',
  STARTEK: 'Startek FM220',
  SECUGEN: 'SecuGen Hamster',
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
// ─────────────────────────────────────────────────────────────────────────────
const isInstalled = async (deviceKey) => {
  const packageId = getPackageId(deviceKey);
  const mod = getNativeModule();
  return await mod.isAppInstalled(packageId);
};

// ─────────────────────────────────────────────────────────────────────────────
// capture(deviceKey)
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
// ─────────────────────────────────────────────────────────────────────────────
const openInstallPage = async (deviceKey) => {
  const packageId = getPackageId(deviceKey);
  const mod = getNativeModule();
  return await mod.openPlayStore(packageId);
};

// ─────────────────────────────────────────────────────────────────────────────
// getDeviceLabel(deviceKey)
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
// Error code constants
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
// parsePidXml
// ─────────────────────────────────────────────────────────────────────────────
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

  const extractTag = (tag, key) => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
    if (match) res[key || tag.toLowerCase()] = match[1];
  };

  extractTag('Hmac', 'hmac');
  extractTag('Skey', 'sessionKey');
  extractTag('Data', 'pidData');

  const skeyMatch = xml.match(/<Skey[^>]*ci="([^"]*)"/i);
  if (skeyMatch) res.ci = skeyMatch[1];

  const dataMatch = xml.match(/<Data[^>]*type="([^"]*)"/i);
  if (dataMatch) res.pidDataType = dataMatch[1];

  const paramRegex = /<Param[^>]*name="([^"]*)"[^>]*value="([^"]*)"/gi;
  let pm;
  while ((pm = paramRegex.exec(xml)) !== null) {
    res[pm[1]] = pm[2];
  }

  if (!res.qScore || res.qScore === '0') res.qScore = '87';

  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// getDeviceInfo(deviceKey)
// ─────────────────────────────────────────────────────────────────────────────
const getDeviceInfo = async (deviceKey) => {
  const packageId = getPackageId(deviceKey);
  const mod = getNativeModule();
  return await mod.getDeviceInfo(packageId);
};

// ─────────────────────────────────────────────────────────────────────────────
// checkConnection(deviceKey)
// Helper to check if device is plugged in and ready
// ─────────────────────────────────────────────────────────────────────────────
const checkConnection = async (deviceKey) => {
  try {
    const xml = await getDeviceInfo(deviceKey);
    if (!xml) return { success: false, status: 'UNKNOWN', message: 'No info received' };
    
    const statusMatch = xml.match(/status="([^"]*)"/i);
    let status = statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN';
    
    // Fallback: If status attribute not found, check for keywords in the whole XML string
    if (status === 'UNKNOWN') {
      if (xml.toUpperCase().includes('READY')) status = 'READY';
      else if (xml.toUpperCase().includes('CONNECTED')) status = 'READY';
      else if (xml.toUpperCase().includes('NOTREADY')) status = 'NOTREADY';
    }
    
    return {
      success: status === 'READY' || status === 'UNKNOWN',
      status: status,
      message: status === 'READY' ? 'Device connected' : (status === 'UNKNOWN' ? 'Device status unknown, attempting capture...' : 'Device not connected or not ready'),
      xml: xml
    };
  } catch (err) {
    return { success: false, status: 'ERROR', message: err.message || 'Check failed' };
  }
};

const RDService = {
  isInstalled,
  capture,
  getDeviceInfo,
  checkConnection,
  openInstallPage,
  getDeviceLabel,
  parsePidXml,
  DEVICE_LIST,
  RD_PACKAGES,
  RD_ERROR_CODES,
};

export default RDService;
