import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

function OwnerDocuments() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTenant, setLoadingTenant] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await api.getTenantDocuments();
      setTenants(data.tenants || []);
    } catch (error) {
      showToast.error(error.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantDocuments = async (tenantId) => {
    try {
      setLoadingTenant(true);
      const data = await api.getTenantDocuments(tenantId);
      setDocuments(data.documents || []);
      setSelectedTenant(data.tenant);
    } catch (error) {
      showToast.error(error.message || "Failed to load tenant documents");
    } finally {
      setLoadingTenant(false);
    }
  };

  const handleDownload = async (type) => {
    if (!selectedTenant) return;

    try {
      setDownloading(type);
      await api.downloadTenantDocument(selectedTenant.id, type);
      showToast.success("Document downloaded successfully");
    } catch (error) {
      showToast.error(error.message || "Failed to download document");
    } finally {
      setDownloading(null);
    }
  };

  const handleView = async (type) => {
    if (!selectedTenant) return;

    try {
      setDownloading(type); // Reuse downloading state for view as well
      await api.viewTenantDocument(selectedTenant.id, type);
    } catch (error) {
      showToast.error(error.message || "Failed to view document");
    } finally {
      setDownloading(null);
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
          Tenant Documents
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          View and download documents for your PG tenants
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1" padding="lg">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Select Tenant
          </h2>
          {tenants.length === 0 ? (
            <p className="text-[var(--color-text-secondary)]">
              No tenants found.
            </p>
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => fetchTenantDocuments(tenant.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedTenant?.id === tenant.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                  }`}
                >
                  <div className="font-semibold text-[var(--color-text-primary)]">
                    {tenant.name}
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    {tenant.email}
                  </div>
                  {tenant.property && (
                    <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {tenant.property.name}
                    </div>
                  )}
                  <div className="mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        tenant.hasDocuments
                          ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
                          : "bg-[var(--color-error-light)] text-[var(--color-error)]"
                      }`}
                    >
                      {tenant.hasDocuments
                        ? "Documents Available"
                        : "No Documents"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" padding="lg">
          {!selectedTenant ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-text-secondary)]">
                Select a tenant to view their documents
              </p>
            </div>
          ) : loadingTenant ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Documents for {selectedTenant.name}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {selectedTenant.email}
                </p>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[var(--color-text-secondary)]">
                    No documents available for this tenant.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {documents.map((doc) => (
                    <Card key={doc.type} padding="md">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-[var(--color-text-primary)]">
                            {doc.name}
                          </h3>
                          {doc.generatedAt && (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                              Generated:{" "}
                              {new Date(doc.generatedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          )}
                        </div>
                        <div className="px-2 py-1 rounded-full text-xs font-semibold bg-[var(--color-success-light)] text-[var(--color-success)]">
                          {doc.available ? "Available" : "Not Available"}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          fullWidth
                          size="sm"
                          variant={doc.available ? "secondary" : "secondary"}
                          disabled={!doc.available}
                          loading={downloading === doc.type}
                          onClick={() => handleView(doc.type)}
                        >
                          {doc.available ? "View" : "N/A"}
                        </Button>
                        <Button
                          fullWidth
                          size="sm"
                          variant={doc.available ? "primary" : "secondary"}
                          disabled={!doc.available}
                          loading={downloading === doc.type}
                          onClick={() => handleDownload(doc.type)}
                        >
                          {doc.available ? "Download" : "N/A"}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default OwnerDocuments;
