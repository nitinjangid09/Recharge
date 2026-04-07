// src/navigation/AppNavigator.js

import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Screens
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import Address from '../screens/Address';
import FinanceHome from '../screens/FinanceHome';
import test from '../screens/test';
import Login from '../screens/Login';
import Otp from '../screens/Otp';
import ActivateAccountScreen from '../screens/ActivateAccountScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import StorePlans from '../screens/StorePlans';
import InvoiceScreen from '../screens/InvoiceScreen';
import Signup from '../screens/Signup';
import CreateUser from '../screens/CreateUser';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import FinanceIntro from '../screens/FinanceIntro';
import TopUpScreen from '../screens/TopUpScreen';
import RechargeScreen from '../screens/RechargeScreen';
import PaymentDetails from '../screens/PaymentDetails';
import Transaction from '../screens/Transaction';
import BBPSServices from '../screens/BBPSServices';
import UserListScreen from '../screens/UserListScreen';

import WalletTransactionScreen from '../screens/WalletTranscation'
import BalanceEnquiry from "../screens/AEPS_Services/BalanceEnquiry";
import CashWithdraw from "../screens/AEPS_Services/CashWithdraw";
import MiniStatement from "../screens/AEPS_Services/MiniStatements";
import DmtLogin from "../screens/DMT/DmtLogin"
import AddBeneficial from "../screens/DMT/AddBeneficial";
import DmtHome from "../screens/DMT/DmtHome"
import ReceiptScreen from "../screens/AEPS_Services/PaymentReceipt"
import AEPSServiceCard from "../screens/AEPS/AEPSServiceCard"
import LoginActivity from "../screens/Account/LoginActivity"
import ChangePassword from "../screens/Account/ChangePassword"
import ChangePin from "../screens/Account/ChangePin"
import ForgotPassword from "../screens/Account/ForgotPassword"
import ForgotPin from "../screens/Account/ForgotPin"
import MoneyTransfer from "../screens/DMT/MoneyTransfer"
// import BBPSServices from "../screens/BBPS_Services/BBPSServiceScreen"
import SupportScreen from "../screens/Account/SupportScreen"
import FaqSupportScreen from "../screens/HomeScreen/FaQSupport"
import PaymentVerification from '../screens/Account/PaymentVerification';
import Offlinekyc from '../screens/kyc/Offlinekyc';
import KycSubmitted from '../screens/kyc/KycSubmitted';
import OfflineTopup from '../screens/OfflineTopup';
import BbpsDynamicServiceScreen from '../screens/BBPS_Services/BbpsDynamicServiceScreen';
import WalletTransfer from '../screens/WalletTransfer';
import CommisionPlan from '../screens/CommisionPlan';
import UserWalletRefill from '../screens/UserWalletRefill';
import OfflineServices from '../screens/OfflineServices';
import OfflineServiceForm from '../screens/OfflineServiceForm';
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
      <Stack.Screen name="Address" component={Address} />
      <Stack.Screen name="FinanceHome" component={FinanceHome} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Otp" component={Otp} />
      <Stack.Screen name="test" component={test} />
      <Stack.Screen name="PaymentsScreen" component={PaymentsScreen} />
      <Stack.Screen name="StorePlans" component={StorePlans} />
      <Stack.Screen name="InvoiceScreen" component={InvoiceScreen} />
      <Stack.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
      <Stack.Screen name="FinanceIntro" component={FinanceIntro} />
      <Stack.Screen name="TopUpScreen" component={TopUpScreen} />
      <Stack.Screen name="RechargeScreen" component={RechargeScreen} />
      <Stack.Screen name="PaymentDetails" component={PaymentDetails} />
      <Stack.Screen name="Transaction" component={Transaction} />
      <Stack.Screen name="BBPSServices" component={BBPSServices} />
      <Stack.Screen name="WalletTransactionScreen" component={WalletTransactionScreen} />
      <Stack.Screen name="LoginActivity" component={LoginActivity} />
      <Stack.Screen name="AEPSServiceCard" component={AEPSServiceCard} />
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
