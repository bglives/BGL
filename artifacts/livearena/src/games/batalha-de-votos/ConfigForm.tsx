import { useEffect, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ArrowLeft, Check, ChevronDown, ImagePlus, Info, Plus, Sparkles, Trash2, Volume2 } from 'lucide-react';
import { Link } from 'wouter';
import { configSchema, type BatalhaDeVotosConfig } from './config-schema';

const defaultGift = () => ({ id: '', name: '', imageUrl: '', costCoins: 0, votes: 1 });
const defaults: BatalhaDeVotosConfig = {
  title: '',
  candidateA: { name: '', color: '#62e6b0', avatar: undefined, gifts: Array.from({ length: 5 }, defaultGift) },
  candidateB: { name: '', color: '#ff8b9f', avatar: undefined, gifts: Array.from({ length: 5 }, defaultGift) },
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
  likesEnergy: false,
  energyBonusThreshold: 100,
  energyBonusPoints: 5,
  energyBonusCap: 20,
  chatCommands: false,
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

function GiftRows({ side, control, register, errors }: {
  side: 'candidateA' | 'candidateB';
  control: ReturnType<typeof useForm<BatalhaDeVotosConfig>>['control'];
  register: ReturnType<typeof useForm<BatalhaDeVotosConfig>>['register'];
  errors: ReturnType<typeof useForm<BatalhaDeVotosConfig>>['formState']['errors'];
}) {
  const { fields } = useFieldArray({ control, name: `${side}.gifts` });
  const colorName = side === 'candidateA' ? 'A' : 'B';
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
        <label className="gift-image-url"><span>Imagem (URL opcional)</span><input className="config-input" placeholder="https://" {...register(`${side}.gifts.${index}.imageUrl`)} data-testid={`input-gift-${colorName}-${index + 1}-image`} /></label>
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

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (avatarPreviewA) URL.revokeObjectURL(avatarPreviewA);
    if (avatarPreviewB) URL.revokeObjectURL(avatarPreviewB);
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
    } else {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(nextPreview);
    }
  };
  const onAvatarFile = (side: 'candidateA' | 'candidateB', file?: File) => {
    const oldPreview = side === 'candidateA' ? avatarPreviewA : avatarPreviewB;
    if (oldPreview) URL.revokeObjectURL(oldPreview);
    setValue(`${side}.avatar`, file, { shouldDirty: true, shouldValidate: true });
    const nextPreview = file ? URL.createObjectURL(file) : '';
    if (side === 'candidateA') setAvatarPreviewA(nextPreview);
    else setAvatarPreviewB(nextPreview);
  };
  const onSubmit = () => setSubmitted(true);
  return <form className="config-form" onSubmit={handleSubmit(onSubmit)} onChange={() => setSubmitted(false)} noValidate data-testid="form-batalha-config">
    <Section number="01" title="Identidade da partida" description="Dê contexto à disputa e escolha como ela será exibida." testId="section-identity">
      <label className="config-field"><span>Título da partida <em>Opcional</em></span><input className="config-input" placeholder="Ex.: Duelo da comunidade" {...register('title')} data-testid="input-match-title" /><FieldError>{errors.title?.message}</FieldError></label>
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
          <GiftRows side={side} control={control} register={register} errors={errors} />
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
      <button type="button" className="preview-button" onClick={() => setShowPreviewNotice(true)} data-testid="button-preview-game">Pré-visualizar</button>
      <button type="submit" className="config-submit" data-testid="button-validate-config">Validar configuração <Check size={16} /></button>
    </div>
    {showPreviewNotice && <div className="preview-notice" role="status" aria-live="polite" data-testid="status-preview-unavailable"><Info size={16} /><span>A prévia interativa do jogo estará disponível em um próximo marco. Nenhum simulador foi iniciado.</span><button type="button" aria-label="Fechar aviso de prévia" onClick={() => setShowPreviewNotice(false)} data-testid="button-dismiss-preview-notice">×</button></div>}
    {submitted && <div className="config-ready" role="status" data-testid="status-config-ready"><Check size={19} /><div><strong>Configuração pronta para o próximo marco.</strong><span>Foi validada localmente; nenhuma partida foi criada ou salva.</span></div><button type="button" onClick={() => setSubmitted(false)} aria-label="Fechar confirmação" data-testid="button-dismiss-ready">×</button></div>}
  </form>;
}

export default ConfigForm;
