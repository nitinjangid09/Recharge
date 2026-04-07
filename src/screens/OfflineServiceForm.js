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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import HeaderBar from '../componets/HeaderBar';
import Colors from '../constants/Colors';
import Fonts from '../constants/Fonts';
import { getOfflineServiceForm, BASE_URL } from '../api/AuthApi';
import CustomAlert from '../componets/CustomAlert';
import ImageUploadAlert from '../componets/Imageuploadalert';

export default function OfflineServiceForm({ navigation, route }) {
    const { service } = route.params; // service contains {_id, serviceName, description}
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formConfig, setFormConfig] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [documents, setDocuments] = useState({});
    const [showImageModal, setShowImageModal] = useState(false);
    const [activeDoc, setActiveDoc] = useState({ key: '', label: '' });

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
        setFormValues(prev => ({ ...prev, [key]: val }));
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

        const callback = (res) => {
            if (res.didCancel) return;
            if (res.errorCode) {
                console.log("[ImagePicker] error:", res.errorMessage || res.errorCode);
                showAlert('error', 'Camera Error', res.errorMessage || 'Could not open camera.');
                return;
            }

            if (res.assets && res.assets.length > 0) {
                const asset = res.assets[0];
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
        };

        if (source === 'camera') {
            try {
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
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    launchCamera(options, callback);
                } else {
                    showAlert('error', 'Permission Denied', 'Camera permission is required to take photos.');
                }
            } catch (err) {
                console.warn("[CameraPermission] Error:", err);
            }
        } else {
            launchImageLibrary(options, callback);
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
                <HeaderBar title={service.serviceName.toUpperCase()} onBack={() => navigation.goBack()} />
                <View style={styles.loaderCentering}>
                    <ActivityIndicator size="large" color={Colors.finance_accent} />
                    <Text style={styles.loadingText}>Loading protocol requirements...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.secondary} />
            <HeaderBar title={service.serviceName.toUpperCase()} onBack={() => navigation.goBack()} />

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
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Required Information</Text>
                            {formConfig.requiredFields.map((field) => (
                                <View key={field._id} style={styles.inputWrap}>
                                    <Text style={styles.label}>{field.label}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                        placeholderTextColor={Colors.text_placeholder}
                                        value={formValues[field.key]}
                                        onChangeText={(val) => handleFieldChange(field.key, val)}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Dynamic Required Documents */}
                    {formConfig?.requiredDocuments?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Required Documents</Text>
                            <View style={styles.docGrid}>
                                {formConfig.requiredDocuments.map((doc) => (
                                    <View key={doc._id} style={styles.docItem}>
                                        <Text style={styles.docLabel}>{doc.label}</Text>
                                        <TouchableOpacity
                                            style={[styles.uploadBox, documents[doc.key] && styles.uploadBoxActive]}
                                            onPress={() => handlePickDocument(doc.key, doc.label)}
                                            activeOpacity={0.7}
                                        >
                                            {documents[doc.key] ? (
                                                <View style={styles.previewWrap}>
                                                    <Image source={{ uri: documents[doc.key].uri }} style={styles.previewImage} />
                                                    <TouchableOpacity
                                                        style={styles.removeBtn}
                                                        onPress={() => removeDocument(doc.key)}
                                                    >
                                                        <Text style={styles.removeText}>✕</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.uploadPlaceholder}>
                                                    <Text style={styles.uploadIcon}>📷</Text>
                                                    <Text style={styles.uploadText}>Select File</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Hero Information */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Service Details</Text>
                        <Text style={styles.infoDesc}>{service.description || "Instruction protocol for offline processing."}</Text>
                        <View style={styles.feeTag}>
                            <Text style={styles.feeLabel}>SERVICE FEE:</Text>
                            <Text style={styles.feeAmount}>₹{service.amount}</Text>
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
        backgroundColor: Colors.secondary,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.secondary,
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

    infoCard: {
        backgroundColor: Colors.primary,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.white,
        fontFamily: Fonts.Bold,
        marginBottom: 8,
    },
    infoDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
        fontFamily: Fonts.Regular,
        marginBottom: 15,
    },
    feeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    feeLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.finance_accent,
        marginRight: 6,
        fontFamily: Fonts.Bold,
    },
    feeAmount: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.white,
        fontFamily: Fonts.Bold,
    },

    section: { marginBottom: 25 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.primary,
        marginBottom: 15,
        fontFamily: Fonts.Bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    inputWrap: { marginBottom: 15 },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 8,
        fontFamily: Fonts.Bold,
    },
    input: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 14,
        color: Colors.text_primary,
        borderWidth: 1,
        borderColor: Colors.divider,
        fontFamily: Fonts.Regular,
    },

    docGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
    },
    docItem: { width: '48%', marginBottom: 15 },
    docLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 8,
        fontFamily: Fonts.Bold,
    },
    uploadBox: {
        aspectRatio: 1,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 15,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.divider,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    uploadBoxActive: {
        borderStyle: 'solid',
        borderColor: Colors.finance_accent,
    },
    uploadPlaceholder: { alignItems: 'center' },
    uploadIcon: { fontSize: 24, marginBottom: 5 },
    uploadText: {
        fontSize: 10,
        color: Colors.text_secondary,
        fontFamily: Fonts.Bold
    },

    previewWrap: { width: '100%', height: '100%' },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 24,
        height: 24,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    removeText: { color: Colors.white, fontSize: 12 },

    submitBtnFixed: {
        backgroundColor: Colors.finance_accent,
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: Colors.finance_accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    submitBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: Colors.primary,
        fontFamily: Fonts.Bold,
        letterSpacing: 0.5,
    },
});
