import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * มือถือ (< 640px): เลื่อนขึ้นจากด้านล่างเต็มความกว้าง (sheet)
 * จอกว้างขึ้นไป: กล่องกลางพื้นที่ที่มองเห็น
 *
 * จัดกึ่งกลางด้วย flex ของฉากหลัง ไม่ใช้ translate(-50%, -50%)
 * เพราะแอนิเมชันเปิดกล่องก็ใช้ transform — ของเดิมโดนแอนิเมชันทับค่า translate
 * จนมุมซ้ายบนของกล่องไปอยู่กลางจอ แล้วครึ่งล่าง/ขวาหลุดออกนอกจอ
 * แบบนี้ขนาดกล่องจึงตามขนาดหน้าต่างเสมอ ไม่ว่าจะย่อ ขยาย หรือหมุนจอ
 */
export function DialogContent({
  children,
  className,
  title,
  description,
  footer,
  size = 'md',
}: {
  children: ReactNode;
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 flex items-end justify-center bg-[hsl(224_60%_8%/0.55)] backdrop-blur-[2px]',
          'sm:items-center sm:p-6',
          'data-[state=open]:animate-fade-in',
        )}
      >
        <DialogPrimitive.Content
          // ไม่มีคำอธิบายก็บอก Radix ตรง ๆ ว่าไม่มี จะได้ไม่เตือนใน console
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl border bg-card shadow-lift outline-none',
            'data-[state=open]:animate-sheet-up sm:data-[state=open]:animate-pop-in',
            'sm:max-h-[calc(100dvh-3rem)] sm:rounded-xl',
            size === 'lg' ? 'sm:max-w-[900px]' : 'sm:max-w-[560px]',
            className,
          )}
        >
          <div className="brand-bar h-[3px] shrink-0" />
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="ปิด"
              className="press focusable -mr-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4', !footer && 'pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-4')}>
            {children}
          </div>
          {footer ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/40 px-4 py-3 pb-safe sm:pb-3">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
}
