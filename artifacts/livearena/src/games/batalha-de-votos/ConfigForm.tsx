import { useEffect, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ArrowLeft, Check, ChevronDown, ImagePlus, Info, Plus, Sparkles, Trash2, Volume2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { configSchema, type BatalhaDeVotosConfig } from './config-schema';

const defaultGiftsA = [
  { id: 'gift-rose', name: 'Rosa', imageUrl: '', costCoins: 1, votes: 1 },
  { id: 'gift-ice-cream', name: 'Sorvete', imageUrl: '', costCoins: 2, votes: 2 },
  { id: 'gift-donut', name: 'Donut', imageUrl: '', costCoins: 5, votes: 5 },
  { id: 'gift-perfume', name: 'Perfume', imageUrl: '', costCoins: 10, votes: 10 },
  { id: 'gift-lion', name: 'Leão Eleitoral', imageUrl: '', costCoins: 50, votes: 50 },
];

const defaultGiftsB = [
  { id: 'gift-heart', name: 'Coração', imageUrl: '', costCoins: 1, votes: 1 },
  { id: 'gift-coffee', name: 'Café', imageUrl: '', costCoins: 2, votes: 2 },
  { id: 'gift-crown', name: 'Coroa', imageUrl: '', costCoins: 5, votes: 5 },
  { id: 'gift-rocket', name: 'Foguete', imageUrl: '', costCoins: 10, votes: 10 },
  { id: 'gift-trophy', name: 'Troféu Oficial', imageUrl: '', costCoins: 50, votes: 50 },
];

const defaults: BatalhaDeVotosConfig = {
  title: 'Eleição 2026 · Ao Vivo',
  candidateA: { name: 'Candidato 10', color: '#10b981', avatar: undefined, gifts: defaultGiftsA },
  candidateB: { name: 'Candidato 20', color: '#ef4444', avatar: undefined, gifts: defaultGiftsB },
  backgroundImage: undefined,
  backgroundVideo: undefined,
  format: 'vertical',
  mode: 'single',
  roundMinutes: '5',
  intermissionSeconds: 20,
  tieRule: 'draw',
  doubleLastMinute: true,
  announceDoubleSeconds: 10,
  leadChangeOvertime: true,
  overtimeSeconds: 20,
  maxOvertimes: 2,
  likesEnergy: true,
  energyBonusThreshold: 100,
  energyBonusPoints: 5,
  energyBonusCap: 20,
  chatCommands: true,
  collectiveGoals: [],
  surpriseEvents: false,
  powerUps: false,
  powerUpEffect: 'shield',
  powerUpGiftA: '',
  powerUpGiftB: '',
  smallThreshold: 1,
  mediumThreshold: 10,
  epicThreshold: 50,
  textNarrator: true,
  voiceNarrator: false,
  soundVolume: 65,
  muted: false,
};

type Preset = 'quick' | 'championship';

function FieldError({ children }: { children?: string }) {
  return children ? <span className="config-error" role="alert">{children}</span> : null;
}

function Section({ number, title, description, children, testId }: { number: string; title: string; description: string; children: ReactNode; testId: string }) {
  return <section className="config-section" data-testid={testId}>
    <div className="config-section-heading"><span className="config-number">{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>
    <div className="config-section-content">{children}</div>
  </section>;
}

function Toggle({ label, description, checked, onChange, testId }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; testId: string }) {
  return <label className="config-toggle" data-testid={`${testId}-control`}>
    <span><strong>{label}</strong><small>{description}</small></span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} data-testid={testId} />
    <span className="toggle-track" aria-hidden="true" />
  </label>;
}

function GiftRows({ side, control, register, setValue, errors }: {
  side: 'candidateA' | 'candidateB';
  control: ReturnType<typeof useForm<BatalhaDeVotosConfig>>['control'];
  register: ReturnType<typeof useForm<BatalhaDeVotosConfig>>['register'];
  setValue: ReturnType<typeof useForm<BatalhaDeVotosConfig>>['setValue'];
  errors: ReturnType<typeof useForm<BatalhaDeVotosConfig>>['formState']['errors'];
}) {
  const { fields } = useFieldArray({ control, name: `${side}.gifts` });
  const colorName = side === 'candidateA' ? 'A' : 'B';

  const handleGiftImageUpload = (index: number, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setValue(`${side}.gifts.${index}.imageUrl`, dataUrl, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  };

  return <div className="gift-list">
    {fields.map((field, index) => {
      const giftError = errors[side]?.gifts?.[index];
      return <div className="gift-row" key={field.id} data-testid={`gift-row-${colorName}-${index + 1}`}>
        <div className="gift-index">{String(index + 1).padStart(2, '0')}</div>
        <div className="gift-fields">
          <label><span>ID do presente</span><input className="config-input" placeholder="ID manual" {...register(`${side}.gifts.${index}.id`)} data-testid={`input-gift-${colorName}-${index + 1}-id`} /><FieldError>{giftError?.id?.message}</FieldError></label>
          <label><span>Nome</span><input className="config-input" placeholder="Nome do presente" {...register(`${side}.gifts.${index}.name`)} data-testid={`input-gift-${colorName}-${index + 1}-name`} /><FieldError>{giftError?.name?.message}</FieldError></label>
          <label><span>Custo em moedas</span><input className="config-input" type="number" min="1" {...register(`${side}.gifts.${index}.costCoins`)} data-testid={`input-gift-${colorName}-${index + 1}-cost`} /><FieldError>{giftError?.costCoins?.message}</FieldError></label>
          <label><span>Votos</span><input className="config-input" type="number" min="1" {...register(`${side}.gifts.${index}.votes`)} data-testid={`input-gift-${colorName}-${index + 1}-votes`} /><FieldError>{giftError?.votes?.message}</FieldError></label>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-1.5 p-2 bg-[#10141e] rounded-lg border border-[#252b38]">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 py-1 px-2.5 rounded bg-cyan-950/60 border border-cyan-800/60">
              <span>📁 Escolher Imagem (PNG / JPG)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleGiftImageUpload(index, e.target.files?.[0])}
              />
            </label>
            <span className="text-[10px] text-gray-500">ou cole URL:</span>
          </div>
          <input
            className="config-input !min-h-[30px] !text-[10px] flex-1"
            placeholder="URL opcional (https://...)"
            {...register(`${side}.gifts.${index}.imageUrl`)}
            data-testid={`input-gift-${colorName}-${index + 1}-image`}
          />
        </div>
      </div>;
    })}
    <FieldError>{errors[side]?.gifts?.message || (side === 'candidateB' ? errors.candidateB?.gifts?.root?.message : undefined)}</FieldError>
  </div>;
}

export function ConfigForm() {
  const form = useForm<BatalhaDeVotosConfig>({ resolver: zodResolver(configSchema), defaultValues: defaults, mode: 'onSubmit' });
  const { register, control, setValue, handleSubmit, formState: { errors } } = form;
  const candidateA = useWatch({ control, name: 'candidateA' });
  const candidateB = useWatch({ control, name: 'candidateB' });
  const powerUps = useWatch({ control, name: 'powerUps' });
  const muted = useWatch({ control, name: 'muted' });
  const doubleLastMinute = useWatch({ control, name: 'doubleLastMinute' });
  const leadChangeOvertime = useWatch({ control, name: 'leadChangeOvertime' });
  const likesEnergy = useWatch({ control, name: 'likesEnergy' });
  const chatCommands = useWatch({ control, name: 'chatCommands' });
  const surpriseEvents = useWatch({ control, name: 'surpriseEvents' });
  const textNarrator = useWatch({ control, name: 'textNarrator' });
  const voiceNarrator = useWatch({ control, name: 'voiceNarrator' });
  const soundVolume = useWatch({ control, name: 'soundVolume' });
  const [submitted, setSubmitted] = useState(false);
  const [preset, setPreset] = useState<Preset>('quick');
  const [imagePreview, setImagePreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');
  const [avatarPreviewA, setAvatarPreviewA] = useState('');
  const [avatarPreviewB, setAvatarPreviewB] = useState('');
  const [showPreviewNotice, setShowPreviewNotice] = useState(false);
  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({ control, name: 'collectiveGoals' });

  // Carregar dados salvos anteriormente no formulário
  useEffect(() => {
    try {
      const stored = localStorage.getItem('livearena_active_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.title) setValue('title', parsed.title);
        if (parsed.config?.backgroundImage || parsed.config?.backgroundDataUrl) {
          const bg = parsed.config.backgroundDataUrl || parsed.config.backgroundImage;
          setImagePreview(bg);
          setValue('backgroundDataUrl', bg);
        }
        if (parsed.config?.candidateA) {
          const ca = parsed.config.candidateA;
          setValue('candidateA.name', ca.name);
          setValue('candidateA.color', ca.color);
          if (ca.avatarDataUrl) {
            setAvatarPreviewA(ca.avatarDataUrl);
            setValue('candidateA.avatarDataUrl', ca.avatarDataUrl);
          }
          if (ca.gifts?.length) setValue('candidateA.gifts', ca.gifts);
        }
        if (parsed.config?.candidateB) {
          const cb = parsed.config.candidateB;
          setValue('candidateB.name', cb.name);
          setValue('candidateB.color', cb.color);
          if (cb.avatarDataUrl) {
            setAvatarPreviewB(cb.avatarDataUrl);
            setValue('candidateB.avatarDataUrl', cb.avatarDataUrl);
          }
          if (cb.gifts?.length) setValue('candidateB.gifts', cb.gifts);
        }
      }
    } catch {}
  }, [setValue]);

  useEffect(() => () => {
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    if (videoPreview && videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview);
    if (avatarPreviewA && avatarPreviewA.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewA);
    if (avatarPreviewB && avatarPreviewB.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewB);
  }, [imagePreview, videoPreview, avatarPreviewA, avatarPreviewB]);

  const setPresetValues = (value: Preset) => {
    setPreset(value);
    setValue('mode', value === 'quick' ? 'single' : 'best-of-3', { shouldDirty: true });
    setValue('roundMinutes', value === 'quick' ? '5' : '10', { shouldDirty: true });
  };
  const onFile = (field: 'backgroundImage' | 'backgroundVideo', file?: File) => {
    setValue(field, file, { shouldDirty: true, shouldValidate: true });
    const nextPreview = file ? URL.createObjectURL(file) : '';
    if (field === 'backgroundImage') {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(nextPreview);
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setValue('backgroundDataUrl', e.target?.result as string, { shouldDirty: true });
        };
        reader.readAsDataURL(file);
      } else {
        setValue('backgroundDataUrl', undefined, { shouldDirty: true });
      }
    } else {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(nextPreview);
    }
  };
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [tiktokUser, setTiktokUser] = useState('');

  const onAvatarFile = (side: 'candidateA' | 'candidateB', file?: File) => {
    const oldPreview = side === 'candidateA' ? avatarPreviewA : avatarPreviewB;
    if (oldPreview) URL.revokeObjectURL(oldPreview);
    setValue(`${side}.avatar`, file, { shouldDirty: true, shouldValidate: true });
    const nextPreview = file ? URL.createObjectURL(file) : '';
    if (side === 'candidateA') setAvatarPreviewA(nextPreview);
    else setAvatarPreviewB(nextPreview);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setValue(`${side}.avatarDataUrl`, dataUrl, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    } else {
      setValue(`${side}.avatarDataUrl`, undefined, { shouldDirty: true });
    }
  };

  const onSubmit = async (values: BatalhaDeVotosConfig) => {
    setSubmitted(true);
    setIsSaving(true);
    try {
      const payloadConfig = {
        ...values,
        candidateA: {
          ...values.candidateA,
          avatar: undefined,
          avatarDataUrl: values.candidateA.avatarDataUrl || avatarPreviewA || undefined,
        },
        candidateB: {
          ...values.candidateB,
          avatar: undefined,
          avatarDataUrl: values.candidateB.avatarDataUrl || avatarPreviewB || undefined,
        },
        backgroundImage: undefined,
        backgroundDataUrl: values.backgroundDataUrl || undefined,
        backgroundVideo: undefined,
      };

      // Salvar imediatamente no localStorage para garantir visualização no teste/preview
      try {
        localStorage.setItem(
          'livearena_active_config',
          JSON.stringify({
            title: values.title || 'Eleição 2026',
            config: payloadConfig,
          }),
        );
      } catch (e) {
        console.warn('LocalStorage limit reached or disabled', e);
      }

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title || 'Eleição 2026',
          config: payloadConfig,
          tiktokUsername: tiktokUser.trim() || 'simulador',
          isSimulation: !tiktokUser.trim(),
        }),
      });

      const data = await res.json();
      if (data?.match?.id) {
        setLocation(`/play/${data.match.id}`);
      } else {
        setLocation('/play');
      }
    } catch {
      setLocation('/play');
    } finally {
      setIsSaving(false);
    }
  };

  return <form className="config-form" onSubmit={handleSubmit(onSubmit)} onChange={() => setSubmitted(false)} noValidate data-testid="form-batalha-config">
    <Section number="01" title="Identidade da partida & Conexão TikTok" description="Dê contexto à disputa e conecte sua live diretamente." testId="section-identity">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
        <label className="config-field">
          <span>Título da partida</span>
          <input className="config-input" placeholder="Ex.: Eleição 2026 · Ao Vivo" {...register('title')} data-testid="input-match-title" />
          <FieldError>{errors.title?.message}</FieldError>
        </label>
        <label className="config-field">
          <span>Seu @ do TikTok LIVE <em className="text-cyan-400 font-bold">(opcional para conectar direto)</em></span>
          <input
            className="config-input border-cyan-500/50 focus:border-cyan-400"
            placeholder="Ex.: seunome_tiktok"
            value={tiktokUser}
            onChange={(e) => setTiktokUser(e.target.value)}
          />
        </label>
      </div>
      <div className="choice-grid">
        <label className="config-field"><span>Formato da tela</span><select className="config-input" {...register('format')} data-testid="select-format"><option value="vertical">Vertical · 9:16</option><option value="horizontal">Horizontal · 16:9</option></select><ChevronDown className="select-chevron" size={14} /></label>
        <label className="config-field"><span>Modo da partida</span><select className="config-input" {...register('mode')} data-testid="select-mode"><option value="single">Partida única</option><option value="best-of-3">Campeonato · melhor de 3</option><option value="best-of-5">Campeonato · melhor de 5</option></select><ChevronDown className="select-chevron" size={14} /></label>
      </div>
      <div className="preset-row">
        <span className="preset-label">Começar com preset</span>
        <button type="button" className={`preset-button ${preset === 'quick' ? 'selected' : ''}`} onClick={() => setPresetValues('quick')} data-testid="button-preset-quick"><Sparkles size={14} /> Partida rápida <small>5 min · 1 rodada</small></button>
        <button type="button" className={`preset-button ${preset === 'championship' ? 'selected' : ''}`} onClick={() => setPresetValues('championship')} data-testid="button-preset-championship">Campeonato <small>melhor de 3</small></button>
      </div>
    </Section>

    <Section number="02" title="Candidatos e presentes" description="Cadastre manualmente cinco presentes por lado. O catálogo oficial ainda não está disponível." testId="section-candidates">
      <div className="catalog-notice"><Info size={17} /><p><strong>Lista oficial de presentes indisponível nesta etapa.</strong><br />Use o ID, nome, custo em moedas e valor em votos para cada item. Não há presentes pré-cadastrados.</p></div>
      {(['candidateA', 'candidateB'] as const).map((side) => {
        const isA = side === 'candidateA';
        return <div className={`candidate-block ${isA ? 'candidate-a' : 'candidate-b'}`} key={side} data-testid={`candidate-config-${isA ? 'a' : 'b'}`}>
          <div className="candidate-heading"><span className="candidate-chip">{isA ? 'LADO A' : 'LADO B'}</span><span>5 presentes obrigatórios</span></div>
          <div className="choice-grid candidate-meta">
            <label className="config-field"><span>Nome do candidato {isA ? 'A' : 'B'}</span><input className="config-input" placeholder={`Nome do lado ${isA ? 'A' : 'B'}`} {...register(`${side}.name`)} data-testid={`input-candidate-${isA ? 'a' : 'b'}-name`} /><FieldError>{errors[side]?.name?.message}</FieldError></label>
            <label className="config-field"><span>Cor principal</span><div className="color-control"><input type="color" {...register(`${side}.color`)} data-testid={`input-candidate-${isA ? 'a' : 'b'}-color`} /><code>{isA ? candidateA?.color : candidateB?.color}</code></div><FieldError>{errors[side]?.color?.message}</FieldError></label>
            <label className="config-field avatar-upload"><span>Avatar · JPG, PNG ou WEBP · até 8 MB</span><input className="config-input file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onAvatarFile(side, event.target.files?.[0])} data-testid={`input-candidate-${isA ? 'a' : 'b'}-avatar`} />{(isA ? avatarPreviewA : avatarPreviewB) && <img className="avatar-local-preview" src={isA ? avatarPreviewA : avatarPreviewB} alt={`Prévia local do avatar do candidato ${isA ? 'A' : 'B'}`} data-testid={`preview-candidate-${isA ? 'a' : 'b'}-avatar`} />}<FieldError>{errors[side]?.avatar?.message as string}</FieldError></label>
          </div>
          <GiftRows side={side} control={control} register={register} setValue={setValue} errors={errors} />
        </div>;
      })}
      <FieldError>{errors.candidateB?.gifts?.message}</FieldError>
    </Section>

    <Section number="03" title="Fundo e proporção" description="Arquivos ficam apenas nesta sessão, com prévia local. Nada é enviado ou salvo." testId="section-background">
      <div className="upload-grid">
        <label className="upload-box">
          <ImagePlus size={19} /><strong>Imagem de fundo</strong><span>JPG, PNG ou WEBP · até 8 MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile('backgroundImage', event.target.files?.[0])} data-testid="input-background-image" />
          {imagePreview && <img className="upload-preview" src={imagePreview} alt="Prévia local do fundo escolhido" data-testid="preview-background-image" />}
          <FieldError>{errors.backgroundImage?.message as string}</FieldError>
        </label>
        <label className="upload-box">
          <Volume2 size={19} /><strong>Vídeo curto em loop</strong><span>MP4, WEBM ou MOV · até 30 MB</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => onFile('backgroundVideo', event.target.files?.[0])} data-testid="input-background-video" />
          {videoPreview && <video className="upload-preview" src={videoPreview} muted loop autoPlay playsInline data-testid="preview-background-video" />}
          <FieldError>{errors.backgroundVideo?.message as string}</FieldError>
        </label>
      </div>
    </Section>

    <Section number="04" title="Ritmo e tensão" description="Regras claras, visíveis para quem chega no meio da partida." testId="section-rules">
      <div className="choice-grid">
        <label className="config-field"><span>Duração por rodada</span><select className="config-input" {...register('roundMinutes')} data-testid="select-round-duration"><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="30">30 minutos</option></select></label>
        <label className="config-field"><span>Intervalo entre rodadas · 20 a 30 s</span><input className="config-input" type="number" min="20" max="30" {...register('intermissionSeconds')} data-testid="input-intermission" /><FieldError>{errors.intermissionSeconds?.message}</FieldError></label>
        <label className="config-field"><span>Regra de empate</span><select className="config-input" {...register('tieRule')} data-testid="select-tie-rule"><option value="draw">Declarar empate</option><option value="overtime">Prorrogação</option></select></label>
      </div>
      <div className="toggle-stack">
        <Toggle label="Votos em dobro no último minuto" description="Aviso na tela 10 segundos antes de ativar." checked={doubleLastMinute} onChange={(value) => setValue('doubleLastMinute', value)} testId="toggle-double-points" />
        <Toggle label="Prorrogação em caso de virada" description="Nos últimos 10 s: +20 s, com até 2 extensões." checked={leadChangeOvertime} onChange={(value) => setValue('leadChangeOvertime', value)} testId="toggle-lead-overtime" />
      </div>
    </Section>

    <Section number="05" title="Participação e recursos" description="Opções preparadas para as próximas etapas do módulo." testId="section-interactions">
      <div className="toggle-stack">
        <Toggle label="Energia por curtidas" description="Curtidas carregam uma barra para cada lado." checked={likesEnergy} onChange={(value) => setValue('likesEnergy', value)} testId="toggle-likes-energy" />
        <Toggle label="Comandos !a e !b no chat" description="Cada pessoa pode votar uma vez a cada 10 segundos; impacto mínimo no placar." checked={chatCommands} onChange={(value) => setValue('chatCommands', value)} testId="toggle-chat-commands" />
        <Toggle label="Eventos surpresa" description="Hora X2 e chuva de bônus, sempre anunciadas." checked={surpriseEvents} onChange={(value) => setValue('surpriseEvents', value)} testId="toggle-surprise-events" />
        <Toggle label="Power-ups" description="Desligados por padrão. Um presente de cada lado pode ativar escudo ou congelar o placar rival por poucos segundos." checked={powerUps} onChange={(value) => setValue('powerUps', value)} testId="toggle-powerups" />
      </div>
      {likesEnergy && <div className="energy-config">
        <div className="energy-config-intro"><strong>Parâmetros de energia</strong><span>Preparação local; o ganho de pontos não é executado neste marco.</span></div>
        <div className="threshold-grid">
          <label className="config-field"><span>Likes para completar energia</span><input className="config-input" type="number" min="1" {...register('energyBonusThreshold')} data-testid="input-energy-threshold" /><FieldError>{errors.energyBonusThreshold?.message}</FieldError></label>
          <label className="config-field"><span>Pontos por energia completa</span><input className="config-input" type="number" min="1" {...register('energyBonusPoints')} data-testid="input-energy-bonus-points" /><FieldError>{errors.energyBonusPoints?.message}</FieldError></label>
          <label className="config-field"><span>Limite de bônus por partida</span><input className="config-input" type="number" min="1" {...register('energyBonusCap')} data-testid="input-energy-bonus-cap" /><FieldError>{errors.energyBonusCap?.message}</FieldError></label>
        </div>
      </div>}
      {powerUps && <div className="choice-grid powerup-selects">
        <label className="config-field"><span>Presente do lado A</span><select className="config-input" {...register('powerUpGiftA')} data-testid="select-powerup-a"><option value="">Escolher presente</option>{candidateA.gifts.map((gift, index) => gift.id.trim() ? <option key={`a-${index}`} value={gift.id}>{gift.name || gift.id}</option> : null)}</select><FieldError>{errors.powerUpGiftA?.message}</FieldError></label>
        <label className="config-field"><span>Presente do lado B</span><select className="config-input" {...register('powerUpGiftB')} data-testid="select-powerup-b"><option value="">Escolher presente</option>{candidateB.gifts.map((gift, index) => gift.id.trim() ? <option key={`b-${index}`} value={gift.id}>{gift.name || gift.id}</option> : null)}</select><FieldError>{errors.powerUpGiftB?.message}</FieldError></label>
        <label className="config-field"><span>Efeito dos presentes escolhidos</span><select className="config-input" {...register('powerUpEffect')} data-testid="select-powerup-effect"><option value="shield">Escudo · protege o placar por alguns segundos</option><option value="freeze">Congelar placar rival por alguns segundos</option></select></label>
        <p className="powerup-explainer">O efeito fica explicado para a audiência antes da partida. A ativação real será implementada em marco futuro.</p>
        <FieldError>{errors.powerUpGiftA?.message || errors.powerUpGiftB?.message}</FieldError>
      </div>}
      <div className="goals-field">
        <div className="goals-heading"><div><strong>Metas coletivas</strong><small>Opcional · até 10 marcos, vinculados a um lado e com mensagem visível.</small></div><button type="button" className="goal-add" onClick={() => appendGoal({ side: 'both', points: 300, message: '' })} disabled={goalFields.length >= 10} data-testid="button-add-collective-goal"><Plus size={14} /> Adicionar meta</button></div>
        {goalFields.map((goal, index) => <div className="goal-row" key={goal.id} data-testid={`collective-goal-${index + 1}`}>
          <label className="config-field"><span>Lado</span><select className="config-input" {...register(`collectiveGoals.${index}.side`)} data-testid={`select-goal-side-${index + 1}`}><option value="both">Ambos</option><option value="candidateA">Candidato A</option><option value="candidateB">Candidato B</option></select></label>
          <label className="config-field"><span>Pontos para liberar</span><input className="config-input" type="number" min="1" {...register(`collectiveGoals.${index}.points`)} data-testid={`input-goal-points-${index + 1}`} /><FieldError>{errors.collectiveGoals?.[index]?.points?.message}</FieldError></label>
          <label className="config-field goal-message"><span>Mensagem exibida</span><input className="config-input" placeholder="Ex.: 300 pontos liberam um efeito visual" {...register(`collectiveGoals.${index}.message`)} data-testid={`input-goal-message-${index + 1}`} /><FieldError>{errors.collectiveGoals?.[index]?.message?.message}</FieldError></label>
          <button type="button" className="goal-remove" onClick={() => removeGoal(index)} aria-label={`Remover meta ${index + 1}`} data-testid={`button-remove-goal-${index + 1}`}><Trash2 size={14} /></button>
        </div>)}
        <small>Os marcos e efeitos não são executados nesta etapa.</small>
      </div>
    </Section>

    <Section number="06" title="Efeitos e áudio" description="Ajuste a intensidade visual e a presença do narrador." testId="section-effects">
      <div className="threshold-grid">
        {(['smallThreshold', 'mediumThreshold', 'epicThreshold'] as const).map((field, index) => <label className="config-field" key={field}><span>{['Pequeno · a partir de', 'Médio · a partir de', 'Épico · a partir de'][index]} votos</span><input className="config-input" type="number" min={index + 1} {...register(field)} data-testid={`input-threshold-${['small', 'medium', 'epic'][index]}`} /><FieldError>{errors[field]?.message}</FieldError></label>)}
      </div>
      <FieldError>{errors.mediumThreshold?.message}</FieldError>
      <div className="toggle-stack">
        <Toggle label="Narrador em texto" description="Mensagens de tensão aparecem na tela." checked={textNarrator} onChange={(value) => setValue('textNarrator', value)} testId="toggle-text-narrator" />
        <Toggle label="Voz do narrador" description="Opcional; será conectada em marco futuro." checked={voiceNarrator} onChange={(value) => setValue('voiceNarrator', value)} testId="toggle-voice-narrator" />
      </div>
      <div className="audio-controls">
        <label className="config-field volume-field"><span>Volume dos sons <strong>{soundVolume}%</strong></span><input type="range" min="0" max="100" {...register('soundVolume')} data-testid="input-sound-volume" /></label>
        <Toggle label="Silenciar sons" description="Mantém o volume configurado para depois." checked={muted} onChange={(value) => setValue('muted', value)} testId="toggle-mute" />
      </div>
      <p className="powerup-explainer">Efeitos visuais, narração e áudio são configurações preparatórias; a reprodução da partida ainda não está disponível.</p>
    </Section>

    <div className="config-footer">
      <Link href="/games" className="btn-quiet config-back" data-testid="link-back-library"><ArrowLeft size={14} /> Biblioteca</Link>
      <Link href="/play" className="preview-button inline-flex items-center justify-center gap-1" data-testid="button-preview-game">Pré-visualizar Arena</Link>
      <button type="submit" className="config-submit" disabled={isSaving} data-testid="button-validate-config">
        {isSaving ? 'Salvando...' : 'Salvar e Abrir Arena'} <Check size={16} />
      </button>
    </div>
  </form>;
}

export default ConfigForm;
