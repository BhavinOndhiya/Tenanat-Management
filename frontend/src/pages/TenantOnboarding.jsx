import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";

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
      showToast.error(error.message || "Failed to load onboarding data");
    } finally {
      setLoading(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await api.submitTenantKyc(kycForm);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <p className="text-red-600">Failed to load onboarding data</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
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
                      onChange={(e) =>
                        setKycForm({ ...kycForm, phone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={kycForm.email}
                      onChange={(e) =>
                        setKycForm({ ...kycForm, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
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
                      onChange={(e) =>
                        setKycForm({ ...kycForm, idType: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="AADHAAR">Aadhaar</option>
                      <option value="PAN">PAN</option>
                      <option value="DL">Driving License</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="VOTER_ID">Voter ID</option>
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
                      onChange={(e) =>
                        setKycForm({ ...kycForm, idNumber: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

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
