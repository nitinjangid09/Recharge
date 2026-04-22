// src/navigation/AppNavigator.js

import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Dimensions } from 'react-native';
import { fetchUserProfile } from '../api/AuthApi';

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
import BalanceEnquiry from "../screens/Services/AEPS1/BalanceEnquiry";
import CashWithdraw from "../screens/Services/AEPS1/CashWithdraw";
import MiniStatement from "../screens/Services/AEPS1/MiniStatements";
import AepsRegistration from "../screens/Services/AEPS1/AepsRegistration";
import DailyLogin from "../screens/Services/AEPS1/DailyLogin";
import DmtLogin from "../screens/Services/DMT/DmtLogin"
import AddBeneficial from "../screens/Services/DMT/AddBeneficial";
import DmtHome from "../screens/Services/DMT/DmtHome"
import ReceiptScreen from "../screens/Services/AEPS1/PaymentReceipt"
import ChangePassword from "../screens/Account/ChangePassword"
import ChangePin from "../screens/Account/ChangePin"
import ForgotPassword from "../screens/Account/ForgotPassword"
import ForgotPin from "../screens/Account/ForgotPin"
import ResetPassword from "../screens/Account/ResetPassword"
import MoneyTransfer from "../screens/Services/DMT/MoneyTransfer"
import SupportScreen from "../screens/Support/SupportScreen"
import FaqSupportScreen from "../screens/Support/FaQSupport"
import PaymentVerification from '../screens/AccountActivate/PaymentVerification';
import Offlinekyc from '../screens/kyc/Offlinekyc';
import KycSubmitted from '../screens/kyc/KycSubmitted';
import OfflineTopup from '../screens/OfflineTopup';
import BbpsDynamicServiceScreen from '../screens/Services/BBPS_Services/BbpsDynamicServiceScreen';
import WalletTransfer from '../screens/UserDownline/WalletTransfer';
import CommisionPlan from '../screens/CommisionPlan';
import UserWalletRefill from '../screens/UserDownline/UserWalletRefill';
import OfflineServices from '../screens/Services/OfflineServices/OfflineServices';
import OfflineServiceForm from '../screens/Services/OfflineServices/OfflineServiceForm';
import Notification from '../screens/Notification';
import AEPS_OnBoard from '../screens/Services/AEPS1/AEPS_OnBoard';
import AEPS1 from '../screens/Services/AEPS1/AEPS_Services';
import AEPSPortalAccess from '../screens/Services/AEPS2/AEPSPortalAccessScreen';
import AEPSAadhaarOTP from '../screens/Services/AEPS2/AEPSAadhaarOTPScreen';
import AEPSSecondaryRegistration from '../screens/Services/AEPS2/AEPSSecondaryRegistrationScreen';
import AEPSServiceActivation from '../screens/Services/AEPS2/AEPSServiceActivationScreen';
import AePSDashboard from '../screens/Services/AEPS2/AePSDashboardScreen';
import TransactionAuditScreen from '../screens/Reports/WalletAudit';
import AEPSPayOut from '../screens/Services/AEPS1/AEPS_Payout';
import AddPayoutBank from '../screens/Services/AEPS1/AddPayoutBank';
import AEPSTransfer from '../screens/Services/AEPS1/AEPS_PayOut_Transfer';



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
            const result = await fetchUserProfile({ headerToken: token });

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
              } else if (kycStatus === "rekyc") {
                setInitialRoute('Offlinekyc');
              } else if (kycStatus === "pending" || kycStatus === "rejected") {
                if (isPaymentDone === false) {
                  if (idPaymentStatus === "complete") {
                    setInitialRoute('PaymentVerification');
                  } else if (idPaymentStatus === "reject") {
                    setInitialRoute('ActivateAccountScreen');
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
      <Stack.Screen name="AepsRegistration" component={AepsRegistration} />
      <Stack.Screen name="DailyLogin" component={DailyLogin} />
      <Stack.Screen name="AddBenificial" component={AddBeneficial} />
      <Stack.Screen name="DmtHome" component={DmtHome} />
      <Stack.Screen name="MoneyTransfer" component={MoneyTransfer} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="ChangePin" component={ChangePin} />
      <Stack.Screen name="ForgotPasswordScreen" component={ForgotPassword} />
      <Stack.Screen name="ForgotPin" component={ForgotPin} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
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
      <Stack.Screen name="AEPS_OnBoard" component={AEPS_OnBoard} />
      <Stack.Screen name="AEPS1" component={AEPS1} />
      <Stack.Screen name="AEPSPortalAccess" component={AEPSPortalAccess} />
      <Stack.Screen name="AEPSAadhaarOTP" component={AEPSAadhaarOTP} />
      <Stack.Screen name="AEPSSecondaryRegistration" component={AEPSSecondaryRegistration} />
      <Stack.Screen name="AEPSServiceActivation" component={AEPSServiceActivation} />
      <Stack.Screen name="AePSDashboard" component={AePSDashboard} />
      <Stack.Screen name="WalletAudit" component={TransactionAuditScreen} />
      <Stack.Screen name="AEPSPayOut" component={AEPSPayOut} />
      <Stack.Screen name="AddPayoutBank" component={AddPayoutBank} />
      <Stack.Screen name="AEPSTransfer" component={AEPSTransfer} />


    </Stack.Navigator>
  );
};

export default AppNavigator;
