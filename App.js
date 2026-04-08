import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import AppNavigator from "./src/navigation/AppNavigator";
import { toastConfig } from "./src/utils/toastConfig";
import { navigationRef } from "./src/utils/NavigationService";

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <Toast config={toastConfig} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;