import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Save, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Código Anti-Atraso" }] }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  city: string | null;
};

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,name,avatar_url,whatsapp,city")
        .eq("id", user.id)
        .maybeSingle();
      const p = (data as Profile | null) ?? {
        id: user.id, name: null, avatar_url: null, whatsapp: null, city: null,
      };
      setProfile(p);
      setName(p.name ?? "");
      setWhatsapp(p.whatsapp ?? "");
      setCity(p.city ?? "");
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Faça login.</p>;
  }
  if (loading || !profile) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const wa = whatsapp.replace(/\D/g, "");
    if (wa && (wa.length < 10 || wa.length > 13)) {
      setMsg({ type: "err", text: "WhatsApp inválido." });
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() || null, whatsapp: wa || null, city: city.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) setMsg({ type: "err", text: error.message });
    else setMsg({ type: "ok", text: "Perfil salvo." });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setMsg({ type: "err", text: "Imagem muito grande (máx 4MB)." });
      return;
    }
    setUploading(true);
    setMsg(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      setMsg({ type: "err", text: upErr.message });
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);
    setUploading(false);
    if (updErr) setMsg({ type: "err", text: updErr.message });
    else {
      setProfile({ ...profile, avatar_url: url });
      setMsg({ type: "ok", text: "Foto atualizada." });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 inline-block border-l-4 border-primary pl-2 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
            Meu perfil
          </div>
          <h1 className="font-display text-[2.4rem] leading-[0.95]">
            Quem é <span className="text-primary">você.</span>
          </h1>
        </div>
        <Link
          to="/"
          className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-surface-elevated">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-50"
              aria-label="Trocar foto"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFile}
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl">{profile.name ?? "Sem nome"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como você quer ser chamado"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>

          <Field label="WhatsApp" hint="Só números, com DDD. Ex.: 11999999999">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              inputMode="tel"
              placeholder="DDD + número"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>

          <Field label="Cidade">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Sua cidade"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>

          {msg && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                msg.type === "ok"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {msg.text}
            </div>
          )}

          <Button
            onClick={save}
            disabled={saving}
            className="h-11 w-full bg-primary text-sm font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
