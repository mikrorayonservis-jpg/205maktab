"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

/** Yoxlama növbəsindəki bütün məqalələri və onlara bağlı albomları bir dəfəyə dərc edir. */
export function BulkPublishButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [galleries, setGalleries] = useState(true);
  const { loading, error, run } = useSubmit();
  const router = useRouter();
  const toast = useToast();

  async function publish() {
    const res = await run(() => api<{ published: number; galleries: number }>("/api/editorial/bulk-publish", { body: { consentConfirmed: consent, includeGalleries: galleries } }));
    if (res) {
      toast.success(`${res.published} məqalə${res.galleries ? ` və ${res.galleries} albom` : ""} dərc edildi.`);
      setOpen(false);
      setConsent(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} disabled={count === 0}>
        <CheckCheck className="size-4" aria-hidden="true" /> Hamısını dərc et ({count})
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${count} məqaləni dərc etmək?`}
        description="Yoxlama növbəsindəki bütün məqalələr saytda dərhal görünəcək."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Ləğv et</Button>
            <Button type="button" onClick={publish} loading={loading} disabled={!consent}>Hamısını dərc et</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Alert tone="warning" title="Fotolarda şagirdlər ola bilər">
            Dərc etməzdən əvvəl tarixlərin və şagird fotoları üçün valideyn razılığının alındığını yoxlayın. Bu təsdiq sizin adınızla hər məqalənin audit jurnalına yazılır.
          </Alert>
          <Checkbox label="Bütün məqalələrdəki şagird təsvirləri üçün valideyn razılığının alındığını təsdiqləyirəm." checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <Checkbox label="Məqalələrə bağlı foto albomlarını da qalereyada dərc et." checked={galleries} onChange={(e) => setGalleries(e.target.checked)} />
        </div>
      </Dialog>
    </>
  );
}
