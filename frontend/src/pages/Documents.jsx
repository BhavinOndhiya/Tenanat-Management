import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";

function Documents() {
  const { user } = useAuth();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Refresh documents when navigating to this page (e.g., after onboarding completion)
  useEffect(() => {
    if (
      location.pathname === "/documents" ||
      location.pathname === "/profile"
    ) {
      // Refresh documents when page is visited
      fetchDocuments();
    }
  }, [location.pathname]);

  // Refresh documents when user changes (e.g., after onboarding completion)
  useEffect(() => {
    if (user?.onboardingStatus === "completed") {
      // Small delay to ensure backend has saved documents
      const timer = setTimeout(() => {
        fetchDocuments();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.onboardingStatus]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getMyDocuments();
      setDocuments(data.documents || []);
      setUserInfo(data.user);
    } catch (error) {
      showToast.error(error.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type) => {
    try {
      setDownloading(type);
      await api.downloadDocument(type);
      showToast.success("Document downloaded successfully");
    } catch (error) {
      showToast.error(error.message || "Failed to download document");
    } finally {
      setDownloading(null);
    }
  };

  const handleView = async (type) => {
    try {
      setDownloading(type); // Reuse downloading state for view as well
      await api.viewDocument(type);
    } catch (error) {
      showToast.error(error.message || "Failed to view document");
    } finally {
      setDownloading(null);
    }
  };

  const handleGenerateDocuments = async () => {
    try {
      setGenerating(true);
      setShowGenerateModal(false);
      const result = await api.generateDocuments();
      showToast.success(result.message || "Documents generated successfully!");

      if (result.emailStatus) {
        if (result.emailStatus.sent) {
          showToast.success(
            "Documents sent via email to you and your PG owner"
          );
        } else if (result.emailStatus.configured) {
          showToast.warning(
            `Documents generated but email sending had issues: ${
              result.emailStatus.error || "Unknown error"
            }`
          );
        } else {
          showToast.info(
            "Documents generated but email is not configured. You can download them below."
          );
        }
      }

      // Refresh documents list
      await fetchDocuments();
    } catch (error) {
      showToast.error(error.message || "Failed to generate documents");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          My Documents
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          View and download your eKYC and PG Agreement documents
        </p>
      </div>

      {documents.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <p className="text-[var(--color-text-secondary)] mb-4">
              No documents available yet.
            </p>
            {userInfo?.onboardingStatus === "completed" ? (
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                  You have completed onboarding. Generate your documents now to
                  receive your eKYC and PG Agreement PDFs via email.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  loading={generating}
                  onClick={() => setShowGenerateModal(true)}
                >
                  {generating
                    ? "Generating Documents..."
                    : "Generate Documents"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Documents will be available after completing the onboarding
                process.
              </p>
            )}
          </div>
        </Card>
      ) : documents.some((doc) => !doc.available) &&
        userInfo?.onboardingStatus === "completed" ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {documents.map((doc) => (
              <Card key={doc.type} padding="lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                      {doc.name}
                    </h3>
                    {doc.generatedAt && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        Generated:{" "}
                        {new Date(doc.generatedAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      doc.available
                        ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
                        : "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
                    }`}
                  >
                    {doc.available ? "Available" : "Not Generated"}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    fullWidth
                    variant={doc.available ? "secondary" : "secondary"}
                    disabled={!doc.available}
                    loading={downloading === doc.type}
                    onClick={() => handleView(doc.type)}
                  >
                    {doc.available ? "View PDF" : "Not Available"}
                  </Button>
                  <Button
                    fullWidth
                    variant={doc.available ? "primary" : "secondary"}
                    disabled={!doc.available}
                    loading={downloading === doc.type}
                    onClick={() => handleDownload(doc.type)}
                  >
                    {doc.available ? "Download" : "Not Available"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card padding="lg">
            <div className="text-center py-6">
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Some documents are not yet generated. Generate them now to
                receive your eKYC and PG Agreement PDFs via email.
              </p>
              <Button
                variant="primary"
                size="lg"
                loading={generating}
                onClick={() => setShowGenerateModal(true)}
              >
                {generating ? "Generating Documents..." : "Generate Documents"}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => (
            <Card key={doc.type} padding="lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {doc.name}
                  </h3>
                  {doc.generatedAt && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                      Generated:{" "}
                      {new Date(doc.generatedAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-success-light)] text-[var(--color-success)]">
                  {doc.available ? "Available" : "Not Available"}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  fullWidth
                  variant={doc.available ? "secondary" : "secondary"}
                  disabled={!doc.available}
                  loading={downloading === doc.type}
                  onClick={() => handleView(doc.type)}
                >
                  {doc.available ? "View PDF" : "Not Available"}
                </Button>
                <Button
                  fullWidth
                  variant={doc.available ? "primary" : "secondary"}
                  disabled={!doc.available}
                  loading={downloading === doc.type}
                  onClick={() => handleDownload(doc.type)}
                >
                  {doc.available ? "Download" : "Not Available"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Documents Confirmation Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => !generating && setShowGenerateModal(false)}
        title="Generate Documents"
        confirmText="Generate & Send"
        cancelText="Cancel"
        onConfirm={handleGenerateDocuments}
        onCancel={() => setShowGenerateModal(false)}
        loading={generating}
        variant="primary"
      >
        <div className="space-y-3">
          <p className="text-[var(--color-text-primary)]">
            This will generate your eKYC and PG Agreement PDFs using your
            existing onboarding data.
          </p>
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              What will happen:
            </p>
            <ul className="text-sm text-[var(--color-text-secondary)] space-y-1 list-disc list-inside">
              <li>Generate eKYC Verification Document PDF</li>
              <li>Generate PG Rental Agreement PDF</li>
              <li>Email both documents to you</li>
              <li>Email both documents to your PG owner</li>
            </ul>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Documents will be stored securely and available for download after
            generation.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default Documents;
