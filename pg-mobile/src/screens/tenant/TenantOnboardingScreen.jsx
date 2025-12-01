import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import {
  validateEmail,
  validatePhone,
  formatPhone,
  validateIDNumber,
  formatAadhar,
  formatPAN,
} from "../../utils/validation";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Modal from "../../components/ui/Modal";
import { Picker } from "@react-native-picker/picker";

const STEPS = {
  PG_DETAILS: 1,
  EKYC: 2,
  AGREEMENT: 3,
};

export default function TenantOnboardingScreen() {
  const navigation = useNavigation();
  const { user, login: storeSession } = useAuth();
  const [currentStep, setCurrentStep] = useState(STEPS.PG_DETAILS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);

  // eKYC form state
  const [kycForm, setKycForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    fatherMotherName: "",
    phone: "",
    email: "",
    permanentAddress: "",
    occupation: "",
    companyCollegeName: "",
    idType: "AADHAAR",
    idNumber: "",
    idFront: null,
    idBack: null,
    selfie: null,
  });

  // Agreement state
  const [otp, setOtp] = useState("");
  const [consentFlags, setConsentFlags] = useState({
    personalDetailsCorrect: false,
    pgDetailsAgreed: false,
    kycAuthorized: false,
    agreementAccepted: false,
  });
  const [agreementHtml, setAgreementHtml] = useState(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (user?.onboardingStatus === "completed") {
      navigation.replace("Dashboard");
      return;
    }
    loadOnboardingData();
  }, [user]);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      const data = await api.getTenantOnboarding();
      setOnboardingData(data);

      setKycForm((prev) => ({
        ...prev,
        fullName: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
      }));

      if (data.user.kycStatus === "verified") {
        setCurrentStep(STEPS.AGREEMENT);
      } else if (data.user.onboardingStatus === "kyc_pending") {
        setCurrentStep(STEPS.EKYC);
      } else {
        setCurrentStep(STEPS.PG_DETAILS);
      }
    } catch (error) {
      console.error("Failed to load onboarding data:", error);
      const errorMessage = error.message || "Failed to load onboarding data";
      if (
        !errorMessage.includes("assigned to a PG property") &&
        !errorMessage.includes("contact your PG owner")
      ) {
        showToast.error(errorMessage);
      }
      setOnboardingData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhone(value);
    setKycForm({ ...kycForm, phone: formatted });
    const validation = validatePhone(formatted);
    setValidationErrors({
      ...validationErrors,
      phone: validation.error || null,
    });
  };

  const handleEmailChange = (value) => {
    const trimmedValue = value.trim().toLowerCase();
    setKycForm({ ...kycForm, email: trimmedValue });
    const validation = validateEmail(trimmedValue, true);
    setValidationErrors({
      ...validationErrors,
      email: validation.error || null,
    });
  };

  const handleIDNumberChange = (value) => {
    let formatted = value;
    if (kycForm.idType === "AADHAAR") {
      formatted = formatAadhar(value);
    } else if (kycForm.idType === "PAN") {
      formatted = value.replace(/\s/g, "").toUpperCase().slice(0, 10);
    } else if (kycForm.idType === "DL") {
      formatted = value.replace(/[\s-]/g, "").toUpperCase().slice(0, 16);
    }

    setKycForm({ ...kycForm, idNumber: formatted });
    const validation = validateIDNumber(kycForm.idType, formatted);
    setValidationErrors({
      ...validationErrors,
      idNumber: validation.error || null,
    });
  };

  const handleKycSubmit = async () => {
    setSubmitting(true);

    const errors = {};
    const phoneValidation = validatePhone(kycForm.phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.error;
    }

    const emailValidation = validateEmail(kycForm.email, true);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
    }

    const idValidation = validateIDNumber(kycForm.idType, kycForm.idNumber);
    if (!idValidation.valid) {
      errors.idNumber = idValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSubmitting(false);
      showToast.error("Please fix the validation errors before submitting");
      return;
    }

    try {
      let cleanedIdNumber = kycForm.idNumber;
      if (kycForm.idType === "AADHAAR") {
        cleanedIdNumber = kycForm.idNumber.replace(/\s/g, "");
      } else if (kycForm.idType === "PAN") {
        cleanedIdNumber = kycForm.idNumber.replace(/\s/g, "").toUpperCase();
      } else if (kycForm.idType === "DL") {
        cleanedIdNumber = kycForm.idNumber.replace(/[\s-]/g, "").toUpperCase();
      }

      const cleanedPhone = kycForm.phone.replace(/\D/g, "");
      const cleanedEmail = kycForm.email.trim().toLowerCase();

      const formData = {
        ...kycForm,
        idNumber: cleanedIdNumber,
        phone: cleanedPhone,
        email: cleanedEmail,
      };

      const result = await api.submitTenantKyc(formData);

      if (result.success) {
        showToast.success("eKYC verification successful!");
        setCurrentStep(STEPS.AGREEMENT);
        await loadOnboardingData();
      }
    } catch (error) {
      console.error("KYC submission error:", error);
      showToast.error(error.message || "KYC verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast.error("Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setKycForm((prev) => ({
        ...prev,
        [field]: {
          uri: asset.uri,
          type: "image/jpeg",
          name: `${field}.jpg`,
        },
      }));
    }
  };

  const handleAgreementPreview = async () => {
    try {
      const html = await api.getAgreementPreview();
      setAgreementHtml(html);
      setShowAgreementModal(true);
    } catch (error) {
      console.error("Failed to load agreement:", error);
      showToast.error(error.message || "Failed to load agreement");
    }
  };

  const handleAgreementAccept = async () => {
    const allConsented = Object.values(consentFlags).every((v) => v === true);
    if (!allConsented) {
      showToast.error("Please check all consent boxes");
      return;
    }

    if (!otp || otp.length < 4) {
      showToast.error("Please enter a valid OTP (use '123456' for testing)");
      return;
    }

    setSubmitting(true);

    try {
      const result = await api.acceptAgreement(otp, consentFlags);

      if (result.success) {
        showToast.success("Onboarding complete! Welcome to your PG.");

        const userData = await api.getMe();
        const token = await AsyncStorage.getItem("token");
        storeSession(userData, token);

        try {
          const docResult = await api.generateDocuments();
          if (docResult.emailStatus) {
            if (docResult.emailStatus.sent) {
              showToast.success(
                "Documents generated and sent via email to you and your PG owner!"
              );
            } else if (docResult.emailStatus.configured) {
              showToast.info(
                `Documents generated but email sending had issues: ${
                  docResult.emailStatus.error || "Unknown error"
                }`
              );
            } else {
              showToast.info(
                "Documents generated but email is not configured. You can download them from the Documents page."
              );
            }
          } else {
            showToast.success("Documents generated successfully!");
          }
        } catch (docError) {
          console.error("Document generation error:", docError);
          showToast.info(
            "Onboarding complete, but document generation encountered an issue. You can generate documents later from the Documents page."
          );
        }

        setTimeout(() => {
          navigation.replace("Profile");
        }, 2000);
      }
    } catch (error) {
      console.error("Agreement acceptance error:", error);
      showToast.error(error.message || "Failed to accept agreement");
    } finally {
      setSubmitting(false);
    }
  };

  const getOrdinalSuffix = (n) => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size="lg" />
        <Text style={styles.loadingText}>Loading onboarding data...</Text>
      </View>
    );
  }

  if (!onboardingData) {
    return (
      <View style={styles.waitingContainer}>
        <Card style={styles.waitingCard} padding="lg">
          <View style={styles.waitingIcon}>
            <Text style={styles.waitingIconText}>👤</Text>
          </View>
          <Text style={styles.waitingTitle}>Waiting for PG Owner</Text>
          <Text style={styles.waitingText}>
            You haven't been assigned to a PG property yet.
          </Text>

          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>What to do next:</Text>
            <View style={styles.instructionsList}>
              <Text style={styles.instructionItem}>
                1. Contact your PG owner and provide them with your email:{" "}
                <Text style={styles.bold}>{user?.email}</Text>
              </Text>
              <Text style={styles.instructionItem}>
                2. Ask them to add you as a tenant in their PG management system
              </Text>
              <Text style={styles.instructionItem}>
                3. Once added, you'll receive an email notification and can
                complete your onboarding
              </Text>
            </View>
          </View>

          <View style={styles.waitingActions}>
            <Button fullWidth onPress={() => navigation.navigate("Dashboard")}>
              Go to Dashboard
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onPress={loadOnboardingData}
              style={styles.refreshButton}
            >
              Refresh
            </Button>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  currentStep >= step && styles.progressCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressNumber,
                    currentStep >= step && styles.progressNumberActive,
                  ]}
                >
                  {step}
                </Text>
              </View>
              <Text style={styles.progressLabel}>
                {step === 1 && "PG Details"}
                {step === 2 && "eKYC"}
                {step === 3 && "Agreement"}
              </Text>
              {step < 3 && (
                <View
                  style={[
                    styles.progressLine,
                    currentStep > step && styles.progressLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Step Content */}
        <Card style={styles.stepCard} padding="lg">
          {/* Step 1: PG Details */}
          {currentStep === STEPS.PG_DETAILS && (
            <View>
              <Text style={styles.stepTitle}>PG Details Review</Text>
              <Text style={styles.stepSubtitle}>
                These PG details are provided by your PG owner. If something is
                incorrect, please contact them before continuing.
              </Text>

              <View style={styles.detailsList}>
                <DetailCard
                  label="PG Name"
                  value={onboardingData.property.name}
                />
                <DetailCard
                  label="Address"
                  value={onboardingData.property.address}
                />
                <DetailCard
                  label="Room & Bed"
                  value={`Room ${
                    onboardingData.room.roomNumber || "TBA"
                  }, Bed ${onboardingData.room.bedNumber || "TBA"}`}
                />
                <DetailCard
                  label="Monthly Rent"
                  value={`₹${Number(
                    onboardingData.financial.rent
                  ).toLocaleString("en-IN")}`}
                />
                <DetailCard
                  label="Security Deposit"
                  value={`₹${Number(
                    onboardingData.financial.deposit
                  ).toLocaleString("en-IN")}`}
                />
                <DetailCard
                  label="Move-in Date"
                  value={
                    onboardingData.financial.moveInDate
                      ? new Date(
                          onboardingData.financial.moveInDate
                        ).toLocaleDateString("en-IN")
                      : "TBD"
                  }
                />
                <DetailCard
                  label="Payment Due Date"
                  value={`${onboardingData.financial.dueDate}${getOrdinalSuffix(
                    onboardingData.financial.dueDate
                  )} of every month`}
                />
                <DetailCard
                  label="Last Penalty-Free Date"
                  value={`${
                    onboardingData.financial.lastPenaltyFreeDate
                  }${getOrdinalSuffix(
                    onboardingData.financial.lastPenaltyFreeDate
                  )} of every month`}
                />
                <DetailCard
                  label="Late Fee"
                  value={`₹${onboardingData.financial.lateFeePerDay} per day`}
                />
                <DetailCard
                  label="Notice Period"
                  value={`${onboardingData.financial.noticePeriodMonths} month(s)`}
                />
                <DetailCard
                  label="Lock-in Period"
                  value={`${onboardingData.financial.lockInMonths} month(s)`}
                />
                <DetailCard
                  label="Facilities"
                  value={
                    onboardingData.property.facilities.length > 0
                      ? onboardingData.property.facilities.join(", ")
                      : "Standard facilities"
                  }
                />
                {onboardingData.property.houseRules && (
                  <View style={styles.houseRules}>
                    <Text style={styles.houseRulesLabel}>House Rules</Text>
                    <View style={styles.houseRulesContent}>
                      <Text>{onboardingData.property.houseRules}</Text>
                    </View>
                  </View>
                )}
              </View>

              <Button
                fullWidth
                onPress={() => setCurrentStep(STEPS.EKYC)}
                style={styles.continueButton}
              >
                Continue to eKYC
              </Button>
            </View>
          )}

          {/* Step 2: eKYC */}
          {currentStep === STEPS.EKYC && (
            <ScrollView>
              <Text style={styles.stepTitle}>Identity Verification (eKYC)</Text>
              <Text style={styles.stepSubtitle}>
                Please provide your personal details and identity documents for
                verification.
              </Text>

              <View style={styles.kycForm}>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={kycForm.fullName}
                      onChangeText={(text) =>
                        setKycForm({ ...kycForm, fullName: text })
                      }
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Date of Birth *</Text>
                    <TextInput
                      style={styles.input}
                      value={kycForm.dateOfBirth}
                      onChangeText={(text) =>
                        setKycForm({ ...kycForm, dateOfBirth: text })
                      }
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Gender *</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={kycForm.gender}
                        onValueChange={(value) =>
                          setKycForm({ ...kycForm, gender: value })
                        }
                        style={styles.picker}
                      >
                        <Picker.Item label="Select" value="" />
                        <Picker.Item label="Male" value="MALE" />
                        <Picker.Item label="Female" value="FEMALE" />
                        <Picker.Item label="Other" value="OTHER" />
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Father/Mother Name</Text>
                    <TextInput
                      style={styles.input}
                      value={kycForm.fatherMotherName}
                      onChangeText={(text) =>
                        setKycForm({
                          ...kycForm,
                          fatherMotherName: text,
                        })
                      }
                    />
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Phone *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      validationErrors.phone && styles.inputError,
                    ]}
                    value={kycForm.phone}
                    onChangeText={handlePhoneChange}
                    placeholder="98765 43210"
                    keyboardType="phone-pad"
                  />
                  {validationErrors.phone && (
                    <Text style={styles.errorText}>
                      {validationErrors.phone}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Gmail *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      validationErrors.email && styles.inputError,
                    ]}
                    value={kycForm.email}
                    onChangeText={handleEmailChange}
                    placeholder="example@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {validationErrors.email && (
                    <Text style={styles.errorText}>
                      {validationErrors.email}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Permanent Address *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={kycForm.permanentAddress}
                    onChangeText={(text) =>
                      setKycForm({
                        ...kycForm,
                        permanentAddress: text,
                      })
                    }
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Occupation</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={kycForm.occupation}
                        onValueChange={(value) =>
                          setKycForm({ ...kycForm, occupation: value })
                        }
                        style={styles.picker}
                      >
                        <Picker.Item label="Select" value="" />
                        <Picker.Item label="Student" value="STUDENT" />
                        <Picker.Item label="Employee" value="EMPLOYEE" />
                        <Picker.Item label="Other" value="OTHER" />
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Company/College Name</Text>
                    <TextInput
                      style={styles.input}
                      value={kycForm.companyCollegeName}
                      onChangeText={(text) =>
                        setKycForm({
                          ...kycForm,
                          companyCollegeName: text,
                        })
                      }
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>ID Type *</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={kycForm.idType}
                        onValueChange={(value) => {
                          setKycForm({
                            ...kycForm,
                            idType: value,
                            idNumber: "",
                          });
                          setValidationErrors({
                            ...validationErrors,
                            idNumber: null,
                          });
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Aadhaar" value="AADHAAR" />
                        <Picker.Item label="PAN" value="PAN" />
                        <Picker.Item label="Driving License" value="DL" />
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>ID Number *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        validationErrors.idNumber && styles.inputError,
                      ]}
                      value={kycForm.idNumber}
                      onChangeText={handleIDNumberChange}
                      placeholder={
                        kycForm.idType === "AADHAAR"
                          ? "1234 5678 9012"
                          : kycForm.idType === "PAN"
                          ? "ABCDE1234F"
                          : "Enter DL number"
                      }
                      maxLength={
                        kycForm.idType === "AADHAAR"
                          ? 14
                          : kycForm.idType === "PAN"
                          ? 10
                          : 16
                      }
                    />
                    {validationErrors.idNumber && (
                      <Text style={styles.errorText}>
                        {validationErrors.idNumber}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.fileUploadSection}>
                  <Text style={styles.sectionTitle}>Upload Documents</Text>
                  <View style={styles.fileUploadGrid}>
                    <View style={styles.fileUploadItem}>
                      <Text style={styles.fileLabel}>ID Front</Text>
                      {kycForm.idFront ? (
                        <Image
                          source={{ uri: kycForm.idFront.uri }}
                          style={styles.filePreview}
                        />
                      ) : (
                        <View style={styles.filePlaceholder}>
                          <Text style={styles.filePlaceholderText}>+</Text>
                        </View>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => handleFileChange("idFront")}
                        style={styles.fileButton}
                      >
                        {kycForm.idFront ? "Change" : "Select"}
                      </Button>
                    </View>
                    <View style={styles.fileUploadItem}>
                      <Text style={styles.fileLabel}>ID Back</Text>
                      {kycForm.idBack ? (
                        <Image
                          source={{ uri: kycForm.idBack.uri }}
                          style={styles.filePreview}
                        />
                      ) : (
                        <View style={styles.filePlaceholder}>
                          <Text style={styles.filePlaceholderText}>+</Text>
                        </View>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => handleFileChange("idBack")}
                        style={styles.fileButton}
                      >
                        {kycForm.idBack ? "Change" : "Select"}
                      </Button>
                    </View>
                    <View style={styles.fileUploadItem}>
                      <Text style={styles.fileLabel}>Selfie</Text>
                      {kycForm.selfie ? (
                        <Image
                          source={{ uri: kycForm.selfie.uri }}
                          style={styles.filePreview}
                        />
                      ) : (
                        <View style={styles.filePlaceholder}>
                          <Text style={styles.filePlaceholderText}>+</Text>
                        </View>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => handleFileChange("selfie")}
                        style={styles.fileButton}
                      >
                        {kycForm.selfie ? "Change" : "Select"}
                      </Button>
                    </View>
                  </View>
                </View>

                <View style={styles.formActions}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => setCurrentStep(STEPS.PG_DETAILS)}
                    style={styles.backButton}
                  >
                    Back
                  </Button>
                  <Button
                    fullWidth
                    onPress={handleKycSubmit}
                    loading={submitting}
                    disabled={submitting}
                  >
                    {submitting ? "Verifying..." : "Verify My Identity (eKYC)"}
                  </Button>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Step 3: Agreement */}
          {currentStep === STEPS.AGREEMENT && (
            <View>
              <Text style={styles.stepTitle}>PG Agreement & Acceptance</Text>
              <Text style={styles.stepSubtitle}>
                Please review the agreement and accept it to complete your
                onboarding.
              </Text>

              <Button
                onPress={handleAgreementPreview}
                style={styles.previewButton}
              >
                Preview Agreement
              </Button>

              <View style={styles.consentSection}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    setConsentFlags({
                      ...consentFlags,
                      personalDetailsCorrect:
                        !consentFlags.personalDetailsCorrect,
                    })
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentFlags.personalDetailsCorrect &&
                        styles.checkboxChecked,
                    ]}
                  >
                    {consentFlags.personalDetailsCorrect && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I confirm all my personal details are correct.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    setConsentFlags({
                      ...consentFlags,
                      pgDetailsAgreed: !consentFlags.pgDetailsAgreed,
                    })
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentFlags.pgDetailsAgreed && styles.checkboxChecked,
                    ]}
                  >
                    {consentFlags.pgDetailsAgreed && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I have reviewed the PG details and agree to them.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    setConsentFlags({
                      ...consentFlags,
                      kycAuthorized: !consentFlags.kycAuthorized,
                    })
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentFlags.kycAuthorized && styles.checkboxChecked,
                    ]}
                  >
                    {consentFlags.kycAuthorized && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I authorize this PG to verify my identity using digital
                    eKYC.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    setConsentFlags({
                      ...consentFlags,
                      agreementAccepted: !consentFlags.agreementAccepted,
                    })
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentFlags.agreementAccepted && styles.checkboxChecked,
                    ]}
                  >
                    {consentFlags.agreementAccepted && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I agree to the PG Agreement & House Rules.
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>OTP Code *</Text>
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter OTP (use '123456' for testing)"
                  keyboardType="numeric"
                />
                <Text style={styles.hint}>
                  For testing, use OTP: 123456 or any 4+ digit code
                </Text>
              </View>

              <View style={styles.formActions}>
                <Button
                  variant="secondary"
                  fullWidth
                  onPress={() => setCurrentStep(STEPS.EKYC)}
                  style={styles.backButton}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  onPress={handleAgreementAccept}
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting
                    ? "Processing..."
                    : "Accept & Complete Onboarding"}
                </Button>
              </View>
            </View>
          )}
        </Card>

        {/* Agreement Modal */}
        <Modal
          visible={showAgreementModal}
          onClose={() => setShowAgreementModal(false)}
          title="PG Agreement"
          confirmText="Close"
          onConfirm={() => setShowAgreementModal(false)}
        >
          <ScrollView style={styles.agreementModalContent}>
            {agreementHtml ? (
              <Text style={styles.agreementText}>{agreementHtml}</Text>
            ) : (
              <Text>Loading agreement...</Text>
            )}
          </ScrollView>
        </Modal>
      </View>
    </ScrollView>
  );
}

function DetailCard({ label, value }) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValue}>
        <Text>{value || "N/A"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  waitingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 16,
  },
  waitingCard: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  waitingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  waitingIconText: {
    fontSize: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  waitingText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  instructionsBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#312E81",
    marginBottom: 12,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: "#4338CA",
    lineHeight: 20,
  },
  bold: {
    fontWeight: "600",
    color: "#312E81",
  },
  waitingActions: {
    width: "100%",
    gap: 12,
  },
  refreshButton: {
    marginTop: 0,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  progressCircleActive: {
    backgroundColor: "#4F46E5",
  },
  progressNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  progressNumberActive: {
    color: "#FFFFFF",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  progressLine: {
    position: "absolute",
    top: 24,
    left: "50%",
    width: "100%",
    height: 2,
    backgroundColor: "#E5E7EB",
    zIndex: -1,
  },
  progressLineActive: {
    backgroundColor: "#4F46E5",
  },
  stepCard: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
  },
  detailsList: {
    gap: 16,
    marginBottom: 24,
  },
  detailCard: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  detailValue: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  houseRules: {
    marginTop: 8,
  },
  houseRulesLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  houseRulesContent: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  continueButton: {
    marginTop: 8,
  },
  kycForm: {
    gap: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formField: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  fileUploadSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  fileUploadGrid: {
    flexDirection: "row",
    gap: 12,
  },
  fileUploadItem: {
    flex: 1,
    alignItems: "center",
  },
  fileLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  filePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  filePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
  },
  filePlaceholderText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  fileButton: {
    width: "100%",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flex: 1,
  },
  previewButton: {
    marginBottom: 24,
  },
  consentSection: {
    gap: 16,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  agreementModalContent: {
    maxHeight: 400,
  },
  agreementText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
});
