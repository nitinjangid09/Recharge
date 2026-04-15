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
  MANTRA:         'com.mantra.rdservice',
  MANTRA_MFS110:  'com.mantra.mfs110.rdservice',
  MORPHO:         'com.idemia.l1rdservice',
  STARTEK:        'com.startek.rdservice',
  SECUGEN:        'com.secugen.rdservice',
};

// ─── Human-readable device names ────────────────────────────────────────────
export const RD_DEVICE_LABELS = {
  MANTRA:         'Mantra MFS100',
  MANTRA_MFS110:  'Mantra MFS110',
  MORPHO:         'Morpho MSO 1300',
  STARTEK:        'Startek FM220',
  SECUGEN:        'SecuGen Hamster',
};

// ─── Ordered device list for UI dropdowns ────────────────────────────────────
export const DEVICE_LIST = Object.entries(RD_DEVICE_LABELS).map(([value, label]) => ({
  value,
  label,
  icon: '🖐',
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
  const mod       = getNativeModule();
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
const capture = async (deviceKey) => {
  const packageId = getPackageId(deviceKey);
  const mod       = getNativeModule();
  return await mod.captureFingerprint(packageId);
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
  const mod       = getNativeModule();
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
  NOT_INSTALLED:      'NOT_INSTALLED',
  CANCELLED:          'CANCELLED',
  NO_PID:             'NO_PID',
  BUSY:               'BUSY',
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  NO_ACTIVITY:        'NO_ACTIVITY',
  LAUNCH_ERROR:       'LAUNCH_ERROR',
};

// ─────────────────────────────────────────────────────────────────────────────
// parsePidXml(xml)
//
// Converts the raw RD Service XML response into a clean JSON object.
// ─────────────────────────────────────────────────────────────────────────────
const parsePidXml = (xml) => {
  if (!xml) return null;

  const getAttr = (tag, attr) => {
    const reg = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, 'i');
    const match = xml.match(reg);
    return match ? match[1] : '';
  };

  const getTagContent = (tag) => {
    const reg = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(reg);
    return match ? match[1].trim() : '';
  };

  return {
    // From <Resp>
    errCode:   getAttr('Resp', 'errCode'),
    errInfo:   getAttr('Resp', 'errInfo'),
    fCount:    getAttr('Resp', 'fCount'),
    fType:     getAttr('Resp', 'fType'),
    iCount:    getAttr('Resp', 'iCount'),
    iType:     getAttr('Resp', 'iType'),
    pCount:    getAttr('Resp', 'pCount'),
    pType:     getAttr('Resp', 'pType'),
    nmPoints:  getAttr('Resp', 'nmPoints'),
    qScore:    getAttr('Resp', 'qScore'),

    // From <DeviceInfo>
    dpId:      getAttr('DeviceInfo', 'dpId'),
    rdsId:     getAttr('DeviceInfo', 'rdsId'),
    rdsVer:    getAttr('DeviceInfo', 'rdsVer'),
    dc:        getAttr('DeviceInfo', 'dc'),
    mi:        getAttr('DeviceInfo', 'mi'),
    mc:        getAttr('DeviceInfo', 'mc'),
    srno:      getAttr('DeviceInfo', 'srno'),
    sysid:     getAttr('DeviceInfo', 'sysid'),

    // From <Skey>
    ci:          getAttr('Skey', 'ci'),
    sessionKey:  getTagContent('Skey'),

    // From <Hmac>
    hmac:        getTagContent('Hmac'),

    // From <Data>
    pidData:     getTagContent('Data'),
    pidDataType: getAttr('Data', 'type') || 'X',
    
    // Use the timestamp from XML if available, else current time
    ts: getAttr('PidData', 'ts') || new Date().toISOString()
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────────────────────────
const RDService = {
  isInstalled,
  capture,
  parsePidXml,
  openInstallPage,
  getDeviceLabel,
  DEVICE_LIST,
  RD_PACKAGES,
  RD_ERROR_CODES,
};

export default RDService;
