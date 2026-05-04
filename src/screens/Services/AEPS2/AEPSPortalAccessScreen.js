import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Easing,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../constants/Colors';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import RDService from '../../../utils/RDService';
import { aeps2DailyLogin } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import Geolocation from '@react-native-community/geolocation';

const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const vscale = (n) => Math.round((SH / 812) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
  Math.min(Math.max(scale(n), lo), hi);

// WalletBar removed

// ─── Animated Fingerprint Pulse ───────────────────────────────────
const FingerprintPulse = ({ active }) => {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.5)).current;
  const opacity2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse1, { toValue: 1.4, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse1, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity1, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    const loop2 = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(pulse2, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(opacity2, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.3, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    loop2.start();
    return () => { loop.stop(); loop2.stop(); };
  }, [active]);

  return (
    <View style={fpStyles.container}>
      {active && (
        <>
          <Animated.View style={[fpStyles.ring, { transform: [{ scale: pulse1 }], opacity: opacity1 }]} />
          <Animated.View style={[fpStyles.ring2, { transform: [{ scale: pulse2 }], opacity: opacity2 }]} />
        </>
      )}
      <View style={fpStyles.core}>
        <Icon name="fingerprint" size={rs(34)} color={Colors.primary} />
      </View>
    </View>
  );
};

const fpStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', width: rs(100), height: rs(100), marginBottom: rs(8) },
  ring: {
    position: 'absolute',
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ring2: {
    position: 'absolute',
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  core: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    backgroundColor: Colors.cardbg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  icon: { fontSize: rs(28) },
});

// AadhaarGrid removed per user request for simpler input

// ─── Screen ───────────────────────────────────────────────────────
export default function AEPSPortalAccessScreen({ navigation }) {
  const [aadhaar, setAadhaar] = useState('');
  const [device, setDevice] = useState('MANTRA');
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const cardScale = useRef(new Animated.Value(0.96)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const formatAadhaar = (raw) => raw.replace(/\D/g, '').slice(0, 12);

  const handleLogin = async () => {
    const clean = aadhaar.replace(/\D/g, '');
    if (clean.length === 0) {
      setError('Please enter merchant Aadhaar');
      return;
    }
    if (clean.length !== 12) {
      setError('Aadhaar must be 12 digits');
      return;
    }
    setError('');

    try {
      setScanning(true);

      // 1. Build PidOptions XML
      const pidOptString = '<PidOptions ver="1.0">'
        + '<Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" otp="" posh="UNKNOWN" env="P" />'
        + '<Demo></Demo>'
        + '<CustOpts></CustOpts>'
        + '</PidOptions>';

      // 2. Capture Biometric PID
      const pidData = await RDService.capture(device, pidOptString);
      if (!pidData) {
        setScanning(true); // show error state
        setScanning(false);
        AlertService.showAlert({ type: 'error', title: 'Capture Failed', message: 'No biometric data received from scanner.' });
        return;
      }

      // 2. Get Location
      const getPos = () => new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude.toString(), lon: p.coords.longitude.toString() }),
          () => resolve({ lat: "26.889811", lon: "75.738343" }), // Sample defaults
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
      const coords = await getPos();

      // 3. Prepare Payload (Keys as requested)
      const hToken = await AsyncStorage.getItem("header_token");
      const hKey = await AsyncStorage.getItem("header_key");
      const clientRefId = `AEPS2_DL_${Date.now()}`;

      const payload = {
        aadhaar: String(aadhaar.replace(/\D/g, '')),
        latitude: coords.lat,
        longitude: coords.lon,
        pidData: pidData.startsWith('<?xml') ? pidData : `<?xml version="1.0"?>${pidData}`
      };

      // 4. Call new API
      const res = await aeps2DailyLogin({
        data: payload,
        headerToken: hToken,
        headerKey: hKey,
        idempotencyKey: clientRefId
      });

      setScanning(false);

      if (res.success || res.status === 'SUCCESS' || res.status === '1') {
        setScanDone(true);
        AlertService.showAlert({
          type: 'success',
          title: 'Verified',
          message: res.message || 'Portal access granted. Redirecting to dashboard.',
          onClose: () => navigation.replace('AePSDashboard')
        });
      } else {
        const msg = typeof res.message === 'string' ? res.message : 'Daily login failed. Please try again.';
        AlertService.showAlert({
          type: 'error',
          title: 'Authentication Failed',
          message: msg
        });
      }
    } catch (err) {
      setScanning(false);
      console.log("[AEPS2_DL] Error:", err);
      AlertService.showAlert({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Biometric capture or network error.'
      });
    }
  };

  const ready = aadhaar.replace(/\D/g, '').length === 12;

  return (
    <SafeAreaView style={styles.safe}>
      <HeaderBar
        title="Portal Authentication"
        onBack={() => navigation.navigate('AEPS2BiometricKYC')}
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(40) }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}>
          <Text style={styles.cardTitle}>PORTAL ACCESS</Text>
          <Text style={styles.cardSub}>SECURE BIOMETRIC GATEWAY</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Aadhaar Input Container */}
          <View style={{ width: '100%', marginBottom: rs(10) }}>
            <Text style={styles.fieldLabel}>MERCHANT AADHAAR NUMBER</Text>
            <View style={styles.aadhaarBox}>
              <TextInput
                style={styles.aadhaarInput}
                value={aadhaar}
                selection={{ start: aadhaar.length, end: aadhaar.length }}
                onChangeText={(t) => {
                  setAadhaar(formatAadhaar(t));
                  if (error) setError('');
                }}
                keyboardType="numeric"
                maxLength={12}
                placeholder="0000 0000 0000"
                placeholderTextColor={Colors.gray}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Device Selection */}
          <View style={{ width: '100%', marginBottom: rs(20) }}>
            <Text style={styles.fieldLabel}>SELECT BIOMETRIC DEVICE</Text>
            <View style={styles.deviceRow}>
              {['MANTRA', 'MORPHO', 'STARTEK'].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDevice(d)}
                  style={[styles.deviceChip, device === d && styles.deviceChipActive]}
                >
                  <Text style={[styles.deviceText, device === d && styles.deviceTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fingerprint section (shown once aadhaar is filled) */}
          {aadhaar.replace(/\D/g, '').length === 12 && (
            <View style={styles.scanSection}>
              <FingerprintPulse active={scanning} />
              <Text style={styles.scanLabel}>
                {scanDone ? '✓ Scan Verified' : scanning ? 'Scanning...' : 'Place finger on scanner'}
              </Text>
            </View>
          )}

          <View style={{ height: rs(10) }} />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.dailyBtn, aadhaar.replace(/\D/g, '').length !== 12 && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={scanning}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.dailyBtnText, aadhaar.replace(/\D/g, '').length !== 12 && { color: Colors.slate_500 }]}
              >
                {scanning ? 'SCANNING...' : 'AUTHENTICATE'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Security Note ── */}
      <Text style={styles.secNote}>
        🔒  Biometric fingerprint scan required daily for security compliance
      </Text>

      {/* ── Spacer for Bottom ── */}
      <View style={{ height: rs(20) }} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.beige },


  card: {
    backgroundColor: Colors.beige,
    borderRadius: rs(28),
    marginHorizontal: rs(20),
    marginTop: rs(12),
    padding: rs(28),
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
  },

  cardTitle: {
    fontSize: rs(18),
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: rs(4),
  },
  cardSub: {
    fontSize: rs(10),
    color: Colors.text_secondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: rs(20),
    textAlign: 'center',
  },
  divider: { width: '100%', height: 0.5, backgroundColor: Colors.input_border, marginBottom: rs(20) },

  fieldLabel: {
    fontSize: rs(10),
    fontWeight: '700',
    color: Colors.text_secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: rs(10),
    alignSelf: 'flex-start',
  },

  aadhaarBox: {
    backgroundColor: Colors.beige,
    borderRadius: rs(20),
    paddingVertical: rs(22),
    paddingHorizontal: rs(10),
    width: '100%',
    marginBottom: rs(24),
    borderWidth: 1.5,
    borderColor: Colors.finance_accent + "40",
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aadhaarInput: {
    flex: 1,
    fontSize: rs(16),
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: rs(5),
    textAlign: 'left',
    paddingLeft: rs(20),
    padding: 0,
  },

  scanSection: { alignItems: 'center', marginBottom: rs(16) },
  scanLabel: { fontSize: rs(12), color: Colors.text_secondary, fontWeight: '600' },

  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: rs(18),
    height: rs(54),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(10),
    marginBottom: rs(4),
  },
  btnDisabled: { backgroundColor: Colors.gold },
  dailyBtnText: {
    fontSize: rs(13),
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 1,
    textAlign: 'center',
  },


  secNote: {
    textAlign: 'center',
    fontSize: rs(11),
    color: Colors.text_secondary,
    marginTop: rs(16),
    paddingHorizontal: rs(20),
    lineHeight: rs(18),
  },
  errorText: {
    fontSize: rs(10),
    color: Colors.red,
    marginTop: -rs(15),
    marginBottom: rs(15),
    fontWeight: '600',
    textAlign: 'center'
  },
  deviceRow: { flexDirection: 'row', gap: rs(8), justifyContent: 'center' },
  deviceChip: {
    flex: 1,
    paddingVertical: rs(10),
    borderRadius: rs(12),
    backgroundColor: Colors.cardbg,
    borderWidth: 1,
    borderColor: Colors.finance_accent + "33",
    alignItems: 'center'
  },
  deviceChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  deviceText: { fontSize: rs(10), fontWeight: '700', color: Colors.text_secondary },
  deviceTextActive: { color: Colors.white }
});
