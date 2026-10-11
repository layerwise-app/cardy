import { useEffect, useState } from 'react';
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  ListChecks,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { authClient, useSession } from '~/lib/auth-client';
import { LABELS, type Card } from '~/lib/cardy.types';
import type { BoardData } from '~/lib/cardy.functions';
import { Brand, Cover, IconButton, PersonAvatar } from './cardy-ui';
import { copyText, type RunAction } from './cardy-utils';

export function AuthDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const session = useSession();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [stage, setStage] = useState<'form' | 'otp' | 'verify'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setError('');
      setStage('form');
      setEmail(session.data?.user.email ?? '');
    }
  }, [open, session.data?.user.email]);

  async function finish() {
    await session.refetch();
    await onSuccess();
    onOpenChange(false);
    setPassword('');
    setOtp('');
  }
  async function sendCode(verify = false) {
    setPending(true);
    setError('');
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: verify ? 'email-verification' : 'sign-in',
      });
      if (result.error)
        throw new Error(result.error.message ?? 'Could not send a code.');
      setStage(verify ? 'verify' : 'otp');
      toast.success('Your code is on its way.');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not send a code.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='cardy-dialog auth-dialog'>
        <DialogHeader>
          <Brand />
          <span className='eyebrow'>A LITTLE SPACE FOR WHAT’S NEXT</span>
          <DialogTitle>
            {stage !== 'form'
              ? 'Check your inbox.'
              : session.data
                ? 'Make it official.'
                : mode === 'signup'
                  ? 'Good things start here.'
                  : 'Welcome back.'}
          </DialogTitle>
          <DialogDescription>
            {stage !== 'form'
              ? `Enter the six-digit code sent to ${email}. It expires in five minutes.`
              : session.data
                ? 'Verify your email to securely accept workspace invitations.'
                : 'A little less chaos. A lot more clarity. Make yourself at home.'}
          </DialogDescription>
        </DialogHeader>
        {stage === 'form' && session.data ? (
          <div className='dialog-form'>
            <label>
              Your email
              <Input type='email' readOnly value={email} />
            </label>
            {session.data.user.emailVerified ? (
              <p>Your email is already verified.</p>
            ) : (
              <button
                className='primary-button'
                disabled={pending}
                onClick={() => void sendCode(true)}
              >
                {pending ? 'Sending...' : 'Send verification code'}
                <Mail size={16} />
              </button>
            )}
          </div>
        ) : (
          <form
            className='dialog-form'
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError('');
              try {
                let result;
                if (stage === 'verify')
                  result = await authClient.emailOtp.verifyEmail({
                    email,
                    otp,
                  });
                else if (stage === 'otp')
                  result = await authClient.signIn.emailOtp({ email, otp });
                else if (mode === 'signup')
                  result = await authClient.signUp.email({
                    email,
                    password,
                    name,
                  });
                else
                  result = await authClient.signIn.email({ email, password });
                if (result.error)
                  throw new Error(
                    result.error.message ??
                      'Could not sign in. Please try again.'
                  );
                await finish();
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Something went wrong.'
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {stage !== 'form' ? (
              <label>
                Six-digit code
                <Input
                  autoFocus
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  required
                  minLength={6}
                  maxLength={6}
                  pattern='[0-9]{6}'
                  placeholder='000000'
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className='otp-input'
                />
              </label>
            ) : (
              <>
                {mode === 'signup' && (
                  <label>
                    Your name
                    <Input
                      autoFocus
                      required
                      maxLength={100}
                      autoComplete='name'
                      placeholder='How should we call you?'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                )}
                <label>
                  Email address
                  <Input
                    type='email'
                    required
                    autoComplete='email'
                    placeholder='you@yourworkspace.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <Input
                    type='password'
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    placeholder='At least 8 characters'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </>
            )}
            <button className='primary-button auth-submit' disabled={pending}>
              {pending ? <Loader2 size={16} className='animate-spin' /> : null}
              {pending
                ? 'One little moment...'
                : stage === 'verify'
                  ? 'Verify email'
                  : stage === 'otp'
                    ? 'Sign in'
                    : mode === 'signup'
                      ? 'Create your account'
                      : 'Sign in'}
              {!pending && <ArrowRight size={16} />}
            </button>
            {stage === 'form' && (
              <>
                <button
                  type='button'
                  className='soft-button'
                  disabled={pending || !email.includes('@')}
                  onClick={() => void sendCode()}
                >
                  <Mail size={16} />
                  Sign in with an email code
                </button>
                {mode === 'signin' && (
                  <a className='text-button' href='/forgot-password'>
                    Forgot your password?
                  </a>
                )}
              </>
            )}
          </form>
        )}
        {error && (
          <p className='form-error' role='alert'>
            {error}
          </p>
        )}
        {stage === 'form' && !session.data && (
          <p className='auth-toggle'>
            {mode === 'signup' ? 'Already feel at home?' : 'New around here?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError('');
              }}
            >
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        )}
        {stage !== 'form' && (
          <button
            className='text-button'
            disabled={pending}
            onClick={() => {
              setStage('form');
              setError('');
            }}
          >
            Back to sign in
          </button>
        )}
        <p className='auth-footnote'>
          A thoughtfully simple home for your work. No clutter required.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function CardDetails({
  card,
  data,
  open,
  onOpenChange,
  run,
  pending,
}: {
  card: Card;
  data: BoardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: RunAction;
  pending: boolean;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [labels, setLabels] = useState(card.labels);
  const [assignees, setAssignees] = useState(card.assignees);
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');
  const [checklist, setChecklist] = useState(card.checklist);
  const [itemTitle, setItemTitle] = useState('');
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const canEdit = data.canEdit && !card.archived;
  const comments = data.comments.filter((entry) => entry.cardId === card.id);
  const history = data.history.filter((entry) => entry.cardId === card.id);
  const completed = checklist.filter((item) => item.done).length;
  const dirty =
    title !== card.title ||
    description !== card.description ||
    dueDate !== (card.dueDate ?? '') ||
    JSON.stringify(labels) !== JSON.stringify(card.labels) ||
    JSON.stringify(assignees) !== JSON.stringify(card.assignees) ||
    JSON.stringify(checklist) !== JSON.stringify(card.checklist);
  const [confirmClose, setConfirmClose] = useState(false);
  function close(next: boolean) {
    if (!next && pending) return;
    if (!next && (dirty || comment.trim())) setConfirmClose(true);
    else onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className='cardy-dialog card-detail-dialog'>
        <DialogHeader className='card-detail-header'>
          <div className='card-detail-breadcrumb'>
            <span>{data.board.name}</span>
            <ChevronDown size={12} />
            <span>{data.lists.find((l) => l.id === card.listId)?.name}</span>
            {!canEdit && <span className='sample-pill'>READ ONLY</span>}
          </div>
          <DialogTitle className='sr-only'>{card.title}</DialogTitle>
          <DialogDescription className='sr-only'>
            Card details, checklist, comments, and activity
          </DialogDescription>
        </DialogHeader>
        {card.cover && <Cover kind={card.cover} />}
        <fieldset className='card-detail-layout' aria-label='Card details' disabled={pending}>
          <div className='card-detail-main'>
            <textarea
              className='card-title-input'
              rows={2}
              aria-label='Card title'
              maxLength={300}
              required
              readOnly={!canEdit}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
            />
            <div className='detail-section'>
              <h3>
                <ListChecks size={17} />
                Description
              </h3>
              {canEdit ? (
                <textarea
                  aria-label='Card description'
                  placeholder='Give this idea a little context...'
                  maxLength={20000}
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setSaved(false);
                  }}
                />
              ) : (
                <p className='description-text'>
                  {description ||
                    'No description yet. A little room for more context.'}
                </p>
              )}
            </div>
            <div className='detail-section checklist-section'>
              <h3>
                <CheckCheck size={17} />
                Checklist
                {checklist.length > 0 && (
                  <span>
                    {completed}/{checklist.length}
                  </span>
                )}
              </h3>
              {checklist.length > 0 && (
                <div className='checklist-progress'>
                  <span
                    style={{
                      width: `${(completed / checklist.length) * 100}%`,
                    }}
                  />
                </div>
              )}
              {checklist.map((item) => (
                <div className='checklist-item' key={item.id}>
                  <input
                    type='checkbox'
                    aria-label={`Complete ${item.title}`}
                    checked={item.done}
                    disabled={!canEdit}
                    onChange={() => {
                      setChecklist(
                        checklist.map((x) =>
                          x.id === item.id ? { ...x, done: !x.done } : x
                        )
                      );
                      setSaved(false);
                    }}
                  />
                  <span className={item.done ? 'item-done' : ''}>
                    {item.title}
                  </span>
                  {canEdit && (
                    <IconButton
                      label={`Remove ${item.title}`}
                      onClick={() => {
                        setChecklist(checklist.filter((x) => x.id !== item.id));
                        setSaved(false);
                      }}
                    >
                      <X size={13} />
                    </IconButton>
                  )}
                </div>
              ))}
              {canEdit && (
                <form
                  className='checklist-add'
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (itemTitle.trim()) {
                      setChecklist([
                        ...checklist,
                        {
                          id: crypto.randomUUID(),
                          title: itemTitle.trim(),
                          done: false,
                        },
                      ]);
                      setItemTitle('');
                      setSaved(false);
                    }
                  }}
                >
                  <Input
                    aria-label='New checklist item'
                    placeholder='Add a little next step...'
                    maxLength={300}
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                  />
                  <button
                    className='soft-button'
                    disabled={!itemTitle.trim() || checklist.length >= 100}
                  >
                    <Plus size={16} />
                  </button>
                </form>
              )}
              {!canEdit && !checklist.length && (
                <p className='dialog-note'>No checklist for this card.</p>
              )}
            </div>
            {canEdit && (
              <div className='card-save-row'>
                <span>
                  {pending
                    ? 'Saving...'
                    : dirty
                      ? 'You have unsaved changes'
                      : saved
                        ? 'All set. Changes saved.'
                        : 'Make it your own.'}
                </span>
                <button
                  className='primary-button'
                  disabled={pending || !dirty || !title.trim()}
                  onClick={async () => {
                    try {
                      const normalizedTitle = title.trim();
                      const normalizedDescription = description.trim();
                      const normalizedChecklist = checklist.map((item) => ({ id: item.id.trim(), title: item.title.trim(), done: item.done }));
                      const normalizedAssignees = assignees.filter((uid) => data.members.some((member) => member.id === uid));
                      await run({
                        type: 'card.update',
                        boardId: data.board.id,
                        cardId: card.id,
                        title: normalizedTitle,
                        description: normalizedDescription,
                        labels,
                        assignees: normalizedAssignees,
                        dueDate: dueDate || null,
                        checklist: normalizedChecklist,
                      });
                      setTitle(normalizedTitle);
                      setDescription(normalizedDescription);
                      setChecklist(normalizedChecklist);
                      setAssignees(normalizedAssignees);
                      setSaved(true);
                      toast.success('Card saved');
                    } catch {
                      /* Keep edits available for retry. */
                    }
                  }}
                >
                  <Check size={15} />
                  Save changes
                </button>
              </div>
            )}
            <div className='detail-conversation'>
              <div className='conversation-tabs'>
                <button
                  className={tab === 'comments' ? 'selected' : ''}
                  onClick={() => setTab('comments')}
                >
                  <MessageCircle size={15} />
                  Comments<span>{comments.length}</span>
                </button>
                <button
                  className={tab === 'activity' ? 'selected' : ''}
                  onClick={() => setTab('activity')}
                >
                  Activity
                </button>
              </div>
              {tab === 'comments' ? (
                <>
                  {comments.map((entry) => (
                    <div className='comment-entry' key={entry.id}>
                      <PersonAvatar name={entry.author} />
                      <div>
                        <strong>{entry.author}</strong>
                        <time>
                          {new Date(entry.createdAt).toLocaleString()}
                        </time>
                        <p>{entry.body}</p>
                      </div>
                    </div>
                  ))}
                  {!comments.length && (
                    <p className='conversation-empty'>
                      Good work starts with a conversation. No comments yet.
                    </p>
                  )}
                  {canEdit && (
                    <form
                      className='comment-form'
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!comment.trim() || pending) return;
                        try {
                          await run({
                            type: 'comment.create',
                            boardId: data.board.id,
                            cardId: card.id,
                            body: comment,
                          });
                          setComment('');
                        } catch {
                          /* Preserve comment draft. */
                        }
                      }}
                    >
                      <textarea
                        required
                        aria-label='Write a comment'
                        placeholder='Add a thought, ask a question...'
                        maxLength={5000}
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <button
                        className='soft-button'
                        disabled={pending || !comment.trim()}
                      >
                        Post comment
                        <ArrowRight size={14} />
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div className='card-activity'>
                  {history.length ? (
                    history.map((entry) => (
                      <div key={entry.id}>
                        <span className='activity-tiny-dot' />
                        <p>
                          <strong>{entry.author ?? 'Cardy'}</strong>{' '}
                          {entry.message}
                          <time>
                            {new Date(entry.createdAt).toLocaleString()}
                          </time>
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className='conversation-empty'>
                      No activity on this card yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <aside className='card-detail-sidebar'>
            <div className='detail-property'>
              <h3>
                <Tag size={14} />
                Labels
              </h3>
              <div className='detail-label-options'>
                {LABELS.map((label) => (
                  <button
                    key={label.name}
                    disabled={!canEdit}
                    className={`card-label label-${label.color} ${labels.includes(label.name) ? 'label-selected' : 'label-unselected'}`}
                    onClick={() => {
                      setLabels(
                        labels.includes(label.name)
                          ? labels.filter((l) => l !== label.name)
                          : [...labels, label.name]
                      );
                      setSaved(false);
                    }}
                  >
                    {label.name}
                    {labels.includes(label.name) && <Check size={11} />}
                  </button>
                ))}
              </div>
            </div>
            <div className='detail-property'>
              <h3>
                <Users size={14} />
                Assignees
              </h3>
              {data.members.map((member, index) => (
                <label className='assignee-option' key={member.id}>
                  <input
                    type='checkbox'
                    disabled={!canEdit}
                    checked={assignees.includes(member.id)}
                    onChange={() => {
                      setAssignees(
                        assignees.includes(member.id)
                          ? assignees.filter((x) => x !== member.id)
                          : [...assignees, member.id]
                      );
                      setSaved(false);
                    }}
                  />
                  <PersonAvatar name={member.name} index={index} />
                  <span>{member.name}</span>
                </label>
              ))}
              {!data.members.length && (
                <p className='dialog-note'>
                  Create a workspace to bring your people together.
                </p>
              )}
            </div>
            <div className='detail-property'>
              <h3>
                <CalendarDays size={14} />
                Due date
              </h3>
              <input
                aria-label='Due date'
                type='date'
                disabled={!canEdit}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setSaved(false);
                }}
              />
              {dueDate && canEdit && (
                <button
                  className='text-button'
                  onClick={() => {
                    setDueDate('');
                    setSaved(false);
                  }}
                >
                  Remove date
                </button>
              )}
            </div>
            {canEdit && (
              <div className='detail-property'>
                <h3>Move to list</h3>
                <select
                  aria-label='Move card to list'
                  disabled={pending}
                  value={card.listId}
                  onChange={async (e) => {
                    try {
                      await run({
                        type: 'card.move',
                        boardId: data.board.id,
                        cardId: card.id,
                        listId: e.target.value,
                        index: data.cards.filter(
                          (c) => c.listId === e.target.value && !c.archived
                        ).length,
                      });
                    } catch {
                      /* Errors are shown by the mutation handler. */
                    }
                  }}
                >
                  {data.lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {canEdit && (
              <button
                className={`archive-card-button ${confirmArchive ? 'confirm-danger' : ''}`}
                disabled={pending}
                onClick={async () => {
                  if (!confirmArchive) {
                    setConfirmArchive(true);
                    return;
                  }
                  try {
                    await run({
                      type: 'card.archive',
                      boardId: data.board.id,
                      cardId: card.id,
                      archived: true,
                    });
                    onOpenChange(false);
                    toast.success('Card archived');
                  } catch {
                    /* Errors are shown by the mutation handler. */
                  }
                }}
              >
                <Archive size={15} />
                {confirmArchive ? 'Confirm archive' : 'Archive card'}
              </button>
            )}
          </aside>
        </fieldset>
        {confirmClose && (
          <div className='unsaved-banner'>
            <span>Leave without saving your changes?</span>
            <button
              className='soft-button'
              onClick={() => setConfirmClose(false)}
            >
              Keep editing
            </button>
            <button
              className='primary-button'
              onClick={() => onOpenChange(false)}
            >
              Discard & close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MembersDialog({
  data,
  open,
  onOpenChange,
  run,
  pending,
}: {
  data: BoardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: RunAction;
  pending: boolean;
}) {
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [removeId, setRemoveId] = useState('');
  useEffect(() => {
    if (!open) {
      setLink('');
      setRemoveId('');
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='cardy-dialog members-dialog'>
        <DialogHeader>
          <span className='modal-symbol'>
            <Users size={23} />
          </span>
          <DialogTitle>Better, together.</DialogTitle>
          <DialogDescription>
            Your people. Your shared space. {data.workspaceName}.
          </DialogDescription>
        </DialogHeader>
        <div className='member-list'>
          {data.members.map((member, index) => (
            <div key={member.id}>
              <PersonAvatar name={member.name} index={index} />
              <strong>{member.name}</strong>
              <span className='member-role'>{member.role}</span>
              {data.role === 'owner' && member.role !== 'owner' && (
                <IconButton
                  label={
                    removeId === member.id
                      ? `Confirm removing ${member.name}`
                      : `Remove ${member.name}`
                  }
                  onClick={async () => {
                    if (removeId !== member.id) {
                      setRemoveId(member.id);
                      return;
                    }
                    try {
                      await run({
                        type: 'member.remove',
                        workspaceId: data.board.workspaceId,
                        userId: member.id,
                      });
                      setRemoveId('');
                      toast.success('Member removed');
                    } catch {
                      /* Errors are shown by the mutation handler. */
                    }
                  }}
                >
                  {removeId === member.id ? (
                    <Check size={16} />
                  ) : (
                    <X size={16} />
                  )}
                </IconButton>
              )}
            </div>
          ))}
        </div>
        {data.role === 'owner' ? (
          <>
            <form
              className='invite-form dialog-form'
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const result = await run({
                    type: 'member.invite',
                    workspaceId: data.board.workspaceId,
                    email,
                  });
                  if (result.token)
                    setLink(
                      `${window.location.origin}/?invite=${result.token}`
                    );
                  setEmail('');
                  toast.success(
                    'Invitation link created. Share it with your teammate.'
                  );
                } catch {
                  /* Keep the email for retry. */
                }
              }}
            >
              <label>
                Give someone a little space
                <Input
                  type='email'
                  required
                  placeholder='teammate@company.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className='primary-button' disabled={pending}>
                <Plus size={15} />
                Create invitation link
              </button>
            </form>
            <p className='dialog-note'>
              Share the link directly with your teammate. Invitations expire
              after 7 days and can only be accepted by the invited, verified
              email address. No invitation email is sent automatically.
            </p>
            {link && (
              <div className='invite-link-panel'>
                <span>
                  <Sparkles size={14} />
                  Your invitation is ready
                </span>
                <div className='share-field'>
                  <Input aria-label='Invitation link' readOnly value={link} />
                  <button
                    className='soft-button'
                    onClick={() => void copyText(link)}
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>
            )}
            {data.invites.length > 0 && (
              <div className='pending-invites'>
                <h3>Pending invitations</h3>
                {data.invites.map((invite) => (
                  <div key={invite.id}>
                    <Mail size={14} />
                    <span>
                      {invite.email}
                      <small>
                        Expires{' '}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </small>
                    </span>
                    <button
                      disabled={pending}
                      onClick={() =>
                        void run({
                          type: 'invite.revoke',
                          workspaceId: data.board.workspaceId,
                          id: invite.id,
                        })
                          .then(() => toast.success('Invitation revoked'))
                          .catch(() => {})
                      }
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className='dialog-note'>
            Workspace owners can invite teammates and manage membership. Members
            can create boards, organize cards, and join the conversation.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
