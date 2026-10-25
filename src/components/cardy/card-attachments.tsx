import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  formatBytes,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_CARD,
} from '~/lib/cardy.attachments';
import {
  deleteAttachment,
  loadAttachments,
  uploadAttachment,
} from '~/lib/cardy.attachments.functions';
import type { Card } from '~/lib/cardy.types';
import { useBoard } from './board-context';
import { readRequest } from './cardy-utils';
import { SubmitButton } from './cardy-ui';

export function AttachmentList({ card, canEdit }: { card: Card; canEdit: boolean }) {
  const { data } = useBoard();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const boardId = data.board.id;
  const attachments = useQuery({
    queryKey: ['cardy', 'attachments', card.id],
    queryFn: ({ signal }) =>
      readRequest(signal, (requestSignal) =>
        loadAttachments({ data: { boardId, cardId: card.id }, signal: requestSignal })
      ),
    networkMode: 'always',
    retry: false,
    // Signed links last 15 minutes; refresh them well before they expire.
    staleTime: 5 * 60000,
    refetchInterval: 10 * 60000,
  });
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['cardy'] });
  const onError = (error: Error) => toast.error(error.message);
  const upload = useMutation({
    networkMode: 'always',
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set('boardId', boardId);
      form.set('cardId', card.id);
      form.set('file', file);
      return uploadAttachment({ data: form });
    },
    onSuccess,
    onError,
  });
  const remove = useMutation({
    networkMode: 'always',
    mutationFn: (attachmentId: string) => deleteAttachment({ data: { boardId, attachmentId } }),
    onSuccess,
    onError,
  });
  const items = attachments.data ?? [];
  const full = items.length >= MAX_ATTACHMENTS_PER_CARD;
  if (!canEdit && !items.length) return null;

  function attach(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES)
      return toast.error(`Files can be up to ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
    upload.mutate(file);
  }

  return (
    <section className='flex flex-col gap-2'>
      <h3 className='flex h-6 items-center gap-2 text-xs font-medium text-muted-foreground'>
        Attachments
        {items.length > 0 && <span className='font-mono text-faint tabular-nums'>{items.length}</span>}
        {canEdit && (
          <SubmitButton
            variant='ghost'
            size='xs'
            className='ml-auto'
            isPending={upload.isPending}
            disabled={full}
            icon={<Paperclip />}
            onClick={() => inputRef.current?.click()}
          >
            Attach file
          </SubmitButton>
        )}
      </h3>
      {canEdit && (
        <input
          ref={inputRef}
          type='file'
          hidden
          onChange={(event) => {
            attach(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      )}
      {attachments.isError && <p className='text-[13px] text-faint'>Attachments couldn’t load.</p>}
      {items.length > 0 && (
        <ul className='flex flex-col'>
          {items.map((item) => (
            <li
              key={item.id}
              className='group -mx-2 flex min-h-11 items-center gap-2.5 rounded-md px-2 py-1 hover:bg-muted/50'
            >
              <a
                href={item.url}
                target='_blank'
                rel='noreferrer'
                tabIndex={-1}
                aria-hidden='true'
                className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white'
              >
                {item.preview ? (
                  <img src={item.url} alt='' loading='lazy' className='size-full object-cover' />
                ) : (
                  <FileText className='size-4 text-muted-foreground' />
                )}
              </a>
              <div className='min-w-0 flex-1'>
                <a
                  href={item.url}
                  target='_blank'
                  rel='noreferrer'
                  className='block truncate text-[13px] hover:underline'
                >
                  {item.name}
                </a>
                <span className='font-mono text-[11px] text-faint'>{formatBytes(item.size)}</span>
              </div>
              <Button variant='ghost' size='icon-xs' aria-label={`Download ${item.name}`} asChild>
                <a href={item.downloadUrl}>
                  <Download />
                </a>
              </Button>
              {canEdit &&
                (confirmId === item.id ? (
                  <Button
                    variant='destructive'
                    size='xs'
                    autoFocus
                    disabled={remove.isPending}
                    onBlur={() => setConfirmId(null)}
                    onClick={() => remove.mutate(item.id, { onSettled: () => setConfirmId(null) })}
                  >
                    Delete
                  </Button>
                ) : (
                  <Button
                    variant='ghost'
                    size='icon-xs'
                    aria-label={`Delete ${item.name}`}
                    disabled={remove.isPending}
                    onClick={() => setConfirmId(item.id)}
                  >
                    <Trash2 />
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
