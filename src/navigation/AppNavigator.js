// src/navigation/AppNavigator.js

import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Screens
import ProfileScreen from '../screens/Profile/ProfileScreen';
import EditProfileScreen from '../screens/Profile/EditProfileScreen';
import FinanceHome from '../screens/HomeScreen/Home';

import Login from '../screens/UserLogin/Login';
import Otp from '../screens/UserLogin/Otp';
import ActivateAccountScreen from '../screens/AccountActivate/ActivateAccountScreen';
import PaymentsScreen from '../screens/Services/BBPS_Services/BBPSService';
import StorePlans from '../screens/Services/Recharge/RechargePlans';
import InvoiceScreen from '../screens/Reports/TranscationHistory';
import Signup from '../screens/UserLogin/Signup';
import CreateUser from '../screens/UserDownline/CreateUser';
import FinanceIntro from '../screens/UserLogin/Splash';
import TopUpScreen from '../screens/Services/Recharge/Recharge';

import UserListScreen from '../screens/UserDownline/UserListScreen';

import WalletTransactionScreen from '../screens/Reports/WalletLedger'
import BalanceEnquiry from "../screens/Services/AEPS_Services/BalanceEnquiry";
import CashWithdraw from "../screens/Services/AEPS_Services/CashWithdraw";
import MiniStatement from "../screens/Services/AEPS_Services/MiniStatements";
import DmtLogin from "../screens/DMT/DmtLogin"
import AddBeneficial from "../screens/DMT/AddBeneficial";
import DmtHome from "../screens/DMT/DmtHome"
import ReceiptScreen from "../screens/Services/AEPS_Services/PaymentReceipt"
import ChangePassword from "../screens/Account/ChangePassword"
import ChangePin from "../screens/Account/ChangePin"
import ForgotPassword from "../screens/Account/ForgotPassword"
import ForgotPin from "../screens/Account/ForgotPin"
import MoneyTransfer from "../screens/DMT/MoneyTransfer"
import SupportScreen from "../screens/Support/SupportScreen"
import FaqSupportScreen from "../screens/Support/FaQSupport"
import PaymentVerification from '../screens/AccountActivate/PaymentVerification';
import Offlinekyc from '../screens/kyc/Offlinekyc';
import KycSubmitted from '../screens/kyc/KycSubmitted';
import OfflineTopup from '../screens/OfflineTopup';
import BbpsDynamicServiceScreen from '../screens/Services/BBPS_Services/BbpsDynamicServiceScreen';
import WalletTransfer from '../screens/UserDownline/DownlineWalletTransfer';
import CommisionPlan from '../screens/CommisionPlan';
import UserWalletRefill from '../screens/UserDownline/UserWalletRefill';
import OfflineServices from '../screens/Services/OfflineServices/OfflineServices';
import OfflineServiceForm from '../screens/Services/OfflineServices/OfflineServiceForm';
import Notification from '../screens/Notification';
const Stack = createStackNavigator();

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('header_token');

        if (token) {
          console.log("🔐 Token Found → Fetching Profile Status");

          try {
            const response = await fetch('http://192.168.1.16:8000/fetch-user-profile', {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();

            if (result?.success && result?.data) {
              const { kycStatus, isPaymentDone, idPaymentStatus } = result.data;
              console.log("Profile Sync →", { kycStatus, isPaymentDone, idPaymentStatus });

              // Sync to storage
              if (kycStatus) await AsyncStorage.setItem('kyc_status', kycStatus);
              await AsyncStorage.setItem('is_payment_done', String(isPaymentDone));
              if (idPaymentStatus) await AsyncStorage.setItem('id_payment_status', idPaymentStatus);

              if (kycStatus === "approved") {
                setInitialRoute('FinanceHome');
              } else if (kycStatus === "submitted") {
                setInitialRoute('KycSubmitted');
              } else if (kycStatus === "pending" || kycStatus === "rejected") {
                if (isPaymentDone === false) {
                  if (idPaymentStatus === "complete") {
                    setInitialRoute('PaymentVerification');
                  } else {
                    setInitialRoute('ActivateAccountScreen');
                  }
                } else {
                  setInitialRoute('Offlinekyc');
                }
              } else {
                setInitialRoute('Offlinekyc');
              }
            } else {
              setInitialRoute('FinanceIntro');
            }
          } catch (apiError) {
            console.error("Profile Fetch Error:", apiError);
            setInitialRoute('FinanceIntro');
          }
        } else {
          console.log("❌ No Token → Go to Login");
          setInitialRoute('FinanceIntro');
        }

      } catch (error) {
        console.error("Token Check Error:", error);
        setInitialRoute('FinanceIntro');
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  // Loading screen
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#fff',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color="#7756c4ff" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Stack.Screen name="FinanceHome" component={FinanceHome} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Otp" component={Otp} />

      <Stack.Screen name="PaymentsScreen" component={PaymentsScreen} />
      <Stack.Screen name="StorePlans" component={StorePlans} />
      <Stack.Screen name="InvoiceScreen" component={InvoiceScreen} />
      <Stack.Screen name="FinanceIntro" component={FinanceIntro} />
      <Stack.Screen name="TopUpScreen" component={TopUpScreen} />

      <Stack.Screen name="WalletTransactionScreen" component={WalletTransactionScreen} />

      <Stack.Screen name="DmtLogin" component={DmtLogin} />
      <Stack.Screen name="BalanceEnquiry" component={BalanceEnquiry} />
      <Stack.Screen name="CashWithdraw" component={CashWithdraw} />
      <Stack.Screen name="MiniStatement" component={MiniStatement} />
      <Stack.Screen name="PaymentReceipt" component={ReceiptScreen} />
      <Stack.Screen name="AddBenificial" component={AddBeneficial} />
      <Stack.Screen name="DmtHome" component={DmtHome} />
      <Stack.Screen name="MoneyTransfer" component={MoneyTransfer} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="ChangePin" component={ChangePin} />
      <Stack.Screen name="ForgotPasswordScreen" component={ForgotPassword} />
      <Stack.Screen name="ForgotPin" component={ForgotPin} />
      <Stack.Screen name="SupportScreen" component={SupportScreen} />
      <Stack.Screen name="FaqSupportScreen" component={FaqSupportScreen} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="Offlinekyc" component={Offlinekyc} />
      <Stack.Screen name="KycSubmitted" component={KycSubmitted} />
      <Stack.Screen name="OfflineTopup" component={OfflineTopup} />
      <Stack.Screen name="BbpsDynamicServiceScreen" component={BbpsDynamicServiceScreen} />
      <Stack.Screen name="ActivateAccountScreen" component={ActivateAccountScreen} />
      <Stack.Screen name="CreateUser" component={CreateUser} />
      <Stack.Screen name="UserListScreen" component={UserListScreen} />
      <Stack.Screen name="WalletTransfer" component={WalletTransfer} />
      <Stack.Screen name="CommisionPlan" component={CommisionPlan} />
      <Stack.Screen name="UserWalletRefill" component={UserWalletRefill} />
      <Stack.Screen name="OfflineServices" component={OfflineServices} />
      <Stack.Screen name="OfflineServiceForm" component={OfflineServiceForm} />
      <Stack.Screen name="PaymentVerification" component={PaymentVerification} />
      <Stack.Screen name="Notification" component={Notification} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
