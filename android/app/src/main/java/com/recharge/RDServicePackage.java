package com.recharge; // ← change to your actual package name

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * RDServicePackage
 *
 * Register this in your MainApplication.java inside getPackages():
 *
 * @Override
 *           protected List<ReactPackage> getPackages() {
 *           List<ReactPackage> packages = new PackageList(this).getPackages();
 *           packages.add(new RDServicePackage()); // ← add this line
 *           return packages;
 *           }
 */
public class RDServicePackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new RDServiceModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
