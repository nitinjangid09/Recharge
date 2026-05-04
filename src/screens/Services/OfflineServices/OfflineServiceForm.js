import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    PermissionsAndroid,
    PixelRatio,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import Colors from '../../../constants/Colors';
import Fonts from '../../../constants/Fonts';
import { getOfflineServiceForm, BASE_URL } from '../../../api/AuthApi';
import CustomAlert from '../../../componets/Alerts/CustomAlert';
import ImageUploadAlert from '../../../componets/Alerts/Imageuploadalert';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function OfflineServiceForm({ navigation, route }) {
    const { service } = route.params; // service contains {_id, serviceName, description}
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formConfig, setFormConfig] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [documents, setDocuments] = useState({});
    const [showImageModal, setShowImageModal] = useState(false);
    const [activeDoc, setActiveDoc] = useState({ key: '', label: '' });

    const { width: W } = Dimensions.get("window");
    const S = (n) => Math.round(PixelRatio.roundToNearestPixel(n * (W / 375)));

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        onClose: null,
    });

    const showAlert = (type, title, message, onClose = null) => {
        setAlertConfig({ visible: true, type, title, message, onClose });
    };

    const hideAlert = () => {
        const { onClose } = alertConfig;
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onClose) setTimeout(onClose, 300);
    };

    useEffect(() => {
        fetchFormStructure();
    }, []);

    const fetchFormStructure = async () => {
        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem('header_token');
            console.log("[OfflineForm] Fetching fields for service:", service._id);
            const res = await getOfflineServiceForm({
                serviceId: service._id,
                headerToken
            });

            console.log("[OfflineForm] API Response:", JSON.stringify(res));

            // Support both { data: { field } } and { data: { data: { field } } }
            const actualData = res?.data?.data || res?.data;

            if (res?.success && actualData) {
                setFormConfig(actualData);
                // Initialize form values safely
                const initialValues = {};
                (actualData.requiredFields || []).forEach(f => {
                    initialValues[f.key] = '';
                });
                setFormValues(initialValues);
            }
        } catch (err) {
            console.log("[OfflineForm] Catch Error:", err);
            showAlert('error', 'Error', 'Could not fetch service details.');
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (key, val) => {
        let sanitized = val;
        // If it's an amount field, prevent leading zeros
        if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('amt')) {
            sanitized = val.replace(/[^0-9]/g, '');
            if (sanitized.startsWith("0")) sanitized = sanitized.replace(/^0+/, "");
        }
        setFormValues(prev => ({ ...prev, [key]: sanitized }));
    };

    const handlePickDocument = (key, label) => {
        setActiveDoc({ key, label });
        setShowImageModal(true);
    };

    const pickImage = async (key, source) => {
        const options = {
            mediaType: 'photo',
            quality: 0.7,
            selectionLimit: 1,
            saveToPhotos: false,
        };

        if (source === 'camera') {
            try {
                // ── Standard Android permission request ──
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: "Camera Permission",
                        message: "App needs camera access to take document photos.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK",
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED || Platform.OS === 'ios') {
                    const result = await launchCamera(options);
                    if (result.didCancel) return;
                    if (result.errorCode) {
                        console.log("[ImagePicker] error:", result.errorMessage || result.errorCode);
                        showAlert('error', 'Camera Error', result.errorMessage || 'Could not open camera.');
                        return;
                    }
                    if (result.assets && result.assets.length > 0) {
                        const asset = result.assets[0];
                        setDocuments(prev => ({
                            ...prev,
                            [key]: {
                                uri: asset.uri,
                                name: asset.fileName || asset.uri.split('/').pop() || `${key}.jpg`,
                                type: asset.type || 'image/jpeg',
                            }
                        }));
                        setShowImageModal(false);
                    }
                } else {
                    showAlert('error', 'Permission Denied', 'Camera permission is required to take photos.');
                }
            } catch (err) {
                console.warn("[CameraPermission] Error:", err);
                showAlert('error', 'Error', 'Unexpected error opening camera.');
            }
        } else {
            const result = await launchImageLibrary(options);
            if (!result.didCancel && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setDocuments(prev => ({
                    ...prev,
                    [key]: {
                        uri: asset.uri,
                        name: asset.fileName || asset.uri.split('/').pop() || `${key}.jpg`,
                        type: asset.type || 'image/jpeg',
                    }
                }));
                setShowImageModal(false);
            }
        }
    };

    const removeDocument = (key) => {
        setDocuments(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleSubmit = async () => {
        // Basic validation
        const missingFields = (formConfig.requiredFields || []).filter(f => !formValues[f.key]?.trim());
        if (missingFields.length > 0) {
            showAlert('warning', 'Required Information', `Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
            return;
        }

        const missingDocs = (formConfig.requiredDocuments || []).filter(d => !documents[d.key]);
        if (missingDocs.length > 0) {
            showAlert('warning', 'Required Documents', `Please upload: ${missingDocs.map(d => d.label).join(', ')}`);
            return;
        }

        // For confirmation, we can use a standard alert for now OR implement a type for confirmation in CustomAlert.
        // Given CustomAlert doesn't have a "confirm" button list yet, we'll use type="info" for the prompt message.
        processSubmission();
    };

    const processSubmission = async () => {
        setSubmitting(true);
        // This is where the submission API call will go.
        // For now, satisfy user's prompt by showing the dynamic structure.
        setTimeout(() => {
            setSubmitting(false);
            showAlert('success', 'Success', 'Protocol submitted successfully under processing phase.', () => {
                navigation.goBack();
            });
        }, 1500);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <HeaderBar title={service.serviceName?.toUpperCase() || "SERVICE"} onBack={() => navigation.goBack()} />
                <View style={styles.loaderCentering}>
                    <ActivityIndicator size="large" color={Colors.finance_accent} />
                    <Text style={styles.loadingText}>Loading protocol requirements...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <HeaderBar title={service.serviceName?.toUpperCase() || "SERVICE"} onBack={() => navigation.goBack()} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Dynamic Required Fields */}
                    {formConfig?.requiredFields?.length > 0 && (
                        <View style={styles.modernCard}>
                            <View style={styles.cardHighlightHeader}>
                                <Icon name="account-details-outline" size={16} color={Colors.finance_accent} />
                                <Text style={styles.cardHighlightTitle}>REQUIRED INFORMATION</Text>
                            </View>
                            <View style={styles.cardBody}>
                                {formConfig.requiredFields.map((field) => (
                                    <View key={field._id} style={styles.modernInputWrapper}>
                                        <Text style={styles.floatingLabel}>{field.label}</Text>
                                        <TextInput
                                            style={styles.bigInput}
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                            placeholderTextColor={Colors.slate_500}
                                            value={formValues[field.key]}
                                            onChangeText={(val) => handleFieldChange(field.key, val)}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Dynamic Required Documents */}
                    {formConfig?.requiredDocuments?.length > 0 && (
                        <View style={styles.modernCard}>
                            <View style={styles.cardHighlightHeader}>
                                <Icon name="file-document-outline" size={16} color={Colors.finance_accent} />
                                <Text style={styles.cardHighlightTitle}>REQUIRED DOCUMENTS</Text>
                            </View>
                            <View style={styles.cardBody}>
                                <View style={styles.docGrid}>
                                    {formConfig.requiredDocuments.map((doc) => (
                                        <View key={doc._id} style={styles.docItem}>
                                            <Text style={styles.docLabel}>{doc.label}</Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.docBox,
                                                    documents[doc.key] && { borderStyle: "solid", borderColor: Colors.kyc_success, backgroundColor: Colors.kyc_success + "08" }
                                                ]}
                                                onPress={() => handlePickDocument(doc.key, doc.label)}
                                                activeOpacity={0.75}
                                            >
                                                {documents[doc.key] ? (
                                                    <View style={{ width: '100%', height: '100%' }}>
                                                        <Image source={{ uri: documents[doc.key].uri }} style={styles.docThumb} resizeMode="cover" />
                                                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.72)"]} style={styles.docOverlay} start={{ x: 0, y: 0.5 }} end={{ x: 0, y: 1 }}>
                                                            <Icon name="check-circle" size={14} color={Colors.white} />
                                                            <Text style={styles.docDoneLabel}>UPLOADED</Text>
                                                        </LinearGradient>
                                                        <TouchableOpacity
                                                            style={styles.cornerDelete}
                                                            onPress={() => removeDocument(doc.key)}
                                                        >
                                                            <Icon name="close" size={11} color={Colors.white} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <View style={styles.docEmptyContent}>
                                                        <View style={[styles.docIconCircle, { backgroundColor: Colors.finance_accent + "12" }]}>
                                                            <Icon name="file-document-outline" size={18} color={Colors.finance_accent} />
                                                        </View>
                                                        <Text style={styles.docSlotLabel}>{doc.label}</Text>
                                                        <View style={styles.docUploadTag}>
                                                            <Icon name="plus" size={10} color={Colors.finance_accent} />
                                                            <Text style={styles.docUploadTagText}>Upload</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Hero Information */}
                    <View style={styles.modernCard}>
                        <View style={styles.cardHighlightHeader}>
                            <Icon name="information-outline" size={16} color={Colors.finance_accent} />
                            <Text style={styles.cardHighlightTitle}>SERVICE DETAILS</Text>
                        </View>
                        <View style={styles.cardBody}>
                            <Text style={styles.infoTitle}>{service.serviceName?.toUpperCase() || "SERVICE"}</Text>
                            <Text style={styles.infoDesc}>{service.description || "Instruction protocol for offline processing."}</Text>
                            <View style={styles.feeTag}>
                                <Text style={styles.feeLabel}>SERVICE FEE:</Text>
                                <Text style={styles.feeAmount}>₹{service.amount}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Floating Bottom Button */}
                <TouchableOpacity
                    style={styles.submitBtnFixed}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={styles.submitBtnText}>CONTINUE TO SUBMISSION</Text>
                    )}
                </TouchableOpacity>
            </KeyboardAvoidingView>

            <ImageUploadAlert
                visible={showImageModal}
                onClose={() => setShowImageModal(false)}
                onCamera={() => pickImage(activeDoc.key, 'camera')}
                onGallery={() => pickImage(activeDoc.key, 'gallery')}
                onFile={() => pickImage(activeDoc.key, 'file')}
            />

            {/* General Feedback Alert */}
            <CustomAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={hideAlert}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.beige,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.beige,
    },
    loaderCentering: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 14,
        color: Colors.text_secondary,
        fontFamily: Fonts.Medium,
        textAlign: 'center',
    },
    scroll: { flex: 1 },
    content: { padding: 20 },

    infoTitle: {
        fontSize: 18,
        color: Colors.primary,
        fontFamily: Fonts.Bold,
        marginBottom: 8,
    },
    infoDesc: {
        fontSize: 13,
        color: Colors.text_secondary,
        lineHeight: 18,
        fontFamily: Fonts.Regular,
        marginBottom: 15,
    },
    feeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "rgba(0,0,0,0.05)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    feeLabel: {
        fontSize: 10,
        color: Colors.finance_accent,
        marginRight: 6,
        fontFamily: Fonts.Bold,
    },
    feeAmount: {
        fontSize: 16,
        color: Colors.primary,
        fontFamily: Fonts.Bold,
    },

    modernCard: {
        backgroundColor: Colors.cardbg,
        borderRadius: 18,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHighlightHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgb(46, 46, 46)',
        gap: 8,
    },
    cardHighlightTitle: {
        fontSize: 11,
        fontFamily: Fonts.Bold,
        color: Colors.finance_accent,
        letterSpacing: 0.5,
    },
    cardBody: {
        padding: 16,
    },
    modernInputWrapper: { borderBottomWidth: 1.5, borderBottomColor: Colors.finance_accent + "30", paddingBottom: 6, marginBottom: 16 },
    floatingLabel: { fontSize: 10, color: Colors.ink2, fontFamily: Fonts.Medium, marginBottom: 2 },
    bigInput: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.finance_text, padding: 0, height: 34 },

    docGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
    },
    docItem: { width: '48%', marginBottom: 15 },
    docLabel: {
        fontSize: 12,
        color: Colors.primary,
        marginBottom: 8,
        fontFamily: Fonts.Bold,
    },
    // ── Document Slot Styles (Sync with KYC) ──
    docBox: {
        height: 110,
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: "rgba(0,0,0,0.12)",
        backgroundColor: Colors.cardbg,
    },
    docThumb: { width: "100%", height: "100%", borderRadius: 12 },
    docOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 5,
        gap: 4,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    docDoneLabel: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 8, letterSpacing: 0.4 },
    docEmptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10 },
    docIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    docSlotLabel: { color: Colors.primary, fontFamily: Fonts.Bold, fontSize: 11, textAlign: 'center' },
    docUploadTag: {
        position: 'absolute',
        top: 6,
        right: 6,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: Colors.finance_accent + "12",
        borderColor: Colors.finance_accent + "40",
        gap: 2,
    },
    docUploadTagText: { color: Colors.finance_accent, fontFamily: Fonts.Bold, fontSize: 8 },

    cornerDelete: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.red,
        borderWidth: 1,
        borderColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        zIndex: 10,
    },

    submitBtnFixed: {
        position: 'absolute',
        bottom: 10,
        left: 40,
        right: 40,
        backgroundColor: Colors.finance_accent,
        height: 56,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        fontSize: 14,
        color: Colors.primary,
        fontFamily: Fonts.Bold,
        letterSpacing: 0.8,
    },
});
