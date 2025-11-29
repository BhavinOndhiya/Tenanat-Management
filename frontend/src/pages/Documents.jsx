import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";

function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  const handleGenerateDocuments = async () => {
    if (
      !window.confirm(
        "Generate and send documents? This will create your eKYC and PG Agreement PDFs and email them to you and your PG owner."
      )
    ) {
      return;
    }

    try {
      setGenerating(true);
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
                  onClick={handleGenerateDocuments}
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

              <div className="mt-6">
                <Button
                  fullWidth
                  variant={doc.available ? "primary" : "secondary"}
                  disabled={!doc.available}
                  loading={downloading === doc.type}
                  onClick={() => handleDownload(doc.type)}
                >
                  {doc.available ? "Download PDF" : "Document Not Available"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Documents;
