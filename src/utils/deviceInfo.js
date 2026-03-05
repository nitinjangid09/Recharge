import DeviceInfo from "react-native-device-info";

export const getDeviceDetails = async () => {
  const deviceId = await DeviceInfo.getAndroidId(); // SAFE replacement for IMEI
  const deviceName = await DeviceInfo.getModel();

  return {
    imei: deviceId,
    device: deviceName
  };
};
