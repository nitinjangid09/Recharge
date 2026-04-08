import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator from "./src/navigation/AppNavigator";
import { navigationRef } from "./src/utils/NavigationService";
import GlobalAlertProvider from "./src/componets/Alerts/GlobalAlertProvider";

const App = () => {
  return (
    <SafeAreaProvider>
      <GlobalAlertProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </GlobalAlertProvider>
    </SafeAreaProvider>
  );
};

export default App;