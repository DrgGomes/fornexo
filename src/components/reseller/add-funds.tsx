"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Plus } from "lucide-react";
import { createDeposit } from "@/actions/reseller";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FilePicker } from "@/components/ui/file-picker";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { useAction } from "@/components/ui/use-action";
import { brl } from "@/lib/format";
import { pixPayload } from "@/lib/pix";
import { cn } from "@/lib/utils";

export function AddFunds({ pix, initialAmount }: { pix: { key: string; holder: string; city: string } | null; initialAmount?: number }) {
  const [open, setOpen] = useState(!!initialAmount);
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState(initialAmount ?? 10000);
  const [qr, setQr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const { exec, pending } = useAction();
  const code = pix && amount > 0 ? pixPayload({ key: pix.key, name: pix.holder, city: pix.city, amountCents: amount }) : "";

  useEffect(() => {
    if (step === 2 && code) QRCode.toDataURL(code, { margin: 1, width: 480 }).then(setQr).catch(() => setQr(""));
  }, [step, code]);

  const reset = () => {
    setOpen(false);
    setStep(1);
    setFile(null);
    setNote("");
  };

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus /> Adicionar saldo
      </Button>
      <Modal
        open={open}
        onClose={reset}
        title={step === 1 ? "Adicionar saldo" : "Pague com PIX"}
        description={step === 1 ? "O saldo paga seus pedidos automaticamente." : `Valor: ${brl(amount)}`}
        footer={
          !pix ? null : step === 1 ? (
            <Button className="w-full" size="lg" disabled={amount < 100} onClick={() => setStep(2)}>
              Gerar PIX de {brl(amount)}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                loading={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("amount", String(amount));
                  fd.set("note", note);
                  if (file) fd.set("proof", file);
                  exec(() => createDeposit(fd), { onSuccess: reset });
                }}
              >
                Já paguei, enviar
              </Button>
            </div>
          )
        }
      >
        {!pix ? (
          <p className="py-4 text-sm text-zinc-600">O fornecedor ainda não cadastrou a chave PIX. Fale com ele pelo chat para combinar o pagamento.</p>
        ) : step === 1 ? (
          <div className="grid gap-4">
            <MoneyInput value={amount} onChange={setAmount} />
            <div className="grid grid-cols-4 gap-2">
              {[5000, 10000, 20000, 50000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={cn("h-10 rounded-xl text-sm font-semibold ring-1", amount === v ? "bg-brand text-brand-fg ring-brand" : "bg-white ring-zinc-200")}
                >
                  {brl(v).replace(",00", "")}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="mx-auto w-56 rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr ? <img src={qr} alt="QR Code PIX" className="size-full" /> : <div className="aspect-square animate-pulse rounded-xl bg-zinc-100" />}
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">PIX copia e cola</span>
                <CopyButton text={code} toastMsg="Código PIX copiado" />
              </div>
              <p className="line-clamp-3 font-mono text-[11px] break-all text-zinc-600">{code}</p>
            </div>
            <p className="text-center text-xs text-zinc-500">
              Recebedor: <span className="font-medium text-zinc-700">{pix.holder}</span> · Chave {pix.key}
            </p>
            <Field label="Comprovante (recomendado)">
              <FilePicker file={file} onChange={setFile} label="Anexar comprovante" />
            </Field>
            <Field label="Observação (opcional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: PIX enviado da conta da empresa" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
