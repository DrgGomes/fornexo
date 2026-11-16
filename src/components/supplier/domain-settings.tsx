"use client";

import { useState } from "react";
import { CircleCheck, Clock, ExternalLink, Globe, Lock } from "lucide-react";
import { connectDomain, disconnectDomain, verifyDomain } from "@/actions/domain";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";

type Rec = { type: string; name: string; value: string };

export function DomainSettings({
  enabled,
  ready,
  domain,
  status,
  apex,
  verification,
  fallbackUrl,
}: {
  enabled: boolean;
  ready: boolean;
  domain: string | null;
  status: "PENDING" | "ACTIVE" | null;
  apex: boolean;
  verification: Rec[];
  fallbackUrl: string;
}) {
  const [value, setValue] = useState("");
  const { exec, pending } = useAction();

  if (!enabled) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 py-8">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
            <Lock className="size-5" />
          </span>
          <p className="text-lg font-semibold tracking-tight">Use seu próprio domínio</p>
          <p className="max-w-lg text-sm text-zinc-600">
            Coloque sua página de revenda, catálogo e portal do revendedor no seu endereço, como <b>revenda.sualoja.com.br</b>, sem aparecer o nome da plataforma. Este recurso é liberado pelo
            suporte de acordo com o seu plano.
          </p>
          <p className="text-sm text-zinc-500">Hoje seu link é: {fallbackUrl}</p>
        </CardBody>
      </Card>
    );
  }

  if (!domain) {
    return (
      <Card>
        <CardHeader title="Conectar domínio próprio" description="Sua página, catálogo e portal do revendedor no seu endereço" />
        <CardBody className="grid gap-4 pt-0">
          <Field label="Seu domínio" hint="Recomendamos um subdomínio, assim seu site atual continua funcionando. Ex: revenda.sualoja.com.br">
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="revenda.sualoja.com.br" autoCapitalize="none" autoCorrect="off" inputMode="url" />
          </Field>
          {!ready && <p className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900">A plataforma está finalizando a configuração deste recurso. Tente novamente mais tarde.</p>}
          <Button className="justify-self-start" loading={pending} disabled={!value.trim() || !ready} onClick={() => exec(() => connectDomain(value))}>
            <Globe /> Conectar domínio
          </Button>
          <div className="rounded-xl bg-zinc-50 p-4 text-[13px] text-zinc-600 ring-1 ring-zinc-100">
            <p className="font-semibold text-zinc-800">Ainda não tem domínio?</p>
            <p className="mt-1">
              Compre no Registro.br (domínios .com.br), Hostinger, GoDaddy ou outro. Depois volte aqui, digite o domínio e siga o passo a passo.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const label = domain.split(".")[0];
  const records: Rec[] = [
    apex ? { type: "A", name: "@ (deixe vazio)", value: "76.76.21.21" } : { type: "CNAME", name: label, value: "cname.vercel-dns.com" },
    ...verification,
  ];
  const active = status === "ACTIVE";

  return (
    <div className="grid gap-4">
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            {active ? <CircleCheck className="size-5" /> : <Clock className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight">{domain}</p>
            <p className={`text-sm ${active ? "text-emerald-700" : "text-amber-700"}`}>{active ? "Ativo, com HTTPS" : "Aguardando configuração do DNS"}</p>
          </div>
          {active ? (
            <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white">
              <ExternalLink className="size-4" /> Abrir
            </a>
          ) : (
            <Button loading={pending} onClick={() => exec(() => verifyDomain())}>
              Verificar agora
            </Button>
          )}
        </CardBody>
      </Card>

      {active && (
        <Card>
          <CardHeader title="Seus links" />
          <CardBody className="grid gap-2 pt-0 text-sm">
            {[
              ["Página de revenda e cadastro", `https://${domain}/cadastro`],
              ["Catálogo", `https://${domain}/catalogo`],
              ["Login dos revendedores", `https://${domain}/entrar`],
            ].map(([l, u]) => (
              <div key={u} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500">{l}</p>
                  <p className="truncate font-medium">{u}</p>
                </div>
                <CopyButton text={u} compact />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title={active ? "Registros de DNS" : "Configure o DNS"} description={active ? "Mantenha estes registros no seu provedor" : "Crie no painel onde você comprou o domínio"} />
        <CardBody className="grid gap-4 pt-0">
          {!active && (
            <ol className="grid gap-1.5 text-sm text-zinc-600">
              <li>1. Entre no painel do seu domínio (Registro.br, Hostinger, GoDaddy...) e abra a área de <b>DNS / Zona DNS</b>.</li>
              <li>2. Crie o registro abaixo exatamente como está.</li>
              <li>3. Salve e clique em <b>Verificar agora</b>. Pode levar de alguns minutos até 2 horas.</li>
            </ol>
          )}
          <div className="overflow-hidden rounded-xl ring-1 ring-zinc-200">
            <div className="grid grid-cols-[70px_1fr_1.4fr] bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-500">
              <span>Tipo</span>
              <span>Nome</span>
              <span>Valor</span>
            </div>
            {records.map((r) => (
              <div key={r.type + r.value} className="grid grid-cols-[70px_1fr_1.4fr] items-center gap-2 border-t border-zinc-100 px-3 py-2.5 text-sm">
                <span className="font-semibold">{r.type}</span>
                <span className="flex min-w-0 items-center gap-1 font-mono text-[13px]">
                  <span className="truncate">{r.name}</span>
                  <CopyButton text={r.name.startsWith("@") ? "@" : r.name} compact className="size-6" />
                </span>
                <span className="flex min-w-0 items-center gap-1 font-mono text-[13px]">
                  <span className="truncate">{r.value}</span>
                  <CopyButton text={r.value} compact className="size-6" />
                </span>
              </div>
            ))}
          </div>
          {!apex && <p className="text-xs text-zinc-500">No campo Nome, alguns painéis pedem só a primeira parte ({label}) e outros o endereço completo ({domain}). Os dois funcionam.</p>}
          <button
            type="button"
            onClick={() => confirm(`Desconectar ${domain}? Seus revendedores voltarão a usar o link da plataforma.`) && exec(() => disconnectDomain())}
            className="justify-self-start text-[13px] font-medium text-red-600 hover:underline"
          >
            Desconectar domínio
          </button>
        </CardBody>
      </Card>
    </div>
  );
}
