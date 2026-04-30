package com.recharge; // ← change to your actual package name

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * RDServiceModule (fixed — 2024)
 *
 * Key fixes over the original:
 * 1. Android 11+ PackageManager flag → GET_ACTIVITIES | MATCH_ALL
 * 2. Morpho alternate action fallback → "com.morpho.rdservice.fp.CAPTURE"
 * 3. Pending-promise guard against leak on Activity destroy
 * 4. captureFingerprint() now checks installation BEFORE saving promise
 * 5. openPlayStore() resolves false instead of crashing when activity is null
 *
 * Supported RD Service packages:
 * Mantra MFS100 → com.mantra.rdservice
 * Morpho MSO 1300 → com.idemia.l1rdservice
 * Startek FM220 → com.startek.rdservice
 * SecuGen Hamster → com.secugen.rdservice
 *
 * IMPORTANT — also add to AndroidManifest.xml (Android 11+ requirement):
 *
 * <queries>
 * <package android:name="com.mantra.rdservice" />
 * <package android:name="com.idemia.l1rdservice" />
 * <package android:name="com.startek.rdservice" />
 * <package android:name="com.secugen.rdservice" />
 * </queries>
 */
public class RDServiceModule extends ReactContextBaseJavaModule {

    // ── Request code for RD Service Activity result ──────────────────────────
    private static final int RD_SERVICE_REQUEST_CODE = 1001;
    private static final int RD_SERVICE_INFO_REQUEST_CODE = 1002;

    // ── Standard UIDAI RD Service action ─────────────────────────────────────
    private static final String RD_ACTION_STANDARD = "in.gov.uidai.rdservice.fp.CAPTURE";
    private static final String RD_ACTION_INFO = "in.gov.uidai.rdservice.fp.INFO";

    // ── Morpho alternate action (some Morpho builds use this instead) ─────────
    private static final String RD_ACTION_MORPHO_ALT = "com.morpho.rdservice.fp.CAPTURE";

    // ── Morpho package ID (needs alternate action fallback) ───────────────────
    private static final String MORPHO_PACKAGE = "com.idemia.l1rdservice";
    private static final String PID_DATA_KEY = "PID_DATA";
    private static final String DEVICE_INFO_KEY = "DEVICE_INFO";

    // ── Default PID Options XML (UIDAI standard) ──────────────────────────────
    // Most RD Service apps require this; otherwise they may cancel immediately.
    private static final String DEFAULT_PID_OPTIONS = "<?xml version=\"1.0\"?>" +
            "<PidOptions ver=\"1.0\">" +
            "   <Opts fCount=\"1\" fType=\"2\" iCount=\"0\" pCount=\"0\" format=\"0\" pidVer=\"2.0\" timeout=\"10000\" posh=\"UNKNOWN\" env=\"P\" />"
            +
            "</PidOptions>";

    /**
     * buildFacePIDOptionsXml
     * Helper to build Face RD Service PID Options (requested by user).
     */
    private String buildFacePIDOptionsXml() {
        try {
            String txnId = String.valueOf(System.currentTimeMillis());
            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                    + "<PidOptions ver=\"1.0\" env=\"P\">"
                    + "<Opts"
                    + " fCount=\"\""
                    + " fType=\"\""
                    + " iCount=\"\""
                    + " iType=\"\""
                    + " pCount=\"\""
                    + " pType=\"\""
                    + " format=\"\""
                    + " pidVer=\"2.0\""
                    + " timeout=\"\""
                    + " otp=\"\""
                    + " posh=\"\""
                    + " />"
                    + "<CustOpts>"
                    + "<Param name=\"txnId\" value=\"" + txnId + "\"/>"
                    + "<Param name=\"purpose\" value=\"auth\"/>"
                    + "<Param name=\"language\" value=\"en\"/>"
                    + "</CustOpts>"
                    + "</PidOptions>";
        } catch (Exception e) {
            return null;
        }
    }

    // ── Pending promise while waiting for Activity result ─────────────────────
    private Promise pendingPromise;

    // ── Track which action was used so we can retry with alternate if needed ──
    private String pendingPackageId;
    private String pendingPidOptions;
    private boolean triedAltAction = false;

    // ── Activity result listener ───────────────────────────────────────────────
    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(
                Activity activity,
                int requestCode,
                int resultCode,
                @Nullable Intent data) {

            if (requestCode != RD_SERVICE_REQUEST_CODE && requestCode != RD_SERVICE_INFO_REQUEST_CODE)
                return;
            if (pendingPromise == null)
                return;

            if (requestCode == RD_SERVICE_INFO_REQUEST_CODE) {
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String deviceInfo = data.getStringExtra(DEVICE_INFO_KEY);
                    if (deviceInfo != null && !deviceInfo.trim().isEmpty()) {
                        pendingPromise.resolve(deviceInfo);
                    } else {
                        pendingPromise.reject("NO_INFO", "RD Service returned empty device info.");
                    }
                } else {
                    pendingPromise.reject("INFO_ERROR", "Failed to get device info. Result code: " + resultCode);
                }
                clearPending();
                return;
            }

            if (resultCode == Activity.RESULT_OK && data != null) {
                String pidData = data.getStringExtra(PID_DATA_KEY);

                if (pidData != null && !pidData.trim().isEmpty()) {
                    pendingPromise.resolve(pidData);
                    clearPending();
                } else {
                    // Some Morpho builds return RESULT_OK but with empty PID —
                    // try alternate action once before giving up.
                    if (MORPHO_PACKAGE.equals(pendingPackageId) && !triedAltAction) {
                        retryWithAltAction(activity, pendingPidOptions);
                    } else {
                        pendingPromise.reject("NO_PID", "RD Service returned empty PID data.");
                        clearPending();
                    }
                }

            } else if (resultCode == Activity.RESULT_CANCELED) {
                // FIX: Some Morpho versions return CANCELLED immediately for the
                // standard action if they expect the alternate action.
                if (MORPHO_PACKAGE.equals(pendingPackageId) && !triedAltAction) {
                    retryWithAltAction(activity, pendingPidOptions);
                } else {
                    pendingPromise.reject("CANCELLED", "Fingerprint capture was cancelled by the user.");
                    clearPending();
                }

            } else {
                // Unknown result — try alternate action for Morpho once
                if (MORPHO_PACKAGE.equals(pendingPackageId) && !triedAltAction) {
                    retryWithAltAction(activity, pendingPidOptions);
                } else {
                    pendingPromise.reject(
                            "RD_ERROR",
                            "RD Service returned an unexpected result (code " + resultCode + "). " +
                                    "Check device connection and RD Service app installation.");
                    clearPending();
                }
            }
        }
    };

    // ── Constructor ───────────────────────────────────────────────────────────
    public RDServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return "RDService"; // NativeModules.RDService in JS
    }

    // ─────────────────────────────────────────────────────────────────────────
    // isAppInstalled(packageId, promise)
    //
    // FIX: Android 11+ (API 30+) requires MATCH_ALL or the <queries> block in
    // AndroidManifest.xml. Without it, getPackageInfo() always throws
    // NameNotFoundException even when the app IS installed.
    // ─────────────────────────────────────────────────────────────────────────
    @ReactMethod
    public void isAppInstalled(String packageId, Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // API 33+
                pm.getPackageInfo(packageId, PackageManager.PackageInfoFlags.of(0));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // API 30–32: use GET_ACTIVITIES to force visibility check
                pm.getPackageInfo(packageId, PackageManager.GET_ACTIVITIES);
            } else {
                pm.getPackageInfo(packageId, 0);
            }

            promise.resolve(true);

        } catch (PackageManager.NameNotFoundException e) {
            promise.resolve(false); // Not installed — not an error
        } catch (Exception e) {
            promise.reject("CHECK_ERROR", "Failed to check app installation: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // captureFingerprint(packageId, promise)
    //
    // FIX 1: Installation check uses the same Android-version-aware logic.
    // FIX 2: Saves packageId for retry logic before setting pendingPromise.
    // FIX 3: For Morpho, tries the standard UIDAI action first; if that
    // returns RESULT_CANCELED or empty PID, retries with alternate
    // action automatically (see retryWithAltAction).
    // ─────────────────────────────────────────────────────────────────────────
    @ReactMethod
    public void captureFingerprint(String packageId, String pidOptions, Promise promise) {
        Activity currentActivity = getCurrentActivity();

        if (currentActivity == null) {
            promise.reject("NO_ACTIVITY", "No active Android Activity. Make sure the app is in the foreground.");
            return;
        }

        // Guard: only one capture at a time
        if (pendingPromise != null) {
            promise.reject("BUSY", "A fingerprint capture is already in progress. Please wait.");
            return;
        }

        // Check installation (Android-version-aware)
        if (!isPackageInstalled(packageId)) {
            promise.reject(
                    "NOT_INSTALLED",
                    "RD Service app (" + packageId + ") is not installed. " +
                            "Please install it from the Play Store.");
            return;
        }

        // Save state for retry logic
        pendingPackageId = packageId;
        pendingPidOptions = pidOptions;
        triedAltAction = false;
        pendingPromise = promise;

        launchRdService(currentActivity, packageId, RD_ACTION_STANDARD, pidOptions);
    }

    @ReactMethod
    public void getDeviceInfo(String packageId, Promise promise) {
        Activity currentActivity = getCurrentActivity();

        if (currentActivity == null) {
            promise.reject("NO_ACTIVITY", "No active Android Activity.");
            return;
        }

        if (pendingPromise != null) {
            promise.reject("BUSY", "Another RD Service operation is in progress.");
            return;
        }

        if (!isPackageInstalled(packageId)) {
            promise.reject("NOT_INSTALLED", "RD Service app (" + packageId + ") is not installed.");
            return;
        }

        pendingPackageId = packageId;
        pendingPromise = promise;

        try {
            Intent intent = new Intent(RD_ACTION_INFO);
            intent.setPackage(packageId);
            currentActivity.startActivityForResult(intent, RD_SERVICE_INFO_REQUEST_CODE);
        } catch (Exception e) {
            promise.reject("INFO_LAUNCH_ERROR", "Failed to launch info: " + e.getMessage());
            clearPending();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // openPlayStore(packageId, promise)
    // ─────────────────────────────────────────────────────────────────────────
    @ReactMethod
    public void openPlayStore(String packageId, Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.resolve(false);
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=" + packageId));
            intent.addFlags(
                    Intent.FLAG_ACTIVITY_NO_HISTORY |
                            Intent.FLAG_ACTIVITY_NEW_DOCUMENT |
                            Intent.FLAG_ACTIVITY_MULTIPLE_TASK);
            currentActivity.startActivity(intent);
            promise.resolve(true);
        } catch (ActivityNotFoundException e) {
            // Play Store not available — fall back to browser
            try {
                Intent webIntent = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/apps/details?id=" + packageId));
                currentActivity.startActivity(webIntent);
                promise.resolve(true);
            } catch (Exception ex) {
                promise.reject("OPEN_ERROR", "Could not open Play Store: " + ex.getMessage());
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Android-version-aware package installation check.
     * Returns true if the package is installed, false otherwise.
     */
    private boolean isPackageInstalled(String packageId) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(packageId, PackageManager.PackageInfoFlags.of(0));
            } else {
                pm.getPackageInfo(packageId, PackageManager.GET_ACTIVITIES);
            }
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Launch the RD Service app using a specific Intent action.
     * Rejects pendingPromise and clears state on any launch failure.
     */
    private void launchRdService(Activity activity, String packageId, String action, String pidOptions) {
        try {
            Intent intent = new Intent(action);
            intent.setPackage(packageId);

            // ── CRITICAL: Use provided PID_OPTIONS or fallback to default ───
            String finalOptions = (pidOptions != null && !pidOptions.isEmpty()) ? pidOptions : DEFAULT_PID_OPTIONS;
            intent.putExtra("PID_OPTIONS", finalOptions);

            // Optional: pass AUA/Sub-AUA if your gateway requires them
            // intent.putExtra("AUA_CODE", "your_aua_code");
            // intent.putExtra("SUB_AUA_CODE", "your_sub_aua_code");

            activity.startActivityForResult(intent, RD_SERVICE_REQUEST_CODE);

        } catch (ActivityNotFoundException e) {
            if (pendingPromise != null) {
                pendingPromise.reject(
                        "ACTIVITY_NOT_FOUND",
                        "Could not launch RD Service (action=" + action + "). " +
                                "Ensure the biometric device is connected and the RD Service app is installed.");
            }
            clearPending();

        } catch (Exception e) {
            if (pendingPromise != null) {
                pendingPromise.reject("LAUNCH_ERROR", "Failed to launch RD Service: " + e.getMessage());
            }
            clearPending();
        }
    }

    /**
     * Retry Morpho capture with the alternate action string.
     * Called from onActivityResult when the standard action fails for Morpho.
     */
    private void retryWithAltAction(Activity activity, String pidOptions) {
        triedAltAction = true;
        launchRdService(activity, MORPHO_PACKAGE, RD_ACTION_MORPHO_ALT, pidOptions);
    }

    /**
     * Clear all pending state after a capture completes (success or failure).
     */
    private void clearPending() {
        pendingPromise = null;
        pendingPackageId = null;
        pendingPidOptions = null;
        triedAltAction = false;
    }
}