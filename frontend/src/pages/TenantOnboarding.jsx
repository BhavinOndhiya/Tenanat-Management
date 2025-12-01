import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";
import {
  validateEmail,
  validatePhone,
  formatPhone,
  validateIDNumber,
  formatIDNumber,
  formatAadhar,
  formatPAN,
  getEmailGuidelines,
  getPhoneGuidelines,
  getAadharGuidelines,
  getPANGuidelines,
  isValidAadhaar,
  isValidPAN,
  isValidDL,
  isValidGmail,
  isValidMobile,
} from "../utils/validation";

const STEPS = {
  PG_DETAILS: 1,
  EKYC: 2,
  AGREEMENT: 3,
};

export default function TenantOnboarding() {
  const navigate = useNavigate();
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
    // Aadhaar OTP fields
    aadhaarOtp: "",
    referenceId: null,
  });

  // Aadhaar OTP state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

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
    // Check if user is already onboarded
    if (user?.onboardingStatus === "completed") {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Load onboarding data
    loadOnboardingData();
  }, [user]);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      const data = await api.getTenantOnboarding();
      setOnboardingData(data);

      // Pre-fill KYC form with user data
      setKycForm((prev) => ({
        ...prev,
        fullName: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
      }));

      // Determine current step based on onboarding status
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

      // Check if it's a profile not found error
      if (
        errorMessage.includes("assigned to a PG property") ||
        errorMessage.includes("contact your PG owner")
      ) {
        // Don't show toast for this - we'll show a better UI message
        setOnboardingData(null);
      } else {
        showToast.error(errorMessage);
      }
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
    // Use Gmail-only validation for KYC
    const validation = validateEmail(trimmedValue, true);
    setValidationErrors({
      ...validationErrors,
      email: validation.error || null,
    });
  };

  const handleIDNumberChange = (value) => {
    let formatted = value;

    // Format based on ID type
    if (kycForm.idType === "AADHAAR") {
      // Aadhaar: format as 1234 5678 9012 (space after every 4 digits)
      formatted = formatAadhar(value);
    } else if (kycForm.idType === "PAN") {
      // PAN: uppercase, no spaces
      formatted = value.replace(/\s/g, "").toUpperCase().slice(0, 10);
    } else if (kycForm.idType === "DL") {
      // DL: uppercase, remove spaces and hyphens
      formatted = value.replace(/[\s-]/g, "").toUpperCase().slice(0, 16);
    }

    setKycForm({ ...kycForm, idNumber: formatted });
    const validation = validateIDNumber(kycForm.idType, formatted);
    setValidationErrors({
      ...validationErrors,
      idNumber: validation.error || null,
    });
  };

  const handleSendAadhaarOtp = async () => {
    if (kycForm.idType !== "AADHAAR") {
      showToast.error("OTP can only be sent for Aadhaar verification");
      return;
    }

    // Validate Aadhaar number
    const idValidation = validateIDNumber("AADHAAR", kycForm.idNumber);
    if (!idValidation.valid) {
      showToast.error(
        idValidation.error || "Please enter a valid Aadhaar number"
      );
      return;
    }

    setSendingOtp(true);
    try {
      const cleanedAadhaar = kycForm.idNumber.replace(/\s/g, "");
      const result = await api.sendAadhaarOtp(cleanedAadhaar);

      if (result.success) {
        setKycForm((prev) => ({
          ...prev,
          referenceId: result.referenceId,
        }));
        setOtpSent(true);
        showToast.success("OTP sent to your Aadhaar registered mobile number");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      showToast.error(error.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate all fields
    const errors = {};

    // Validate phone
    const phoneValidation = validatePhone(kycForm.phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.error;
    }

    // Validate email (Gmail only for KYC)
    const emailValidation = validateEmail(kycForm.email, true);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
    }

    // Validate ID number
    const idValidation = validateIDNumber(kycForm.idType, kycForm.idNumber);
    if (!idValidation.valid) {
      errors.idNumber = idValidation.error;
    }

    // For Aadhaar, validate OTP and referenceId
    if (kycForm.idType === "AADHAAR") {
      if (!otpSent || !kycForm.referenceId) {
        errors.aadhaarOtp = "Please send OTP first";
      } else if (!kycForm.aadhaarOtp || kycForm.aadhaarOtp.length < 4) {
        errors.aadhaarOtp =
          "Please enter the OTP received on your Aadhaar registered mobile";
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSubmitting(false);
      showToast.error("Please fix the validation errors before submitting");
      return;
    }

    try {
      // Clean the ID number before sending (remove spaces, uppercase for PAN/DL)
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
        // Include referenceId and otp for Aadhaar verification
        ...(kycForm.idType === "AADHAAR" && {
          referenceId: kycForm.referenceId,
          otp: kycForm.aadhaarOtp,
        }),
      };

      const result = await api.submitTenantKyc(formData);

      if (result.success) {
        showToast.success("eKYC verification successful!");
        setCurrentStep(STEPS.AGREEMENT);
        // Reload onboarding data to get updated status
        await loadOnboardingData();
      }
    } catch (error) {
      console.error("KYC submission error:", error);
      showToast.error(error.message || "KYC verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (field, file) => {
    setKycForm((prev) => ({ ...prev, [field]: file }));
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

  const handleAgreementAccept = async (e) => {
    e.preventDefault();

    // Validate all consents
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

        // Refresh user data
        const userData = await api.getMe();
        storeSession(userData, localStorage.getItem("token"));

        // Generate documents and send emails
        try {
          console.log("[TenantOnboarding] Calling document generation API...");
          const docResult = await api.generateDocuments();
          console.log(
            "[TenantOnboarding] Document generation result:",
            docResult
          );

          if (docResult.emailStatus) {
            if (docResult.emailStatus.sent) {
              showToast.success(
                "Documents generated and sent via email to you and your PG owner!"
              );
            } else if (docResult.emailStatus.configured) {
              showToast.warning(
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
          console.error(
            "[TenantOnboarding] Document generation error:",
            docError
          );
          // Don't fail the onboarding if document generation fails
          // The backend already tries to generate documents, so this is a backup
          showToast.warning(
            "Onboarding complete, but document generation encountered an issue. You can generate documents later from the Documents page."
          );
        }

        // Redirect to profile page
        setTimeout(() => {
          navigate("/profile", { replace: true });
        }, 2000);
      }
    } catch (error) {
      console.error("Agreement acceptance error:", error);
      showToast.error(error.message || "Failed to accept agreement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding data...</p>
        </div>
      </div>
    );
  }

  if (!onboardingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="mb-6">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Waiting for PG Owner
            </h2>
            <p className="text-gray-600 mb-4">
              You haven't been assigned to a PG property yet.
            </p>
          </div>

          <div className="bg-indigo-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-indigo-900 mb-3">
              What to do next:
            </h3>
            <ol className="space-y-2 text-sm text-indigo-800">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>
                  Contact your PG owner and provide them with your email:{" "}
                  <strong className="text-indigo-900">{user?.email}</strong>
                </span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>
                  Ask them to add you as a tenant in their PG management system
                </span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>
                  Once added, you'll receive an email notification and can
                  complete your onboarding
                </span>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => loadOnboardingData()}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step}
                  </div>
                  <p className="mt-2 text-sm text-center text-gray-600">
                    {step === 1 && "PG Details"}
                    {step === 2 && "eKYC"}
                    {step === 3 && "Agreement"}
                  </p>
                </div>
                {step < 3 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      currentStep > step ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Step 1: PG Details */}
          {currentStep === STEPS.PG_DETAILS && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                PG Details Review
              </h2>
              <p className="text-gray-600 mb-6">
                These PG details are provided by your PG owner. If something is
                incorrect, please contact them before continuing.
              </p>

              <div className="space-y-6">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      House Rules
                    </label>
                    <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {onboardingData.property.houseRules}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setCurrentStep(STEPS.EKYC)}
                className="mt-8 w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue to eKYC
              </button>
            </div>
          )}

          {/* Step 2: eKYC */}
          {currentStep === STEPS.EKYC && (
            <form onSubmit={handleKycSubmit}>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                Identity Verification (eKYC)
              </h2>
              <p className="text-gray-600 mb-6">
                Please provide your personal details and identity documents for
                verification.
              </p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={kycForm.fullName}
                      onChange={(e) =>
                        setKycForm({ ...kycForm, fullName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={kycForm.dateOfBirth}
                      onChange={(e) =>
                        setKycForm({ ...kycForm, dateOfBirth: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender *
                    </label>
                    <select
                      required
                      value={kycForm.gender}
                      onChange={(e) =>
                        setKycForm({ ...kycForm, gender: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Father/Mother Name
                    </label>
                    <input
                      type="text"
                      value={kycForm.fatherMotherName}
                      onChange={(e) =>
                        setKycForm({
                          ...kycForm,
                          fatherMotherName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={kycForm.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={() => {
                        if (kycForm.phone) {
                          const validation = validatePhone(kycForm.phone);
                          setValidationErrors({
                            ...validationErrors,
                            phone: validation.error || null,
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        validationErrors.phone
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="98765 43210"
                    />
                    {validationErrors.phone && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.phone}
                      </p>
                    )}
                    {!validationErrors.phone && kycForm.phone && (
                      <p className="mt-1 text-xs text-gray-500">
                        {getPhoneGuidelines()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gmail *
                    </label>
                    <input
                      type="email"
                      required
                      value={kycForm.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={() => {
                        if (kycForm.email) {
                          // Use Gmail-only validation for KYC
                          const validation = validateEmail(kycForm.email, true);
                          setValidationErrors({
                            ...validationErrors,
                            email: validation.error || null,
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        validationErrors.email
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="example@gmail.com"
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.email}
                      </p>
                    )}
                    {!validationErrors.email && kycForm.email && (
                      <p className="mt-1 text-xs text-gray-500">
                        Enter a valid Gmail address (example@gmail.com)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permanent Address *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={kycForm.permanentAddress}
                    onChange={(e) =>
                      setKycForm({
                        ...kycForm,
                        permanentAddress: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occupation
                    </label>
                    <select
                      value={kycForm.occupation}
                      onChange={(e) =>
                        setKycForm({ ...kycForm, occupation: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="STUDENT">Student</option>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company/College Name
                    </label>
                    <input
                      type="text"
                      value={kycForm.companyCollegeName}
                      onChange={(e) =>
                        setKycForm({
                          ...kycForm,
                          companyCollegeName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Type *
                    </label>
                    <select
                      required
                      value={kycForm.idType}
                      onChange={(e) => {
                        setKycForm({
                          ...kycForm,
                          idType: e.target.value,
                          idNumber: "", // Clear ID number when type changes
                          aadhaarOtp: "", // Clear OTP when type changes
                          referenceId: null, // Clear referenceId when type changes
                        });
                        setValidationErrors({
                          ...validationErrors,
                          idNumber: null,
                          aadhaarOtp: null,
                        });
                        setOtpSent(false); // Reset OTP sent status
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="AADHAAR">Aadhaar</option>
                      <option value="PAN">PAN</option>
                      <option value="DL">Driving License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={kycForm.idNumber}
                      onChange={(e) => handleIDNumberChange(e.target.value)}
                      onBlur={() => {
                        if (kycForm.idNumber) {
                          const validation = validateIDNumber(
                            kycForm.idType,
                            kycForm.idNumber
                          );
                          setValidationErrors({
                            ...validationErrors,
                            idNumber: validation.error || null,
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        validationErrors.idNumber
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
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
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.idNumber}
                      </p>
                    )}
                    {!validationErrors.idNumber && kycForm.idNumber && (
                      <p className="mt-1 text-xs text-gray-500">
                        {kycForm.idType === "AADHAAR"
                          ? getAadharGuidelines()
                          : kycForm.idType === "PAN"
                          ? getPANGuidelines()
                          : "Enter your ID number"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Aadhaar OTP Section */}
                {kycForm.idType === "AADHAAR" && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhaar OTP Verification *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={kycForm.aadhaarOtp}
                        onChange={(e) =>
                          setKycForm({
                            ...kycForm,
                            aadhaarOtp: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6),
                          })
                        }
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        disabled={!otpSent}
                        className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                          validationErrors.aadhaarOtp
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300"
                        } ${!otpSent ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={handleSendAadhaarOtp}
                        disabled={
                          sendingOtp ||
                          !kycForm.idNumber ||
                          validationErrors.idNumber
                        }
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {sendingOtp
                          ? "Sending..."
                          : otpSent
                          ? "Resend OTP"
                          : "Send OTP"}
                      </button>
                    </div>
                    {validationErrors.aadhaarOtp && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.aadhaarOtp}
                      </p>
                    )}
                    {otpSent && !validationErrors.aadhaarOtp && (
                      <p className="mt-1 text-xs text-green-600">
                        OTP sent! Please check your Aadhaar registered mobile
                        number.
                      </p>
                    )}
                    {!otpSent && (
                      <p className="mt-1 text-xs text-gray-500">
                        Click "Send OTP" to receive OTP on your Aadhaar
                        registered mobile number.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Front
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileChange("idFront", e.target.files[0])
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Back
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileChange("idBack", e.target.files[0])
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selfie
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileChange("selfie", e.target.files[0])
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(STEPS.PG_DETAILS)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? "Verifying..." : "Verify My Identity (eKYC)"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Agreement */}
          {currentStep === STEPS.AGREEMENT && (
            <form onSubmit={handleAgreementAccept}>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                PG Agreement & Acceptance
              </h2>
              <p className="text-gray-600 mb-6">
                Please review the agreement and accept it to complete your
                onboarding.
              </p>

              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleAgreementPreview}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Preview Agreement
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={consentFlags.personalDetailsCorrect}
                    onChange={(e) =>
                      setConsentFlags({
                        ...consentFlags,
                        personalDetailsCorrect: e.target.checked,
                      })
                    }
                    className="mt-1 mr-3"
                  />
                  <span>I confirm all my personal details are correct.</span>
                </label>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={consentFlags.pgDetailsAgreed}
                    onChange={(e) =>
                      setConsentFlags({
                        ...consentFlags,
                        pgDetailsAgreed: e.target.checked,
                      })
                    }
                    className="mt-1 mr-3"
                  />
                  <span>I have reviewed the PG details and agree to them.</span>
                </label>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={consentFlags.kycAuthorized}
                    onChange={(e) =>
                      setConsentFlags({
                        ...consentFlags,
                        kycAuthorized: e.target.checked,
                      })
                    }
                    className="mt-1 mr-3"
                  />
                  <span>
                    I authorize this PG to verify my identity using digital
                    eKYC.
                  </span>
                </label>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={consentFlags.agreementAccepted}
                    onChange={(e) =>
                      setConsentFlags({
                        ...consentFlags,
                        agreementAccepted: e.target.checked,
                      })
                    }
                    className="mt-1 mr-3"
                  />
                  <span>I agree to the PG Agreement & House Rules.</span>
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP Code *
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP (use '123456' for testing)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  For testing, use OTP: 123456 or any 4+ digit code
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(STEPS.EKYC)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting
                    ? "Processing..."
                    : "Accept & Complete Onboarding"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>

      {/* Agreement Modal */}
      {showAgreementModal && agreementHtml && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">PG Agreement</h3>
              <button
                onClick={() => setShowAgreementModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div
              className="p-6"
              dangerouslySetInnerHTML={{ __html: agreementHtml }}
            />
            <div className="sticky bottom-0 bg-white border-t p-4">
              <button
                onClick={() => setShowAgreementModal(false)}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="p-3 bg-gray-50 rounded-lg">{value || "N/A"}</div>
    </div>
  );
}

function getOrdinalSuffix(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
