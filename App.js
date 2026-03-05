import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import AppNavigator from "./src/navigation/AppNavigator";
import { toastConfig } from "./src/utils/toastConfig";

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
        <Toast config={toastConfig} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;